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
  try { localStorage.setItem(CONTENT_CACHE_KEY, JSON.stringify(contentCache)); } catch (e) { /* 忽略 */ }
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
const SITE_PARTNER_EMAIL = 'partner@beanbeanmouse.com';
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
    if (s && Array.isArray(s.products) && s.products.length && s.inquiries && s.favorites) return s;
  } catch (e) { /* 忽略并重建 */ }
  const fresh = seedDemoData();
  api.storage.setState(fresh);
  return fresh;
}

let state = loadState();

function saveState() {
  api.storage.setState(state);
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
  if (!state.tipDismissed || typeof state.tipDismissed !== 'object') { state.tipDismissed = {}; changed = true; }
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
  try { localStorage.setItem(TRANS_CACHE_KEY, JSON.stringify(transCache)); } catch (e) { /* 忽略 */ }
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

async function translateViaLibre(text, target) {
  const instances = [
    'https://libretranslate.com/translate',
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

/* 真实翻译主流程：缓存 → MyMemory → LibreTranslate → 离线词典 */
async function realTranslate(text, target) {
  const s = String(text || '').trim();
  if (!s) return { text: '', mode: '' };
  const tgt = providerLang(target);
  const src = detectSource(s);
  if (tgt === src) return { text: s, mode: 'same' };
  const key = src + '>' + tgt + ':' + s;
  if (transCache[key]) return { text: transCache[key], mode: 'cache' };
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
  else if (f.dataset.form === 'register-form') p = submitRegister(f);
  else if (f.dataset.form === 'company-form') p = submitCompanyForm(f);
  else if (f.dataset.form === 'catreq-form') p = submitCatReqForm(f);
  else if (f.dataset.form === 'shipment-create-form') p = submitShipmentCreate(f);
  else if (f.dataset.form === 'shipment-event-form') p = submitShipmentEvent(f);
  else if (f.dataset.form === 'promo-form') p = submitPromo(f);
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
    case 'dismiss-trial': {
      try { localStorage.setItem(TRIAL_DISMISS_KEY, '1'); } catch (e) { /* 忽略 */ }
      const b = document.getElementById('trialBanner');
      if (b) b.hidden = true;
      break;
    }
    case 'logout': logout(false); break;
    case 'switch-role': logout(false, true); break;
    case 'go-dashboard': go('/dashboard'); break;
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
  if (u) {
    ua.innerHTML =
      '<button type="button" class="user-chip" data-action="go-dashboard">'
      + '<span class="avatar">' + esc(u.name[0].toUpperCase()) + '</span>'
      + '<span>' + esc(u.name) + '</span>'
      + '<span class="role-tag">' + (u.role === 'seller' ? (state.lang === 'zh' ? '卖家' : 'Seller') : u.role === 'admin' ? t('adminRoleTag') : (state.lang === 'zh' ? '买家' : 'Buyer')) + '</span>'
      + '</button>'
      + '<button type="button" class="icon-btn" data-action="logout" title="' + t('logout') + '" aria-label="' + t('logout') + '">' + icon('logout') + '</button>';
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

/* ---------- 防伪验证 ---------- */
function fakeChecksum(str) {
  let s = 0;
  for (const ch of String(str || '')) s = (s * 31 + ch.charCodeAt(0)) % 97;
  return String(s).padStart(2, '0');
}

/* 每个产品一个确定性防伪码，正式版可由权威验真机构签发 */
function fakeCodeOf(p) {
  if (!p) return '';
  const pid = String(p.id).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const seed = p.id + ':' + p.sellerId + ':' + (p.en ? p.en.title : '');
  return 'BBM-' + pid + '-' + fakeChecksum(seed);
}

function productByFakeCode(code) {
  const c = String(code || '').trim().toUpperCase();
  return state.products.find(p => fakeCodeOf(p) === c);
}

/* 由防伪码生成的演示用“扫码”图案 */
function fakeQrSvg(seed) {
  const n = 9, cell = 3;
  let h = 0;
  for (const ch of String(seed || '')) h = (h * 131 + ch.charCodeAt(0)) >>> 0;
  const bits = [];
  for (let i = 0; i < n * n; i++) {
    h = (h * 1103515245 + 12345) >>> 0;
    bits.push((h >> 16) & 1);
  }
  const set = (x, y) => { if (x >= 0 && y >= 0 && x < n && y < n) bits[y * n + x] = 1; };
  [[0, 0], [n - 1, 0], [0, n - 1]].forEach(([cx, cy]) => {
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) set(cx + dx, cy + dy);
  });
  let rects = '';
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (bits[y * n + x]) rects += '<rect x="' + (x * cell) + '" y="' + (y * cell) + '" width="' + cell + '" height="' + cell + '"/>';
  return '<svg viewBox="0 0 ' + (n * cell) + ' ' + (n * cell) + '" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="QR">' + rects + '</svg>';
}

function openFakeCheck() {
  showModal(
    '<div class="modal-head"><h3>🛡 ' + t('fakeCheck') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<p class="small muted">' + t('fakeEnter') + '</p>'
    + '<div class="input-group"><input class="input" id="fakeCodeInput" placeholder="' + t('fakePlaceholder') + '" style="text-transform:uppercase"><button type="button" class="btn btn-primary" data-action="fake-verify">' + t('fakeVerify') + '</button></div>'
    + '<p class="small muted fake-hint">' + t('fakeHint') + '</p>'
    + '<div class="fake-demo-list">' + state.products.slice(0, 5).map(p => '<button type="button" class="chip fake-chip" data-action="verify-product" data-id="' + p.id + '" title="' + esc(langObj(p).title) + '">' + fakeCodeOf(p) + '</button>').join('') + '</div>'
    + '<p class="small muted">' + t('fakeScanNote') + '</p>'
    + '</div>'
  );
}

function showFakeResult(p, code) {
  const seller = sellerOf(p);
  closeModal();
  showModal(
    '<div class="modal-head"><h3>🛡 ' + t('fakeOkTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body fake-result">'
    + '<div class="fake-ico fake-ico--ok">✓</div>'
    + '<p class="fake-genuine">' + t('fakeGenuine') + '</p>'
    + '<div class="fake-row"><span>' + t('fakeCode') + '</span><b class="fake-code">' + esc(code) + '</b></div>'
    + '<div class="fake-row"><span>' + t('fakeProduct') + '</span><b>' + esc(langObj(p).title) + '</b></div>'
    + '<div class="fake-row"><span>' + t('fakeSeller') + '</span><b>' + esc(langObj(seller).company) + (isVerifiedSeller(p.sellerId) ? ' ✅' : '') + '</b></div>'
    + '<div class="fake-row"><span>' + t('fakeIssued') + '</span><b>BeanBeanMouse</b></div>'
    + '<div class="fake-row"><span>' + t('fakeVerifiedAt') + '</span><b>' + fmtDate(Date.now()) + '</b></div>'
    + '<div class="fake-qr">' + fakeQrSvg(code + p.id) + '</div>'
    + '<p class="small muted fake-scan-label">' + t('fakeScan') + '</p>'
    + '<p class="small muted">' + t('fakeInfo') + '</p>'
    + '</div>'
  );
}

function openSiteVerify() {
  showModal(
    '<div class="modal-head"><h3>🛡 ' + t('fakeSiteTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body fake-result">'
    + '<div class="fake-ico fake-ico--ok">✓</div>'
    + '<p class="fake-genuine">BeanBeanMouse · ' + t('fakeSiteTitle') + '</p>'
    + '<div class="fake-row"><span>' + t('fakeSiteCode') + '</span><b class="fake-code">BBM-OFFICIAL-2026</b></div>'
    + '<div class="fake-row"><span>' + t('fakeDomain') + '</span><b>beanbeanmouse.com</b></div>'
    + '<p class="small muted">' + t('fakeSiteDesc') + '</p>'
    + '<p class="small muted">' + t('fakeScanNote') + '</p>'
    + '</div>'
  );
}

/* ---------- 收藏 ---------- */
function toggleFav(id) {
  const i = state.favorites.indexOf(id);
  if (i >= 0) state.favorites.splice(i, 1);
  else state.favorites.push(id);
  saveState();
  renderHeader();
  const { path } = parseHash();
  if (path.indexOf('/product/') === 0 || path === '/dashboard' || path.indexOf('/dashboard/') === 0) render();
  else renderPage();
}

/* ---------- 登录 / 登出 ---------- */
function loginAs(role) {
  const rec = (state.users || []).find(x => x.id === DEMO_USERS[role].id);
  if (rec && rec.status === 'frozen') { toast(t('frozenBlocked')); return; }
  state.user = JSON.parse(JSON.stringify(DEMO_USERS[role]));
  saveState();
  toast(state.lang === 'zh' ? '已登录：' + state.user.name : 'Signed in: ' + state.user.name);
  go('/dashboard');
}
function logout(guest, goLogin) {
  state.user = null;
  saveState();
  toast(guest ? t('guestName') : (state.lang === 'zh' ? '已退出登录' : 'Signed out'));
  go(goLogin ? '/login' : '/');
}

/* 标语一行自适应：无论语言多长都保持一行，过长自动缩小字号 */
function fitHeroTitle() {
  const h = document.querySelector('.hero h1');
  if (!h) return;
  h.style.fontSize = '';
  const avail = Math.max(80, h.parentElement.clientWidth - 40);
  let fs = parseFloat(window.getComputedStyle(h).fontSize) || 38;
  h.style.fontSize = fs + 'px';
  while (h.scrollWidth > avail && fs > 11) {
    fs -= 0.5;
    h.style.fontSize = fs + 'px';
  }
}

/* ---------- 主渲染 ---------- */
function render() {
  renderHeader();
  renderFirstVisitHint();
  const { path, params } = parseHash();
  const app = $('#app');
  if (path === '' || path === '/') app.innerHTML = renderHome();
  else if (path === '/products') { app.innerHTML = renderProducts(params); bindProductsPage(); }
  else if (path === '/news') { app.innerHTML = renderNews(params); bindNewsPage(); }
  else if (path === '/guide') { app.innerHTML = renderGuide(); }
  else if (path === '/customs') { app.innerHTML = renderCustoms(); }
  else if (path === '/recruit') { app.innerHTML = renderRecruit(); }
  else if (path === '/insurance') { app.innerHTML = renderInsurance(); bindInsurancePage(); }
  else if (path === '/contracts') { app.innerHTML = renderContracts(); }
  else if (path.indexOf('/product/') === 0) app.innerHTML = renderDetail(path.slice(9));
  else if (path === '/login') app.innerHTML = renderLogin();
  else if (path === '/dashboard' || path.indexOf('/dashboard/') === 0) app.innerHTML = renderDashboard(path);
  else app.innerHTML = renderHome();
  applyViewerLang(app);
  if (path === '' || path === '/') fitHeroTitle();
  window.scrollTo(0, 0);
}

function renderPage() {
  render();
}

/* ---------- 产品卡片 ---------- */
function productCard(p) {
  const fav = state.favorites.includes(p.id);
  const seller = sellerOf(p);
  const certs = (p.certs || []).slice(0, 2);
  return '<article class="product-card" data-action="open-product" data-id="' + p.id + '">'
    + '<div class="thumb">'
    + (p.hot ? '<span class="badge">' + t('hot') + '</span>' : '')
    + (p.promoted ? '<span class="badge promo">' + t('promoBadge') + '</span>' : '')
    + (p.featured && !p.hot ? '<span class="badge new">★</span>' : '')
    + '<img src="' + productImg(p) + '" alt="' + esc(langObj(p).title) + '" loading="lazy">'
    + '<button type="button" class="fav-btn ' + (fav ? 'on' : '') + '" data-action="toggle-fav" data-id="' + p.id + '" aria-label="' + t('favorite') + '">' + icon(fav ? 'heart' : 'heart', fav ? 'fill' : '') + '</button>'
    + '</div>'
    + '<div class="body">'
    + '<h3 class="title"' + l10nAttrs(p.id, 'title', baseContentLang(p), viewProductText(p, 'title')) + '>' + esc(viewProductText(p, 'title')) + '</h3>'
    + '<div class="meta">'
    + (isVerifiedSeller(p.sellerId) ? '<span class="badge verified">' + icon('shield') + t('verified') + '</span>' : '')
    + '<span class="stars">★★★★★</span><span class="rating-num">' + p.rating.toFixed(1) + '</span>'
    + '</div>'
    + '<div class="price-row">'
    + '<span class="price"><span class="cur">$</span>' + fmtPrice(p.priceMin) + '</span>'
    + (p.priceMax > p.priceMin ? '<span class="range-sep">–</span><span class="price"><span class="cur">$</span>' + fmtPrice(p.priceMax) + '</span>' : '')
    + '<span class="moq-tag">' + t('moqLabel') + ' ' + p.moq + ' ' + p.unit + '</span>'
    + '</div>'
    + '<div class="meta">'
    + (subLabel(p) ? '<span class="chip sub-chip">' + esc(subLabel(p)) + '</span>' : '')
    + '<span class="flag">' + flagEmoji(p.country) + '</span><span>' + countryName(p.country) + '</span>'
    + certs.map(c => '<span class="chip cert">' + esc(c) + '</span>').join('')
    + '</div>'
    + '</div>'
    + '<div class="foot">'
    + '<span class="seller-mini"><span class="avatar" style="width:22px;height:22px;font-size:10px">' + esc(initialsOf(langObj(seller).company)) + '</span>' + esc(langObj(seller).company) + '</span>'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="open-inquiry" data-id="' + p.id + '">' + icon('message') + t('sendInquiry') + '</button>'
    + '</div>'
    + '</article>';
}

/* ---------- 首页 ---------- */
const HELP_ITEMS = {
  zh: [
    ['浏览产品', '进入「产品市场」，按行业、价格、产地、认证筛选，点击卡片查看详情。'],
    ['发送询盘', '在详情页填写数量和需求发送询盘，供应商会通过站内消息和邮件回复。'],
    ['卖家发布', '进入「工作台」发布产品，填写规格与价格，平台审核通过后上架。'],
    ['平台管理', '管理员可在产品审核、企业认证、用户管理、审计日志中完成日常管理。'],
    ['语言与翻译', '右上角可切换语言；对话和详情页支持实时翻译（仅供参考）。'],
    ['防伪查询', '页脚「防伪查询」输入防伪码验真；「验证本站真伪」可识别钓鱼网站。'],
    ['文档打印', '报价单与形式发票按国际通行格式生成，支持打印或另存为 PDF。'],
    ['贸易资讯', '按你关注的区域聚合权威政策，每条资讯附可查询的官方来源。'],
    ['贸易流程参考', '从询盘到售后的规范流程、贸易术语与风险提示，帮助新手安全完成跨国交易。']
  ],
  en: [
    ['Browse products', 'Go to Products, filter by category, price, origin and certification, then click a card for details.'],
    ['Send an inquiry', 'Fill in quantity and needs on the detail page; suppliers reply via in-app messages and email.'],
    ['Seller publishing', 'Dashboard -> Publish product, add specs and price; it goes live after platform review.'],
    ['Platform admin', 'Admins manage product review, company verification, users and audit logs.'],
    ['Language & translation', 'Switch language at the top-right; live translation is available in chats and details (for reference only).'],
    ['Anti-counterfeit', 'Use Anti-counterfeit Query in the footer to verify codes; Verify This Site detects phishing.'],
    ['Documents', 'Quotations and proforma invoices follow international formats and support print / save as PDF.'],
    ['Trade news', 'Aggregated by your followed regions; every item links to an official source.'],
    ['Trade process guide', 'Standard flow from inquiry to after-sales, Incoterms and risk alerts to help you trade safely.']
  ]
};
function helpLocale() { return state.lang === 'zh' ? 'zh' : 'en'; }
function renderHelpContent() {
  $('#helpTitle').textContent = helpLocale() === 'zh' ? '网站使用帮助' : 'Site help';
  $('#helpBody').innerHTML = HELP_ITEMS[helpLocale()]
    .map(([title, desc]) => '<div class="help-item"><b>' + esc(title) + '</b><p>' + esc(desc) + '</p></div>')
    .join('');
}
function toggleHelp() {
  const panel = $('#helpPanel');
  const btn = document.querySelector('.help-btn');
  if (panel.hidden) { renderHelpContent(); panel.hidden = false; }
  else panel.hidden = true;
  if (btn) btn.setAttribute('aria-expanded', String(!panel.hidden));
}
function closeHelp() {
  $('#helpPanel').hidden = true;
  const btn = document.querySelector('.help-btn');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}

function renderHome() {
  document.title = 'BeanBeanMouse · ' + t('heroTitle');
  const live = state.products.filter(isLive);
  const featured = live.filter(p => p.featured || p.promoted).sort((a, b) => (b.promoted ? 1 : 0) - (a.promoted ? 1 : 0)).slice(0, 6);
  const hotKw = state.lang === 'zh'
    ? ['激光切割机', '氮化镓充电器', '柚木家具', '柠檬酸', '充电枪']
    : ['laser cutter', 'GaN charger', 'teak furniture', 'citric acid', 'EV cable'];
  const catEmoji = { machinery: '⚙️', electronics: '💡', textiles: '👕', furniture: '🛋️', chemicals: '🧪', auto: '🚗' };
  return '<section class="hero">'
    + '<div class="hero-inner">'
    + '<h1>' + t('heroTitle') + '</h1>'
    + '<p>' + t('heroSub') + '</p>'
    + '<form class="hero-search" data-form="home-search">'
    + '<input type="search" id="homeKw" placeholder="' + t('searchPlaceholder') + '" aria-label="' + t('searchPlaceholder') + '">'
    + '<button type="submit" class="btn btn-accent">' + icon('search') + t('searchPlaceholder').split('，')[0] + '</button>'
    + '</form>'
    + '<div class="hero-popular">' + t('popular') + hotKw.map(k => '<a href="#/products?kw=' + encodeURIComponent(k) + '" data-nav="/products?kw=' + encodeURIComponent(k) + '">' + esc(k) + '</a>').join('') + '</div>'
    + '</div>'
    /* 预留：今日交易成功案例实时滚动条（后续接入实时数据流后替换此占位） */
    + '<div class="hero-deals" id="heroDeals"><span class="hero-deals-hint">' + (state.lang === 'zh' ? '今日交易成功案例 · 实时滚动（预留）' : 'Today\'s closed deals · live ticker (reserved)') + '</span></div>'
    + '</section>'
    + '<div class="container page">'
    + '<section class="section"><div class="section-head"><h2>' + t('categoriesTitle') + '</h2><a href="#/products" class="small" data-nav="/products">' + t('viewAll') + ' →</a></div>'
    + '<div class="cat-grid">' + CATEGORIES.map(c => {
      const count = live.filter(p => p.cat === c.id).length;
      return '<a class="cat-card" href="#/products?cat=' + c.id + '" data-nav="/products?cat=' + c.id + '">'
        + '<div class="cat-ico" style="background:linear-gradient(135deg,hsl(' + c.hue + ' 70% 52%),hsl(' + ((c.hue + 45) % 360) + ' 65% 38%))">' + (catEmoji[c.id] || '📦') + '</div>'
        + '<div class="name">' + langObj(c) + '</div>'
        + '<div class="count">' + count + ' ' + t('totalProducts') + '</div>'
        + '</a>';
    }).join('') + '</div></section>'
    + '<section class="section"><div class="section-head"><h2>' + t('featuredTitle') + '</h2><a href="#/products" class="small" data-nav="/products">' + t('viewAll') + ' →</a></div>'
    + '<div class="product-grid">' + featured.map(productCard).join('') + '</div></section>'
    + '<div class="cta-band">'
    + '<div><h2>' + t('sellerCtaTitle') + '</h2><p>' + t('sellerCtaDesc') + '</p></div>'
    + '<a class="btn btn-accent btn-lg" href="#/dashboard" data-nav="/dashboard">' + icon('sparkle') + t('sellerCtaBtn') + '</a>'
    + '</div>'
    + '</div>';
}

/* ---------- 产品市场 ---------- */
function renderProducts(params) {
  document.title = t('marketplace') + ' · BeanBeanMouse';
  const kw = (params.get('kw') || '').trim();
  const cat = params.get('cat') || '';
  const sort = params.get('sort') || 'recommended';
  const min = params.get('min') ? +params.get('min') : null;
  const max = params.get('max') ? +params.get('max') : null;
  const moqMin = params.get('moq') ? +params.get('moq') : null;
  const origin = params.get('origin') || '';
  const certs = (params.get('certs') || '').split(',').filter(Boolean);
  const origins = Array.from(new Set(state.products.filter(isLive).map(p => p.country)));

  let list = state.products.filter(isLive);
  if (kw) {
    const k = kw.toLowerCase();
    list = list.filter(p => p.en.title.toLowerCase().includes(k) || p.zh.title.includes(kw) || p.en.desc.toLowerCase().includes(k) || p.zh.desc.includes(kw));
  }
  if (cat) list = list.filter(p => p.cat === cat);
  if (min != null) list = list.filter(p => p.priceMax >= min);
  if (max != null) list = list.filter(p => p.priceMin <= max);
  if (moqMin != null) list = list.filter(p => p.moq >= moqMin);
  if (origin) list = list.filter(p => p.country === origin);
  if (certs.length) list = list.filter(p => (p.certs || []).some(c => certs.includes(c)));

  if (sort === 'newest') list = [...list].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
  else if (sort === 'priceAsc') list = [...list].sort((a, b) => a.priceMin - b.priceMin);
  else if (sort === 'priceDesc') list = [...list].sort((a, b) => b.priceMax - a.priceMax);
  else list = [...list].sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0) || b.rating - a.rating);

  const chips = [];
  if (kw) chips.push('<span class="active-filter" data-action="remove-filter" data-key="kw">' + esc(kw) + ' ✕</span>');
  if (cat) chips.push('<span class="active-filter" data-action="remove-filter" data-key="cat">' + esc(langObj(catById(cat))) + ' ✕</span>');
  if (min != null || max != null) chips.push('<span class="active-filter" data-action="remove-filter" data-key="minmax">$' + (min != null ? min : '0') + '–' + (max != null ? max : '∞') + ' ✕</span>');
  if (moqMin != null) chips.push('<span class="active-filter" data-action="remove-filter" data-key="moq">MOQ ≥ ' + moqMin + ' ✕</span>');
  if (origin) chips.push('<span class="active-filter" data-action="remove-filter" data-key="origin">' + esc(countryName(origin)) + ' ✕</span>');
  certs.forEach(c => chips.push('<span class="active-filter" data-action="remove-filter" data-key="certs" data-value="' + esc(c) + '">' + esc(c) + ' ✕</span>'));

  const grid = list.length
    ? '<div class="product-grid">' + list.map(productCard).join('') + '</div>'
    : '<div class="empty-state"><div class="ico">🔎</div><h3>' + t('noResults') + '</h3><p>' + t('noResultsHint') + '</p></div>';

  return '<div class="container page">'
    + '<div class="page-head">'
    + '<h1>' + (kw ? t('searchResultsFor', { kw }) : t('marketplace')) + '</h1>'
    + '<div class="sub">' + t('statsProducts') + ' · ' + state.products.filter(isLive).length + '+</div>'
    + '</div>'
    + '<div class="products-layout">'
    + '<aside class="card filter-panel" id="filterPanel">'
    + '<h3>' + icon('filter') + t('filters') + '</h3>'
    + '<div class="filter-group"><h4>' + t('category') + '</h4><div class="radio-row">'
    + '<label class="' + (cat === '' ? 'active' : '') + '"><input type="radio" name="cat" value="" ' + (cat === '' ? 'checked' : '') + '>' + t('allCategories') + '</label>'
    + CATEGORIES.map(c => '<label class="' + (cat === c.id ? 'active' : '') + '"><input type="radio" name="cat" value="' + c.id + '" ' + (cat === c.id ? 'checked' : '') + '>' + langObj(c) + '</label>').join('')
    + '</div></div>'
    + '<div class="filter-group"><h4>' + t('priceRange') + '</h4>'
    + '<div class="input-group"><input class="input" type="number" min="0" id="priceMin" placeholder="' + t('minPrice') + '" value="' + (min != null ? min : '') + '"><span class="sep">–</span><input class="input" type="number" min="0" id="priceMax" placeholder="' + t('maxPrice') + '" value="' + (max != null ? max : '') + '"></div>'
    + '</div>'
    + '<div class="filter-group"><h4>' + t('moq') + '</h4><input class="input" type="number" min="0" id="moqFilter" placeholder="' + t('anyMoq') + '" value="' + (moqMin != null ? moqMin : '') + '"></div>'
    + '<div class="filter-group"><h4>' + t('origin') + '</h4><select class="select" id="originFilter">'
    + '<option value="">' + t('allCountries') + '</option>'
    + origins.map(o => '<option value="' + o + '" ' + (origin === o ? 'selected' : '') + '>' + flagEmoji(o) + ' ' + countryName(o) + '</option>').join('')
    + '</select></div>'
    + '<div class="filter-group"><h4>' + t('certs') + '</h4><div class="check-group">'
    + CERT_LIST.map(c => '<label class="check-pill"><input type="checkbox" value="' + c + '" data-cert="' + c + '" ' + (certs.includes(c) ? 'checked' : '') + '>' + c + '</label>').join('')
    + '</div></div>'
    + '<div class="filter-actions"><button type="button" class="btn btn-sm btn-block" data-action="clear-filters">' + t('clearFilters') + '</button></div>'
    + '</aside>'
    + '<div>'
    + '<div class="results-bar">'
    + '<span class="results-count"><b>' + list.length + '</b> ' + t('resultsCount') + '</span>'
    + (chips.length ? '<div class="flex items-center gap-10">' + chips.join('') + '</div>' : '')
    + '<select class="select sort-select" id="sortSel" style="margin-left:auto">'
    + '<option value="recommended" ' + (sort === 'recommended' ? 'selected' : '') + '>' + t('sortRecommended') + '</option>'
    + '<option value="newest" ' + (sort === 'newest' ? 'selected' : '') + '>' + t('sortNewest') + '</option>'
    + '<option value="priceAsc" ' + (sort === 'priceAsc' ? 'selected' : '') + '>' + t('sortPriceAsc') + '</option>'
    + '<option value="priceDesc" ' + (sort === 'priceDesc' ? 'selected' : '') + '>' + t('sortPriceDesc') + '</option>'
    + '</select>'
    + '<button type="button" class="btn btn-sm" data-action="catreq-open" style="margin-left:10px">🙋 ' + t('categoryRequestBtn') + '</button>'
    + '</div>'
    + grid
    + '</div>'
    + '</div></div>';
}

function bindProductsPage() {
  const panel = $('#filterPanel');
  if (!panel) return;
  panel.querySelectorAll('input[name="cat"]').forEach(r => r.addEventListener('change', () => setFilter('cat', r.value)));
  const pm = $('#priceMin'), px = $('#priceMax'), mq = $('#moqFilter'), or = $('#originFilter'), so = $('#sortSel');
  if (pm) pm.addEventListener('change', e => setFilter('min', e.target.value));
  if (px) px.addEventListener('change', e => setFilter('max', e.target.value));
  if (mq) mq.addEventListener('change', e => setFilter('moq', e.target.value));
  if (or) or.addEventListener('change', e => setFilter('origin', e.target.value));
  if (so) so.addEventListener('change', e => setFilter('sort', e.target.value));
  panel.querySelectorAll('input[data-cert]').forEach(cb => cb.addEventListener('change', () => {
    const checked = panel.querySelectorAll('input[data-cert]:checked');
    setFilter('certs', Array.from(checked).map(c => c.value).join(','));
  }));
}

function setFilter(key, value) {
  const { params } = parseHash();
  if (value === '' || value == null) params.delete(key);
  else params.set(key, value);
  const qs = params.toString();
  location.hash = '#/products' + (qs ? '?' + qs : '');
}

function removeFilter(key, value) {
  const { params } = parseHash();
  if (key === 'certs') {
    const arr = (params.get('certs') || '').split(',').filter(Boolean).filter(c => c !== value);
    if (arr.length) params.set('certs', arr.join(','));
    else params.delete('certs');
  } else if (key === 'minmax') {
    params.delete('min'); params.delete('max');
  } else {
    params.delete(key);
  }
  const qs = params.toString();
  location.hash = '#/products' + (qs ? '?' + qs : '');
}

/* ---------- 贸易资讯 ---------- */
function fxStrip() {
  return '<div class="fx-strip"><span class="fx-label">' + icon('globe') + ' ' + t('fxReference') + ' (' + FX_RATES.date + ')：</span>'
    + '<span>USD/CNY ' + FX_RATES.USD_CNY + '</span><span>USD/EUR ' + FX_RATES.USD_EUR + '</span>'
    + '<span>USD/JPY ' + FX_RATES.USD_JPY + '</span><span>USD/GBP ' + FX_RATES.USD_GBP + '</span>'
    + '<span class="fx-note">' + t('fxNote') + '</span></div>';
}

function newsCard(n) {
  const cat = NEWS_CATS.find(c => c.id === n.cat);
  const region = NEWS_REGIONS.find(r => r.id === n.region);
  return '<article class="news-card">'
    + '<div class="news-top">'
    + '<span class="chip ' + (n.highlight ? 'chip-hot' : '') + '">' + esc(cat ? langObj(cat) : n.cat) + '</span>'
    + '<span class="chip">' + esc(region ? langObj(region) : n.region) + '</span>'
    + '<span class="news-date">' + n.date + '</span>'
    + '</div>'
    + '<h3' + l10nAttrs(n.id, 'title', 'en', n.en.title) + '>' + esc(langObj(n).title) + '</h3>'
    + '<p' + l10nAttrs(n.id, 'summary', 'en', n.en.summary) + '>' + esc(langObj(n).summary) + '</p>'
    + '<div class="news-foot">'
    + '<span class="news-source">' + t('sourceLabel') + '：<b>' + esc(n.source) + '</b></span>'
    + '<a class="btn btn-sm btn-ghost" href="' + n.sourceUrl + '" target="_blank" rel="noopener noreferrer">' + t('viewSource') + ' ' + icon('external') + '</a>'
    + '</div></article>';
}

function briefCard(n) {
  return '<a class="brief-card" href="' + n.sourceUrl + '" target="_blank" rel="noopener noreferrer">'
    + '<div class="brief-tag">' + t('policyBrief') + '</div>'
    + '<h3' + l10nAttrs(n.id, 'title', 'en', n.en.title) + '>' + esc(langObj(n).title) + '</h3>'
    + '<p' + l10nAttrs(n.id, 'summary', 'en', n.en.summary) + '>' + esc(langObj(n).summary) + '</p>'
    + '<span class="news-source">' + t('sourceLabel') + '：' + esc(n.source) + '</span>'
    + '</a>';
}

function renderNews(params) {
  document.title = t('newsTitle') + ' · BeanBeanMouse';
  const cat = params.get('cat') || 'all';
  const regions = state.newsRegions || ['GLOBAL'];
  const showAll = regions.includes('GLOBAL');
  const briefs = NEWS_ITEMS.filter(n => n.highlight);
  const list = NEWS_ITEMS.filter(n =>
    (cat === 'all' || n.cat === cat) &&
    (showAll || regions.includes(n.region) || n.region === 'GLOBAL')
  );
  return '<div class="container page">'
    + '<div class="page-head"><h1>' + icon('bell') + ' ' + t('newsTitle') + '</h1>'
    + '<div class="sub">' + t('newsSub') + '</div></div>'
    + '<section class="section"><div class="section-head"><h2>' + t('policyBrief') + '</h2></div>'
    + '<div class="brief-grid">' + briefs.map(briefCard).join('') + '</div></section>'
    + '<div class="card panel news-filter">'
    + '<div class="news-filter-row"><span class="filter-label">' + t('newsCatFilter') + '</span>'
    + '<div class="sub-tabs">' + NEWS_CATS.map(c =>
      '<a class="sub-tab ' + (cat === c.id ? 'on' : '') + '" href="#/news?cat=' + c.id + '" data-nav="/news?cat=' + c.id + '">' + langObj(c) + '</a>'
    ).join('') + '</div></div>'
    + '<div class="news-filter-row" id="newsRegionGroup"><span class="filter-label">' + t('newsRegionFilter') + '</span>'
    + '<div class="check-group">' + NEWS_REGIONS.map(r =>
      '<label class="check-pill"><input type="checkbox" name="newsRegion" value="' + r.id + '" ' + (regions.includes(r.id) ? 'checked' : '') + '>' + langObj(r) + '</label>'
    ).join('') + '</div></div>'
    + '<p class="small muted">' + icon('bell') + ' ' + t('newsRegionHint') + '</p>'
    + '</div>'
    + '<div class="news-sync"><span class="status-pill done">● ' + t('newsUpdated') + '</span><span>' + icon('bell') + ' ' + t('newsSyncedAt') + '：' + fmtDate(state.newsSyncedAt) + '</span>'
    + '<button type="button" class="btn btn-sm" data-action="refresh-news">' + icon('refresh') + t('newsRefresh') + '</button></div>'
    + (list.length
      ? '<div class="news-list">' + list.map(newsCard).join('') + '</div>'
      : '<div class="empty-state"><div class="ico">📰</div><p>' + t('noNews') + '</p></div>')
    + '<section class="section mt-20"><div class="section-head"><h2>' + t('sourceDirectory') + '</h2><span class="sub">' + t('sourceDirectorySub') + '</span></div>'
    + '<div class="source-grid">' + SOURCE_DIRECTORY.map(s =>
      '<a class="source-card" href="' + s.url + '" target="_blank" rel="noopener noreferrer">'
      + '<div class="source-name">' + esc(s.name) + ' ' + icon('external') + '</div>'
      + '<div class="source-note">' + esc(langObj(s.note)) + '</div>'
      + '</a>'
    ).join('') + '</div></section>'
    + fxStrip()
    + '<div class="news-integration">' + icon('globe') + ' ' + t('newsIntegration') + '</div>'
    + '<div class="news-disclaimer">ℹ️ ' + t('newsDisclaimer') + '</div>'
    + '</div>';
}

function bindNewsPage() {
  $$('#newsRegionGroup input[name="newsRegion"]').forEach(cb => cb.addEventListener('change', () => {
    const ids = Array.from($$('#newsRegionGroup input[name="newsRegion"]:checked')).map(c => c.value);
    state.newsRegions = ids.length ? ids : ['GLOBAL'];
    saveState();
    renderPage();
  }));
}

/* ---------- 产品详情 ---------- */
function renderDetail(pid) {
  const p = productById(pid);
  if (!p || !isLive(p)) return renderHome();
  document.title = langObj(p).title + ' · BeanBeanMouse';
  const seller = sellerOf(p);
  const cat = catById(p.cat);
  const fav = state.favorites.includes(p.id);
  const variant = (p.hue % 3) || 0;
  const base = baseContentLang(p);
  const srcTitle = (p[base] && p[base].title) || '';
  const srcDesc = (p[base] && p[base].desc) || '';
  const srcFeatures = (p[base] && p[base].features) || [];
  const showSrcBlock = state.lang !== base;
  const thumbs = [0, 1, 2].map(v =>
    '<img src="' + productImg(p, 640, 480, v) + '" alt="' + (v + 1) + '" class="' + (v === variant ? 'on' : '') + '" data-action="gallery" data-id="' + p.id + '" data-v="' + v + '">'
  ).join('');
  return '<div class="container page">'
    + '<nav class="breadcrumb"><a href="#/" data-nav="/">' + t('home') + '</a> / <a href="#/products" data-nav="/products">' + t('marketplace') + '</a> / <a href="#/products?cat=' + p.cat + '" data-nav="/products?cat=' + p.cat + '">' + esc(langObj(cat)) + '</a> / <span>' + esc(langObj(p).title) + '</span></nav>'
    + '<div class="detail-layout">'
    + '<div class="gallery">'
    + '<div class="main-img"><img src="' + productImg(p, 800, 600, variant) + '" alt="' + esc(langObj(p).title) + '" id="mainImg"></div>'
    + '<div class="gallery-thumbs">' + thumbs + '</div>'
    + '</div>'
    + '<div class="card detail-main">'
    + '<h1' + l10nAttrs(p.id, 'title', base, srcTitle) + '>' + esc(viewProductText(p, 'title')) + '</h1>'
    + '<div class="detail-meta">'
    + '<span class="stars">★★★★★</span><span class="rating-num"><b>' + p.rating.toFixed(1) + '</b></span>'
    + '<span>' + flagEmoji(p.country) + ' ' + countryName(p.country) + '</span>'
    + '<span>' + t('orders') + ': ' + p.orders.toLocaleString() + '</span>'
    + (p.hot ? '<span class="badge verified" style="background:var(--accent-050);color:#B45309;border-color:#F3D9A4">🔥 ' + t('hot') + '</span>' : '')
    + '</div>'
    + '<div class="detail-price-row">'
    + '<span class="price"><span class="cur">$</span>' + fmtPrice(p.priceMin) + '</span>'
    + (p.priceMax > p.priceMin ? '<span class="range-sep">–</span><span class="price"><span class="cur">$</span>' + fmtPrice(p.priceMax) + '</span>' : '')
    + '<span class="moq-tag">' + t('priceFrom') + '</span>'
    + '</div>'
    + fxStrip()
    + '<ul class="spec-list">'
    + '<li><span class="k">' + t('moqLabel') + '</span><span class="v">' + p.moq + ' ' + p.unit + '</span></li>'
    + (subLabel(p) ? '<li><span class="k">' + t('categoryField') + '</span><span class="v">' + esc(subLabel(p)) + ' · HS ' + esc(subOf(p).hs) + '</span></li>' : '')
    + '<li><span class="k">' + t('leadTime') + '</span><span class="v">' + p.leadTime + ' ' + t('days') + '</span></li>'
    + '<li><span class="k">' + t('terms') + '</span><span class="v">' + (p.terms || []).join(' / ') + '</span></li>'
    + '<li><span class="k">' + t('hsCode') + '</span><span class="v">' + esc(p.hsCode || t('noHsCode')) + '</span></li>'
    + '<li><span class="k">' + t('certs') + '</span><span class="v">' + ((p.certs || []).join(', ') || '—') + '</span></li>'
    + '<li><span class="k">' + t('originLabel') + '</span><span class="v">' + flagEmoji(p.country) + ' ' + countryName(p.country) + '</span></li>'
    + '</ul>'
    + '<details class="term-legend"><summary>' + icon('file') + ' ' + t('incotermsLegend') + '</summary>'
    + INCOTERMS.map(x => '<div class="term-row"><b>' + x.code + '</b><span>' + esc(langObj(x)) + '</span></div>').join('')
    + '</details>'
    + '<div class="tip-box">' + icon('shield') + ' <b>' + t('complianceTip') + '</b><p>' + t('complianceTipText') + '</p></div>'
    + '<div class="seller-card">'
    + '<span class="avatar" style="width:38px;height:38px;font-size:14px">' + esc(initialsOf(langObj(seller).company)) + '</span>'
    + '<div class="info"><div class="name">' + esc(langObj(seller).company) + (isVerifiedSeller(p.sellerId) ? ' ' + icon('shield') + '<span style="color:var(--success);font-size:12px">' + t('verified') + '</span>' : '') + '</div>'
    + '<div class="sub">' + esc(langObj(seller).city) + ', ' + countryName(seller.country) + ' · ' + t('responseRate') + ' ' + seller.responseRate + '%</div></div>'
    + '</div>'
    + '<div class="detail-actions">'
    + '<button type="button" class="btn btn-primary btn-lg" data-action="open-inquiry" data-id="' + p.id + '" style="flex:1">' + icon('send') + t('sendInquiry') + '</button>'
    + '<button type="button" class="btn btn-lg ' + (fav ? 'on' : '') + '" data-action="toggle-fav" data-id="' + p.id + '" style="color:' + (fav ? 'var(--danger)' : '') + '">' + icon(fav ? 'heart' : 'heart', fav ? 'fill' : '') + ' ' + (fav ? t('favorited') : t('favorite')) + '</button>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '<div class="detail-sections">'
    + '<div class="card detail-block"><h2>' + t('productDetail') + '</h2>'
    + '<p' + l10nAttrs(p.id, 'desc', base, srcDesc) + '>' + esc(viewProductText(p, 'desc')) + '</p>'
    + '<ul class="feature-list">'
    + (langObj(p).features || []).map((f, i) => '<li><span class="tick">✓</span><span' + l10nAttrs(p.id, 'feature' + i, base, srcFeatures[i] || f) + '>' + esc(viewProductText(p, 'features', i)) + '</span></li>').join('')
    + '</ul>'
    + (showSrcBlock
      ? '<details class="src-text"><summary>🌐 ' + t('sourceLang') + '（' + langLabel(base) + '）</summary>'
        + '<div class="src-text-body"><h4>' + esc(srcTitle) + '</h4><p>' + esc(srcDesc) + '</p><ul class="feature-list">'
        + srcFeatures.map(f => '<li><span class="tick">✓</span><span>' + esc(f) + '</span></li>').join('')
        + '</ul></div></details>'
      : '')
    + '</div>'
    + '<div class="card detail-block fake-card"><h2>🛡 ' + t('fakeTitle') + '</h2>'
    + '<div class="fake-card-body">'
    + '<div class="fake-qr">' + fakeQrSvg(fakeCodeOf(p)) + '</div>'
    + '<div class="fake-card-info">'
    + '<div class="fake-status"><span class="fake-badge">✓ ' + t('fakeGenuine') + '</span></div>'
    + '<div class="fake-code-row"><span>' + t('fakeCode') + '：</span><b class="fake-code">' + fakeCodeOf(p) + '</b></div>'
    + '<p class="small muted">' + t('fakeInfo') + '</p>'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="verify-product" data-id="' + p.id + '">🛡 ' + t('fakeVerify') + '</button>'
    + '</div></div></div>'
    + '<div class="card detail-block"><h2>' + icon('shield') + ' ' + t('complianceTitle') + '</h2>'
    + ((p.markets || []).length
      ? p.markets.map(m => {
        const mc = MARKET_COMPLIANCE[m];
        return '<div class="compliance-market"><b>' + esc(mc ? langObj(mc) : m) + '</b><ul>'
          + (mc ? mc.items.map(x => '<li>' + esc(x) + '</li>').join('') : '<li>—</li>')
          + '</ul></div>';
      }).join('')
      : '<p class="muted">' + t('complianceEmpty') + '</p>')
    + '<p class="small muted">' + t('complianceRef') + '</p></div>'
    + '<div class="card detail-block"><h2>' + t('aboutSeller') + '</h2><div class="seller-block">'
    + '<span class="avatar" style="width:54px;height:54px;font-size:18px">' + esc(initialsOf(langObj(seller).company)) + '</span>'
    + '<div><div class="name" style="font-weight:700">' + esc(langObj(seller).company) + '</div>'
    + '<div class="small muted">' + esc(langObj(seller).city) + ', ' + countryName(seller.country) + ' · ' + t('since') + ' ' + seller.since + '</div></div>'
    + '<div class="stats">'
    + '<div><div class="n">' + seller.rating + '</div><div class="l">★ ' + t('statsSuppliers') + '</div></div>'
    + '<div><div class="n">' + seller.responseRate + '%</div><div class="l">' + t('responseRate') + '</div></div>'
    + '<div><div class="n">' + seller.responseTime + '</div><div class="l">' + t('responseTime') + '</div></div>'
    + '<div><div class="n">' + seller.orders.toLocaleString() + '</div><div class="l">' + t('orders') + '</div></div>'
    + '</div>'
    + '</div></div>'
    + '</div></div>';
}

function setGallery(el) {
  const p = productById(el.dataset.id);
  if (!p) return;
  const v = el.dataset.v;
  const main = $('#mainImg');
  if (main) main.src = productImg(p, 800, 600, +v);
  $$('.gallery-thumbs img').forEach(i => i.classList.toggle('on', i === el));
}

/* ---------- 询盘 ---------- */
function openInquiryModal(pid) {
  const p = productById(pid);
  if (!p) return;
  const u = state.user;
  const buyerCountries = [
    ['DE', '德国 / Germany'], ['US', '美国 / USA'], ['GB', '英国 / UK'], ['FR', '法国 / France'],
    ['AU', '澳大利亚 / Australia'], ['JP', '日本 / Japan'], ['BR', '巴西 / Brazil'],
    ['AE', '阿联酋 / UAE'], ['CA', '加拿大 / Canada'], ['SG', '新加坡 / Singapore']
  ];
  const defaultMsg = state.lang === 'zh'
    ? '您好，我对「' + p.zh.title + '」很感兴趣。请报价 ' + p.moq + ' ' + p.unit + ' 的最佳价格（' + (p.terms || ['FOB'])[0] + '），并告知包装与交期。'
    : 'Hello, we are interested in "' + p.en.title + '". Please quote your best price for ' + p.moq + ' ' + p.unit + ' (' + (p.terms || ['FOB'])[0] + ') including packaging and lead time.';
  showModal(
    '<div class="modal-head"><h3>' + icon('send') + ' ' + t('inquiryTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="inquiry-summary"><img src="' + productImg(p, 200, 150) + '" alt=""><div><div style="font-weight:600">' + esc(langObj(p).title) + '</div><div class="small muted">' + fmtPrice(p.priceMin) + '–' + fmtPrice(p.priceMax) + ' USD · ' + t('moqLabel') + ' ' + p.moq + ' ' + p.unit + '</div></div></div>'
    + '<form data-form="inquiry-form" data-id="' + p.id + '" novalidate>'
    + '<div class="field"><label>' + t('quantity') + ' *</label><div class="input-group"><input class="input" type="number" min="1" name="qty" value="' + p.moq + '" required><select class="select" name="unit" style="width:110px">' + UNITS.map(uu => '<option value="' + uu + '" ' + (uu === p.unit ? 'selected' : '') + '>' + uu + '</option>').join('') + '</select></div></div>'
    + '<div class="field"><label>' + t('message') + ' *</label><textarea class="textarea" name="message" required>' + esc(defaultMsg) + '</textarea></div>'
    + '<div class="trans-preview"><span class="trans-label">⚡ ' + t('translateLabel') + '</span><p data-trans-target="msg">' + t('translating') + '</p><div class="trans-note">' + t('translateNote') + '</div></div>'
    + '<div class="field"><label>' + t('payment') + ' <span class="hint">' + t('paymentHint') + '</span></label><select class="select" name="payment">' + PAYMENT_TERMS.map((pt, i) => '<option value="' + i + '">' + esc(langObj(pt)) + '</option>').join('') + '</select></div>'
    + '<div class="form-grid">'
    + '<div class="field"><label>' + t('contactName') + ' *</label><input class="input" name="name" value="' + esc(u && u.role === 'buyer' ? u.name : '') + '" required></div>'
    + '<div class="field"><label>' + t('contactEmail') + ' *</label><input class="input" type="email" name="email" value="' + esc(u && u.role === 'buyer' ? u.email : '') + '" required></div>'
    + '<div class="field"><label>' + t('companyName') + '</label><input class="input" name="company" value="' + esc(u && u.role === 'buyer' ? (u.buyerCompany || '') : '') + '"></div>'
    + '<div class="field"><label>' + t('countryLabel') + '</label><select class="select" name="country"><option value="">—</option>' + buyerCountries.map(c => '<option value="' + c[0] + '" ' + (u && u.buyerCountry === c[0] ? 'selected' : '') + '>' + c[1] + '</option>').join('') + '</select></div>'
    + '</div>'
    + '<button type="submit" class="btn btn-primary btn-lg btn-block">' + icon('send') + t('send') + '</button>'
    + '</form></div>'
  );
  fillTransBox(document.querySelector('[data-trans-target="msg"]'), defaultMsg);
}

function submitInquiry(f) {
  const fd = new FormData(f);
  const name = (fd.get('name') || '').trim();
  const email = (fd.get('email') || '').trim();
  const rawQty = (fd.get('qty') || '').trim();
  const message = (fd.get('message') || '').trim();
  if (!validateForm(f, {
    name: [requireText],
    email: [requireEmail],
    qty: [v => requireNumber(v, 1)],
    message: [requireText]
  })) return;
  const qty = Number(rawQty);
  const pid = f.dataset.id;
  const p = productById(pid);
  const inquiry = {
    id: 'i' + Date.now(),
    productId: pid, sellerId: p.sellerId,
    buyerId: state.user ? state.user.id : 'guest',
    name, email, company: (fd.get('company') || '').trim(), country: fd.get('country') || '',
    qty, unit: fd.get('unit'), message,
    payment: PAYMENT_TERMS[+(fd.get('payment') || 0)] || PAYMENT_TERMS[0],
    createdAt: Date.now(), status: 'new', reply: ''
  };
  state.inquiries.unshift(inquiry);
  saveState();
  const pid2 = pid;
  const p2 = productById(pid2);
  $('#modalRoot').innerHTML = '<div class="modal-mask"><div class="modal" data-stop="1">'
    + '<div class="modal-success">'
    + '<div class="success-ico">✓</div>'
    + '<h3>' + t('inquirySuccessTitle') + '</h3>'
    + '<p>' + t('inquirySuccessDesc') + '</p>'
    + '<div class="inquiry-summary" style="text-align:left"><img src="' + productImg(p2, 200, 150) + '" alt=""><div><div style="font-weight:600">' + esc(langObj(p2).title) + '</div><div class="small muted">' + qty + ' ' + fd.get('unit') + ' · ' + esc(name) + '</div></div></div>'
    + '<div class="flex gap-10" style="justify-content:center">'
    + '<a class="btn btn-primary" href="#/dashboard" data-nav="/dashboard">' + t('viewMyInquiries') + '</a>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('continueBrowsing') + '</button>'
    + '</div></div></div></div>';
}

/* ---------- 注册 / 企业认证 / 品类需求 / 订单小费 ---------- */
function companyOfSeller() {
  const sid = state.user && state.user.sellerId;
  return (state.companies || []).find(c => c.sellerId === sid) || null;
}
function registerFormHtml() {
  return '<div class="modal-head"><h3>' + t('regTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="register-form" class="full" novalidate>'
    + '<input type="text" name="homepage" style="position:absolute;left:-9999px;opacity:0" tabindex="-1" autocomplete="off">'
    + '<div class="field"><label>' + t('regName') + ' *</label><input class="input" name="name" required maxlength="80"></div>'
    + '<div class="field"><label>' + t('regEmail') + ' *</label><input class="input" type="email" name="email" required></div>'
    + '<div class="field"><label>' + t('regPassword') + ' *</label><input class="input" type="password" name="password" required minlength="8"></div>'
    + '<div class="field"><label>' + t('regRole') + ' *</label><div class="check-group">'
    + '<label class="check-pill"><input type="radio" name="role" value="buyer" checked onchange="document.getElementById(\'sellerRegFields\').hidden=true">' + t('regRoleBuyer') + '</label>'
    + '<label class="check-pill"><input type="radio" name="role" value="seller" onchange="document.getElementById(\'sellerRegFields\').hidden=false">' + t('regRoleSeller') + '</label>'
    + '</div></div>'
    + '<div id="sellerRegFields" hidden>'
    + '<div class="field"><label>' + t('regCompanyName') + ' *</label><input class="input" name="companyName" required></div>'
    + '<div class="field"><label>' + t('regCountry') + ' *</label><input class="input" name="country" required></div>'
    + '<div class="field"><label>' + t('regCity') + '</label><input class="input" name="city"></div>'
    + '<div class="field"><label>' + t('regRegNo') + '</label><input class="input" name="registrationNo"></div>'
    + '<div class="field"><label>' + t('regLicenseNo') + '</label><input class="input" name="licenseNo"></div>'
    + '<div class="field"><label>' + t('regCompanyWebsite') + '</label><input class="input" name="companyWebsite"></div>'
    + '<div class="field"><label>' + t('regContact') + '</label><input class="input" name="contact"></div>'
    + '<div class="field"><label>' + t('regScope') + '</label><input class="input" name="businessScope"></div>'
    + '</div>'
    + '<div class="form-note">💡 ' + t('regNote') + '</div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('regSubmit') + '</button>'
    + '</form></div>';
}
function companyFormHtml() {
  const c = companyOfSeller() || {};
  return '<div class="modal-head"><h3>' + t('companyApply') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="company-form" class="full">'
    + '<div class="field"><label>' + t('regCompanyName') + ' *</label><input class="input" name="name" required value="' + esc(c.name || '') + '"></div>'
    + '<div class="field"><label>' + t('regCountry') + ' *</label><input class="input" name="country" required value="' + esc(c.country || '') + '"></div>'
    + '<div class="field"><label>' + t('regCity') + '</label><input class="input" name="city" value="' + esc(c.city || '') + '"></div>'
    + '<div class="field"><label>' + t('regRegNo') + '</label><input class="input" name="registrationNo" value="' + esc(c.registrationNo || '') + '"></div>'
    + '<div class="field"><label>' + t('regLicenseNo') + '</label><input class="input" name="licenseNo" value="' + esc(c.licenseNo || '') + '"></div>'
    + '<div class="field"><label>' + t('regCompanyWebsite') + '</label><input class="input" name="website" value="' + esc(c.website || '') + '"></div>'
    + '<div class="field"><label>' + t('regContact') + '</label><input class="input" name="contact" value="' + esc(c.contact || '') + '"></div>'
    + '<div class="field"><label>' + t('regScope') + '</label><input class="input" name="businessScope" value="' + esc(c.businessScope || '') + '"></div>'
    + '<div class="form-note">💡 ' + t('companyTip') + '</div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('companyApply') + '</button>'
    + '</form></div>';
}
function catReqFormHtml() {
  return '<div class="modal-head"><h3>' + t('categoryRequestTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="catreq-form" class="full">'
    + '<div class="field"><label>' + t('catName') + ' *</label><input class="input" name="name" required maxlength="120"></div>'
    + '<div class="field"><label>' + t('catDesc') + '</label><textarea class="input" name="description" rows="3"></textarea></div>'
    + '<div class="field"><label>' + t('catMarkets') + '</label><input class="input" name="markets" placeholder="DE, US, ..."></div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('catSubmit') + '</button>'
    + '</form></div>';
}
function companyBannerHtml() {
  const c = companyOfSeller();
  if (!c) {
    return '<div class="card panel" style="border-color:rgba(245,158,11,.45)"><div class="panel-head"><h2>🏭 ' + t('companyApply') + '</h2></div>'
      + '<p class="muted">' + t('companyTip') + '</p>'
      + '<button type="button" class="btn btn-primary" data-action="company-form">' + t('companyApply') + '</button></div>';
  }
  if (c.status === 'approved') {
    return '<div class="card panel" style="border-color:rgba(34,197,94,.35)"><div class="panel-head"><h2>✅ ' + esc(c.name || '') + '</h2><span class="status-pill done">' + t('companyApproved') + '</span></div></div>';
  }
  if (c.status === 'rejected') {
    return '<div class="card panel" style="border-color:rgba(239,68,68,.35)"><div class="panel-head"><h2>🏭 ' + esc(c.name || '') + '</h2><span class="status-pill new">' + t('companyRejected') + '</span></div>'
      + (c.rejectReason ? '<p class="muted">' + t('companyReason') + '：' + esc(c.rejectReason) + '</p>' : '')
      + '<button type="button" class="btn btn-primary" data-action="company-form">' + t('companyResubmit') + '</button></div>';
  }
  return '<div class="card panel" style="border-color:rgba(245,158,11,.45)"><div class="panel-head"><h2>🏭 ' + esc(c.name || '') + '</h2><span class="status-pill new">' + t('companyPending') + '</span></div>'
    + '<p class="muted">' + t('companyTip') + '</p></div>';
}
function orderStatusLabel(s) {
  return s === 'complete' ? t('orderStatusComplete') : s === 'cancelled' ? t('orderStatusCancelled') : t('orderStatusCreated');
}
function shipmentStages() {
  return ['processing', 'packed', 'shipped', 'in_transit', 'customs', 'out_for_delivery', 'delivered'];
}
function shipmentStatusLabel(s) {
  const key = 'shp' + String(s || '').replace(/(^|_)([a-z])/g, (m, p, c) => c.toUpperCase());
  const v = t(key);
  return v === key ? String(s || '') : v;
}
function transportMode(shipment) {
  if (shipment && shipment.mode) return shipment.mode;
  const c = String((shipment && shipment.carrier) || '').toLowerCase();
  if (/cosco|maersk|msc|oocl|evergreen|hmm|yang|sealand|vessel|sea/.test(c)) return 'sea';
  if (/dhl|fedex|ups|sf |ems|air|tnt/.test(c)) return 'air';
  return 'land';
}
function transportArt(mode) {
  return 'assets/pixel/transport-' + (mode === 'sea' ? 'sea' : mode === 'air' ? 'air' : 'land') + '.gif';
}
function transportName(mode) {
  return mode === 'sea' ? t('modeSea') : mode === 'air' ? t('modeAir') : t('modeLand');
}
function phaseOf(status) {
  const s = shipmentStages();
  const i = Math.max(0, s.indexOf(status));
  return i <= 1 ? 'start' : i <= 4 ? 'transit' : 'end';
}
function hasActiveTipFromMe(o) {
  if (!state.user || !o) return false;
  return (o.tips || []).some(x => x.status === 'active' && x.fromUserId === state.user.id);
}
function tipMascotImg(orderId) {
  const o = (state.orders || []).find(x => x.id === orderId);
  return (o && hasActiveTipFromMe(o)) ? 'assets/tip-hamster-full.svg' : 'assets/tip-hamster-empty.svg';
}
function partyNameOf(o, side) {
  if (!o) return '';
  const row = side === 'buyer' ? o.buyer : o.seller;
  if (row && row.name) return row.name;
  const uid = side === 'buyer' ? o.buyerId : o.sellerId;
  const u = (state.users || []).find(x => x.id === uid);
  if (u) return u.name;
  return side === 'buyer' ? t('partyBuyer') : t('partySeller');
}
function shipmentTimelineHtml(shipment) {
  const stages = shipmentStages();
  const idx = Math.max(0, stages.indexOf(shipment.status));
  const pct = Math.round(idx / (stages.length - 1) * 100);
  const mode = transportMode(shipment);
  const phase = phaseOf(shipment.status);
  const phaseIdx = phase === 'start' ? 0 : phase === 'transit' ? 1 : 2;
  const phasePct = Math.round(phaseIdx / 2 * 100);
  const evs = (shipment.events || []).slice().sort((a, b) => (a.event_time || a.createdAt || 0) - (b.event_time || b.createdAt || 0));
  return '<div class="shipment-box">'
    + '<div class="ship-head"><b>' + icon('box') + ' ' + t('shipmentTitle') + '</b>'
    + '<span class="status-pill ' + (shipment.status === 'delivered' ? 'done' : shipment.status === 'exception' ? 'rej' : 'pend') + '">' + esc(shipmentStatusLabel(shipment.status)) + '</span></div>'
    + '<div class="escort-head"><img src="assets/mascot-vector.svg" alt="" width="40" height="40" loading="lazy">'
    + '<div class="escort-txt"><b>' + t('escortTitle') + '</b><span class="small muted">' + esc(transportName(mode)) + (shipment.carrier || shipment.tracking_no || shipment.trackingNo ? ' · ' + esc(shipment.carrier || shipment.tracking_no || shipment.trackingNo) : '') + '</span></div>'
    + '<span class="chip sub-chip">' + esc(transportName(mode)) + '</span></div>'
    + '<div class="transport-scene-wrap"><img class="transport-scene" src="' + transportArt(mode) + '" alt="' + esc(transportName(mode)) + '" loading="lazy">'
    + '<div class="escort-pkg" style="left:calc(' + pct + '% - 22px)">📦</div>'
    + '<div class="transport-scene-label">' + esc(transportName(mode)) + '</div></div>'
    + '<div class="phase-bar"><span class="phase' + (phase === 'start' ? ' on' : '') + '">' + t('phaseStart') + '</span>'
    + '<span class="phase' + (phase === 'transit' ? ' on' : '') + '">' + t('phaseTransit') + '</span>'
    + '<span class="phase' + (phase === 'end' ? ' on' : '') + '">' + t('phaseEnd') + '</span>'
    + '<div class="phase-fill" style="width:' + phasePct + '%"></div></div>'
    + '<div class="ship-loc"><span>' + t('shipmentCurrent') + '</span><b>' + esc(shipment.current_location || shipment.currentLocation || shipment.origin || '—') + '</b></div>'
    + (shipment.eta ? '<div class="ship-meta muted">' + t('shipmentEta') + '：' + fmtDate(shipment.eta) + '</div>' : '')
    + (evs.length ? '<ul class="ship-events">' + evs.slice(-4).reverse().map(ev =>
      '<li><span class="ev-dot"></span><div><b>' + esc(shipmentStatusLabel(ev.status)) + '</b>' + (ev.location ? ' · ' + esc(ev.location) : '')
      + '<div class="muted small">' + fmtDate(ev.event_time || ev.createdAt) + (ev.note ? ' · ' + esc(ev.note) : '') + '</div></div></li>'
    ).join('') + '</ul>' : '')
    + '</div>';
}
function evidenceKindLabel(kind) {
  const map = {
    order_create: t('evOrderCreate'), receipt_confirmed: t('evReceiptConfirmed'), tip_create: t('evTipCreate'),
    tip_cancel: t('evTipCancel'), shipment_create: t('evShipmentCreate'), shipment_event: t('evShipmentEvent'),
    manual: t('evManual')
  };
  return map[kind] || String(kind || '');
}
function evidencePanelHtml(o) {
  const evs = (o.evidence && o.evidence.length ? o.evidence : (state.evidence || []).filter(x => x.orderId === o.id))
    .slice().sort((a, b) => (a.chain_index || a.chainIndex || 0) - (b.chain_index || b.chainIndex || 0));
  const verified = o.evidenceVerified !== false;
  return '<div class="evidence-box">'
    + '<div class="ev-head"><b>' + icon('shield') + ' ' + t('evidenceTitle') + '</b>'
    + '<span class="small muted">' + esc(t('evidenceHint')) + '</span></div>'
    + (evs.length ? '<div class="ev-badge ' + (verified ? 'ok' : 'bad') + '">' + (verified ? '✓ ' + t('evidenceChainValid') : '✗ ' + t('evidenceChainBroken')) + '</div>' : '')
    + (evs.length
      ? '<ul class="ev-list">' + evs.map(x =>
        '<li><b>' + esc(evidenceKindLabel(x.kind)) + '</b><span class="muted small">' + fmtDate(x.created_at || x.createdAt) + '</span>'
        + '<code class="ev-hash">' + esc(String(x.content_hash || x.contentHash || '').slice(0, 16)) + '…</code></li>'
      ).join('') + '</ul>'
      : '<p class="small muted ev-empty">' + t('evidenceEmpty') + '</p>')
    + '<div class="flex gap-10 ev-actions">'
    + '<button type="button" class="btn btn-sm" data-action="evidence-save" data-id="' + o.id + '">' + t('evidenceSave') + '</button>'
    + (evs.length ? '<button type="button" class="btn btn-sm" data-action="evidence-verify" data-id="' + o.id + '">' + t('evidenceVerify') + '</button>' : '')
    + (evs.length ? '<button type="button" class="btn btn-sm" data-action="evidence-print" data-id="' + o.id + '">🖨 ' + t('evidencePrint') + '</button>' : '')
    + '</div></div>';
}
function tipCalloutHtml(o) {
  return '<div class="tip-callout">'
    + '<img src="assets/tip-hamster-empty.svg" alt="' + esc(t('tipTitle')) + '" width="56" height="56" loading="lazy">'
    + '<div class="tip-callout-txt"><b>' + t('dealDone') + '</b><p>' + t('tipCallout') + '</p></div>'
    + '<div class="tip-callout-actions">'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="tip-open" data-id="' + o.id + '">' + t('tipViewBtn') + '</button>'
    + '<button type="button" class="btn btn-sm" data-action="tip-dismiss" data-id="' + o.id + '">' + t('tipDismissBtn') + '</button>'
    + '</div></div>';
}
function insuranceOfOrder(o) {
  const rows = (state.insurances || []).filter(x => x.orderId === o.id);
  return rows.find(x => x.status === 'active') || rows[0] || null;
}
function insuranceBoxHtml(o) {
  const isBuyer = state.user && o.buyerId === state.user.id;
  const ins = insuranceOfOrder(o);
  if (ins) {
    return '<div class="insurance-box ' + (ins.status === 'active' ? 'on' : '') + '">'
      + '<div class="ins-head"><b>' + icon('shield') + ' ' + t('insuranceTitle') + '</b>'
      + '<span class="status-pill ' + (ins.status === 'active' ? 'done' : 'rej') + '">' + (ins.status === 'active' ? t('insuranceActive') : t('insuranceCancelled')) + '</span></div>'
      + '<p class="small muted">' + t('insProviderLabel') + '：' + esc(ins.providerName || '') + ' · ' + t('insTierLabel') + '：' + esc(ins.tierLabel || ins.tier || '') + '</p>'
      + '<p class="small">' + t('insCoverageLabel') + '：' + esc(ins.coverage || '') + '</p>'
      + '<p class="small"><b>' + t('insPremiumLabel') + '：' + (ins.currency || 'USD') + ' ' + Number(ins.premium || 0).toFixed(2) + '</b></p>'
      + (isBuyer && ins.status === 'active'
        ? '<button type="button" class="btn btn-sm" data-action="insurance-cancel" data-id="' + ins.id + '">' + t('insuranceCancel') + '</button>' : '')
      + '</div>';
  }
  if (!isBuyer || !['created', 'complete'].includes(o.status)) return '';
  return '<div class="insurance-box"><div class="ins-head"><b>' + icon('shield') + ' ' + t('insuranceTitle') + '</b>'
    + '<span class="chip sub-chip">' + t('insurancePartnersNote') + '</span></div>'
    + '<div class="ins-tiers" role="radiogroup" aria-label="' + esc(t('insTierLabel')) + '">'
    + [['basic', t('insTierBasic')], ['standard', t('insTierStandard')], ['premium', t('insTierPremium')]].map((kv, i) =>
      '<button type="button" class="chip ins-tier' + (i === 1 ? ' sel' : '') + '" data-action="insurance-tier" data-tier="' + kv[0] + '">' + esc(kv[1]) + '</button>').join('')
    + '</div>'
    + '<div class="flex gap-10"><button type="button" class="btn btn-sm btn-primary" data-action="insurance-buy" data-order="' + o.id + '">' + t('insuranceBuy') + '</button></div>'
    + '</div>';
}
function contractDraftText(o) {
  const p = productById(o.productId);
  const buyer = partyNameOf(o, 'buyer'), seller = partyNameOf(o, 'seller');
  const qty = Number(o.quantity) || 100;
  const unit = p && p.unit ? p.unit : 'pcs';
  const total = Number(o.total) || 0;
  const price = qty > 0 ? total / qty : (p ? p.priceMin : 0);
  const date = new Date().toISOString().slice(0, 10);
  const code = 'BBM-C-' + String(o.id).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10) + '-' + date.replace(/-/g, '');
  return [
    '=== ' + t('contractTitle2') + ' ===', '',
    t('contractNo') + '：' + code,
    t('contractDate') + '：' + date, '',
    t('partyBuyer') + '：' + buyer,
    t('partySeller') + '：' + seller,
    t('contractId') + '：' + o.id, '',
    '1. ' + t('contractQty') + '：' + qty + ' ' + unit,
    '2. ' + t('contractUnitPrice') + '：' + (o.currency || 'USD') + ' ' + Number(price).toFixed(2) + ' / ' + unit,
    '3. ' + t('contractTotal') + '：' + (o.currency || 'USD') + ' ' + Number(total).toLocaleString('en-US'),
    '4. ' + t('contractIncoterm') + '：' + (p && p.incoterm ? p.incoterm : 'FOB'),
    '5. ' + t('contractDelivery') + '：45 days after deposit',
    '6. ' + t('contractPayment') + '：30% T/T deposit, 70% against copy of B/L',
    '7. ' + t('contractInspection') + '：pre-shipment inspection by buyer or third party (e.g. SGS)',
    '8. ' + t('contractForceMajeure') + '：standard clause, notice within 7 days',
    '9. ' + t('contractDispute') + '：HKIAC arbitration, Hong Kong SAR', '',
    '--- ' + t('contractSignBlock') + ' ---',
    t('contractSignParty'), '________________________',
    t('contractSignParty2'), '________________________'
  ].join('\n');
}
function contractWarningsHtml() {
  return [1, 2, 3, 4, 5].map(n => '<li>' + esc(t('contractWarn' + n)) + '</li>').join('');
}
function openContractPrint(o) {
  if (!o) return;
  const draft = contractDraftText(o);
  const doc = '<div class="contract-doc">'
    + '<h3>' + esc(t('contractTitle2')) + '</h3>'
    + '<p class="small muted">' + esc(t('contractDraftNotice')) + '</p>'
    + '<pre class="contract-pre">' + esc(draft) + '</pre>'
    + '<div class="warn-box"><b>' + esc(t('contractWarnings')) + '</b><p class="small muted">' + esc(t('contractWarningTitle')) + '</p><ul>' + contractWarningsHtml() + '</ul></div>'
    + '</div>';
  const printEl = document.getElementById('printDoc');
  if (printEl) printEl.innerHTML = doc;
  showModal('<div class="modal doc-modal"><div class="modal-head"><h3>' + icon('file') + ' ' + t('contractsTitle') + '</h3>'
    + '<button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">' + doc
    + '<p class="small muted">' + icon('file') + ' ' + t('contractPrintHint') + '</p>'
    + '<div class="doc-actions"><button type="button" class="btn btn-primary" data-action="print-now">🖨 ' + t('printNow') + '</button>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('close') + '</button></div>'
    + '</div></div>');
}
async function buyInsurance(orderId) {
  const btn = document.querySelector('[data-action="insurance-buy"][data-order="' + orderId + '"]');
  const box = btn && btn.closest('.insurance-box');
  const sel = box && box.querySelector('.ins-tier.sel');
  const tier = sel ? sel.dataset.tier : 'standard';
  try {
    const provs = await api.insurance.providers();
    const prov = provs.find(p => p.enabled === 1);
    if (!prov) throw new Error('NOT_FOUND');
    const rec = await api.insurance.create({ orderId, providerId: prov.id, tier });
    toast(t('insuranceActive') + ' · ' + (rec.currency || 'USD') + ' ' + Number(rec.premium || 0).toFixed(2));
    renderPage();
  } catch (e) {
    toast(e.message === 'DUPLICATE' ? t('insuranceActive') : (e.message || 'ERROR'));
  }
}
async function cancelInsurance(id) {
  try {
    await api.insurance.cancel(id);
    toast(t('insuranceCancelled'));
    renderPage();
  } catch (e) { toast(e.message || 'ERROR'); }
}
async function requestContractCustody(orderId) {
  const o = (state.orders || []).find(x => x.id === orderId);
  if (!o) return;
  try {
    await api.contracts.custody({ orderId, draftText: contractDraftText(o) });
    toast(t('contractCustodyDone'));
    renderPage();
  } catch (e) { toast(e.message || 'ERROR'); }
}
function orderCard(o) {
  const p = productById(o.productId);
  const isBuyer = state.user && o.buyerId === state.user.id;
  const isSeller = state.user && o.sellerId === (state.user.sellerId || state.user.id);
  const tips = o.tips || [];
  const shipments = (o.shipments && o.shipments.length ? o.shipments : (state.shipments || []).filter(s => s.orderId === o.id));
  const tippedByMe = hasActiveTipFromMe(o);
  const showTipCallout = o.status === 'complete' && !state.tipDismissed[o.id] && !tippedByMe;
  const activeTips = tips.filter(x => x.status === 'active');
  return '<div class="card panel">'
    + '<div class="panel-head"><div class="order-head-main">' + (p ? '<img class="order-thumb" src="' + productImg(p, 80, 80) + '" alt="" loading="lazy">' : '') + '<h2>' + esc(p ? langObj(p).title : o.productId) + '</h2></div><span class="status-pill ' + (o.status === 'complete' ? 'done' : o.status === 'cancelled' ? 'new' : '') + '">' + orderStatusLabel(o.status) + '</span></div>'
    + '<p class="muted">' + t('orderTotal') + '：' + (o.currency || 'USD') + ' ' + Number(o.total).toLocaleString() + ' · ' + fmtDate(o.createdAt) + '</p>'
    + '<p class="small muted">' + t('party') + '：' + t('partyBuyer') + ' ' + esc(partyNameOf(o, 'buyer')) + ' · ' + t('partySeller') + ' ' + esc(partyNameOf(o, 'seller')) + '</p>'
    + (showTipCallout ? tipCalloutHtml(o) : '')
    + (activeTips.length ? '<div class="tip-list-head"><img src="assets/tip-hamster-full.svg" alt="" width="42" height="42" loading="lazy"><span>' + t('tipList') + ' · ' + t('tipAlready') + '</span></div>' : '')
    + insuranceBoxHtml(o)
    + (tips.length ? '<div class="reply-box"><ul style="margin:6px 0 0;padding-left:18px">'
      + tips.map(x => '<li>💛 ' + x.amount + ' ' + (x.currency || 'USD') + (x.note ? ' — ' + esc(x.note) : '') + (x.status === 'cancelled' ? ' <span class="muted">' + t('tipCancelled') + '</span>' : '')
        + (x.fromUserId === state.user.id && x.status === 'active' ? ' <button type="button" class="btn btn-sm" data-action="tip-cancel" data-order="' + o.id + '" data-tip="' + x.id + '">' + t('tipCancel') + '</button>' : '')
        + '</li>').join('')
      + '</ul></div>' : '')
    + (shipments.length ? shipmentTimelineHtml(shipments[0]) : '')
    + evidencePanelHtml(o)
    + '<div class="flex gap-10" style="margin-top:10px;flex-wrap:wrap">'
    + (o.status === 'created' && isBuyer ? '<button type="button" class="btn btn-primary" data-action="order-confirm" data-id="' + o.id + '">' + t('confirmReceipt') + '</button><button type="button" class="btn" data-action="order-cancel" data-id="' + o.id + '">' + t('orderStatusCancelled') + '</button>' : '')
    + (o.status === 'complete' ? '<button type="button" class="btn" data-action="tip-open" data-id="' + o.id + '">💛 ' + (tippedByMe ? t('tipBtnAgain') : t('tipTitle')) + '</button>' : '')
    + (isSeller && !shipments.length && (o.status === 'created' || o.status === 'complete')
      ? '<button type="button" class="btn btn-primary" data-action="shipment-create" data-id="' + o.id + '">🚚 ' + t('shipmentCreate') + '</button>' : '')
    + (isSeller && shipments.length
      ? '<button type="button" class="btn" data-action="shipment-event" data-id="' + o.id + '" data-shipment="' + shipments[0].id + '">' + t('shipmentAddEvent') + '</button>' : '')
    + '</div>'
    + '</div>';
}
function ordersBody() {
  const u = state.user;
  let rows = (state.orders || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  if (u && u.role !== 'admin') rows = rows.filter(o => o.buyerId === u.id || o.sellerId === (u.sellerId || u.id));
  return '<div class="card panel"><div class="panel-head"><h2>' + t('myOrders') + '</h2></div>'
    + (rows.length ? rows.map(orderCard).join('') : '<div class="empty-state" style="padding:36px"><div class="ico">📦</div><p>' + t('noOrders') + '</p></div>')
    + '</div>';
}
function tipModalHtml(o) {
  const tippedByMe = hasActiveTipFromMe(o);
  return '<div class="modal-head"><h3>💛 ' + t('tipTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="tip-img-wrap"><img src="' + tipMascotImg(o.id) + '" alt="' + t('tipTitle') + '" width="110" height="110" loading="lazy">'
    + (tippedByMe ? '<span class="tip-coins">🪙🪙🪙</span>' : '')
    + '</div>'
    + '<p class="muted" style="text-align:center">' + (tippedByMe ? t('tipAgain') : t('tipHint')) + '</p>'
    + '<div class="tip-chips" role="group" aria-label="' + esc(t('tipAmount')) + '">' + [5, 10, 25, 50, 100].map(v => '<button type="button" class="chip" data-action="tip-quick" data-amount="' + v + '">$' + v + '</button>').join('') + '</div>'
    + '<div class="field"><label>' + t('tipAmount') + ' *</label><input class="input" id="tipAmountInput" type="number" min="0.01" max="10000" step="0.01" placeholder="5"></div>'
    + '<div class="field"><label>' + t('tipNote') + '</label><input class="input" id="tipNoteInput" maxlength="200"></div>'
    + '<button type="button" class="btn btn-primary btn-block" data-action="tip-send" data-order="' + o.id + '">' + t('tipSend') + '</button>'
    + '<button type="button" class="btn btn-block tip-skip" data-action="tip-skip" data-order="' + o.id + '">' + t('tipSkip') + '</button>'
    + '</div>';
}
async function submitRegister(form) {
  const fd = new FormData(form);
  const role = fd.get('role') || 'buyer';
  const rules = {
    name: [requireText],
    email: [requireEmail],
    password: [v => (v.length >= 8 && /[A-Za-z]/.test(v) && /[0-9]/.test(v)) ? '' : t('errPassword')]
  };
  if (role === 'seller') {
    rules.companyName = [requireText];
    rules.country = [requireText];
  }
  if (!validateForm(form, rules)) return;
  const payload = {
    email: String(fd.get('email') || '').trim(),
    password: String(fd.get('password') || ''),
    role,
    name: String(fd.get('name') || '').trim(),
    homepage: String(fd.get('homepage') || ''),
    companyName: String(fd.get('companyName') || '').trim(),
    country: String(fd.get('country') || '').trim(),
    city: String(fd.get('city') || '').trim(),
    registrationNo: String(fd.get('registrationNo') || '').trim(),
    licenseNo: String(fd.get('licenseNo') || '').trim(),
    companyWebsite: String(fd.get('companyWebsite') || '').trim(),
    contact: String(fd.get('contact') || '').trim(),
    businessScope: String(fd.get('businessScope') || '').trim()
  };
  try {
    const r = await api.auth.register(payload);
    closeModal();
    toast(t('registerOk'));
    if (r && r.emailVerified !== false) go('/dashboard');
  } catch (e) {
    const msg = e.message === 'EMAIL_EXISTS' ? t('emailExists') : e.message === 'BOT_DETECTED' ? t('botDetected') : e.message === 'VALIDATION' ? t('required') : (e.message || String(e));
    toast(msg);
  }
}
async function submitCompanyForm(form) {
  const payload = {
    name: form.name.value, country: form.country.value,
    city: form.city ? form.city.value : '', registrationNo: form.registrationNo ? form.registrationNo.value : '',
    licenseNo: form.licenseNo ? form.licenseNo.value : '', website: form.website ? form.website.value : '',
    contact: form.contact ? form.contact.value : '', businessScope: form.businessScope ? form.businessScope.value : ''
  };
  try {
    await api.companies.apply(payload);
    closeModal();
    toast(t('companyApply') + ' ✓');
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function submitCatReqForm(form) {
  const fd = new FormData(form);
  const markets = String(fd.get('markets') || '').split(',').map(s => s.trim()).filter(Boolean);
  try {
    await api.categoryRequests.create({ name: fd.get('name'), description: fd.get('description'), targetMarkets: markets });
    closeModal();
    toast(t('catSubmitted'));
  } catch (e) { toast(e.message || String(e)); }
}
async function createOrderFromInquiry(inquiryId) {
  try { await api.orders.create({ inquiryId }); toast(t('orders') + ' ✓'); render(); }
  catch (e) { toast(e.message || String(e)); }
}
async function confirmOrderReceipt(id) {
  try {
    await api.orders.confirmReceipt(id);
    toast(t('dealDone'));
    state.tipDismissed[id] = false;
    saveState();
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function cancelOrder(id) {
  try { await api.orders.cancel(id); toast(t('orderStatusCancelled')); render(); }
  catch (e) { toast(e.message || String(e)); }
}
function openTipModal(id) {
  const o = (state.orders || []).find(x => x.id === id);
  if (o) showModal(tipModalHtml(o));
}
async function sendTip(orderId) {
  const inp = $('#tipAmountInput');
  const amount = parseFloat(($('#tipAmountInput') || {}).value || '');
  const note = ($('#tipNoteInput') || {}).value || '';
  if (inp) {
    const msg = (!Number.isFinite(amount) || amount <= 0 || amount > 10000) ? (Number.isFinite(amount) && amount > 10000 ? t('errNumber') : t('errPositive')) : '';
    setFieldError(inp, msg);
    if (msg) { inp.focus(); return; }
  }
  try {
    await api.orders.tip(orderId, { amount, note });
    closeModal();
    state.tipDismissed[orderId] = true;
    saveState();
    toast('💛 ' + t('tipReceived') + ' ✓');
    render();
  }
  catch (e) { toast(e.message || String(e)); }
}
async function cancelTip(orderId, tipId) {
  try { await api.orders.cancelTip(orderId, tipId); toast(t('tipCancel') + ' ✓'); render(); }
  catch (e) { toast(e.message || String(e)); }
}
async function saveEvidenceSnapshot(orderId) {
  const o = (state.orders || []).find(x => x.id === orderId);
  if (!o) { toast(t('evidenceEmpty')); return; }
  const snapshot = {
    orderId, status: o.status, total: o.total, currency: o.currency,
    productId: o.productId, buyerId: o.buyerId, sellerId: o.sellerId,
    note: 'manual snapshot @ ' + new Date().toISOString()
  };
  try {
    await api.evidence.create(orderId, { kind: 'manual', refId: orderId, snapshot });
    toast('✓ ' + t('evidenceSave'));
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function verifyOrderEvidence(orderId) {
  const rows = (state.evidence || []).filter(e => e.orderId === orderId);
  const last = rows[rows.length - 1];
  if (!last) { toast(t('evidenceEmpty')); return; }
  try {
    const r = await api.evidence.verify(last.id);
    toast(r.chainValid ? '✓ ' + t('evidenceChainValid') : '✗ ' + t('evidenceChainBroken'));
  } catch (e) { toast(e.message || String(e)); }
}
function buildEvidenceReport(o, evs, verified) {
  const no = 'BBM-EV-' + String(o.id).replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 12) + '-' + new Date().getTime().toString(36).toUpperCase().slice(-4);
  const p = productById(o.productId);
  const dateFmt = ts => new Date(ts).toLocaleString(uiLocale());
  return '<div class="doc" id="docSheet">'
    + '<div class="doc-head">'
    + '<div class="doc-brand"><b>BeanBeanMouse</b><div>' + esc(t('evReportSub')) + '</div><div class="doc-web">beanbeanmouse.com</div></div>'
    + '<div class="doc-title"><h2>' + esc(t('evReportTitle')) + '</h2><div>' + esc(t('evReportNo')) + ' · ' + esc(no) + '</div></div>'
    + '</div>'
    + '<div class="doc-meta">'
    + '<span><b>' + t('docNo') + '：</b>' + esc(no) + '</span>'
    + '<span><b>' + t('docDate') + '：</b>' + dateFmt(Date.now()) + '</span>'
    + '<span><b>' + t('orderTotal') + '：</b>' + (o.currency || 'USD') + ' ' + Number(o.total || 0).toLocaleString() + '</span>'
    + '<span><b>' + t('evidenceVerifiedAt') + '：</b>' + dateFmt(Date.now()) + '</span>'
    + '</div>'
    + '<div class="doc-parties">'
    + '<div><div class="doc-party-label">' + t('orderTotal') + ' / ' + t('orderStatusCreated') + '</div><b>' + (o.currency || 'USD') + ' ' + Number(o.total || 0).toLocaleString() + '</b><div>' + orderStatusLabel(o.status) + '</div></div>'
    + '<div><div class="doc-party-label">' + t('party') + '</div><b>' + esc(partyNameOf(o, 'buyer')) + ' ↔ ' + esc(partyNameOf(o, 'seller')) + '</b><div>' + esc(p ? langObj(p).title : o.id) + '</div></div>'
    + '</div>'
    + '<table class="doc-table">'
    + '<thead><tr><th>#</th><th>' + esc(t('evidenceTitle')) + '</th><th>' + esc(t('evidenceVerifiedAt')) + '</th><th>' + esc(t('evidenceHash')) + '</th></tr></thead>'
    + '<tbody>' + evs.map((x, i) =>
      '<tr><td>' + (i + 1) + '</td><td>' + esc(evidenceKindLabel(x.kind)) + '</td><td>' + dateFmt(x.created_at || x.createdAt) + '</td><td><code>' + esc(String(x.content_hash || x.contentHash || '')) + '</code></td></tr>'
    ).join('') + '</tbody>'
    + '</table>'
    + '<div class="ev-report-verdict ' + (verified ? 'ok' : 'bad') + '">' + (verified ? '✓ ' + t('evReportSealed') : '✗ ' + t('evReportBroken')) + '</div>'
    + '<div class="ev-seal"><div class="ev-qr">' + fakeQrSvg(no + '|' + evs.length + '|' + (verified ? 'OK' : 'BAD')) + '</div>'
    + '<div class="ev-seal-txt"><b>BeanBeanMouse</b><div>' + esc(t('evReportSub')) + '</div><div class="muted small">' + esc(t('evidenceVerifiedAt')) + '：' + dateFmt(Date.now()) + '</div></div></div>'
    + '<div class="doc-sign"><div>' + t('docSellerSign') + '</div><div>' + t('docBuyerSign') + '</div></div>'
    + '<div class="doc-disclaimer">' + t('evReportNote') + '</div>'
    + '</div>';
}
function openEvidencePrint(orderId) {
  const o = (state.orders || []).find(x => x.id === orderId);
  if (!o) return;
  const evs = (o.evidence && o.evidence.length ? o.evidence : (state.evidence || []).filter(x => x.orderId === orderId))
    .slice().sort((a, b) => (a.chain_index || a.chainIndex || 0) - (b.chain_index || b.chainIndex || 0));
  if (!evs.length) { toast(t('evidenceEmpty')); return; }
  const verified = o.evidenceVerified !== false;
  const doc = buildEvidenceReport(o, evs, verified);
  const printEl = document.getElementById('printDoc');
  if (printEl) printEl.innerHTML = doc;
  showModal('<div class="modal doc-modal"><div class="modal-head"><h3>' + icon('shield') + ' ' + t('evidencePrint') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">' + doc
    + '<p class="small muted">' + icon('file') + ' ' + t('evidencePrintHint') + '</p>'
    + '<div class="doc-actions"><button type="button" class="btn btn-primary" data-action="print-now">🖨 ' + t('printNow') + '</button>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('close') + '</button></div>'
    + '</div></div>');
}
function shipmentStatusOptions(current) {
  const stages = shipmentStages();
  const idx = stages.indexOf(current);
  const suggested = idx >= 0 && idx < stages.length - 1 ? stages[idx + 1] : (current === 'delivered' ? 'delivered' : 'exception');
  return stages.concat(['exception']).map(s =>
    '<option value="' + s + '"' + (s === suggested ? ' selected' : '') + '>' + esc(shipmentStatusLabel(s)) + '</option>'
  ).join('');
}
function openShipmentCreateModal(orderId) {
  const o = (state.orders || []).find(x => x.id === orderId);
  if (!o) return;
  const p = productById(o.productId);
  showModal(
    '<div class="modal-head"><h3>🚚 ' + t('shipmentCreate') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="shipment-create-form" data-order="' + orderId + '" novalidate>'
    + (p ? '<p class="small muted">' + esc(langObj(p).title) + '</p>' : '')
    + '<div class="field"><label>' + t('shipmentCarrier') + '</label><input class="input" name="carrier" maxlength="80" placeholder="COSCO / DHL / FedEx…"></div>'
    + '<div class="field"><label>' + t('shipmentTrackingNo') + '</label><input class="input" name="trackingNo" maxlength="80"></div>'
    + '<div class="field"><label>' + t('shipmentMode') + '</label><select class="input" name="mode"><option value="land">' + t('modeLand') + '</option><option value="sea">' + t('modeSea') + '</option><option value="air">' + t('modeAir') + '</option></select></div>'
    + '<div class="grid-2"><div class="field"><label>' + t('shipmentOrigin') + '</label><input class="input" name="origin" maxlength="120" placeholder="Ningbo, CN"></div>'
    + '<div class="field"><label>' + t('shipmentDestination') + '</label><input class="input" name="destination" maxlength="120" placeholder="Hamburg, DE"></div></div>'
    + '<div class="field"><label>' + t('shipmentEta') + '</label><input class="input" name="eta" type="date"></div>'
    + '<div class="field"><label>' + t('shipmentRemark') + '</label><input class="input" name="remark" maxlength="500"></div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('shipmentCreateBtn') + '</button>'
    + '</form></div>'
  );
}
async function submitShipmentCreate(form) {
  if (!validateForm(form, {
    carrier: [requireText],
    origin: [requireText],
    destination: [requireText]
  })) return;
  const eta = form.eta && form.eta.value ? new Date(form.eta.value + 'T23:59:59').getTime() : null;
  const payload = {
    carrier: form.carrier.value.trim(),
    trackingNo: form.trackingNo.value.trim(),
    mode: form.mode ? form.mode.value : 'land',
    origin: form.origin.value.trim(),
    destination: form.destination.value.trim(),
    eta,
    remark: form.remark.value.trim()
  };
  try {
    await api.shipments.create(form.dataset.order, payload);
    closeModal();
    toast('✓ ' + t('shipmentCreate'));
    render();
  } catch (e) { toast(e.message || String(e)); }
}
function openShipmentEventModal(orderId, shipmentId) {
  const shipment = (state.shipments || []).find(s => s.id === shipmentId && s.orderId === orderId);
  if (!shipment) return;
  showModal(
    '<div class="modal-head"><h3>🚚 ' + t('shipmentAddEvent') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="shipment-event-form" data-order="' + orderId + '" data-shipment="' + shipmentId + '" novalidate>'
    + '<div class="field"><label>' + t('shipmentEvent') + ' *</label><select class="input" name="status">' + shipmentStatusOptions(shipment.status) + '</select></div>'
    + '<div class="field"><label>' + t('shipmentCurrent') + '</label><input class="input" name="location" maxlength="120" placeholder="' + t('shipmentLocPh') + '"></div>'
    + '<div class="field"><label>' + t('shipmentNotePh') + '</label><input class="input" name="note" maxlength="500"></div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('shipmentAddEvent') + '</button>'
    + '</form></div>'
  );
}
async function submitShipmentEvent(form) {
  const payload = {
    status: form.status.value,
    location: form.location.value.trim(),
    note: form.note.value.trim()
  };
  try {
    await api.shipments.addEvent(form.dataset.order, form.dataset.shipment, payload);
    closeModal();
    toast('✓ ' + t('shipmentEventAdded'));
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function setCatReqStatus(id, status, note) {
  const reason = note || (status === 'done' ? '' : prompt(t('catNote')) || '');
  try { await api.categoryRequests.setStatus(id, { status, note: reason }); toast('✓'); render(); }
  catch (e) { toast(e.message || String(e)); }
}

/* ---------- 登录页 ---------- */
/* ---------- 贸易流程规范参考 ---------- */
const TRADE_GUIDE_FLOW = [
  { zh: '询盘与需求确认', en: 'Inquiry & requirements' },
  { zh: '报价 / 形式发票', en: 'Quote / Proforma Invoice' },
  { zh: '签订销售合同', en: 'Signed sales contract' },
  { zh: '支付定金', en: 'Deposit payment' },
  { zh: '生产 / 备货', en: 'Production / packing' },
  { zh: '验货', en: 'Inspection' },
  { zh: '订舱 / 出口报关', en: 'Booking & export customs' },
  { zh: '装船 / 发运', en: 'Loading / shipment' },
  { zh: '单据流转', en: 'Document flow' },
  { zh: '清关 / 提货', en: 'Import customs & pickup' },
  { zh: '支付尾款', en: 'Balance payment' },
  { zh: '售后与评价', en: 'After-sales & review' }
];
const TRADE_GUIDE_INCOTERMS = [
  { code: 'EXW', zh: '工厂交货（风险在工厂转移）', en: 'Ex Works - risk transfers at your factory' },
  { code: 'FCA', zh: '货交承运人（指定地点）', en: 'Free Carrier (named place)' },
  { code: 'FAS', zh: '船边交货', en: 'Free Alongside Ship' },
  { code: 'FOB', zh: '船上交货（装运港）', en: 'Free On Board (port of shipment)' },
  { code: 'CFR', zh: '成本加运费（风险在装运港转移）', en: 'Cost and Freight (risk transfers at loading port)' },
  { code: 'CIF', zh: '成本、保险费加运费（卖方购保险）', en: 'Cost, Insurance and Freight (seller buys insurance)' },
  { code: 'CPT', zh: '运费付至', en: 'Carriage Paid To' },
  { code: 'CIP', zh: '运费和保险费付至（含保险）', en: 'Carriage and Insurance Paid To' },
  { code: 'DAP', zh: '目的地交货（不含卸货）', en: 'Delivered at Place (unloaded)' },
  { code: 'DPU', zh: '目的地卸货后交货', en: 'Delivered at Place Unloaded' },
  { code: 'DDP', zh: '完税后交货（卖方责任最大）', en: 'Delivered Duty Paid (max seller duty)' }
];
const TRADE_GUIDE_PAYMENTS = [
  { code: 'T/T', zh: '电汇。常见 30% 定金 + 70% 见提单副本付清；小额可全款预付（风险较高）。', en: 'Telegraphic transfer. Common: 30% deposit + 70% against B/L copy; full prepayment is riskier.' },
  { code: 'L/C', zh: '信用证。银行信用，适合大额订单；注意软条款与单据不符点。', en: 'Letter of credit. Bank credit, good for large orders; watch soft clauses and discrepancies.' },
  { code: 'D/P', zh: '付款交单。买方付款后才能拿单据提货。', en: 'Documents against Payment. Buyer pays before receiving documents.' },
  { code: 'D/A', zh: '承兑交单。买方承兑后即可提货、到期付款（卖方风险较高）。', en: 'Documents against Acceptance. Buyer takes goods after acceptance; higher seller risk.' },
  { code: 'O/A', zh: '赊销。先发货后付款，仅建议用于长期信任客户。', en: 'Open account. Ship first, pay later; only for trusted long-term customers.' }
];
const TRADE_GUIDE_RISKS = [
  { zh: '付款到个人账户或非合同公司账户', en: 'Paying to a personal account or an account not named in the contract' },
  { zh: '贸易术语写错或模糊（如仅写 "FOB China" 未指定港口）', en: 'Vague Incoterms (e.g. only "FOB China" without a named port)' },
  { zh: '没有书面合同 / 形式发票就支付大额全款', en: 'Paying a large amount upfront without a contract or proforma invoice' },
  { zh: '大额订单不做第三方验货、不约定质量标准', en: 'No third-party inspection or agreed quality standard for large orders' },
  { zh: '单证不符（品名、HS 编码、唛头与实物不一致）', en: 'Documents inconsistent with the goods (name, HS code, shipping marks)' },
  { zh: '仿牌 / 侵权产品被目的国海关扣押', en: 'Counterfeit or infringing goods seized by destination customs' },
  { zh: '汇率波动未锁定，导致利润缩水', en: 'Unhedged exchange-rate exposure eroding margins' },
  { zh: '危险品 / 违禁品未如实申报', en: 'Dangerous or prohibited goods not declared truthfully' }
];
function renderGuide() {
  document.title = t('navGuide') + ' · BeanBeanMouse';
  const zh = state.lang === 'zh';
  const L = zh
    ? {
        intro: '从询盘到售后的完整规范流程，帮助你了解每一步该做什么、该签什么、该防范什么。本指南适用于一般货物贸易（B2B）。',
        flowTitle: '标准贸易流程', paymentTitle: '常见付款方式与风险', incotermTitle: 'Incoterms® 2020 贸易术语速查',
        riskTitle: '常见风险与不规范操作提示', riskSub: '以下情形一旦出现，请立即提高警惕、要求书面确认，必要时联系平台客服：',
        flowNote: '流程因产品、国家与付款方式而异，请以合同约定为准。', evidenceNote: '平台为关键节点自动保存存证，双方可随时核对，减少争议。',
        complianceTitle: '合规要点', compliance: [
          'HS 编码务必准确，并在报关前与货代/报关行复核；',
          '目的国进口认证（CE、FDA、SASO 等）由谁提供、何时提供要写入合同；',
          '唛头、箱单、发票信息必须与实物完全一致；',
          '涉税、涉证产品（如化学品、食品、医疗器械）需提前确认出口许可；',
          '建议大额订单购买货运保险并约定索赔流程。'
        ],
        disclaimer: t('guideDisclaimer')
      }
    : {
        intro: 'A complete standard flow from inquiry to after-sales: what to do, what to sign and what to watch out for at every step. Suitable for general B2B merchandise trade.',
        flowTitle: 'Standard trade flow', paymentTitle: 'Common payment terms & risk', incotermTitle: 'Incoterms® 2020 quick reference',
        riskTitle: 'Common risks & non-standard practices', riskSub: 'If you see any of the following, stay alert, ask for written confirmation and contact platform support if needed:',
        flowNote: 'The flow varies by product, country and payment terms; the signed contract prevails.', evidenceNote: 'Key milestones are automatically sealed as evidence; both parties can verify them anytime to reduce disputes.',
        complianceTitle: 'Compliance checklist', compliance: [
          'Make sure the HS code is accurate and double-check it with your forwarder before declaration.',
          'Put in the contract who provides destination import certifications (CE, FDA, SASO, etc.) and when.',
          'Shipping marks, packing list and invoice must match the goods exactly.',
          'Dutiable or licensed goods (chemicals, food, medical devices) need export permits confirmed in advance.',
          'For large orders, buy cargo insurance and agree on the claims process.'
        ],
        disclaimer: t('guideDisclaimer')
      };
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>' + t('guideTitle') + '</h1><p>' + esc(L.intro) + '</p></div>'
    + '<section class="card panel guide-section"><div class="panel-head"><h2>' + esc(L.flowTitle) + '</h2><span class="small muted">' + esc(L.evidenceNote) + '</span></div>'
    + '<ol class="guide-flow">' + TRADE_GUIDE_FLOW.map((s, i) => '<li><span class="step-no">' + (i + 1) + '</span><span class="step-name">' + esc(zh ? s.zh : s.en) + '</span></li>').join('') + '</ol>'
    + '<p class="small muted">' + esc(L.flowNote) + '</p></section>'
    + '<section class="card panel guide-section"><div class="panel-head"><h2>' + esc(L.incotermTitle) + '</h2></div>'
    + '<div class="table-responsive"><table class="table guide-table"><thead><tr><th>Code</th><th>' + (zh ? '说明' : 'Meaning') + '</th></tr></thead><tbody>'
    + TRADE_GUIDE_INCOTERMS.map(x => '<tr><td><b>' + x.code + '</b></td><td>' + esc(zh ? x.zh : x.en) + '</td></tr>').join('')
    + '</tbody></table></div></section>'
    + '<section class="card panel guide-section"><div class="panel-head"><h2>' + esc(L.paymentTitle) + '</h2></div>'
    + TRADE_GUIDE_PAYMENTS.map(x => '<div class="guide-payment"><b>' + x.code + '</b><span>' + esc(zh ? x.zh : x.en) + '</span></div>').join('')
    + '</section>'
    + '<section class="card panel guide-section"><div class="panel-head"><h2>' + esc(L.complianceTitle) + '</h2></div>'
    + '<ul class="guide-list">' + L.compliance.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></section>'
    + '<section class="card panel guide-section guide-risk"><div class="panel-head"><h2>' + esc(L.riskTitle) + '</h2></div>'
    + '<p class="small muted">' + esc(L.riskSub) + '</p>'
    + '<ul class="risk-list">' + TRADE_GUIDE_RISKS.map(x => '<li><span class="risk-ico">⚠</span><span>' + esc(zh ? x.zh : x.en) + '</span></li>').join('') + '</ul></section>'
    + '<p class="small muted guide-disclaimer">' + esc(L.disclaimer) + '</p>'
    + '</div>';
}

/* ---------- 清关/报关参考 ---------- */
function renderCustoms() {
  document.title = t('customsTitle') + ' · BeanBeanMouse';
  const zh = state.lang === 'zh';
  const { params } = parseHash();
  const code = params.get('country') || 'US';
  const row = CUSTOMS_REF.find(c => c.code === code) || CUSTOMS_REF[0];
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>' + t('customsTitle') + '</h1><p>' + t('customsSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('customsPick') + '</h2></div>'
    + '<div class="customs-grid">' + CUSTOMS_REF.map(c =>
      '<a class="customs-card' + (c.code === row.code ? ' on' : '') + '" href="#/customs?country=' + c.code + '" data-nav="/customs?country=' + c.code + '">'
      + '<span class="lang-flag">' + flagEmoji(c.flag) + '</span><span>' + esc(zh ? c.zh : c.en) + '</span></a>'
    ).join('') + '</div></section>'
    + '<div class="dash-layout customs-layout">'
    + '<aside class="card panel customs-side"><h3>' + flagEmoji(row.flag) + ' ' + esc(zh ? row.zh : row.en) + '</h3>'
    + '<p class="small muted">' + esc(row.note) + '</p></aside>'
    + '<div class="customs-main">'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('customsDocs') + '</h2></div>'
    + '<ul class="guide-list">' + row.docs.map(d => '<li>📄 ' + esc(zh ? d.zh : d.en) + '</li>').join('') + '</ul></section>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('customsSources') + '</h2></div>'
    + '<div class="source-grid">' + row.sources.map(s =>
      '<a class="source-card" href="' + esc(s.url) + '" target="_blank" rel="noopener noreferrer"><b>' + esc(s.name) + '</b><span class="small muted">' + esc(s.region) + ' · ' + t('viewSource') + '</span></a>'
    ).join('') + '</div></section>'
    + '<section class="card panel guide-risk"><div class="panel-head"><h2>' + t('customsNote') + '</h2></div>'
    + '<p class="small">' + esc(row.note) + '</p>'
    + '<p class="small muted">' + t('customsDisclaimer') + '</p></section>'
    + '</div></div>'
    + '</div>';
}

/* ---------- 招商入驻 ---------- */
function renderRecruit() {
  document.title = t('navRecruit') + ' · BeanBeanMouse';
  const zh = state.lang === 'zh';
  const steps = zh
    ? [['注册并提交企业资料', '填写公司/工厂真实资质，平台审核（可查证）'], ['按外贸品类发布产品', '选择细分品类与 HS 参考，等待上架审核'], ['获得询盘与推广', '买家询盘直达邮箱与站内信，可申请推广位']]
    : [['Register & verify', 'Submit real company/factory credentials for platform review'], ['Publish by category', 'Pick a foreign-trade subcategory with HS reference and go live'], ['Get inquiries & growth', 'Buyer inquiries hit your inbox; apply for promotion slots']];
  const benefits = [
    ['🌍', zh ? '面向全球买家' : 'Global buyers', zh ? '多语言界面与实时翻译，跨时区询盘直达' : 'Multilingual UI with live translation'],
    ['🔒', zh ? '企业实名审核' : 'Verified companies', zh ? '真实可查证公司/工厂才能发品，建立信任' : 'Only real, verifiable companies can list'],
    ['📈', zh ? '细分品类与推广' : 'Subcategories & promotion', zh ? '外贸细分品类 + HS 参考，推广位放大曝光' : 'Foreign-trade subcategories with HS reference and promo slots']
  ];
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>' + t('recruitTitle') + '</h1><p>' + t('recruitSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + (zh ? '入驻流程' : 'How it works') + '</h2></div>'
    + '<ol class="guide-flow">' + steps.map((s, i) => '<li><span class="step-no">' + (i + 1) + '</span><span class="step-name"><b>' + esc(s[0]) + '</b><div class="small muted">' + esc(s[1]) + '</div></span></li>').join('') + '</ol></section>'
    + '<section class="card panel"><div class="panel-head"><h2>' + (zh ? '为什么选择豆豆鼠' : 'Why BeanBeanMouse') + '</h2></div>'
    + '<div class="benefit-grid">' + benefits.map(b => '<div class="benefit-card"><div class="benefit-ico">' + b[0] + '</div><b>' + esc(b[1]) + '</b><p>' + esc(b[2]) + '</p></div>').join('') + '</div></section>'
    + '<div class="cta-band recruit-cta"><div><h2>' + t('recruitCta') + '</h2><p>' + (zh ? '免费入驻，按效果付费' : 'Free to join, pay by results') + '</p></div>'
    + '<a class="btn btn-accent btn-lg" href="#/login" data-nav="/login">' + t('recruitCta') + '</a></div>'
    + '</div>';
}

/* ---------- 第三方运输保险页 ---------- */
function renderInsurance() {
  document.title = t('insurancePageTitle') + ' · BeanBeanMouse';
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>' + icon('shield') + ' ' + t('insurancePageTitle') + '</h1><p>' + t('insurancePageSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('insProviderLabel') + '</h2></div>'
    + '<div id="insuranceProviders" class="ins-providers"><p class="muted">…</p></div></section>'
    + '<section class="card panel"><div class="panel-head"><h2>⚖️ ' + t('insurancePageNote') + '</h2></div>'
    + '<p class="small muted">' + t('insurancePartnersNote') + '</p></section>'
    + '</div>';
}
async function bindInsurancePage() {
  const wrap = document.getElementById('insuranceProviders');
  if (!wrap) return;
  try {
    const provs = await api.insurance.providers();
    wrap.innerHTML = provs.map(p => {
      const tiers = Object.keys(p.tiers || {});
      return '<div class="ins-provider' + (p.enabled ? '' : ' off') + '">'
        + '<div class="ins-provider-head"><b>' + esc(p.name) + '</b>'
        + '<span class="chip ' + (p.enabled ? 'ok' : '') + '">' + (p.enabled ? t('insuranceActive') : t('insurancePartnersNote')) + '</span></div>'
        + (tiers.length
          ? '<ul class="ins-tier-list">' + tiers.map(k => '<li><b>' + esc(p.tiers[k].label) + '</b> — ' + esc(p.tiers[k].coverage) + '</li>').join('') + '</ul>'
          : '<p class="small muted">' + t('insurancePartnersNote') + '</p>')
        + '</div>';
    }).join('');
  } catch (e) {
    wrap.innerHTML = '<p class="muted">' + esc(e.message || 'ERROR') + '</p>';
  }
}

/* ---------- 合同草案参考与 30 天平台保管 ---------- */
function renderContracts() {
  document.title = t('contractsTitle') + ' · BeanBeanMouse';
  if (!state.user) {
    return '<div class="container page"><div class="card panel"><p>' + t('contractNeedLogin') + '</p>'
      + '<a class="btn btn-primary" href="#/login" data-nav="/login">' + t('login') + '</a></div></div>';
  }
  const mine = (state.orders || []).filter(o => o.buyerId === state.user.id || o.sellerId === (state.user.sellerId || state.user.id));
  const opts = mine.map(o => '<option value="' + o.id + '">' + esc(o.id) + ' · ' + esc(partyNameOf(o, 'seller')) + ' ⇄ ' + esc(partyNameOf(o, 'buyer')) + '</option>').join('');
  const cust = (state.contracts || []).filter(c => c.userId === state.user.id);
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>' + icon('file') + ' ' + t('contractsTitle') + '</h1><p>' + t('contractsSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('contractSelectOrder') + '</h2></div>'
    + (mine.length
      ? '<div class="field"><label for="contractOrderSelect">' + t('contractSelectOrder') + '</label>'
        + '<select class="input" id="contractOrderSelect">' + opts + '</select></div>'
        + '<button type="button" class="btn btn-primary" data-action="contract-gen">' + t('contractGenerate') + '</button>'
        + '<div id="contractPreview"></div>'
      : '<p class="muted">' + t('contractNoOrders') + '</p>')
    + '</section>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('contractCustodyRecords') + '</h2></div>'
    + (cust.length
      ? cust.map(c => '<div class="custody-row"><b>' + esc(c.orderId) + '</b>'
        + '<span class="small muted">' + (c.status === 'active' ? t('custodyActiveLabel') : t('custodyExpiredLabel')) + ' · ' + t('contractExpiresAt') + '：' + fmtDate(c.expiresAt) + '</span>'
        + '<code class="ev-hash">' + esc(String(c.contractHash || '').slice(0, 16)) + '…</code></div>').join('')
      : '<p class="muted">—</p>')
    + '</section></div>';
}
function renderContractPreview() {
  const sel = document.getElementById('contractOrderSelect');
  const wrap = document.getElementById('contractPreview');
  if (!sel || !wrap) return;
  const o = (state.orders || []).find(x => x.id === sel.value);
  if (!o) { wrap.innerHTML = '<p class="muted">' + t('contractSelectHint') + '</p>'; return; }
  const cust = (state.contracts || []).find(c => c.orderId === o.id);
  wrap.innerHTML = '<div class="contract-doc"><h4>' + esc(o.id) + '</h4><pre class="contract-pre">' + esc(contractDraftText(o)) + '</pre></div>'
    + '<div class="warn-box"><b>' + t('contractWarnings') + '</b><p class="small muted">' + t('contractWarningTitle') + '</p><ul>' + contractWarningsHtml() + '</ul></div>'
    + '<div class="flex gap-10">'
    + '<button type="button" class="btn" data-action="contract-print" data-order="' + o.id + '">🖨 ' + t('contractDownloadPdf') + '</button>'
    + (cust
      ? '<span class="status-pill done">' + t('contractCustodyDone') + '</span>'
      : '<button type="button" class="btn btn-primary" data-action="contract-custody" data-order="' + o.id + '">' + t('contractCustody') + '</button>')
    + '</div>'
    + (cust ? '<p class="small muted">' + t('contractExpiresAt') + '：' + fmtDate(cust.expiresAt) + ' · ' + t('contractHash') + '：<code class="ev-hash">' + esc(String(cust.contractHash || '').slice(0, 16)) + '…</code></p>' : '');
}

/* ---------- 卖家推广 / 管理员推广审核 ---------- */
function promoStatusLabel(st) {
  return st === 'approved' ? t('promoApproved') : st === 'rejected' ? t('promoRejected') : t('promoPending');
}
function sellerPromoBody(sid) {
  const my = state.products.filter(p => p.sellerId === sid);
  const reqs = (state.promotions || []).filter(r => r.sellerId === sid).sort((a, b) => b.createdAt - a.createdAt);
  return '<div class="card panel"><div class="panel-head"><h2>' + t('promoTitle') + '</h2><span class="small muted">' + t('promoSub') + '</span></div>'
    + '<p class="small muted">' + t('promoNote') + '</p>'
    + '<h3 class="section-divider">' + t('promoApply') + '</h3>'
    + '<div class="promo-prod-grid">' + (my.filter(isLive).map(p =>
      '<div class="promo-prod"><img src="' + productImg(p, 80, 80) + '" alt=""><div class="promo-prod-info"><b>' + esc(langObj(p).title) + '</b><span class="small muted">$' + fmtPrice(p.priceMin) + '–' + fmtPrice(p.priceMax) + '</span></div>'
      + '<button type="button" class="btn btn-sm btn-primary" data-action="promo-open" data-id="' + p.id + '">' + t('promoApply') + '</button></div>'
    ).join('') || '<p class="small muted">' + t('noProducts') + '</p>') + '</div>'
    + (reqs.length ? '<h3 class="section-divider">' + t('myOrders') + '</h3><div class="promo-req-list">' + reqs.map(r => {
      const p = productById(r.productId);
      return '<div class="promo-req"><b>' + esc(p ? langObj(p).title : r.productId) + '</b>'
        + '<span class="small muted">' + r.days + ' ' + t('promoDays') + ' · ' + esc(r.budget) + '</span>'
        + '<span class="status-pill ' + (r.status === 'approved' ? 'done' : r.status === 'rejected' ? 'rej' : 'pend') + '">' + promoStatusLabel(r.status) + '</span>'
        + (r.status === 'rejected' && (r.rejectReason || r.reject_reason) ? '<span class="small muted">' + esc(r.rejectReason || r.reject_reason) + '</span>' : '')
        + '</div>';
    }).join('') + '</div>' : '')
    + '</div>';
}
function adminPromoBody() {
  const reqs = (state.promotions || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  return '<div class="card panel"><div class="panel-head"><h2>' + t('promoAdmin') + '</h2><span class="small muted">' + t('promoSub') + '</span></div>'
    + (reqs.length ? reqs.map(r => {
      const p = productById(r.productId);
      return '<div class="promo-req"><b>' + esc(p ? langObj(p).title : r.productId) + '</b>'
        + '<span class="small muted">' + r.days + ' ' + t('promoDays') + ' · ' + esc(r.budget) + '</span>'
        + '<span class="status-pill ' + (r.status === 'approved' ? 'done' : r.status === 'rejected' ? 'rej' : 'pend') + '">' + promoStatusLabel(r.status) + '</span>'
        + (r.status === 'pending' ? '<div class="flex gap-10"><button type="button" class="btn btn-sm btn-primary" data-action="promo-review" data-id="' + r.id + '" data-action2="approve">' + t('approve') + '</button><button type="button" class="btn btn-sm btn-danger-ghost" data-action="promo-review" data-id="' + r.id + '" data-action2="reject">' + t('reject') + '</button></div>' : '')
        + (r.status === 'rejected' && (r.rejectReason || r.reject_reason) ? '<span class="small muted">' + esc(r.rejectReason || r.reject_reason) + '</span>' : '')
        + '</div>';
    }).join('') : '<div class="empty-state" style="padding:30px"><p>' + t('noUsers') + '</p></div>')
    + '</div>';
}
function openPromoModal(productId) {
  const p = productById(productId);
  if (!p) return;
  showModal(
    '<div class="modal-head"><h3>📈 ' + t('promoApply') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><p class="small muted">' + esc(langObj(p).title) + '</p>'
    + '<form data-form="promo-form" data-product="' + productId + '" novalidate>'
    + '<div class="field"><label>' + t('promoDays') + ' *</label><input class="input" name="days" type="number" min="1" max="90" value="7" required></div>'
    + '<div class="field"><label>' + t('promoBudget') + '</label><select class="input" name="budget"><option value="basic">Basic</option><option value="standard">Standard</option><option value="premium">Premium</option></select></div>'
    + '<div class="field"><label>' + t('tipNote') + '</label><input class="input" name="note" maxlength="300"></div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('promoSubmit') + '</button>'
    + '</form></div>'
  );
}
async function submitPromo(form) {
  const days = parseInt(form.days.value, 10);
  if (!(days >= 1) || days > 90) { toast(t('errPositive')); return; }
  try {
    await api.promotions.create({ productId: form.dataset.product, days, budget: form.budget.value, note: form.note.value });
    closeModal();
    toast('✓ ' + t('promoSubmit'));
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function reviewPromotion(id, action) {
  const reason = action === 'reject' ? (prompt(t('rejectReason')) || '') : '';
  if (action === 'reject' && !reason) { toast(t('rejectReasonPh')); return; }
  try {
    await api.promotions.review(id, { action, reason });
    toast(action === 'approve' ? '✓ ' + t('promoApproved') : t('promoRejected'));
    render();
  } catch (e) { toast(e.message || String(e)); }
}

function renderLogin() {
  document.title = t('login') + ' · BeanBeanMouse';
  return '<div class="container"><div class="login-wrap">'
    + '<h1>' + t('loginTitle') + '</h1>'
    + '<p class="sub">' + t('loginDesc') + '</p>'
    + '<div class="role-cards">'
    + '<div class="role-card" data-action="login-role" data-role="buyer">'
    + '<div class="role-ico" style="background:linear-gradient(135deg,#2563EB,#7C3AED)">🛒</div>'
    + '<h3>' + t('asBuyer') + '</h3>'
    + '<p>' + (state.lang === 'zh' ? '搜索产品、筛选对比、发送询盘并跟踪供应商回复' : 'Search products, filter, send inquiries and track supplier replies') + '</p>'
    + '</div>'
    + '<div class="role-card" data-action="login-role" data-role="seller">'
    + '<div class="role-ico" style="background:linear-gradient(135deg,#F59E0B,#DC2626)">🏭</div>'
    + '<h3>' + t('asSeller') + '</h3>'
    + '<p>' + (state.lang === 'zh' ? '发布产品、管理询盘、回复买家报价' : 'Publish products, manage inquiries and reply to buyers') + '</p>'
    + '</div>'
    + '<div class="role-card" data-action="login-role" data-role="admin">'
    + '<div class="role-ico" style="background:linear-gradient(135deg,#0F2145,#1D4ED8)">🛡️</div>'
    + '<h3>' + t('asAdmin') + '</h3>'
    + '<p>' + t('adminDesc') + '</p>'
    + '</div>'
    + '</div>'
    + '<button type="button" class="btn btn-lg guest-btn" data-action="login-guest">' + t('asGuest') + '</button>'
    + '<button type="button" class="btn btn-lg" data-action="show-register" style="margin-top:10px">📝 ' + t('registerTab') + '</button>'
    + '<div class="login-note">💡 ' + t('loginNote') + '</div>'
    + '</div></div>';
}

/* ---------- 工作台 ---------- */
function renderDashboard(path) {
  const u = state.user;
  if (!u) {
    toast(t('needLogin'));
    return renderLogin();
  }
  return u.role === 'seller' ? renderSellerDash(path) : u.role === 'admin' ? renderAdminDash(path) : renderBuyerDash(path);
}

function sideNav(items, activeTab) {
  return '<aside class="card dash-side">'
    + '<div class="side-user"><div class="name">' + esc(state.user.name) + '</div><div class="sub">' + esc((state.user.role === 'seller' ? langObj(sellerById(state.user.sellerId)).company : state.user.buyerCompany || state.user.email)) + '</div></div>'
    + '<nav class="side-nav">'
    + items.map(it =>
      '<a href="#/dashboard/' + it.tab + '" data-nav="/dashboard/' + it.tab + '" class="' + (activeTab === it.tab ? 'active' : '') + '">' + icon(it.icon) + it.label + (it.count ? '<span class="badge-dot">' + it.count + '</span>' : '') + '</a>'
    ).join('')
    + '<a href="#/login" data-nav="/login" data-action="switch-role">' + icon('users') + (state.lang === 'zh' ? '切换角色' : 'Switch role') + '</a>'
    + '</nav></aside>';
}

function renderSellerDash(path) {
  const u = state.user;
  const sid = u.sellerId;
  const seller = sellerById(sid);
  const myProducts = state.products.filter(p => p.sellerId === sid);
  const myInquiries = state.inquiries.filter(i => i.sellerId === sid).sort((a, b) => b.createdAt - a.createdAt);
  const live = myProducts.filter(isLive).length;
  const monthAgo = Date.now() - 30 * 86400000;
  const monthInq = myInquiries.filter(i => i.createdAt > monthAgo).length;
  const pending = myInquiries.filter(i => i.status === 'new').length;

  const tabs = [
    { tab: '', icon: 'chart', label: t('overview') },
    { tab: 'products', icon: 'box', label: t('productManage'), count: myProducts.length },
    { tab: 'publish', icon: 'plus', label: t('publish') },
    { tab: 'inquiries', icon: 'message', label: t('inquiryManage'), count: pending || null },
    { tab: 'promo', icon: 'sparkle', label: t('promoTitle'), count: (state.promotions || []).filter(r => r.sellerId === sid && r.status === 'pending').length || null },
    { tab: 'orders', icon: 'box', label: t('orders'), count: (state.orders || []).filter(o => o.sellerId === sid && o.status === 'created').length || null }
  ];
  const activeTab = path.split('/')[2] || '';
  let body = '';

  if (activeTab === '' || activeTab === 'overview') {
    body = companyBannerHtml() + '<div class="stat-grid">'
      + '<div class="card stat-card"><div class="stat-ico ico-blue">' + icon('box') + '</div><div><div class="n">' + live + '</div><div class="l">' + t('statLive') + '</div></div></div>'
      + '<div class="card stat-card"><div class="stat-ico ico-amber">' + icon('message') + '</div><div><div class="n">' + monthInq + '</div><div class="l">' + t('statInquiries') + '</div></div></div>'
      + '<div class="card stat-card"><div class="stat-ico ico-green">' + icon('clock') + '</div><div><div class="n">' + pending + '</div><div class="l">' + t('statPending') + '</div></div></div>'
      + '<div class="card stat-card"><div class="stat-ico ico-purple">' + icon('sparkle') + '</div><div><div class="n">' + seller.responseRate + '%</div><div class="l">' + t('statRate') + '</div></div></div>'
      + '</div>'
      + '<div class="card panel"><div class="panel-head"><h2>' + t('recentInquiries') + '</h2><a class="btn btn-sm" href="#/dashboard/inquiries" data-nav="/dashboard/inquiries">' + t('viewAll') + ' →</a></div>'
      + (myInquiries.length ? myInquiries.slice(0, 4).map(inquiryItem).join('') : '<div class="empty-state" style="padding:30px"><div class="ico">📭</div><p>' + t('noInquiries') + '</p></div>')
      + '</div>'
      + '<div class="card panel mt-20"><div class="panel-head"><h2>' + t('quickActions') + '</h2></div>'
      + '<div class="flex gap-10" style="flex-wrap:wrap">'
      + '<a class="btn btn-primary" href="#/dashboard/publish" data-nav="/dashboard/publish">' + icon('plus') + t('newProduct') + '</a>'
      + '<a class="btn" href="#/dashboard/products" data-nav="/dashboard/products">' + icon('box') + t('productManage') + '</a>'
      + '<a class="btn" href="#/dashboard/inquiries" data-nav="/dashboard/inquiries">' + icon('message') + t('inquiryManage') + '</a>'
      + '</div></div>';
  } else if (activeTab === 'products') {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('productManage') + '</h2><a class="btn btn-primary btn-sm" href="#/dashboard/publish" data-nav="/dashboard/publish">' + icon('plus') + t('newProduct') + '</a></div>'
      + (myProducts.length
        ? '<div class="table-responsive"><table class="table"><thead><tr><th>' + t('productDetail') + '</th><th>' + t('category') + '</th><th>' + t('priceRangeLabel') + '</th><th>' + t('moqLabel') + '</th><th>' + t('statusPill') + '</th><th></th></tr></thead><tbody>'
        + myProducts.map(p => {
          const st = p.status === undefined || p.status === 'on' ? 'on' : p.status;
          const pillCls = st === 'on' ? 'live' : st === 'pending' ? 'pend' : st === 'rejected' ? 'rej' : 'off';
          const pillTxt = st === 'on' ? t('onShelfLabel') : st === 'pending' ? t('pendingLabel') : st === 'rejected' ? t('rejectedLabel') : t('offShelfLabel');
          return '<tr>'
            + '<td><div class="prod-cell"><img src="' + productImg(p, 120, 90) + '" alt=""><span class="t">' + esc(langObj(p).title) + '</span></div>'
            + (st === 'rejected' ? '<p class="small reject-reason" style="margin:4px 0 0">' + t('rejectedLabel') + '：' + esc(p.rejectReason || p.reject_reason || '') + '</p><p class="small muted" style="margin:0">' + t('resubmitHint') + '</p>' : '')
            + '</td>'
            + '<td>' + esc(langObj(catById(p.cat))) + '</td>'
            + '<td>$' + fmtPrice(p.priceMin) + '–' + fmtPrice(p.priceMax) + '</td>'
            + '<td>' + p.moq + ' ' + p.unit + '</td>'
            + '<td><span class="status-pill ' + pillCls + '">' + pillTxt + '</span></td>'
            + '<td><div class="row-actions">'
            + (st === 'on' || st === 'off' ? '<button type="button" class="btn btn-sm" data-action="toggle-status" data-id="' + p.id + '">' + (st === 'on' ? t('offShelf') : t('onShelf')) + '</button>' : '')
            + '<button type="button" class="btn btn-sm" data-action="edit-product" data-id="' + p.id + '">' + icon('edit') + t('edit') + '</button>'
            + '<button type="button" class="btn btn-sm btn-danger-ghost" data-action="delete-product" data-id="' + p.id + '">' + icon('trash') + '</button>'
            + '</div></td></tr>';
        }).join('') + '</tbody></table></div>'
        : '<div class="empty-state" style="padding:36px"><div class="ico">📦</div><p>' + t('noProducts') + '</p></div>')
      + '</div>';
  } else if (activeTab === 'orders') {
    body = companyBannerHtml() + ordersBody();
  } else if (activeTab === 'promo') {
    body = sellerPromoBody(sid);
  } else if (activeTab === 'publish') {
    body = renderPublishForm();
  } else if (activeTab === 'inquiries') {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('inquiryManage') + '</h2><span class="small muted">' + myInquiries.length + ' ' + t('totalInquiries') + '</span></div>'
      + (myInquiries.length ? myInquiries.map(inquiryItem).join('') : '<div class="empty-state" style="padding:36px"><div class="ico">📭</div><p>' + t('noInquiries') + '</p></div>')
      + '</div>';
  }
  return '<div class="container page"><div class="dash-layout">' + sideNav(tabs, activeTab) + '<div>' + body + '</div></div></div>';
}

/* ---------- 平台管理员后台 ---------- */
function renderAdminDash(path) {
  document.title = t('adminPanel') + ' · BeanBeanMouse';
  const activeTab = path.split('/')[2] || 'overview';
  const pendingCount = state.products.filter(p => p.status === 'pending').length;
  const verifyCount = (state.companies || []).filter(c => c.status === 'pending').length;
  const tabs = [
    { tab: 'overview', icon: 'chart', label: t('adminOverview') },
    { tab: 'review', icon: 'eye', label: t('productReview'), count: pendingCount || null },
    { tab: 'verify', icon: 'building', label: t('companyVerify'), count: verifyCount || null },
    { tab: 'promo', icon: 'sparkle', label: t('promoAdmin'), count: (state.promotions || []).filter(r => r.status === 'pending').length || null },
    { tab: 'catreqs', icon: 'sparkle', label: t('catRequests'), count: (state.categoryRequests || []).filter(r => r.status === 'new').length || null },
    { tab: 'users', icon: 'users', label: t('userManage') },
    { tab: 'logs', icon: 'clock', label: t('auditLog') }
  ];
  let body = '';
  if (activeTab === 'review') body = adminReviewBody();
  else if (activeTab === 'verify') body = adminVerifyBody();
  else if (activeTab === 'promo') body = adminPromoBody();
  else if (activeTab === 'catreqs') body = adminCatReqBody();
  else if (activeTab === 'users') body = adminUsersBody();
  else if (activeTab === 'logs') body = adminLogsBody();
  else body = adminOverviewBody();
  return '<div class="container page"><div class="dash-layout">' + sideNav(tabs, activeTab) + '<div>' + body + '</div></div></div>';
}

function adminStatCard(cls, iconName, n, label) {
  return '<div class="card stat-card"><div class="stat-ico ' + cls + '">' + icon(iconName) + '</div><div><div class="n">' + n + '</div><div class="l">' + label + '</div></div></div>';
}

function adminCatReqBody() {
  const rows = (state.categoryRequests || []).slice().sort((a, b) => b.createdAt - a.createdAt);
  return '<div class="card panel"><div class="panel-head"><h2>' + t('catRequests') + '</h2></div>'
    + (rows.length ? rows.map(r =>
      '<div class="inquiry-item"><div class="top"><div class="who"><div class="nm">' + esc(r.name) + '</div>'
      + '<div class="ct">' + fmtDate(r.createdAt) + ' · ' + (r.targetMarkets || []).join(', ') + ' · <span class="status-pill ' + (r.status === 'done' ? 'done' : r.status === 'invited' ? '' : 'new') + '">' + (r.status === 'new' ? t('catStatusNew') : r.status === 'invited' ? t('catStatusInvited') : t('catStatusDone')) + '</span></div></div>'
      + '<div class="flex gap-10">'
      + (r.status === 'new' ? '<button type="button" class="btn btn-sm btn-primary" data-action="catreq-status" data-id="' + r.id + '" data-status="invited">' + t('catStatusInvited') + '</button>' : '')
      + '<button type="button" class="btn btn-sm" data-action="catreq-status" data-id="' + r.id + '" data-status="done">' + t('catStatusDone') + '</button>'
      + '</div>'
      + (r.description ? '<p class="muted" style="margin-top:6px">' + esc(r.description) + '</p>' : '')
      + (r.note ? '<p class="small muted">📝 ' + esc(r.note) + '</p>' : '')
      + '</div></div>').join('')
      : '<div class="empty-state" style="padding:36px"><div class="ico">🙋</div><p>' + t('noUsers') + '</p></div>')
    + '</div>';
}

function adminOverviewBody() {
  const live = state.products.filter(isLive).length;
  const pending = state.products.filter(p => p.status === 'pending').length;
  const monthAgo = Date.now() - 30 * 864e5;
  const monthInq = state.inquiries.filter(i => i.createdAt > monthAgo).length;
  const catCount = {};
  state.inquiries.forEach(i => { const p = productById(i.productId); if (p) catCount[p.cat] = (catCount[p.cat] || 0) + 1; });
  const catRows = Object.entries(catCount).sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...catRows.map(r => r[1]));
  const cntCount = {};
  state.inquiries.forEach(i => { const c = i.country || '—'; cntCount[c] = (cntCount[c] || 0) + 1; });
  const cntRows = Object.entries(cntCount).sort((a, b) => b[1] - a[1]);
  const maxCnt = Math.max(1, ...cntRows.map(r => r[1]));
  const barRows = (rows, max, labelFn) => rows.length
    ? rows.map(r => '<div class="bar-row"><span class="bar-label">' + esc(labelFn(r[0])) + '</span><div class="bar-track"><div class="bar-fill" style="width:' + Math.max(8, Math.round(r[1] / max * 100)) + '%"></div></div><span class="bar-val">' + r[1] + '</span></div>').join('')
    : '<div class="empty-state" style="padding:20px"><p>' + t('noInquiries') + '</p></div>';
  const logs = (state.logs || []).slice(0, 5);
  return '<div class="stat-grid">'
    + adminStatCard('ico-blue', 'users', state.users.length, t('statUsers'))
    + adminStatCard('ico-green', 'box', live, t('statLive'))
    + adminStatCard('ico-amber', 'clock', pending, t('statPendingProducts'))
    + adminStatCard('ico-purple', 'message', monthInq, t('statInquiries'))
    + '</div>'
    + '<div class="stat-grid stat-grid--two">'
    + '<div class="card panel"><div class="panel-head"><h2>' + t('inqByCategory') + '</h2></div><div class="chart-bars">' + barRows(catRows, maxCat, k => langObj(catById(k))) + '</div></div>'
    + '<div class="card panel"><div class="panel-head"><h2>' + t('inqByCountry') + '</h2></div><div class="chart-bars">' + barRows(cntRows, maxCnt, k => k === '—' ? '—' : flagEmoji(k) + ' ' + countryName(k)) + '</div></div>'
    + '</div>'
    + '<div class="card panel mt-20"><div class="panel-head"><h2>' + t('latestActivity') + '</h2><a class="btn btn-sm" href="#/dashboard/logs" data-nav="/dashboard/logs">' + t('viewAll') + ' →</a></div>'
    + (logs.length
      ? '<div class="table-responsive"><table class="table"><thead><tr><th>' + t('logTime') + '</th><th>' + t('logActor') + '</th><th>' + t('logAction') + '</th><th>' + t('logTarget') + '</th></tr></thead><tbody>'
      + logs.map(l => '<tr><td>' + fmtDate(l.ts) + '</td><td>' + esc(l.actor) + '</td><td>' + esc(l.action) + '</td><td>' + esc(l.target) + '</td></tr>').join('')
      + '</tbody></table></div>'
      : '<div class="empty-state" style="padding:24px"><p>' + t('logsEmpty') + '</p></div>')
    + '</div>';
}

function adminReviewBody() {
  const { params } = parseHash();
  const st = params.get('status') || 'pending';
  const list = state.products.filter(p => st === 'pending' ? p.status === 'pending' : st === 'rejected' ? p.status === 'rejected' : isLive(p));
  const tabs = [
    { k: 'pending', label: t('pendingLabel') },
    { k: 'live', label: t('onShelfLabel') },
    { k: 'rejected', label: t('rejectedLabel') }
  ];
  return '<div class="card panel"><div class="panel-head"><h2>' + t('productReview') + '</h2><span class="small muted">' + t('reviewHint') + '</span></div>'
    + '<div class="sub-tabs">' + tabs.map(tb => '<a class="sub-tab ' + (st === tb.k ? 'on' : '') + '" href="#/dashboard/review?status=' + tb.k + '" data-nav="/dashboard/review?status=' + tb.k + '">' + tb.label + (tb.k === 'pending' ? ' (' + list.length + ')' : '') + '</a>').join('') + '</div>'
    + (list.length ? list.map(p => adminReviewCard(p, st)).join('') : '<div class="empty-state" style="padding:36px"><div class="ico">✅</div><p>' + t('noPending') + '</p></div>')
    + '</div>';
}

function adminReviewCard(p, st) {
  const seller = sellerOf(p);
  const risks = st === 'pending' ? complianceCheck(p) : [];
  const stLabel = p.status === 'pending' ? t('pendingLabel') : p.status === 'rejected' ? t('rejectedLabel') : t('onShelfLabel');
  const stCls = p.status === 'pending' ? 'pend' : p.status === 'rejected' ? 'rej' : 'live';
  return '<div class="review-card">'
    + '<img class="thumb" src="' + productImg(p, 240, 180) + '" alt="' + esc(langObj(p).title) + '">'
    + '<div class="info">'
    + '<div class="head"><b>' + esc(langObj(p).title) + '</b><span class="status-pill ' + stCls + '">' + stLabel + '</span></div>'
    + '<div class="meta small muted">' + esc(langObj(seller).company) + ' · ' + flagEmoji(p.country) + ' ' + countryName(p.country) + ' · $' + fmtPrice(p.priceMin) + '–' + fmtPrice(p.priceMax) + ' · ' + t('moqLabel') + ' ' + p.moq + ' ' + p.unit + '</div>'
    + '<div class="meta">' + (p.certs || []).map(c => '<span class="chip cert">' + esc(c) + '</span>').join('') + '</div>'
    + ((p.markets || []).length ? '<div class="meta">' + p.markets.map(m => '<span class="chip">' + esc(MARKET_COMPLIANCE[m] ? langObj(MARKET_COMPLIANCE[m]) : m) + '</span>').join('') + '</div>' : '')
    + (st === 'pending'
      ? (risks.length
        ? '<div class="risk-box"><div class="risk-title">⚠ ' + t('riskHints') + '</div>' + risks.map(r => '<span class="risk-chip">' + esc(r) + '</span>').join('') + '</div>'
        : '<div class="risk-box ok">✓ ' + t('noRisk') + '</div>')
      : '')
    + (p.status === 'rejected' && p.rejectReason ? '<div class="reject-reason">' + t('rejectedLabel') + '：' + esc(p.rejectReason) + '</div>' : '')
    + '</div>'
    + (st === 'pending'
      ? '<div class="actions">'
        + '<button type="button" class="btn btn-sm btn-primary" data-action="approve-product" data-id="' + p.id + '">' + icon('check') + t('approve') + '</button>'
        + '<button type="button" class="btn btn-sm btn-danger-ghost" data-action="reject-product" data-id="' + p.id + '">' + t('reject') + '</button>'
        + '</div>'
      : st === 'live'
        ? '<div class="actions"><a class="btn btn-sm" href="#/product/' + p.id + '" data-nav="/product/' + p.id + '">' + t('viewDetail') + ' →</a></div>'
        : '<div class="actions"></div>')
    + '</div>';
}

function adminVerifyBody() {
  const list = state.companies || [];
  const pending = list.filter(c => c.status === 'pending');
  const approved = list.filter(c => c.status === 'approved');
  const rejected = list.filter(c => c.status === 'rejected');
  return '<div class="card panel"><div class="panel-head"><h2>' + t('companyVerify') + '</h2><span class="small muted">' + pending.length + ' ' + t('pendingVerify') + '</span></div>'
    + (pending.length
      ? pending.map(verifyCard).join('')
      : '<div class="empty-state" style="padding:28px"><div class="ico">🏛️</div><p>' + t('noCompanies') + '</p></div>')
    + (approved.length ? '<div class="section-divider">' + t('verifiedLabel') + ' · ' + approved.length + '</div>' + approved.map(verifyCard).join('') : '')
    + (rejected.length ? '<div class="section-divider">' + t('rejectedVerify') + ' · ' + rejected.length + '</div>' + rejected.map(verifyCard).join('') : '')
    + '</div>';
}

function verifyCard(c) {
  const seller = sellerById(c.sellerId);
  const st = c.status;
  const stCls = st === 'approved' ? 'live' : st === 'rejected' ? 'rej' : 'pend';
  const stLabel = st === 'approved' ? t('verifiedLabel') : st === 'rejected' ? t('rejectedVerify') : t('pendingVerify');
  return '<div class="verify-card">'
    + '<span class="avatar" style="width:44px;height:44px;font-size:16px">' + esc(initialsOf(langObj(seller).company)) + '</span>'
    + '<div class="info">'
    + '<div class="head"><b>' + esc(langObj(seller).company) + '</b><span class="status-pill ' + stCls + '">' + stLabel + '</span></div>'
    + '<div class="meta small muted">' + esc(langObj(seller).city) + ', ' + countryName(seller.country) + ' · ' + t('since') + ' ' + seller.since + '</div>'
    + '<div class="meta"><span class="small muted">' + t('docsLabel') + '：</span>' + c.docs.map(d => '<span class="chip">' + esc(d) + '</span>').join('') + '</div>'
    + '</div>'
    + (st === 'pending'
      ? '<div class="actions">'
        + '<button type="button" class="btn btn-sm btn-primary" data-action="verify-company" data-id="' + c.sellerId + '">' + icon('check') + t('verifyCompany') + '</button>'
        + '<button type="button" class="btn btn-sm btn-danger-ghost" data-action="reject-verify" data-id="' + c.sellerId + '">' + t('rejectVerify') + '</button>'
        + '</div>'
      : '')
    + '</div>';
}

function adminUsersBody() {
  const list = state.users || [];
  return '<div class="card panel"><div class="panel-head"><h2>' + t('userManage') + '</h2><span class="small muted">' + list.length + ' ' + t('statUsers') + '</span></div>'
    + (list.length
      ? '<div class="table-responsive"><table class="table"><thead><tr><th>' + t('login') + '</th><th>' + t('roleCol') + '</th><th>' + t('contactEmail') + '</th><th>' + t('companyCol') + '</th><th>' + t('countryCol') + '</th><th>' + t('joinedCol') + '</th><th>' + t('statusPill') + '</th><th></th></tr></thead><tbody>'
      + list.map(u => {
        const roleLabel = u.role === 'admin' ? t('adminRoleTag') : u.role === 'seller' ? t('sellerRoleLabel') : t('buyerRoleLabel');
        const frozen = u.status === 'frozen';
        return '<tr>'
          + '<td><div class="prod-cell"><span class="avatar" style="width:30px;height:30px;font-size:12px">' + esc(String(u.name || '?')[0].toUpperCase()) + '</span><span class="t">' + esc(u.name) + '</span></div></td>'
          + '<td>' + roleLabel + '</td>'
          + '<td>' + esc(u.email) + '</td>'
          + '<td>' + esc(u.company || '—') + '</td>'
          + '<td>' + (u.country ? flagEmoji(u.country) + ' ' + countryName(u.country) : '—') + '</td>'
          + '<td>' + fmtDate(u.joinedAt) + '</td>'
          + '<td><span class="status-pill ' + (frozen ? 'rej' : 'live') + '">' + (frozen ? t('frozenStatus') : t('activeStatus')) + '</span></td>'
          + '<td><div class="row-actions">' + (u.role === 'admin' ? '<span class="small muted">—</span>' : '<button type="button" class="btn btn-sm ' + (frozen ? '' : 'btn-danger-ghost') + '" data-action="freeze-user" data-id="' + u.id + '">' + (frozen ? t('unfreeze') : t('freeze')) + '</button>') + '</div></td>'
          + '</tr>';
      }).join('') + '</tbody></table></div>'
      : '<div class="empty-state"><p>' + t('noUsers') + '</p></div>')
    + '</div>';
}

function adminLogsBody() {
  const logs = state.logs || [];
  return '<div class="card panel"><div class="panel-head"><h2>' + t('auditLog') + '</h2><span class="small muted">' + logs.length + '</span></div>'
    + (logs.length
      ? '<div class="table-responsive"><table class="table"><thead><tr><th>' + t('logTime') + '</th><th>' + t('logActor') + '</th><th>' + t('logAction') + '</th><th>' + t('logTarget') + '</th><th>' + t('logDetail') + '</th></tr></thead><tbody>'
      + logs.map(l => '<tr><td>' + fmtDate(l.ts) + '</td><td>' + esc(l.actor) + '</td><td>' + esc(l.action) + '</td><td>' + esc(l.target) + '</td><td class="small muted">' + esc(l.detail || '—') + '</td></tr>').join('')
      + '</tbody></table></div>'
      : '<div class="empty-state" style="padding:36px"><div class="ico">📋</div><p>' + t('logsEmpty') + '</p></div>')
    + '</div>';
}

function quoteBlock(i) {
  const q = i.quote;
  return '<div class="quote-title">' + icon('file') + ' ' + t('quoteBlock') + '</div>'
    + '<div class="quote-grid">'
    + '<span>' + t('quotePrice') + '：<b>$' + fmtPrice(q.price) + '</b></span>'
    + '<span>' + t('quoteIncoterm') + '：<b>' + esc(q.incoterm) + '</b></span>'
    + '<span>' + t('quotePayment') + '：' + esc(langObj(q.payment)) + '</span>'
    + '<span>' + t('quoteValidity') + '：' + q.validity + ' ' + t('days') + '</span>'
    + '<span>' + t('quoteLeadTime') + '：' + q.leadTime + ' ' + t('days') + '</span>'
    + (q.note ? '<span class="full">' + t('quoteNote') + '：' + esc(q.note) + '</span>' : '')
    + '</div>'
    + '<div class="doc-actions">'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="print-doc" data-id="' + i.id + '" data-type="quotation">' + icon('file') + t('printQuotation') + '</button>'
    + '<button type="button" class="btn btn-sm" data-action="print-doc" data-id="' + i.id + '" data-type="proforma">' + icon('file') + t('printProforma') + '</button>'
    + '</div>';
}

function inquiryMsg(i) {
  return '<div class="msg-wrap"><div class="msg">' + esc(i.message) + '</div>'
    + (msgTransState[i.id]
      ? '<div class="trans-msg" data-trans-box="' + i.id + '"><span class="trans-pill">⚡ ' + t('translateLabel') + '</span><p>' + t('translating') + '</p><div class="trans-note">' + t('translateNote') + '</div></div>'
      : '')
    + '<button type="button" class="trans-toggle" data-action="toggle-msg-trans" data-id="' + i.id + '">⚡ ' + t('translateToggle') + '</button></div>';
}

function inquiryItem(i) {
  const p = productById(i.productId);
  const done = i.status === 'handled' || i.status === 'quoted';
  return '<div class="inquiry-item">'
    + '<div class="top">'
    + '<span class="avatar">' + esc(initialsOf(i.name)) + '</span>'
    + '<div class="who">'
    + '<div class="nm">' + esc(i.name) + (i.country ? ' <span class="flag">' + flagEmoji(i.country) + '</span>' : '') + '</div>'
    + '<div class="ct">' + esc(i.company || '—') + ' · ' + esc(i.email) + ' · ' + t('sentAt') + ' ' + fmtDate(i.createdAt) + '</div>'
    + '</div>'
    + '<span class="status-pill ' + (done ? 'done' : 'new') + '">' + (i.status === 'quoted' ? t('quotedStatus') : done ? t('statusReplied') : t('statusNew')) + '</span>'
    + '</div>'
    + inquiryMsg(i)
    + '<div class="prod-ref">' + (p ? '<img src="' + productImg(p, 120, 90) + '" alt="">' : '') + '<span>' + (p ? esc(langObj(p).title) : '—') + '</span>'
    + '<span class="chip">' + i.qty + ' ' + i.unit + '</span>'
    + (i.payment ? '<span class="chip">' + t('payment') + ' ' + esc(langObj(i.payment)) + '</span>' : '')
    + '</div>'
    + '<div class="foot">'
    + (done
      ? '<span class="small muted">' + icon('check') + ' ' + (i.status === 'quoted' ? t('quotedStatus') : t('replied')) + '</span>'
      : '<button type="button" class="btn btn-sm" data-action="mark-handled" data-id="' + i.id + '">' + t('markHandled') + '</button>')
    + '</div>'
    + (i.quote
      ? '<div class="reply-box">' + quoteBlock(i) + '</div>'
      : done && i.reply
        ? '<div class="reply-box"><div class="reply-msg"><b>' + (state.lang === 'zh' ? '您的回复：' : 'Your reply: ') + '</b>' + esc(i.reply) + '</div></div>'
        : '<div class="reply-box"><form data-form="quote-form" data-id="' + i.id + '" novalidate>'
          + '<div class="quote-title">' + icon('file') + ' ' + t('quoteTitle') + '</div>'
          + '<div class="quote-form-grid">'
          + '<div class="field"><label>' + t('quotePrice') + ' *</label><input class="input" type="number" min="0" step="0.01" name="price" required></div>'
          + '<div class="field"><label>' + t('quoteIncoterm') + ' *</label><select class="select" name="incoterm">' + INCOTERMS.map(x => '<option value="' + x.code + '">' + x.code + '</option>').join('') + '</select></div>'
          + '<div class="field"><label>' + t('quotePayment') + ' *</label><select class="select" name="payment">' + PAYMENT_TERMS.map((pt, j) => '<option value="' + j + '">' + esc(langObj(pt)) + '</option>').join('') + '</select></div>'
          + '<div class="field"><label>' + t('quoteValidity') + ' *</label><input class="input" type="number" min="1" name="validity" value="15" required></div>'
          + '<div class="field"><label>' + t('quoteLeadTime') + ' *</label><input class="input" type="number" min="1" name="leadTime" value="' + (p ? p.leadTime : '15') + '" required></div>'
          + '</div>'
          + '<div class="field"><label>' + t('quoteNote') + '</label><textarea class="textarea" name="note" placeholder="' + t('replyPlaceholder') + '" style="min-height:54px"></textarea></div>'
          + '<div class="trans-preview"><span class="trans-label">⚡ ' + t('translateLabel') + '</span><p data-trans-target="quoteNote' + i.id + '">—</p><div class="trans-note">' + t('translateNote') + '</div></div>'
          + '<details class="doc-ref"><summary>' + icon('file') + ' ' + t('docReference') + '</summary>'
          + '<p class="small muted">' + t('docStandardNote') + '</p>'
          + '<div class="doc-fields"><b>' + t('docQuotation') + '</b><ul>' + t('docQuotationFields').split('\n').map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
          + '<div class="doc-fields"><b>' + t('docProforma') + '</b><ul>' + t('docProformaFields').split('\n').map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
          + '</details>'
          + '<button type="submit" class="btn btn-primary">' + icon('send') + t('sendQuote') + '</button>'
          + '</form></div>')
    + '</div>';
}

function submitQuote(f) {
  const i = state.inquiries.find(x => x.id === f.dataset.id);
  if (!i) return;
  if (!validateForm(f, {
    price: [v => requireNumber(v, 0.01)],
    incoterm: [requireText],
    validity: [v => requireNumber(v, 1)],
    leadTime: [v => requireNumber(v, 1)]
  })) return;
  const fd = new FormData(f);
  const price = +fd.get('price');
  const incoterm = fd.get('incoterm');
  const validity = +fd.get('validity');
  const leadTime = +fd.get('leadTime');
  i.quote = {
    price: price,
    incoterm: incoterm,
    payment: PAYMENT_TERMS[+(fd.get('payment') || 0)] || PAYMENT_TERMS[0],
    validity: validity,
    leadTime: leadTime,
    note: (fd.get('note') || '').trim()
  };
  i.status = 'quoted';
  i.reply = '';
  saveState();
  toast(t('quoteSent'));
  renderPage();
}

function docNumber(type) {
  const d = new Date();
  const ymd = '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  return (type === 'proforma' ? 'PI-' : 'QT-') + ymd + '-' + Math.floor(1000 + Math.random() * 9000);
}

function buildDoc(i, type) {
  const p = productById(i.productId);
  if (!p || !i.quote) return '';
  const seller = sellerOf(p);
  const q = i.quote;
  const lang = state.lang;
  const title = type === 'proforma' ? t('docProforma') : t('docQuotation');
  const amountN = i.qty * q.price;
  const dateFmt = ts => new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  return '<div class="doc" id="docSheet">'
    + '<div class="doc-head">'
    + '<div class="doc-brand"><b>' + esc(seller[lang].company) + '</b><div>' + esc(seller[lang].city) + ', ' + countryName(seller.country) + '</div><div class="doc-web">BeanBeanMouse</div></div>'
    + '<div class="doc-title"><h2>' + esc(title) + '</h2><div>DOCUMENT · ' + t('quoteBlock') + '</div></div>'
    + '</div>'
    + '<div class="doc-meta">'
    + '<span><b>' + t('docNo') + '：</b>' + docNumber(type) + '</span>'
    + '<span><b>' + t('docDate') + '：</b>' + dateFmt(Date.now()) + '</span>'
    + (type === 'quotation' ? '<span><b>' + t('docValidUntil') + '：</b>' + dateFmt(Date.now() + q.validity * 864e5) + '</span>' : '')
    + '<span><b>' + t('docCurrency') + '</b></span>'
    + '</div>'
    + '<div class="doc-parties">'
    + '<div><div class="doc-party-label">' + t('docSeller') + '</div><b>' + esc(seller[lang].company) + '</b><div>' + esc(seller[lang].city) + ', ' + countryName(seller.country) + '</div></div>'
    + '<div><div class="doc-party-label">' + t('docBuyer') + '</div><b>' + esc(i.name) + '</b><div>' + esc(i.company || '—') + '</div><div>' + esc(i.email) + '</div></div>'
    + '</div>'
    + '<table class="doc-table">'
    + '<thead><tr><th>' + t('docItem') + '</th><th>' + t('docDesc') + '</th><th>HS Code</th><th>' + t('docQty') + '</th><th>' + t('docUnitPrice') + '</th><th>' + t('docAmount') + '</th></tr></thead>'
    + '<tbody><tr><td>1</td><td>' + esc(p[lang].title) + '</td><td>' + esc(p.hsCode || '—') + '</td><td>' + i.qty + ' ' + esc(i.unit) + '</td><td>' + fmtPrice(q.price) + '</td><td>' + fmtPrice(amountN) + '</td></tr></tbody>'
    + '<tfoot><tr><td colspan="5" class="doc-total-label">' + t('docTotal') + '</td><td><b>' + fmtPrice(amountN) + '</b></td></tr></tfoot>'
    + '</table>'
    + '<div class="doc-terms">'
    + '<span><b>' + t('quoteIncoterm') + '：</b>' + esc(q.incoterm) + '</span>'
    + '<span><b>' + t('quotePayment') + '：</b>' + esc(q.payment[lang]) + '</span>'
    + '<span><b>' + t('quoteLeadTime') + '：</b>' + q.leadTime + ' ' + t('days') + '</span>'
    + (type === 'quotation' ? '<span><b>' + t('quoteValidity') + '：</b>' + q.validity + ' ' + t('days') + '</span>' : '')
    + '<span class="full">' + t('docInsurance') + '</span>'
    + (q.note ? '<span class="full"><b>' + t('quoteNote') + '：</b>' + esc(q.note) + '</span>' : '')
    + '</div>'
    + '<div class="doc-sign"><div>' + t('docSellerSign') + '</div><div>' + t('docBuyerSign') + '</div></div>'
    + '<div class="doc-disclaimer">' + t('docDisclaimer') + '</div>'
    + '</div>';
}

function openPrintDoc(inquiryId, type) {
  const i = state.inquiries.find(x => x.id === inquiryId);
  if (!i || !i.quote) return;
  const doc = buildDoc(i, type);
  if (!doc) return;
  const printEl = document.getElementById('printDoc');
  if (printEl) printEl.innerHTML = doc;
  const title = type === 'proforma' ? t('docProforma') : t('docQuotation');
  showModal('<div class="modal doc-modal"><div class="modal-head"><h3>' + icon('file') + ' ' + esc(title) + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">' + doc
    + '<p class="small muted">' + icon('file') + ' ' + t('printHint') + '</p>'
    + '<div class="doc-actions"><button type="button" class="btn btn-primary" data-action="print-now">🖨 ' + t('printNow') + '</button>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('close') + '</button></div>'
    + '</div></div>');
}

function renderPublishForm() {
  const { params } = parseHash();
  const editId = params.get('id') || '';
  const p = editId ? productById(editId) : null;
  const hue = p ? p.hue : 210;
  const cat = p ? p.cat : 'machinery';
  const hueList = [210, 262, 330, 24, 160, 0];
  return '<div class="card panel"><div class="panel-head"><h2>' + (p ? t('updateProduct') : t('publish')) + '</h2>'
    + (p ? '<button type="button" class="btn btn-sm" data-action="cancel-edit">' + t('cancelEdit') + '</button>' : '')
    + '</div>'
    + '<div class="form-grid">'
    + '<form data-form="product-form" data-id="' + (p ? p.id : '') + '" class="full" novalidate>'
    + '<input type="hidden" name="hue" value="' + hue + '">'
    + '<div class="form-grid">'
    + '<div class="field"><label>' + t('titleEn') + ' *</label><input class="input" name="titleEn" value="' + esc(p ? p.en.title : '') + '" required></div>'
    + '<div class="field"><label>' + t('titleZh') + ' *</label><input class="input" name="titleZh" value="' + esc(p ? p.zh.title : '') + '" required></div>'
    + '<div class="field"><label>' + t('srcLangField') + ' <span class="hint">' + t('srcLangAuto') + '</span></label><select class="select" name="srcLang">'
    + '<option value="auto"' + (!p || !p.srcLang ? ' selected' : '') + '>' + t('srcLangAuto') + '</option>'
    + '<option value="zh"' + (p && p.srcLang === 'zh' ? ' selected' : '') + '>中文</option>'
    + '<option value="en"' + (p && p.srcLang === 'en' ? ' selected' : '') + '>English</option>'
    + '</select></div>'
    + '<div class="field"><label>' + t('categoryField') + ' *</label><select class="select" name="cat">' + CATEGORIES.map(c => '<option value="' + c.id + '" ' + (cat === c.id ? 'selected' : '') + '>' + langObj(c) + '</option>').join('') + '</select></div>'
    + '<div class="field full"><label>' + t('subcatField') + ' <span class="hint">' + t('subcatHint') + '</span></label><select class="select" name="sub">'
    + '<option value="">' + t('allSubs') + '</option>'
    + CATEGORIES.map(c => '<optgroup label="' + esc(langObj(c)) + '">' + (c.subs || []).map(s => '<option value="' + s.id + '"' + (p && p.sub === s.id ? ' selected' : '') + '>' + esc(langObj(s)) + ' · HS ' + esc(s.hs) + '</option>').join('') + '</optgroup>').join('')
    + '</select></div>'
    + '<div class="field"><label>' + t('chooseImage') + '</label><div class="palette">' + hueList.map(h => '<span class="swatch ' + (h === hue ? 'on' : '') + '" data-action="pick-hue" data-hue="' + h + '" style="background:linear-gradient(135deg,hsl(' + h + ' 55% 48%),hsl(' + ((h + 45) % 360) + ' 55% 30%))"></span>').join('') + '</div></div>'
    + '<div class="field"><label>' + t('priceMinField') + ' *</label><input class="input" type="number" min="0" step="0.01" name="priceMin" value="' + (p ? p.priceMin : '') + '" required></div>'
    + '<div class="field"><label>' + t('priceMaxField') + ' *</label><input class="input" type="number" min="0" step="0.01" name="priceMax" value="' + (p ? p.priceMax : '') + '" required></div>'
    + '<div class="field"><label>' + t('moqField') + ' *</label><div class="input-group"><input class="input" type="number" min="1" name="moq" value="' + (p ? p.moq : '') + '" required><select class="select" name="unit" style="width:100px">' + UNITS.map(u => '<option value="' + u + '" ' + (p && p.unit === u ? 'selected' : '') + '>' + u + '</option>').join('') + '</select></div></div>'
    + '<div class="field"><label>' + t('leadTimeField') + ' *</label><div class="input-group"><input class="input" type="number" min="1" name="leadTime" value="' + (p ? p.leadTime : '') + '" required><span class="sep">' + t('days') + '</span></div></div>'
    + '<div class="field"><label>' + t('originLabel') + ' *</label><select class="select" name="country">' + Object.keys(COUNTRY_NAMES).map(c => '<option value="' + c + '" ' + (p && p.country === c ? 'selected' : '') + '>' + flagEmoji(c) + ' ' + countryName(c) + '</option>').join('') + '</select></div>'
    + '<div class="field"><label>' + t('hsCode') + ' <span class="hint">' + t('hsHint') + '</span></label><input class="input" name="hsCode" value="' + esc(p ? (p.hsCode || '') : '') + '" placeholder="8456.11"></div>'
    + '<div class="field full"><label>' + t('termsField') + '</label><div class="check-group">' + TERM_LIST.map(tr => '<label class="check-pill"><input type="checkbox" name="terms" value="' + tr + '" ' + (p && p.terms.includes(tr) ? 'checked' : '') + '>' + tr + '</label>').join('') + '</div></div>'
    + '<div class="field full"><label>' + t('certsField') + '</label><div class="check-group">' + CERT_LIST.map(c => '<label class="check-pill"><input type="checkbox" name="certs" value="' + c + '" ' + (p && p.certs.includes(c) ? 'checked' : '') + '>' + c + '</label>').join('') + '</div></div>'
    + '<div class="field full"><label>' + t('marketsField') + ' <span class="hint">' + t('complianceHint') + '</span></label><div class="check-group">' + Object.keys(MARKET_COMPLIANCE).map(m => '<label class="check-pill"><input type="checkbox" name="markets" value="' + m + '" ' + (p && (p.markets || []).includes(m) ? 'checked' : '') + '>' + langObj(MARKET_COMPLIANCE[m]) + '</label>').join('') + '</div></div>'
    + '<div class="field full"><label>' + t('descEn') + ' *</label><textarea class="textarea" name="descEn" required>' + esc(p ? p.en.desc : '') + '</textarea></div>'
    + '<div class="field full"><label>' + t('descZh') + ' *</label><textarea class="textarea" name="descZh" required>' + esc(p ? p.zh.desc : '') + '</textarea></div>'
    + '</div>'
    + '<button type="submit" class="btn btn-primary btn-lg">' + icon('check') + (p ? t('updateProduct') : t('saveProduct')) + '</button>'
    + '</form>'
    + '<div class="full publish-preview" id="publishPreview"><img src="' + productImg({ hue: hue, cat: cat, en: { title: p ? p.en.title : 'YOUR PRODUCT' }, zh: { title: '你的产品' } }, 800, 600) + '" alt="' + t('previewLabel') + '"></div>'
    + '</div></div>';
}

function submitProduct(f) {
  if (state.user && state.user.role === 'seller') {
    const co = companyOfSeller();
    if (!co || co.status !== 'approved') {
      toast(t('companyPending'));
      return;
    }
  }
  const fd = new FormData(f);
  const titleEn = (fd.get('titleEn') || '').trim();
  const titleZh = (fd.get('titleZh') || '').trim();
  const priceMin = +fd.get('priceMin'), priceMax = +fd.get('priceMax');
  const moq = +fd.get('moq'), leadTime = +fd.get('leadTime');
  const descEn = (fd.get('descEn') || '').trim();
  const descZh = (fd.get('descZh') || '').trim();
  if (!validateForm(f, {
    titleEn: [requireText],
    titleZh: [requireText],
    priceMin: [v => requireNumber(v, 0.01)],
    priceMax: [v => requireNumber(v, 0.01), (v, input, form) => {
      const min = Number((form.querySelector('[name="priceMin"]') || {}).value || 0);
      return Number(v) < min ? t('errPriceMax') : '';
    }],
    moq: [v => requireNumber(v, 1)],
    leadTime: [v => requireNumber(v, 1)],
    descEn: [requireText],
    descZh: [requireText]
  })) return;
  const id = f.dataset.id;
  let srcLang = fd.get('srcLang') || 'auto';
  if (srcLang === 'auto') {
    const s = sellerById(state.user.sellerId);
    srcLang = (s && s.country === 'CN') ? 'zh' : 'en';
  }
  const data = {
    cat: fd.get('cat'), sub: (fd.get('sub') || '').trim(), country: fd.get('country'),
    hue: +(fd.get('hue') || 210),
    hsCode: (fd.get('hsCode') || '').trim(),
    markets: fd.getAll('markets'),
    priceMin, priceMax, moq, unit: fd.get('unit'), leadTime,
    terms: fd.getAll('terms'), certs: fd.getAll('certs'),
    srcLang: srcLang,
    en: { title: titleEn, desc: descEn, features: [] },
    zh: { title: titleZh, desc: descZh, features: [] },
    rating: 0, orders: 0
  };
  if (id) {
    const p = productById(id);
    Object.assign(p, data);
    p.status = 'pending';
    p.rejectReason = '';
  } else {
    state.products.unshift(Object.assign({ id: 'u' + Date.now(), sellerId: state.user.sellerId, status: 'pending', featured: false, hot: false, addedAt: Date.now() }, data));
  }
  saveState();
  toast(t('productSubmitted'));
  go('/dashboard/products');
}

function deleteProduct(id) {
  if (!confirm(t('deleteConfirm'))) return;
  state.products = state.products.filter(p => p.id !== id);
  saveState();
  toast(t('productDeleted'));
  renderPage();
}

function toggleStatus(id) {
  const p = productById(id);
  if (!p) return;
  p.status = p.status === 'off' ? 'on' : 'off';
  saveState();
  toast(p.status === 'off' ? t('productOff') : t('productOn'));
  renderPage();
}

function markHandled(id) {
  const i = state.inquiries.find(x => x.id === id);
  if (!i) return;
  i.status = 'handled';
  saveState();
  toast(t('inquiryMarked'));
  renderPage();
}

function submitReply(f) {
  const i = state.inquiries.find(x => x.id === f.dataset.id);
  const reply = (new FormData(f).get('reply') || '').trim();
  if (!i || !reply) { toast(t('required')); return; }
  i.reply = reply;
  i.status = 'handled';
  saveState();
  toast(t('replySent'));
  renderPage();
}

/* ---------- 买家中台 ---------- */
function renderBuyerDash(path) {
  const u = state.user;
  const activeTab = path.split('/')[2] || 'inquiries';
  const myInquiries = state.inquiries.filter(i => i.buyerId === u.id).sort((a, b) => b.createdAt - a.createdAt);
  const favProducts = state.products.filter(p => state.favorites.includes(p.id) && isLive(p));
  const tabs = [
    { tab: 'inquiries', icon: 'message', label: t('myInquiries'), count: myInquiries.filter(i => i.status === 'new').length || null },
    { tab: 'favorites', icon: 'heart', label: t('myFavorites'), count: favProducts.length || null },
    { tab: 'orders', icon: 'box', label: t('orders'), count: (state.orders || []).filter(o => o.buyerId === u.id && o.status === 'created').length || null }
  ];
  let body = '';
  if (activeTab === 'favorites') {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('myFavorites') + '</h2></div>'
      + (favProducts.length ? '<div class="product-grid">' + favProducts.map(productCard).join('') + '</div>' : '<div class="empty-state" style="padding:36px"><div class="ico">🤍</div><p>' + t('noFavoritesYet') + '</p></div>')
      + '</div>';
  } else if (activeTab === 'orders') {
    body = ordersBody();
  } else {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('myInquiries') + '</h2></div>'
      + (myInquiries.length ? myInquiries.map(buyerInquiryItem).join('') : '<div class="empty-state" style="padding:36px"><div class="ico">📭</div><p>' + t('noInquiriesYet') + '</p></div>')
      + '</div>';
  }
  return '<div class="container page"><div class="dash-layout">' + sideNav(tabs, activeTab) + '<div>' + body + '</div></div></div>';
}

function buyerInquiryItem(i) {
  const p = productById(i.productId);
  const status = i.status === 'handled' || i.status === 'quoted';
  return '<div class="inquiry-item">'
    + '<div class="top">'
    + '<div class="who"><div class="nm">' + (p ? esc(langObj(p).title) : '—') + '</div>'
    + '<div class="ct">' + t('sentAt') + ' ' + fmtDate(i.createdAt) + ' · ' + i.qty + ' ' + i.unit + ' · <span class="status-pill ' + (status ? 'done' : 'new') + '">' + (i.status === 'quoted' ? t('quotedStatus') : status ? t('statusReplied') : t('statusNew')) + '</span></div></div>'
    + (p ? '<a class="btn btn-sm" href="#/product/' + p.id + '" data-nav="/product/' + p.id + '">' + t('viewDetail') + ' →</a>' : '')
    + (i.quote ? '<button type="button" class="btn btn-sm btn-primary" data-action="order-create" data-id="' + i.id + '" style="margin-left:6px">📦 ' + t('orders') + '</button>' : '')
    + '</div>'
    + inquiryMsg(i)
    + (i.quote ? '<div class="reply-box">' + quoteBlock(i) + '</div>' : status && i.reply ? '<div class="reply-box"><div class="reply-msg"><b>' + t('sellerReply') + '：</b>' + esc(i.reply) + '</div></div>' : '')
    + '</div>';
}

/* ---------- 全局事件（表单与杂项） ---------- */
document.addEventListener('submit', e => {
  const f = e.target;
  if (f.dataset.form === 'home-search') {
    e.preventDefault();
    const kw = $('#homeKw').value.trim();
    go('/products' + (kw ? '?kw=' + encodeURIComponent(kw) : ''));
  }
});

/* 发布页：色板与预览联动 */
document.addEventListener('click', e => {
  const sw = e.target.closest('[data-action="pick-hue"]');
  if (!sw) return;
  $$('.swatch').forEach(s => s.classList.toggle('on', s === sw));
  const form = document.querySelector('form[data-form="product-form"]');
  const hidden = form ? form.querySelector('input[name="hue"]') : null;
  if (hidden) hidden.value = sw.dataset.hue;
  updatePublishPreview();
});

function updatePublishPreview() {
  const img = document.querySelector('#publishPreview img');
  const form = document.querySelector('form[data-form="product-form"]');
  if (!img || !form) return;
  const fd = new FormData(form);
  const hue = +(fd.get('hue') || 210);
  const cat = fd.get('cat') || 'machinery';
  const title = (fd.get('titleEn') || 'YOUR PRODUCT').trim() || 'YOUR PRODUCT';
  img.src = productImg({ hue: hue, cat: cat, en: { title: title }, zh: { title: title } }, 800, 600);
}

document.addEventListener('input', e => {
  const el = e.target;
  if (el.closest('form[data-form="product-form"]')) { updatePublishPreview(); return; }
  if ((el.name === 'note' && el.closest('form[data-form="quote-form"]')) || (el.name === 'message' && el.closest('form[data-form="inquiry-form"]'))) {
    const box = el.closest('form').querySelector('[data-trans-target]');
    if (box) {
      clearTimeout(box._transTimer);
      box._transTimer = setTimeout(() => {
        fillTransBox(box, el.value);
      }, 350);
    }
  }
});

/* 取消编辑 */
document.addEventListener('click', e => {
  if (e.target.closest('[data-action="cancel-edit"]')) go('/dashboard/products');
});

/* 清除筛选 */
document.addEventListener('click', e => {
  if (e.target.closest('[data-action="clear-filters"]')) go('/products');
});

/* ---------- 启动 ---------- */
window.addEventListener('hashchange', render);
window.addEventListener('resize', fitHeroTitle);
render();
