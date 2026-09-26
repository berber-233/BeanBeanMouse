/* BeanBeanMouse 前端核心（工具 / 状态 / 事件委托 / 弹窗 / 顶栏）——由拆分脚本生成 */
/* ================= BeanBeanMouse（豆豆鼠）前端逻辑 ================= */

/* ---------- 基础工具 ---------- */
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function t(key, vars) {
  let s = (langObj(I18N) && langObj(I18N)[key]) || I18N.en[key] || key;
  if (vars) for (const k in vars) s = s.split('{' + k + '}').join(vars[k]);
  return s;
}

/* 多语言兜底：数据对象只完整覆盖中/英文，其他语言回退到英文 */
function langObj(obj, lang) {
  const code = lang || state.lang;
  if (obj && obj[code]) return obj[code];
  if (obj && obj.en) return obj.en;
  if (obj && obj.zh) return obj.zh;
  return obj || {};
}

function uiLocale() {
  const c = state.lang || 'zh';
  return c === 'zh' ? 'zh-CN' : c;
}

function langLabel(code) {
  const m = LANG_META.find(x => x.code === code);
  return m ? m.local : code;
}

function detectBrowserLang() {
  const nav = String((navigator.language || navigator.userLanguage || 'en')).toLowerCase();
  const base = nav.split('-')[0];
  if (LANG_META.some(m => m.code === base)) return base;
  return base === 'zh' ? 'zh' : 'en';
}

/* ---------- 产品内容按浏览者语言展示（卖家语言 → 买家语言） ---------- */
const CONTENT_CACHE_KEY = 'bridgetrade_content_v1';
let contentCache = (() => {
  try { return JSON.parse(localStorage.getItem(CONTENT_CACHE_KEY)) || {}; } catch (e) { return {}; }
})();
function saveContentCache() {
  try {
    const keys = Object.keys(contentCache);
    if (keys.length > 400) keys.slice(0, keys.length - 300).forEach(k => delete contentCache[k]);
    localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(contentCache));
  } catch (e) { /* 忽略 */ }
}

/* 产品源语言：发布时记录；旧数据按卖家所在国推断（中国卖家=中文，其余=英文） */
function baseContentLang(p) {
  if (p && (p.srcLang === 'zh' || p.srcLang === 'en')) return p.srcLang;
  const s = p && sellerOf(p);
  return (s && s.country === 'CN') ? 'zh' : 'en';
}

/* 渲染时的同步文案：中/英用平台整理好的双语数据，其他语言先用源语言兜底，随后异步翻译 */
function viewProductText(p, key, idx) {
  const lang = state.lang;
  if (lang === 'zh' || lang === 'en') return langObj(p)[key];
  const base = baseContentLang(p);
  const src = p[base] && p[base][key];
  if (Array.isArray(src)) return src[idx];
  return src;
}

function l10nAttrs(id, key, srcLang, srcText) {
  return ' data-l10n="' + id + ':' + key + ':' + srcLang + '" data-l10n-text="' + esc(srcText) + '"';
}

/* 商务合作邮箱（试验阶段联系方式；正式运营前替换为运营邮箱） */
const SITE_PARTNER_EMAIL = '694113406@qq.com';
const TRIAL_DISMISS_KEY = 'bbm_trial_dismissed_v1';
function initTrialBanner() {
  const el = document.getElementById('trialBanner');
  if (!el) return;
  let dismissed = false;
  try { dismissed = localStorage.getItem(TRIAL_DISMISS_KEY) === '1'; } catch (e) { /* 忽略 */ }
  if (dismissed) return;
  el.hidden = false;
  const txt = document.getElementById('trialBannerText');
  const mail = document.getElementById('trialBannerMail');
  if (txt) txt.textContent = t('trialNotice') + ' ';
  if (mail) { mail.href = 'mailto:' + SITE_PARTNER_EMAIL; mail.textContent = SITE_PARTNER_EMAIL; }
}

/* 非中/英浏览者：把页面中标记过的产品/资讯内容异步翻译成浏览者语言并回填（结果本地缓存） */
function applyViewerLang(root) {
  if (!root) return;
  if (state.lang === 'zh' || state.lang === 'en') return;
  root.querySelectorAll('[data-l10n]').forEach(el => {
    const parts = (el.dataset.l10n || '').split(':');
    if (parts.length < 3) return;
    const id = parts[0], key = parts[1], srcLang = parts[2];
    const srcText = el.dataset.l10nText || '';
    if (!srcText) return;
    const tgt = providerLang(state.lang);
    if (tgt === srcLang) return;
    const cacheKey = 'l10n:' + srcLang + '>' + tgt + ':' + id + ':' + key;
    if (contentCache[cacheKey]) { el.textContent = contentCache[cacheKey]; return; }
    const seq = (el._l10nSeq = (el._l10nSeq || 0) + 1);
    realTranslate(srcText, state.lang).then(res => {
      if (res.mode !== 'offline' && res.text && res.text !== srcText) {
        contentCache[cacheKey] = res.text;
        saveContentCache();
      }
      if (el.isConnected && el._l10nSeq === seq && res.text) el.textContent = res.text;
    }).catch(() => { /* 保持源语言兜底 */ });
  });
}

function loadState() {
  try {
    const s = api.storage.getState();
    /* 版本不符（演示数据换过）就丢弃旧缓存重建，否则老访客会一直看到过期目录 */
    if (s && s.dataVersion === DATA_VERSION && Array.isArray(s.products) && s.products.length && s.inquiries && s.favorites) return s;
  } catch (e) { /* 忽略并重建 */ }
  const fresh = seedDemoData();
  fresh.dataVersion = DATA_VERSION;
  api.storage.setState(fresh);
  return fresh;
}

let state = loadState();

function saveState() {
  try {
    api.storage.setState(state);
    if (api.storage.full) {
      api.storage.full = false;
      toast(t('storageFull'));
    }
  } catch (e) {
    toast(t('storageFull'));
  }
}

/* 数据层（api.*）变更后自动重载本地状态并重绘 */
document.addEventListener('api:changed', () => {
  state = loadState();
  migrateState();
  renderPage();
});

/* 旧数据迁移：为已存在的本地数据补齐新字段 */
function migrateState() {
  const now = Date.now();
  let changed = false;
  if (!Array.isArray(state.users)) { state.users = buildUsers(now); changed = true; }
  if (!Array.isArray(state.companies)) { state.companies = buildCompanies(); changed = true; }
  if (!Array.isArray(state.logs)) { state.logs = buildLogs(now); changed = true; }
  if (!Array.isArray(state.newsRegions)) { state.newsRegions = ['CN', 'GLOBAL']; changed = true; }
  if (!state.newsSyncedAt) { state.newsSyncedAt = Date.now(); changed = true; }
  if (!Array.isArray(state.orders)) { state.orders = []; changed = true; }
  if (!Array.isArray(state.tips)) { state.tips = []; changed = true; }
  if (!Array.isArray(state.categoryRequests)) { state.categoryRequests = []; changed = true; }
  if (!Array.isArray(state.shipments)) { state.shipments = []; changed = true; }
  if (!Array.isArray(state.evidence)) { state.evidence = []; changed = true; }
  if (!Array.isArray(state.promotions)) { state.promotions = []; changed = true; }
  if (!Array.isArray(state.insurances)) { state.insurances = []; changed = true; }
  if (!Array.isArray(state.contracts)) { state.contracts = []; changed = true; }
  if (!state.exportReadiness || typeof state.exportReadiness !== 'object') { state.exportReadiness = {}; changed = true; }
  if (!state.orderDocs || typeof state.orderDocs !== 'object') { state.orderDocs = {}; changed = true; }
  if (!Array.isArray(state.afterSales)) { state.afterSales = []; changed = true; }
  if (!Array.isArray(state.suggestions)) { state.suggestions = []; changed = true; }
  if (!state.profiles || typeof state.profiles !== 'object') { state.profiles = {}; changed = true; }
  if (!state.files || typeof state.files !== 'object') { state.files = {}; changed = true; }
  if (!state.conversations || typeof state.conversations !== 'object') { state.conversations = {}; changed = true; }
  if (!Array.isArray(state.notifications)) { state.notifications = []; changed = true; }
  if (!state.convReadAt || typeof state.convReadAt !== 'object') { state.convReadAt = {}; changed = true; }
  if (!state.tipDismissed || typeof state.tipDismissed !== 'object') { state.tipDismissed = {}; changed = true; }
  (state.users || []).forEach(u => { if (!u.accountType) { u.accountType = 'company'; changed = true; } });
  (state.users || []).forEach(u => {
    if (u.role === 'seller' && !u.sellerId) {
      const s = (typeof SELLERS !== 'undefined' ? SELLERS : []).find(x => x.zh && (x.zh.company === u.company || (x.en && x.en.company === u.company)));
      u.sellerId = s ? s.id : ('s' + String(u.id || '').replace(/\D/g, ''));
      changed = true;
    }
  });
  if (state.user && !state.user.accountType) { state.user.accountType = 'company'; changed = true; }
  state.products.forEach(p => {
    if (!p.hsCode) { p.hsCode = HS_BY_CAT[p.cat] || ''; changed = true; }
    if (!Array.isArray(p.markets)) { p.markets = MARKETS_BY_PRODUCT[p.id] || []; changed = true; }
    if (!p.sub) { const cat = CATEGORIES.find(c => c.id === p.cat); if (cat && cat.subs && cat.subs[0]) { p.sub = cat.subs[0].id; changed = true; } }
  });
  if (!state.products.some(p => p.id === 'p15')) {
    state.products = state.products.concat(pendingSeedProducts());
    changed = true;
  }
  if (changed) saveState();
}
migrateState();
initTrialBanner();

function syncVerification() {
  state.companies.forEach(c => {
    const s = SELLERS.find(x => x.id === c.sellerId);
    if (s) s.verified = c.status === 'approved';
  });
}
syncVerification();

function go(path) { location.hash = path; }
function parseHash() {
  const h = (location.hash || '#/').slice(1);
  const i = h.indexOf('?');
  if (i === -1) return { path: h || '/', params: new URLSearchParams() };
  return { path: h.slice(0, i) || '/', params: new URLSearchParams(h.slice(i + 1)) };
}

/* 干净路径兼容：_redirects 已把 /products 这类路径 301 到 /#/products；
   万一重定向把 hash 丢掉（或有人直接访问干净路径），这里再兜一次，
   保证落到对应页面而不是首页。仅在 hash 为空时改写，不影响正常路由。 */
const CLEAN_PATHS = ['products', 'news', 'guide', 'export', 'logistics', 'compliance', 'disputes', 'feedback', 'customs', 'recruit', 'insurance', 'contracts'];
(function adoptCleanPath() {
  if (location.hash) return;
  const seg = location.pathname.replace(/\/+$/, '').replace(/^\//, '');
  if (CLEAN_PATHS.indexOf(seg) === -1) return;
  try { history.replaceState(null, '', '/#/' + seg); } catch (e) { location.hash = '#/' + seg; }
})();

function fmtPrice(n) {
  if (Number.isInteger(n)) return n.toLocaleString('en-US');
  return n.toLocaleString('en-US', { maximumFractionDigits: n < 10 ? 2 : 1 });
}

function flagEmoji(code) {
  return String.fromCodePoint(...[...code].map(c => 0x1F1E6 + c.charCodeAt(0) - 65));
}

function countryName(code) {
  const c = COUNTRY_NAMES[code];
  return c ? langObj(c) : code;
}

function catById(id) { return CATEGORIES.find(c => c.id === id) || CATEGORIES[0]; }
function subOf(p) {
  const cat = catById(p.cat);
  return (cat.subs || []).find(s => s.id === p.sub) || null;
}
function subLabel(p) {
  const s = subOf(p);
  return s ? langObj(s) : '';
}
function sellerById(id) { return SELLERS.find(s => s.id === id) || SELLERS[0]; }
function productById(id) { return state.products.find(p => p.id === id); }
function sellerOf(p) { return sellerById(p.sellerId); }
function isLive(p) { return p.status === undefined || p.status === 'on'; }
function companyStatusOf(sellerId) {
  const c = (state.companies || []).find(x => x.sellerId === sellerId);
  return c ? c.status : 'pending';
}
function isVerifiedSeller(sellerId) { return companyStatusOf(sellerId) === 'approved'; }
const BANNED_KW = ['毒品', '仿牌', 'replica', 'weapon', '枪械', '爆炸物', '香烟', '假币', '破解', 'hack'];

function complianceCheck(p) {
  const txt = ((p.en.title || '') + ' ' + (p.en.desc || '') + ' ' + (p.zh.title || '') + ' ' + (p.zh.desc || '')).toLowerCase();
  const risks = [];
  BANNED_KW.forEach(kw => { if (txt.includes(kw)) risks.push(t('riskKeyword', { kw: kw })); });
  if (!(p.certs || []).length) risks.push(t('riskNoCert'));
  return risks;
}

function addLog(actor, action, target, detail) {
  state.logs.unshift({
    id: 'l' + Date.now() + Math.floor(Math.random() * 999),
    ts: Date.now(),
    actor: actor || '—',
    action: action || '',
    target: target || '',
    detail: detail || ''
  });
}

function initialsOf(str) {
  return String(str || '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase() || 'BT';
}

/* ---------- 实时翻译：第三方服务 + 本地缓存 + 离线词典兜底 ---------- */
const TRANS_CACHE_KEY = 'bridgetrade_trans_v1';
let transCache = (() => {
  try { return JSON.parse(localStorage.getItem(TRANS_CACHE_KEY)) || {}; } catch (e) { return {}; }
})();
function saveTransCache() {
  try {
    const keys = Object.keys(transCache);
    if (keys.length > 600) keys.slice(0, keys.length - 400).forEach(k => delete transCache[k]);
    localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(transCache));
  } catch (e) { /* 忽略 */ }
}

/* 翻译目标语言：中文界面译为英文、英文界面译为中文，其他语言译为当前界面语言 */
function transTarget() {
  if (state.lang === 'zh') return 'en';
  if (state.lang === 'en') return 'zh';
  return state.lang;
}

/* 把界面语言代码映射为翻译服务支持的语言代码 */
function providerLang(code) {
  const map = {
    zh: 'zh-CN', en: 'en', ja: 'ja', ko: 'ko', es: 'es', fr: 'fr', de: 'de',
    pt: 'pt', ru: 'ru', ar: 'ar', hi: 'hi', id: 'id', th: 'th', vi: 'vi',
    tr: 'tr', it: 'it', nl: 'nl', pl: 'pl', uk: 'uk', sv: 'sv', cs: 'cs',
    el: 'el', fa: 'fa', ms: 'ms', fil: 'fil'
  };
  return map[code] || 'en';
}

/* 简单源语言判断：含中文则按中文处理，否则按英文处理 */
function detectSource(text) {
  return /[\u4e00-\u9fff]/.test(text) ? 'zh-CN' : 'en';
}

/* 带超时的 fetch，避免网络异常时一直转圈 */
async function fetchTimeout(url, opts, ms) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, Object.assign({}, opts, { signal: ctrl.signal }));
  } finally {
    clearTimeout(timer);
  }
}

async function translateViaMyMemory(text, target) {
  const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text.slice(0, 500))
    + '&langpair=' + detectSource(text) + '|' + target;
  const r = await fetchTimeout(url, null, 4000);
  if (!r.ok) throw new Error('MyMemory HTTP ' + r.status);
  const j = await r.json();
  const out = j && j.responseData && j.responseData.translatedText;
  if (!out || j.responseStatus !== 200) throw new Error('MyMemory empty');
  return out;
}

/* 备用 LibreTranslate 实例。原先第一位是 libretranslate.com，但该站点已要求
   API key 且不返回 CORS 头，从浏览器必然预检失败（实测每次都浪费一个往返），
   故只保留无需密钥的公共实例。 */
async function translateViaLibre(text, target) {
  const instances = [
    'https://translate.argosopentech.com/translate'
  ];
  let lastErr;
  for (const base of instances) {
    try {
      const r = await fetchTimeout(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q: text.slice(0, 1000), source: detectSource(text), target: target, format: 'text' })
      }, 3000);
      if (!r.ok) { lastErr = new Error('LibreTranslate HTTP ' + r.status); continue; }
      const j = await r.json();
      if (j && j.translatedText) return j.translatedText;
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('LibreTranslate failed');
}

/* 并发闸门 + 同文本合并：一页可能有几十个 [data-l10n]，不设限会同时打第三方
   公共接口，触发大面积 429（实测如此）。这里限制同时最多 3 个请求，
   相同原文（中/俄切换常见重复短语）只发一次。 */
const TRANSLATE_MAX_CONCURRENCY = 3;
const translateInflight = new Map();
let translateActive = 0;
const translateWaiters = [];

function withTranslateSlot(fn) {
  return new Promise((resolve, reject) => {
    const run = () => {
      translateActive += 1;
      Promise.resolve().then(fn).then(resolve, reject).finally(() => {
        translateActive -= 1;
        const next = translateWaiters.shift();
        if (next) next();
      });
    };
    if (translateActive < TRANSLATE_MAX_CONCURRENCY) run();
    else translateWaiters.push(run);
  });
}

/* 真实翻译主流程：缓存 → MyMemory → LibreTranslate → 离线词典 */
async function realTranslate(text, target) {
  const s = String(text || '').trim();
  if (!s) return { text: '', mode: '' };
  const tgt = providerLang(target);
  const src = detectSource(s);
  if (tgt === src) return { text: s, mode: 'same' };
  const key = src + '>' + tgt + ':' + s;
  if (transCache[key]) return { text: transCache[key], mode: 'cache' };
  if (translateInflight.has(key)) return translateInflight.get(key);
  const job = withTranslateSlot(() => translateRemote(s, tgt, key));
  translateInflight.set(key, job);
  try {
    return await job;
  } finally {
    translateInflight.delete(key);
  }
}

/* 远端翻译：拿到就写缓存，全失败则回落离线词典 */
async function translateRemote(s, tgt, key) {
  try {
    const out = await translateViaMyMemory(s, tgt);
    if (out && out.trim()) { transCache[key] = out.trim(); saveTransCache(); return { text: out.trim(), mode: 'remote' }; }
  } catch (e) { /* 尝试下一个服务 */ }
  try {
    const out = await translateViaLibre(s, tgt);
    if (out && out.trim()) { transCache[key] = out.trim(); saveTransCache(); return { text: out.trim(), mode: 'remote' }; }
  } catch (e) { /* 使用离线词典 */ }
  const out = demoTranslate(s, tgt === 'zh-CN' ? 'zh' : tgt);
  return { text: out, mode: 'offline' };
}

/* 离线兜底：中英短语库（仅支持中/英，其他语言原样返回） */
function demoTranslate(text, target) {
  const s = String(text || '').trim();
  if (!s) return '';
  if (target !== 'en' && target !== 'zh') return s;
  let out = ' ' + s + ' ';
  const pairs = TRANSLATION_DICT.slice().sort((a, b) => {
    const la = (target === 'en' ? a[0] : a[1]) || '';
    const lb = (target === 'en' ? b[0] : b[1]) || '';
    return lb.length - la.length;
  });
  pairs.forEach(pair => {
    const from = target === 'en' ? pair[0] : pair[1];
    const to = target === 'en' ? pair[1] : pair[0];
    if (!from) return;
    out = out.split(from).join(to);
    out = out.split(from.toLowerCase()).join(to);
  });
  return out.replace(/\s+/g, ' ').trim();
}

/* 异步填充翻译框：防串号 + 断线保护 */
async function fillTransBox(box, text) {
  if (!box) return;
  const clean = String(text || '').trim();
  if (!clean) { box.textContent = '—'; return; }
  box._transSeq = (box._transSeq || 0) + 1;
  const seq = box._transSeq;
  box.textContent = t('translating');
  const res = await realTranslate(clean, transTarget());
  if (box && box.isConnected && box._transSeq === seq) {
    box.textContent = res.text || '—';
    box.dataset.mode = res.mode;
    const pill = box.closest('.trans-preview, .trans-msg') ? box.closest('.trans-preview, .trans-msg').querySelector('.trans-pill, .trans-label') : null;
    if (pill) {
      const extra = res.mode === 'offline' ? ' · ' + t('transOffline') : '';
      pill.textContent = '⚡ ' + t('translateLabel') + extra;
    }
  }
}

const msgTransState = {};
function fmtDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString(uiLocale(), { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

/* ---------- 图标 ---------- */
function icon(name, extra = '') {
  const paths = {
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>',
    heart: '<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
    heartFill: '<path fill="currentColor" stroke="none" d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5"/><path d="M21 12H9"/>',
    plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
    edit: '<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4Z"/>',
    trash: '<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
    box: '<path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/>',
    message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
    chart: '<path d="M3 3v18h18"/><path d="m7 15 4-6 3 3 5-8"/>',
    send: '<path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    globe: '<circle cx="12" cy="12" r="10"/><path d="M2 12h20"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    sparkle: '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/>',
    x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
    filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54Z"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
    building: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01M12 6h.01M16 6h.01M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01"/>',
    cart: '<circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/>',
    external: '<path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>',
    bell: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>',
    file: '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5Z"/><path d="M14 2v6h6"/>',
    refresh: '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>'
  };
  const filled = extra === 'fill';
  const key = filled ? name + 'Fill' : name;
  const body = paths[key] || paths[name] || '';
  return `<svg viewBox="0 0 24 24" width="16" height="16" fill="${filled ? 'currentColor' : 'none'}" stroke="${filled ? 'none' : 'currentColor'}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}

/* ---------- 产品图片（SVG 生成） ---------- */
function productImg(p, w = 640, h = 480, variant = 0) {
  const cat = catById(p.cat);
  const hue = p.hue || cat.hue;
  const hue2 = (hue + 45) % 360;
  const initials = (p.en.title || 'BT').split(/\s+/).slice(0, 3).map(w => w[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BT';
  const catLabel = (langObj(cat) || '').toUpperCase();
  const off = variant * 55;
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">'
    + '<stop offset="0" stop-color="hsl(' + hue + ' 46% 44%)"/>'
    + '<stop offset="1" stop-color="hsl(' + hue2 + ' 50% 24%)"/>'
    + '</linearGradient></defs>'
    + '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>'
    + '<circle cx="' + Math.round(w * 0.84) + '" cy="' + Math.round(h * 0.16) + '" r="' + Math.round(h * 0.36) + '" fill="rgba(255,255,255,0.08)"/>'
    + '<circle cx="' + Math.round(w * 0.12) + '" cy="' + Math.round(h * 0.9) + '" r="' + Math.round(h * 0.3) + '" fill="rgba(255,255,255,0.06)"/>'
    + '<circle cx="' + Math.round(w * 0.5 + off) + '" cy="' + Math.round(h * 0.5 - off * 0.5) + '" r="5" fill="rgba(255,255,255,0.5)"/>'
    + '<text x="' + (w / 2) + '" y="' + Math.round(h * 0.45) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="' + Math.round(h * 0.26) + '" font-weight="700" fill="rgba(255,255,255,0.9)">' + initials + '</text>'
    + '<text x="' + (w / 2) + '" y="' + Math.round(h * 0.74) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="' + Math.round(h * 0.07) + '" letter-spacing="3" fill="rgba(255,255,255,0.75)">' + esc(catLabel) + '</text>'
    + '</svg>';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}
/* 真实商品图优先，无图回退程序占位图 */
function productImages(p) {
  const mapped = (typeof window !== 'undefined' && window.__PRODUCT_IMAGE_MAP__ && window.__PRODUCT_IMAGE_MAP__[p && p.id]) || [];
  const own = Array.isArray(p && p.images) ? p.images.filter(x => x && (x.dataUrl || typeof x === 'string')) : [];
  return mapped.concat(own);
}
function productImgUrl(p, v) {
  const imgs = productImages(p);
  if (!imgs.length) return '';
  const it = imgs[(v || 0) % imgs.length];
  return typeof it === 'string' ? it : (it.dataUrl || '');
}
function productMainImg(p, w, h) {
  return productImages(p).length ? productImgUrl(p, 0) : productImg(p, w || 640, h || 480, 0);
}

/* ---------- 全局交互（事件委托） ---------- */
document.addEventListener('click', e => {
  const actEl = e.target.closest('[data-action]');
  const navEl = e.target.closest('[data-nav]');
  if (actEl) { handleAction(actEl); return; }
  if (navEl) { go(navEl.dataset.nav); return; }
  if (e.target.classList && e.target.classList.contains('modal-mask')) closeModal();
});

document.addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const btn = f.querySelector('button[type="submit"]');
  if (btn) { btn.disabled = true; btn.classList.add('busy'); }
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(safety);
    if (btn) { btn.disabled = false; btn.classList.remove('busy'); }
  };
  const safety = setTimeout(release, 20000);
  let p = null;
  if (f.dataset.form === 'inquiry-form') p = submitInquiry(f);
  else if (f.dataset.form === 'product-form') p = submitProduct(f);
  else if (f.dataset.form === 'reply-form') p = submitReply(f);
  else if (f.dataset.form === 'quote-form') p = submitQuote(f);
  else if (f.dataset.form === 'login-form') p = submitLogin(f);
  else if (f.dataset.form === 'admin-login-form') p = submitAdminLogin(f);
  else if (f.dataset.form === 'register-form') p = submitRegister(f);
  else if (f.dataset.form === 'company-form') p = submitCompanyForm(f);
  else if (f.dataset.form === 'catreq-form') p = submitCatReqForm(f);
  else if (f.dataset.form === 'shipment-create-form') p = submitShipmentCreate(f);
  else if (f.dataset.form === 'shipment-event-form') p = submitShipmentEvent(f);
  else if (f.dataset.form === 'promo-form') p = submitPromo(f);
  else if (f.dataset.form === 'logistics-estimate-form') p = runLogisticsEstimate(f);
  else if (f.dataset.form === 'compliance-screen-form') p = runComplianceScreen(f);
  else if (f.dataset.form === 'after-sales-form') p = submitAfterSales(f);
  else if (f.dataset.form === 'aftersales-respond-form') p = submitAfterSalesRespond(f);
  else if (f.dataset.form === 'aftersales-arbitrate-form') p = submitAfterSalesArbitrate(f);
  else if (f.dataset.form === 'chat-send') p = sendChatMessage(f);
  else if (f.dataset.form === 'profile-form') p = submitProfile(f);
  else if (f.dataset.form === 'change-password') p = submitChangePassword(f);
  else if (f.dataset.form === 'feedback-form') p = submitFeedback(f);
  else if (f.dataset.form === 'products-search') {
    const v = (f.querySelector('#productKw') || {}).value || '';
    setFilter('kw', v.trim());
  }
  if (p && typeof p.finally === 'function') p.finally(release);
  else release();
});

/* 动作按钮防连点：禁用→执行→恢复，20 秒兜底防止卡死 */
function runBusy(btn, fn) {
  if (!btn) return Promise.resolve(fn && fn());
  btn.disabled = true;
  btn.classList.add('busy');
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    clearTimeout(safety);
    btn.disabled = false;
    btn.classList.remove('busy');
  };
  const safety = setTimeout(release, 20000);
  return Promise.resolve(fn && fn()).finally(release);
}

/* ---------- 表单内联错误提示 ---------- */
function setFieldError(input, msg) {
  if (!input) return;
  const wrap = input.closest('.field');
  let err = wrap ? wrap.querySelector('.field-error') : null;
  if (!err && wrap) {
    err = document.createElement('span');
    err.className = 'field-error';
    err.setAttribute('role', 'alert');
    wrap.appendChild(err);
  }
  input.classList.toggle('invalid', !!msg);
  if (msg) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  if (err) err.textContent = msg || '';
}
function clearFieldErrors(form) {
  form.querySelectorAll('.field-error').forEach(e => { e.textContent = ''; });
  form.querySelectorAll('.invalid').forEach(i => i.classList.remove('invalid'));
  form.querySelectorAll('[aria-invalid]').forEach(i => i.removeAttribute('aria-invalid'));
}
function requireText(val) { return val ? '' : t('errRequired'); }
function requireEmail(val) {
  if (!val) return t('errRequired');
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val) ? '' : t('errEmail');
}
function requireNumber(val, min) {
  const n = Number(val);
  if (val === '' || val == null || !Number.isFinite(n)) return t('errNumber');
  if (min != null && n < min) return t('errPositive');
  return '';
}
function validateForm(form, rules) {
  clearFieldErrors(form);
  let firstBad = null;
  for (const [name, checks] of Object.entries(rules)) {
    const input = form.querySelector('[name="' + name + '"]');
    const val = input ? String(input.value || '').trim() : '';
    for (const c of checks) {
      const msg = c(val, input, form);
      setFieldError(input, msg);
      if (msg) { if (!firstBad) firstBad = input; break; }
    }
  }
  if (firstBad) { firstBad.focus(); return false; }
  return true;
}

function handleAction(el) {
  const a = el.dataset.action;
  const id = el.dataset.id;
  switch (a) {
    case 'toggle-fav': toggleFav(id); break;
    case 'open-inquiry': openInquiryModal(id); break;
    case 'open-product': go('/product/' + id); break;
    case 'login-role': loginAs(el.dataset.role); break;
    case 'login-guest': logout(true); break;
    case 'show-register': showModal(registerFormHtml()); break;
    case 'company-form': showModal(companyFormHtml()); break;
    case 'catreq-open': showModal(catReqFormHtml()); break;
    case 'order-create': createOrderFromInquiry(id); break;
    case 'order-confirm': runBusy(el, () => confirmOrderReceipt(id)); break;
    case 'order-cancel': runBusy(el, () => cancelOrder(id)); break;
    case 'tip-open': openTipModal(id); break;
    case 'tip-send': runBusy(el, () => sendTip(el.dataset.order)); break;
    case 'tip-quick': {
      const inp = $('#tipAmountInput');
      if (inp) inp.value = el.dataset.amount;
      break;
    }
    case 'tip-cancel': cancelTip(el.dataset.order, el.dataset.tip); break;
    case 'tip-skip': closeModal(); toast(t('tipSkipped')); break;
    case 'tip-dismiss': {
      state.tipDismissed[id] = true;
      saveState();
      render();
      break;
    }
    case 'evidence-save': runBusy(el, () => saveEvidenceSnapshot(id)); break;
    case 'evidence-verify': runBusy(el, () => verifyOrderEvidence(id)); break;
    case 'evidence-print': openEvidencePrint(id); break;
    case 'shipment-create': openShipmentCreateModal(id); break;
    case 'shipment-event': openShipmentEventModal(id, el.dataset.shipment); break;
    case 'promo-open': openPromoModal(id); break;
    case 'promo-review': reviewPromotion(id, el.dataset.action2); break;
    case 'catreq-status': setCatReqStatus(id, el.dataset.status, el.dataset.note); break;
    case 'insurance-tier': {
      const box = el.closest('.insurance-box');
      if (box) box.querySelectorAll('.ins-tier').forEach(b => b.classList.toggle('sel', b === el));
      break;
    }
    case 'insurance-buy': runBusy(el, () => buyInsurance(el.dataset.order)); break;
    case 'insurance-cancel': runBusy(el, () => cancelInsurance(el.dataset.id)); break;
    case 'contract-gen': renderContractPreview(); break;
    case 'contract-print': openContractPrint((state.orders || []).find(o => o.id === el.dataset.order)); break;
    case 'contract-custody': runBusy(el, () => requestContractCustody(el.dataset.order)); break;
    case 'export-toggle': runBusy(el, () => toggleExportItem(el)); break;
    case 'doc-gen': runBusy(el, () => generateOrderDoc(el.dataset.order, el.dataset.type)); break;
    case 'doc-print': openOrderDocPrint(el.dataset.order, el.dataset.type); break;
    case 'doc-check': runBusy(el, () => checkOrderDocConsistency(el.dataset.order)); break;
    case 'after-sales-open': openAfterSalesModal(id, false); break;
    case 'dispute-open': openAfterSalesModal(id, true); break;
    case 'as-respond': openAfterSalesRespondModal(id); break;
    case 'as-escalate': runBusy(el, () => escalateAfterSales(id)); break;
    case 'as-arbitrate': openAfterSalesArbitrateModal(id); break;
    case 'as-evidence': openEvidencePrint(id); break;
    case 'export-conv': {
      const i = state.inquiries.find(x => x.id === id);
      if (i) exportConversation(i, el.dataset.format);
      break;
    }
    case 'view-card': {
      const i = state.inquiries.find(x => x.id === id);
      if (i) openCardModal(i);
      break;
    }
    case 'card-flip': card3d.flipped = !card3d.flipped; card3dTransform(); break;
    case 'view-attach': {
      const i = state.inquiries.find(x => x.id === el.dataset.id);
      if (i) openAttachModal(findInquiryAttachment(i, el.dataset.name));
      break;
    }
    case 'attach-remove': {
      removePendingAttach(el.dataset.store, el.dataset.name);
      const input = document.querySelector('[data-attach-store="' + el.dataset.store + '"]');
      renderAttachPreview(input ? input.closest('.attach-field') : null, el.dataset.store);
      break;
    }
    case 'card-remove': runBusy(el, removeBusinessCard); break;
    case 'card-template': runBusy(el, () => applyCardTemplate(el.dataset.tpl)); break;
    case 'card-apply-custom': {
      const color = document.querySelector('input[name="cardAccent"]');
      const font = document.querySelector('select[name="cardFont"]');
      saveCardOpts({ accent: color ? color.value : '', font: font ? font.value : '' });
      const o = cardOptsOf(state.user);
      runBusy(el, () => applyCardTemplate(o.lastTpl || 'luxe-ink'));
      break;
    }
    case 'feedback-status': runBusy(el, () => api.suggestions.setStatus(id, { status: el.dataset.status }).then(() => {
      const sug = (state.suggestions || []).find(s => s.id === id);
      if (sug && sug.userId) pushNotification({ toUserId: sug.userId, title: t('notifFeedback'), body: t('feedbackDone'), link: '/feedback' });
      toast(t('feedbackMarkSeenDone'));
      renderPage();
    })); break;
    case 'notif-toggle': {
      const p = document.getElementById('notifPanel');
      if (p) { p.hidden = !p.hidden; el.setAttribute('aria-expanded', String(!p.hidden)); }
      break;
    }
    case 'notif-read-all': runBusy(el, markAllNotificationsRead); break;
    case 'open-conv': go('/dashboard/messages?conv=' + encodeURIComponent(id)); break;
    case 'export-orders': exportOrdersCsv(); break;
    case 'export-inquiries': exportInquiriesCsv(); break;
    case 'pay-open': {
      const o = (state.orders || []).find(x => x.id === id);
      if (o) openPayModal(o);
      break;
    }
    case 'pay-paypal': runBusy(el, () => doPaypalPay(id)); break;
    case 'product-img-remove': {
      const idx = Number(el.dataset.idx);
      const { params } = parseHash();
      const pid = params.get('id') || '';
      const p = pid ? productById(pid) : null;
      const base = Array.isArray(p && p.images) ? p.images.length : 0;
      if (p && idx < base) {
        const imgs = Array.isArray(p.images) ? p.images.slice() : [];
        imgs.splice(idx, 1);
        p.images = imgs;
        saveState();
      } else if (idx >= base) {
        productImgFiles.splice(idx - base, 1);
      }
      refreshProductImgWrap();
      renderPage();
      break;
    }
    case 'dismiss-trial': {
      try { localStorage.setItem(TRIAL_DISMISS_KEY, '1'); } catch (e) { /* 忽略 */ }
      const b = document.getElementById('trialBanner');
      if (b) b.hidden = true;
      break;
    }
    case 'logout': logout(false); break;
    case 'switch-role': logout(false, true); break;
      case 'ask-open': openAskFlow(el.dataset.id || ''); break;
      case 'ask-pick': askPick(el.dataset.field, el.dataset.value); break;
      case 'ask-next': askNext(); break;
      case 'ask-back': if (askFlow) { askFlow.step = Math.max(1, askFlow.step - 1); renderAskStep(); } break;
      case 'ask-submit': runBusy(el, () => askSubmit()); break;
      case 'resend-verify': {
        const em = $('#resendEmail');
        const v = em ? em.value.trim() : '';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast(t('askNeedContact')); break; }
        runBusy(el, async () => {
          await api.auth.resendVerification(v);
          toast(t('resendSent'));
        });
        break;
      }
      case 'review-user': {
        runBusy(el, async () => {
          await apiRequest('/admin/users/' + el.dataset.id + '/' + el.dataset.verdict, { method: 'POST', token: authTokenOf(), body: {} });
          toast(el.dataset.verdict === 'approve' ? t('reviewApproved') : t('reviewRejected'));
          await loadPendingUsers();
          if (typeof hydrateSessionData === 'function') { try { await hydrateSessionData(); } catch (e) { /* 忽略 */ } }
        });
        break;
      }
      case 'reload-session-data': {
        runBusy(el, () => (typeof hydrateSessionData === 'function' ? hydrateSessionData() : Promise.resolve()));
        break;
      }
      case 'go-dashboard': go('/dashboard'); break;
      case 'toggle-nav': {
        const nav = $('.main-nav');
        if (nav) {
          const open = nav.classList.toggle('open');
          el.setAttribute('aria-expanded', open ? 'true' : 'false');
        }
        break;
      }
      case 'toggle-user-menu': {
        const menu = $('#userMenu');
        if (menu) {
          const willOpen = menu.hidden;
          menu.hidden = !willOpen;
          el.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
        }
        break;
      }
    case 'close-modal': closeModal(); break;
    case 'delete-product': deleteProduct(id); break;
    case 'toggle-status': toggleStatus(id); break;
    case 'edit-product': go('/dashboard/publish?id=' + id); break;
    case 'mark-handled': markHandled(id); break;
    case 'remove-filter': removeFilter(el.dataset.key, el.dataset.value); break;
    case 'gallery': setGallery(el); break;
    case 'approve-product': {
      const p = productById(id);
      if (!p) break;
      p.status = 'on';
      p.rejectReason = '';
      addLog(state.user ? state.user.name : '管理员', t('reviewPassed'), langObj(p).title, '');
      saveState(); toast(t('reviewPassed')); renderPage();
      break;
    }
    case 'reject-product': {
      const p = productById(id);
      if (!p) break;
      const reason = prompt(t('rejectReason'));
      if (reason === null) break;
      p.status = 'rejected';
      p.rejectReason = reason.trim() || t('rejectedLabel');
      addLog(state.user ? state.user.name : '管理员', t('reviewRejected'), langObj(p).title, reason.trim());
      saveState(); toast(t('reviewRejected')); renderPage();
      break;
    }
    case 'verify-company': {
      const c = (state.companies || []).find(x => x.sellerId === id);
      if (!c) break;
      c.status = 'approved';
      const s = SELLERS.find(x => x.id === id);
      if (s) s.verified = true;
      addLog(state.user ? state.user.name : '管理员', t('companyApproved'), s ? langObj(s).company : id, '');
      saveState(); toast(t('companyApproved')); renderPage();
      break;
    }
    case 'reject-verify': {
      const c = (state.companies || []).find(x => x.sellerId === id);
      if (!c) break;
      const reason = prompt(t('rejectReasonPh'));
      if (reason === null) break;
      c.status = 'rejected';
      c.rejectReason = reason.trim() || t('companyRejected');
      const s = SELLERS.find(x => x.id === id);
      if (s) s.verified = false;
      addLog(state.user ? state.user.name : '管理员', t('companyRejected'), s ? langObj(s).company : id, c.rejectReason);
      saveState(); toast(t('companyRejected')); renderPage();
      break;
    }
    case 'freeze-user': {
      const u = (state.users || []).find(x => x.id === id);
      if (!u || u.role === 'admin') break;
      u.status = u.status === 'frozen' ? 'active' : 'frozen';
      addLog(state.user ? state.user.name : '管理员', u.status === 'frozen' ? t('userFrozen') : t('userUnfrozen'), u.name, u.email);
      saveState(); toast(u.status === 'frozen' ? t('userFrozen') : t('userUnfrozen')); renderPage();
      break;
    }
    case 'legal-note': toast(t('legalNote')); break;
    case 'fake-check': openFakeCheck(); break;
    case 'site-verify': openSiteVerify(); break;
    case 'toggle-help': toggleHelp(); break;
    case 'close-help': closeHelp(); break;
    case 'verify-product': {
      const p = productById(id);
      if (p) showFakeResult(p, fakeCodeOf(p));
      break;
    }
    case 'fake-verify': {
      const input = $('#fakeCodeInput');
      const code = (input ? input.value : '').trim().toUpperCase();
      if (!code) { toast(t('fakeEnter')); return; }
      const p = productByFakeCode(code);
      if (p) showFakeResult(p, code);
      else {
        closeModal();
        showModal(
          '<div class="modal-head"><h3>🔍 ' + t('fakeCheck') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
          + '<div class="modal-body fake-result"><div class="fake-ico fake-ico--bad">✕</div>'
          + '<p class="fake-genuine" style="color:var(--danger)">' + t('fakeNotFound') + '</p>'
          + '<p class="small muted" style="text-align:center">' + t('fakeHint') + '</p>'
          + '<button type="button" class="btn btn-primary" data-action="fake-check" style="margin-top:12px">' + t('fakeVerify') + '</button>'
          + '</div>'
        );
      }
      break;
    }
    case 'set-lang':
      state.lang = el.dataset.lang;
      state.firstVisit = false;
      saveState();
      closeModal();
      render();
      if (!$('#helpPanel').hidden) renderHelpContent();
      break;
    case 'lang-more':
      openLangModal();
      break;
    case 'lang-auto': {
      const code = detectBrowserLang();
      state.lang = code;
      state.firstVisit = false;
      saveState();
      closeModal();
      render();
      toast(t('langAuto') + '：' + langLabel(code));
      break;
    }
    case 'dismiss-lang-hint': {
      state.firstVisit = false;
      saveState();
      const hint = $('#langHint');
      if (hint) hint.remove();
      break;
    }
    case 'refresh-news':
      state.newsSyncedAt = Date.now();
      saveState();
      toast(t('newsRefreshed'));
      renderPage();
      break;
    case 'print-doc': openPrintDoc(id, el.dataset.type); break;
    case 'print-now': window.print(); break;
    case 'toggle-msg-trans': {
      msgTransState[id] = !msgTransState[id];
      renderPage();
      const inq = state.inquiries.find(x => x.id === id);
      if (msgTransState[id] && inq) fillTransBox(document.querySelector('[data-trans-box="' + id + '"] p'), inq.message);
      break;
    }
    case 'toggle-lang':
      state.lang = state.lang === 'zh' ? 'en' : 'zh';
      saveState();
      render();
      break;
  }
}

/* ---------- 弹窗 / 提示 ---------- */
let lastFocusedEl = null;
function modalFocusables() {
  const m = document.querySelector('#modalRoot .modal');
  if (!m) return [];
  return Array.from(m.querySelectorAll('a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
    .filter(el => el.offsetParent !== null || el === document.activeElement);
}
function showModal(html) {
  setTimeout(mountTurnstile, 0);
  lastFocusedEl = document.activeElement;
  document.body.classList.add('modal-open');
  $('#modalRoot').innerHTML = '<div class="modal-mask" role="dialog" aria-modal="true"><div class="modal" data-stop="1" tabindex="-1">' + html + '</div></div>';
  const m = document.querySelector('#modalRoot .modal');
  if (m) {
    const title = m.querySelector('.modal-head h3');
    if (title) {
      title.id = title.id || ('modalTitle' + Date.now());
      m.setAttribute('aria-labelledby', title.id);
    }
    const focusable = modalFocusables()[0];
    if (focusable) focusable.focus();
    else m.focus();
  }
}
function closeModal() {
  $('#modalRoot').innerHTML = '';
  document.body.classList.remove('modal-open');
  if (lastFocusedEl && lastFocusedEl.focus) lastFocusedEl.focus();
}
document.addEventListener('keydown', e => {
  if (!$('#modalRoot').innerHTML) return;
  if (e.key === 'Escape') { closeModal(); return; }
  if (e.key === 'Tab') {
    const f = modalFocusables();
    if (!f.length) return;
    const first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
});

function toast(msg) {
  const root = $('#toastRoot');
  const el = document.createElement('div');
  el.className = 'toast';
  el.innerHTML = '<span class="dot">✓</span><span>' + esc(msg) + '</span>';
  root.appendChild(el);
  setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 320); }, 2800);
}

/* ---------- 顶栏 ---------- */
function renderHeader() {
  document.documentElement.lang = uiLocale();
  document.documentElement.dir = (['ar', 'fa'].includes(state.lang) ? 'rtl' : 'ltr');
  $('#langSwitch').innerHTML = '<div class="lang-switch" role="group" aria-label="Language / 语言">'
    + '<button type="button" class="lang-btn ' + (state.lang === 'zh' ? 'on' : '') + '" data-action="set-lang" data-lang="zh" aria-pressed="' + (state.lang === 'zh') + '">中文</button>'
    + '<button type="button" class="lang-btn ' + (state.lang === 'en' ? 'on' : '') + '" data-action="set-lang" data-lang="en" aria-pressed="' + (state.lang === 'en') + '">EN</button>'
    + '<button type="button" class="lang-btn lang-btn--more' + (LANG_META.some(m => m.code !== 'zh' && m.code !== 'en' && m.code === state.lang) ? ' on' : '') + '"  data-action="lang-more" title="' + t('otherLang') + '" aria-pressed="' + LANG_META.some(m => m.code !== 'zh' && m.code !== 'en' && m.code === state.lang) + '">' + t('otherLang') + ' <span class="lang-caret">▾</span></button>'
    + '</div>';
  applyStaticI18n();
  const { path } = parseHash();
  $$('.main-nav a').forEach(a => {
    const href = a.getAttribute('href').slice(1);
    const active =
      (path === href) ||
      (href === '/products' && (path === '/product' || path.indexOf('/product/') === 0)) ||
      (href === '/dashboard' && (path === '/dashboard' || path.indexOf('/dashboard/') === 0)) ||
      (href === '/news' && path.indexOf('/news') === 0) ||
      (href === '/guide' && path.indexOf('/guide') === 0) ||
      (href === '/customs' && path.indexOf('/customs') === 0) ||
      (href === '/recruit' && path.indexOf('/recruit') === 0);
    a.classList.toggle('active', active);
  });
  const fc = $('#favCount');
  fc.textContent = state.favorites.length;
  fc.hidden = state.favorites.length === 0;
  const ua = $('#userArea');
  const u = state.user;
  let bellHtml = '';
  if (u) {
    const notifRows = (state.notifications || []).filter(n => u.role === 'admin' || n.toUserId === u.id).slice(0, 5);
    const unreadN = notifRows.filter(n => !n.read).length;
    bellHtml = '<div class="notif-wrap">'
      + '<button type="button" class="icon-btn notif-btn" data-action="notif-toggle" aria-label="' + t('notificationsTitle') + '" aria-expanded="false">' + icon('bell')
      + (unreadN ? '<span class="badge-dot notif-badge">' + unreadN + '</span>' : '') + '</button>'
      + '<div class="notif-panel" id="notifPanel" hidden>'
      + (notifRows.length
        ? notifRows.map(n => '<div class="notif-row' + (n.read ? ' read' : '') + '"' + (n.link ? ' data-nav="' + esc(n.link) + '"' : '') + '>'
          + '<b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p><span class="small muted">' + fmtDate(n.createdAt) + '</span></div>').join('')
        : '<p class="small muted">' + t('notificationsEmpty') + '</p>')
      + '<button type="button" class="btn btn-sm btn-block" data-action="notif-read-all">' + t('markAllRead') + '</button>'
      + '</div></div>';
  }
  if (u) {
    ua.innerHTML = bellHtml +
      '<button type="button" class="user-chip" data-action="toggle-user-menu" aria-haspopup="true" aria-expanded="false" title="' + esc(u.email || u.name || '') + '">'
      + '<span class="avatar">' + esc(String(u.name || '?')[0].toUpperCase()) + '</span>'
      + '<span>' + esc(u.name) + '</span>'
      + '<span class="role-tag">' + (u.role === 'seller' ? t('roleSeller') : u.role === 'admin' ? t('adminRoleTag') : t('roleBuyer')) + '</span>'
      + '</button>'
      + '<div class="user-menu" id="userMenu" hidden role="menu">'
            + '<div class="user-menu-head"><b>' + esc(u.name || '') + '</b><span class="small muted oneline">' + esc(u.email || '') + '</span></div>'
            + '<a role="menuitem" href="#/dashboard/profile" data-nav="/dashboard/profile">' + icon('users') + t('profileTab') + '</a>'
            + '<a role="menuitem" href="#/dashboard/inquiries" data-nav="/dashboard/inquiries">' + icon('message') + t('myInquiries') + '</a>'
            + '<a role="menuitem" href="#/dashboard/favorites" data-nav="/dashboard/favorites">' + icon('sparkle') + t('favorite') + '</a>'
            + '<a role="menuitem" href="#/dashboard" data-nav="/dashboard">' + icon('box') + t('dashboard') + '</a>'
            + '<button type="button" role="menuitem" class="user-menu-out" data-action="logout">' + icon('log') + t('logout') + '</button>'
            + '</div>'
      ;
  } else {
    ua.innerHTML = '<a class="btn btn-sm btn-primary" href="#/login">' + t('login') + '</a>';
  }
}

/* 首次访问引导条：默认英文展示，并提示选择语言 */
function renderFirstVisitHint() {
  const old = $('#langHint');
  if (old) old.remove();
  if (!state.firstVisit) return;
  const bar = document.createElement('div');
  bar.id = 'langHint';
  bar.className = 'lang-hint';
  bar.innerHTML = '<div class="lang-hint-inner">'
    + '<span class="lang-hint-ico">🌐</span>'
    + '<div class="lang-hint-txt"><b>' + esc(t('firstVisitTitle')) + '</b> ' + esc(t('firstVisitDesc')) + '</div>'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="lang-more">' + esc(t('chooseLang')) + '</button>'
    + '<button type="button" class="btn btn-sm" data-action="dismiss-lang-hint">' + esc(t('gotIt')) + '</button>'
    + '</div>';
  document.body.insertBefore(bar, document.body.firstChild);
}

/* 语言选择弹窗：列出全部支持语言 + 跟随浏览器语言 */
function openLangModal() {
  const items = LANG_META.map(m =>
    '<button type="button" class="lang-opt' + (state.lang === m.code ? ' on' : '') + '" data-action="set-lang" data-lang="' + m.code + '">'
    + '<span class="lang-flag">' + flagEmoji(m.flag) + '</span>'
    + '<span class="lang-name">' + esc(m.local) + '</span>'
    + '<span class="lang-code">' + m.code.toUpperCase() + '</span>'
    + '</button>').join('');
  showModal(
    '<div class="modal-head"><h3>🌐 ' + t('chooseLang') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<button type="button" class="lang-auto" data-action="lang-auto">🖥 ' + t('langAuto') + '<span class="lang-code">' + esc(detectBrowserLang().toUpperCase()) + '</span></button>'
    + '<div class="lang-grid">' + items + '</div>'
    + '<p class="small muted lang-note">' + t('langNote') + '</p>'
    + '</div>'
  );
}

/* 静态文案（导航/页脚）随语言切换 */
function applyStaticI18n() {
  $$('[data-i18n]').forEach(el => {
    const k = el.dataset.i18n;
    const v = t(k);
    if (v !== k) el.textContent = v;
  });
}

/* ---------- Turnstile：动态挂载（pet0.2）---------- */
function mountTurnstile(attempt) {
  attempt = attempt || 0;
  if (!window.__TURNSTILE_KEY__) return;           // 没配 Site Key 就什么都不做
  const el = document.querySelector('.cf-turnstile');
  if (!el || el.dataset.mounted) return;           // 当前弹窗里没有该容器，或已挂载过
  if (!window.turnstile) {
    /* 官方脚本是 async defer，可能还没就绪；最多重试 20 次（约 6 秒） */
    if (attempt < 20) setTimeout(function () { mountTurnstile(attempt + 1); }, 300);
    return;
  }
  el.dataset.mounted = '1';
  const hidden = el.parentElement ? el.parentElement.querySelector('input[name="turnstileToken"]') : null;
  try {
    window.turnstile.render(el, {
      sitekey: window.__TURNSTILE_KEY__,
      callback: function (token) { if (hidden) hidden.value = token; },
      'error-callback': function () { if (hidden) hidden.value = ''; },
      'expired-callback': function () { if (hidden) hidden.value = ''; }
    });
  } catch (e) {
    console.warn('[turnstile] render 失败：' + (e && e.message));
  }
}
