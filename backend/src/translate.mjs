/* 翻译服务端代理：真实服务链（MyMemory -> LibreTranslate）+ 离线词典兜底
 * 附带：结果缓存、按用户每日字符额度管理 */
import { randomUUID } from 'node:crypto';
import { run, get } from './db.mjs';

const DAILY_QUOTA = Number(process.env.TRANSLATION_DAILY_QUOTA || 5000);
const cache = new Map(); // key: text|target -> result

function providerMode() {
  return process.env.TRANSLATION_PROVIDER || 'chain'; // 'chain' | 'mock'
}

function detectSource(text) {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh-CN' : 'en';
}

function fetchTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() => clearTimeout(timer));
}

async function providerMyMemory(text, target) {
  const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 500))
    + '&langpair=' + detectSource(text) + '|' + target;
  const r = await fetchTimeout(url, null, 4000);
  if (!r.ok) throw new Error('MyMemory HTTP ' + r.status);
  const j = await r.json();
  const out = j && j.responseData && j.responseData.translatedText;
  if (!out || j.responseStatus !== 200) throw new Error('MyMemory empty');
  return out;
}

async function providerLibre(text, target) {
  const r = await fetchTimeout('https://libretranslate.com/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ q: text.slice(0, 1000), source: detectSource(text), target, format: 'text' })
  }, 3000);
  if (!r.ok) throw new Error('LibreTranslate HTTP ' + r.status);
  const j = await r.json();
  if (!j || !j.translatedText) throw new Error('LibreTranslate empty');
  return j.translatedText;
}

/* 离线兜底：中英短语替换（正式环境仅在网络故障时触发） */
export function offlineTranslate(text, target) {
  const s = String(text || '').trim();
  if (!s) return '';
  const t = target === 'zh-CN' ? 'zh' : target;
  if (t !== 'en' && t !== 'zh') return s;
  let out = ' ' + s + ' ';
  const pairs = OFFLINE_DICT.slice().sort((a, b) => {
    const la = (t === 'en' ? a[0] : a[1]) || '';
    const lb = (t === 'en' ? b[0] : b[1]) || '';
    return lb.length - la.length;
  });
  for (const [from, to] of pairs) {
    const src = t === 'en' ? from : to;
    const dst = t === 'en' ? to : from;
    if (!src) continue;
    out = out.split(src).join(dst);
    out = out.split(src.toLowerCase()).join(dst);
  }
  return out.replace(/\s+/g, ' ').trim();
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function usedChars(userId) {
  const row = get('SELECT COALESCE(SUM(chars),0) AS c FROM translation_usage WHERE user_id = ? AND day = ?', userId || 'guest', todayKey());
  return row ? row.c : 0;
}

export function translateError(status, code, message) {
  const e = new Error(message);
  e.status = status;
  e.code = code;
  return e;
}

export async function translateText({ userId, text, target, source }) {
  const s = String(text || '').trim();
  const tgt = String(target || '').trim();
  if (!s || !tgt) throw translateError(400, 'VALIDATION', 'text/target 为必填');
  if (s.length > 2000) throw translateError(400, 'TEXT_TOO_LONG', '单次翻译最多 2000 字符');

  const cacheKey = s + '|' + tgt;
  if (cache.has(cacheKey)) {
    const hit = cache.get(cacheKey);
    return { text: hit.text, target: tgt, source: source || null, provider: hit.provider, cached: true };
  }

  const uid = userId || 'guest';
  if (usedChars(uid) + s.length > DAILY_QUOTA) {
    throw translateError(429, 'QUOTA_EXCEEDED', '今日翻译额度已用完');
  }

  let result = null, provider = '';
  if (providerMode() !== 'mock') {
    try { result = await providerMyMemory(s, tgt); provider = 'mymemory'; }
    catch (e) {
      try { result = await providerLibre(s, tgt); provider = 'libretranslate'; }
      catch (e2) { /* 走离线兜底 */ }
    }
  }
  if (!result) {
    result = offlineTranslate(s, tgt);
    provider = 'offline';
  }

  if (provider !== 'offline') cache.set(cacheKey, { text: result, provider });
  run(
    'INSERT INTO translation_usage (id, user_id, day, chars, created_at) VALUES (?,?,?,?,?)',
    randomUUID(), uid, todayKey(), s.length, Date.now()
  );
  return { text: result, target: tgt, source: source || null, provider, cached: false };
}

const OFFLINE_DICT = [
  ['您好', 'Hello'], ['你好', 'Hi'], ['感谢', 'Thank you'], ['谢谢', 'Thanks'], ['请报价', 'please quote'],
  ['报价', 'quotation'], ['询盘', 'inquiry'], ['回复', 'reply'], ['数量', 'quantity'], ['单价', 'unit price'],
  ['价格', 'price'], ['总价', 'total amount'], ['交期', 'lead time'], ['交货期', 'delivery time'],
  ['样品', 'sample'], ['认证', 'certification'], ['证书', 'certificate'], ['支付', 'payment'],
  ['包装', 'packaging'], ['发票', 'invoice'], ['订单', 'order'], ['折扣', 'discount'],
  ['发货', 'shipment'], ['工厂', 'factory'], ['港口', 'port'], ['运费', 'freight'], ['保险', 'insurance'],
  ['合同', 'contract'], ['定金', 'deposit'], ['尾款', 'balance'], ['信用证', 'letter of credit (L/C)'],
  ['质量', 'quality'], ['规格', 'specification'], ['定制', 'customized'], ['原产地', 'origin'],
  ['有效期', 'validity'], ['包含', 'including'], ['需要', 'need'], ['可以', 'can'],
  ['请确认', 'please confirm'], ['到货', 'arrival'], ['目的港', 'destination port'], ['装运港', 'loading port'],
  ['tariff', '关税'], ['customs', '海关'], ['compliance', '合规'], ['shipment', '发货'],
  ['payment', '支付'], ['price', '价格'], ['quantity', '数量'], ['sample', '样品'], ['invoice', '发票'],
  ['quotation', '报价'], ['inquiry', '询盘'], ['delivery', '交货'], ['warehouse', '仓库'],
  ['order', '订单'], ['discount', '折扣'], ['quality', '质量'], ['factory', '工厂'],
  ['please quote', '请报价'], ['best price', '最优价格'], ['lead time', '交期'], ['packing', '包装'],
  ['MOQ', '起订量'], ['FOB', 'FOB'], ['CIF', 'CIF']
];
