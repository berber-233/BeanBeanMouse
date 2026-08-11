/* ============================================================
 * trade boat 前端数据层（阶段 0）
 * ------------------------------------------------------------
 * 页面所有数据统一通过 window.api 访问，不再直接读写 localStorage。
 * 当前 mode = 'mock'：用 localStorage 模拟后端（带网络延迟与错误语义）；
 * 接入真实后端时，把 API_CONFIG.mode 改为 'http' 并填写 baseUrl，
 * 各服务已预留 http 分支（与 docs/openapi.yaml 对应）。
 * ============================================================ */

const API_CONFIG = {
  mode: 'mock',           // 'mock' | 'http'
  baseUrl: '',            // 例如 'https://api.tradeboat.example.com'
  latencyMs: 80           // 模拟网络延迟
};

const API_STORE_KEY = (typeof window !== 'undefined' && window.__TB_STORE_KEY__) || 'bridgetrade_v1';

const api = { config: API_CONFIG };

/* ---------- 基础设施 ---------- */
function apiDelay(ms) {
  return new Promise(r => setTimeout(r, ms === undefined ? api.config.latencyMs : ms));
}
function apiClone(x) { return JSON.parse(JSON.stringify(x)); }

/* 本地 mock 存储适配（将来替换为服务端） */
const apiStorage = {
  getState() {
    try {
      const raw = localStorage.getItem(API_STORE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  },
  setState(s) {
    try { localStorage.setItem(API_STORE_KEY, JSON.stringify(s)); } catch (e) { /* 忽略 */ }
  },
  /* 通知应用层数据已变化（应用层监听后重载并重绘） */
  notifyChanged() {
    if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('api:changed'));
  }
};
api.storage = apiStorage;

/* 通用 HTTP 请求（真实后端时使用；需要时补充鉴权头） */
async function apiRequest(path, options = {}) {
  const { method = 'GET', body, token } = options;
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(api.config.baseUrl + path, {
    method: method,
    headers: headers,
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) {
    let msg = 'HTTP ' + res.status;
    try { const j = await res.json(); msg = j.message || msg; } catch (e) { /* 忽略 */ }
    throw new Error(msg);
  }
  return res.json();
}

/* ---------- mock 数据辅助（仅本地演示用） ---------- */
function mockState() { return apiStorage.getState() || {}; }
function mockProducts() { return mockState().products || []; }
function mockFindProduct(id) { return mockProducts().find(p => p.id === id); }
function mockFindUser(email) {
  const u = String(email || '').trim().toLowerCase();
  return (mockState().users || []).find(x => String(x.email).toLowerCase() === u);
}
function mockSave(st) { apiStorage.setState(st); apiStorage.notifyChanged(); }

/* ============================================================
 * 服务：账号与认证
 * ============================================================ */
api.auth = {
  async login({ email, password, role } = {}) {
    if (api.config.mode === 'http') return apiRequest('/auth/login', { method: 'POST', body: { email, password } });
    await apiDelay();
    const u = mockFindUser(email) || (role ? { id: 'u-' + role, role: role, name: email ? email.split('@')[0] : 'Guest', email: email || '', status: 'active' } : null);
    if (!u) throw new Error('INVALID_CREDENTIALS');
    if (u.status === 'frozen') throw new Error('ACCOUNT_FROZEN');
    return { token: 'mock-token-' + u.id, user: apiClone(u) };
  },
  async me(token) {
    if (api.config.mode === 'http') return apiRequest('/auth/me', { token });
    await apiDelay();
    return mockState().user ? apiClone(mockState().user) : null;
  },
  async logout() {
    if (api.config.mode === 'http') return apiRequest('/auth/logout', { method: 'POST' });
    const st = mockState();
    st.user = null;
    mockSave(st);
    return { ok: true };
  }
};

/* ============================================================
 * 服务：产品
 * ============================================================ */
api.products = {
  async list({ kw, cat, min, max, origin, includeOffline = false } = {}) {
    if (api.config.mode === 'http') {
      const qs = new URLSearchParams({ kw: kw || '', cat: cat || '', origin: origin || '' });
      const r = await apiRequest('/products?' + qs.toString());
      return r.items || [];
    }
    await apiDelay();
    let list = mockProducts().filter(p => includeOffline || !p.status || p.status === 'on');
    if (cat) list = list.filter(p => p.cat === cat);
    if (origin) list = list.filter(p => p.country === origin);
    if (kw) {
      const k = String(kw).toLowerCase();
      list = list.filter(p => {
        const hay = ((p.en && p.en.title + ' ' + (p.en.desc || '')) + ' ' + (p.zh && p.zh.title)).toLowerCase();
        return hay.includes(k);
      });
    }
    if (min != null || max != null) {
      list = list.filter(p => (min == null || p.priceMax >= +min) && (max == null || p.priceMin <= +max));
    }
    return apiClone(list);
  },
  async get(id) {
    if (api.config.mode === 'http') return apiRequest('/products/' + encodeURIComponent(id));
    await apiDelay();
    const p = mockFindProduct(id);
    if (!p) throw new Error('NOT_FOUND');
    return apiClone(p);
  },
  async create(payload) {
    if (api.config.mode === 'http') return apiRequest('/products', { method: 'POST', body: payload });
    await apiDelay();
    const st = mockState();
    const sellerId = st.user && st.user.sellerId ? st.user.sellerId : 's1';
    const prod = Object.assign({
      id: 'api' + Date.now(),
      sellerId: sellerId,
      status: 'pending',
      featured: false,
      hot: false,
      addedAt: Date.now()
    }, apiClone(payload));
    st.products.unshift(prod);
    mockSave(st);
    return apiClone(prod);
  },
  async review(id, { action, reason } = {}) {
    if (api.config.mode === 'http') return apiRequest('/products/' + encodeURIComponent(id) + '/review', { method: 'POST', body: { action, reason } });
    await apiDelay();
    const st = mockState();
    const p = st.products.find(x => x.id === id);
    if (!p) throw new Error('NOT_FOUND');
    if (action === 'approve') { p.status = 'on'; p.rejectReason = ''; }
    else if (action === 'reject') { p.status = 'rejected'; p.rejectReason = reason || 'rejected'; }
    else throw new Error('INVALID_ACTION');
    mockSave(st);
    return apiClone(p);
  }
};

/* ============================================================
 * 服务：企业认证
 * ============================================================ */
api.companies = {
  async verify(sellerId) {
    if (api.config.mode === 'http') return apiRequest('/companies/' + encodeURIComponent(sellerId) + '/verify', { method: 'PUT' });
    await apiDelay();
    const st = mockState();
    const c = (st.companies || []).find(x => x.sellerId === sellerId);
    if (!c) throw new Error('NOT_FOUND');
    c.status = 'approved';
    mockSave(st);
    return apiClone(c);
  }
};

/* ============================================================
 * 服务：询盘与报价
 * ============================================================ */
api.inquiries = {
  async list() {
    if (api.config.mode === 'http') return apiRequest('/inquiries');
    await apiDelay();
    return apiClone(mockState().inquiries || []);
  },
  async create({ productId, qty, unit, message, name, email, company, country, payment } = {}) {
    if (api.config.mode === 'http') return apiRequest('/inquiries', { method: 'POST', body: { productId, qty, unit, message, name, email, company, country, payment } });
    await apiDelay();
    if (!productId || !qty || !message) throw new Error('REQUIRED_FIELDS');
    const st = mockState();
    const inq = {
      id: 'i' + Date.now(),
      productId: productId,
      sellerId: (mockFindProduct(productId) || {}).sellerId || 's1',
      buyerId: st.user ? st.user.id : 'guest',
      name: name || 'Guest',
      email: email || '',
      company: company || '',
      country: country || '',
      qty: qty,
      unit: unit || 'pcs',
      payment: payment || null,
      message: message,
      createdAt: Date.now(),
      status: 'new',
      reply: ''
    };
    st.inquiries.unshift(inq);
    mockSave(st);
    return apiClone(inq);
  },
  async addQuote(inquiryId, quote) {
    if (api.config.mode === 'http') return apiRequest('/inquiries/' + encodeURIComponent(inquiryId) + '/quote', { method: 'POST', body: quote });
    await apiDelay();
    const st = mockState();
    const i = st.inquiries.find(x => x.id === inquiryId);
    if (!i) throw new Error('NOT_FOUND');
    i.quote = apiClone(quote);
    i.status = 'quoted';
    mockSave(st);
    return apiClone(i);
  }
};

/* ============================================================
 * 服务：消息（WebSocket 阶段实现，当前为占位）
 * ============================================================ */
api.messages = {
  async list(conversationId) {
    if (api.config.mode === 'http') return apiRequest('/conversations/' + encodeURIComponent(conversationId) + '/messages');
    await apiDelay();
    return []; // TODO: 阶段2 实现消息表与 WebSocket
  },
  async send(conversationId, text) {
    if (api.config.mode === 'http') return apiRequest('/conversations/' + encodeURIComponent(conversationId) + '/messages', { method: 'POST', body: { text } });
    throw new Error('NOT_IMPLEMENTED_YET');
  }
};

/* ============================================================
 * 服务：翻译（真实服务由服务端代理，前端不直连第三方）
 * ============================================================ */
api.translate = {
  async text(text, target, source) {
    if (api.config.mode === 'http') return apiRequest('/translate', { method: 'POST', body: { text, target, source } });
    await apiDelay();
    return { text: String(text || ''), target: target, source: source || null, mode: 'mock', note: '演示：真实翻译由服务端代理' };
  }
};

/* ============================================================
 * 服务：防伪验真
 * ============================================================ */
api.antiFake = {
  /* 仅演示用：与服务端签发逻辑保持一致（正式版由后端签发） */
  codeOf(productId) {
    const p = mockFindProduct(productId);
    if (!p) return '';
    let s = 0;
    const seed = p.id + ':' + p.sellerId + ':' + (p.en ? p.en.title : '');
    for (const ch of seed) s = (s * 31 + ch.charCodeAt(0)) % 97;
    return 'TB-' + String(p.id).toUpperCase().replace(/[^A-Z0-9]/g, '') + '-' + String(s).padStart(2, '0');
  },
  async verify(code) {
    if (api.config.mode === 'http') return apiRequest('/anti-fake/verify', { method: 'POST', body: { code } });
    await apiDelay();
    const c = String(code || '').trim().toUpperCase();
    const p = mockProducts().find(x => api.antiFake.codeOf(x.id) === c);
    if (!p) throw new Error('CODE_NOT_FOUND');
    return { genuine: true, code: c, productId: p.id, verifiedAt: new Date().toISOString() };
  }
};

/* ============================================================
 * 服务：资讯
 * ============================================================ */
api.news = {
  async list(params) {
    if (api.config.mode === 'http') {
      const qs = new URLSearchParams(params || {});
      const r = await apiRequest('/news?' + qs.toString());
      return r.items || [];
    }
    await apiDelay();
    return apiClone(typeof NEWS_ITEMS !== 'undefined' ? NEWS_ITEMS : []);
  },
  async sources() {
    if (api.config.mode === 'http') return apiRequest('/news/sources');
    await apiDelay();
    return apiClone(typeof SOURCE_DIRECTORY !== 'undefined' ? SOURCE_DIRECTORY : []);
  }
};

/* ============================================================
 * 服务：通知与管理
 * ============================================================ */
api.notifications = {
  async list() {
    if (api.config.mode === 'http') return apiRequest('/notifications');
    await apiDelay();
    return []; // TODO: 阶段2 实现站内通知
  }
};

api.admin = {
  async overview() {
    if (api.config.mode === 'http') return apiRequest('/admin/overview');
    await apiDelay();
    const st = mockState();
    return {
      products: st.products.length,
      pendingReviews: st.products.filter(p => p.status === 'pending').length,
      inquiries: (st.inquiries || []).length,
      users: (st.users || []).length
    };
  },
  async logs() {
    if (api.config.mode === 'http') return apiRequest('/admin/logs');
    await apiDelay();
    return apiClone(mockState().logs || []);
  }
};

api.files = {
  async upload(file) {
    if (api.config.mode === 'http') {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch(api.config.baseUrl + '/files', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    }
    throw new Error('NOT_IMPLEMENTED_YET');
  }
};

/* 暴露给页面与控制台测试 */
window.api = api;
