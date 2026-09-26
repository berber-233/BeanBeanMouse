/* BeanBeanMouse 启动与杂项事件——由拆分脚本生成 */
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

/* ---------- 后端驱动（pet0.2）----------
 * http 模式下用服务器商品替换本地演示种子，让目录真正来自 D1。
 * 安全兜底：只有拿到足够数量的商品才替换；任何异常/数量不足都保留本地种子，
 * 保证最坏情况只是"还看演示数据"，绝不会让页面变空。 */
(function hydrateFromApi() {
  if (!window.api || !api.config || api.config.mode !== 'http') return;
  const MIN_EXPECTED = 8;
  const txt = (p, lang, key) => {
    const t = (p.translations && p.translations[lang]) || {};
    const v = key === 'desc' ? (t.desc || t.description) : t[key];
    return v === undefined || v === null ? '' : v;
  };
  const toFrontend = p => ({
    id: p.id,
    sellerId: p.sellerId || 'bbm',
    cat: p.cat || p.category || 'pet',
    sub: p.sub || '',
    country: p.country || 'CN',
    priceMin: Number(p.priceMin) || 0,
    priceMax: Number(p.priceMax) || 0,
    moq: Number(p.moq) || 1,
    unit: p.unit || 'pcs',
    leadTime: Number(p.leadTime) || 15,
    terms: Array.isArray(p.terms) ? p.terms : [],
    certs: Array.isArray(p.certs) ? p.certs : [],
    rating: typeof p.rating === 'number' ? p.rating : 4.6,
    orders: typeof p.orders === 'number' ? p.orders : 0,
    hue: typeof p.hue === 'number' ? p.hue : 32,
    pets: (Array.isArray(p.pets) && p.pets.length) ? p.pets : ((PET_ATTR_FALLBACK[p.sub] || {}).pets || []),
    petSize: p.petSize || (PET_ATTR_FALLBACK[p.sub] || {}).petSize || 'medium',
    material: p.material || (PET_ATTR_FALLBACK[p.sub] || {}).material || '',
    status: p.status || 'on',
    en: { title: txt(p, 'en', 'title') || p.id, desc: txt(p, 'en', 'desc'), features: txt(p, 'en', 'features') || [] },
    zh: { title: txt(p, 'zh', 'title') || txt(p, 'en', 'title') || p.id, desc: txt(p, 'zh', 'desc'), features: txt(p, 'zh', 'features') || [] }
  });
  /* 服务器表结构里没有 pets/petSize/material，按细分推导，避免线上所有商品都显示默认值 */
  const PET_ATTR_FALLBACK = (function () {
    const base = {
      'pet-hamster': { pets: ['hamster', 'small-pet'], petSize: 'small', material: '环保塑料' },
      'pet-cat': { pets: ['cat'], petSize: 'medium', material: '实木 / 塑料' },
      'pet-dog-small': { pets: ['dog-small'], petSize: 'small', material: '尼龙 / 网布' },
      'pet-dog-large': { pets: ['dog-large'], petSize: 'large', material: '尼龙 / 橡胶' },
      'pet-food': { pets: ['cat', 'dog-small', 'dog-large'], petSize: 'medium', material: '食品级原料' },
      'pet-grooming': { pets: ['cat', 'dog-small', 'dog-large'], petSize: 'medium', material: 'ABS / 硅胶' },
      'pet-toys': { pets: ['cat', 'dog-small', 'dog-large'], petSize: 'medium', material: '食品级 TPR' },
      'pet-travel': { pets: ['cat', 'dog-small'], petSize: 'medium', material: 'PC / ABS' }
    };
    /* 细分 id 在服务器上可能不带 pet- 前缀，两种都兜住 */
    const out = {};
    for (const [k, v] of Object.entries(base)) { out[k] = v; out[k.replace('pet-', '')] = v; }
    return out;
  })();
  /* 先用令牌确认"我是谁"：避免本地残留的账号信息与令牌不匹配 */
  if (state.token) {
    api.auth.me().then(u => {
      if (u && u.id) {
        state.user = Object.assign({}, u);
        saveState();
        render();
        hydrateSessionData();
      }
    }).catch(() => {
      /* 令牌失效或不属于任何账号：清掉登录态，防止张冠李戴 */
      state.token = '';
      state.user = null;
      saveState();
      render();
    });
  } else if (state.user) {
    /* 没有令牌却显示着用户（历史遗留的本地演示登录）：一并清掉 */
    state.user = null;
    saveState();
    render();
  }

  api.products.list().then(res => {
    /* api.products.list() 在 http 模式直接返回数组；兼容两种返回形态 */
    const items = Array.isArray(res) ? res : ((res && res.items) || []);
    if (items.length < MIN_EXPECTED) {
      console.warn('[hydrate] 服务器商品仅 ' + items.length + ' 款，保留本地演示数据');
      return;
    }
    state.products = items.map(toFrontend);
    render();
    console.log('[hydrate] 已切换到服务器商品：' + items.length + ' 款');
  }).catch(e => console.warn('[hydrate] 拉取失败，保留本地演示数据：' + (e && e.message)));
})();

/* ---------- 登录范围内的真实数据（pet0.2 接线）----------
 * 现象：客户提交了询盘、建议箱收到了建议，运营在页面上却"看不到"。
 * 原因：工作台里的 inquiries / suggestions / users / logs 一直读的是本地演示种子，
 *       只有 products 一直接了服务器——缺的是接线，不是功能。
 * 这里在登录后统一从 D1 拉取这个账号有权看到的数据，并覆盖本地演示数组。
 * 服务端无数据时就是空列表（宁可空，也不给访客看假数据）。 */
let sessionHydrating = false;
function mapServerInquiry(r) {
  const q = r.quote || null;
  return {
    id: r.id,
    productId: r.product_id,
    sellerId: r.seller_id || '',
    buyerId: r.buyer_id || '',
    name: r.contact_name || '',
    email: r.contact_email || '',
    company: r.contact_company || '',
    country: r.contact_country || '',
    qty: r.qty,
    unit: r.unit || 'pcs',
    payment: r.payment_term || '',
    message: r.message || '',
    attachments: [],
    createdAt: r.created_at,
    status: r.status,
    reply: '',
    quote: q ? {
      price: q.price, incoterm: q.incoterm, payment: q.payment_term,
      validity: q.validity_days, leadTime: q.lead_time, note: q.note || ''
    } : null
  };
}
function mapServerSuggestion(s) {
  return {
    id: s.id, userId: s.user_id, type: s.type, content: s.content, contact: s.contact,
    status: s.status, createdAt: s.created_at, updatedAt: s.updated_at
  };
}
function mapServerNotification(n) {
  return {
    id: n.id, toUserId: n.user_id, title: n.title, body: n.body,
    link: '', read: !!n.read_at, createdAt: n.created_at
  };
}
function mapServerAdminUser(u) {
  return {
    id: u.id, email: u.email, name: u.name, role: u.role, status: u.status,
    reviewState: u.review_state || '', emailVerified: !!u.email_verified, joinedAt: u.created_at
  };
}
async function hydrateSessionData() {
  if (typeof api === 'undefined' || !api.config || api.config.mode !== 'http') return false;
  if (!state.token || !state.user || sessionHydrating) return false;
  sessionHydrating = true;
  const isAdmin = state.user.role === 'admin';
  try {
    const jobs = [
      api.inquiries.list().then(rows => {
        state.inquiries = (Array.isArray(rows) ? rows : ((rows && rows.items) || [])).map(mapServerInquiry);
      }),
      api.suggestions.list().then(rows => {
        state.suggestions = (Array.isArray(rows) ? rows : ((rows && rows.items) || [])).map(mapServerSuggestion);
      }),
      api.notifications.list().then(rows => {
        state.notifications = (Array.isArray(rows) ? rows : ((rows && rows.items) || [])).map(mapServerNotification);
      })
    ];
    if (isAdmin) {
      jobs.push(apiRequest('/admin/users', {}).then(r => {
        state.adminUsers = ((r && r.items) || []).map(mapServerAdminUser);
      }));
      jobs.push(apiRequest('/admin/logs', {}).then(r => {
        const rows = Array.isArray(r) ? r : ((r && r.items) || []);
        const nameOf = id => {
          const u = (state.adminUsers || []).find(x => x.id === id);
          return u ? u.name : (id || '系统');
        };
        state.adminLogs = rows.map(l => ({
          ts: l.created_at, actor: nameOf(l.actor_id), action: l.action,
          target: l.target_id || '', detail: l.detail || ''
        }));
      }));
    }
    const settled = await Promise.allSettled(jobs);
    const failed = settled.filter(x => x.status === 'rejected');
    if (failed.length) console.warn('[hydrate] 部分数据未取到：' + failed.map(f => f.reason && f.reason.message).join(' / '));
    saveState();
    renderPage();
    return true;
  } catch (e) {
    console.warn('[hydrate] 账号数据拉取失败：' + (e && e.message));
    return false;
  } finally {
    sessionHydrating = false;
  }
}
window.hydrateSessionData = hydrateSessionData;

/* ---------- 运输动画视频：进入视口才播放，离开即暂停（省流量），并尊重 reduced-motion ---------- */
(function transportVideoAutoplay() {
  const reduce = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  const seen = new WeakSet();
  const reduced = () => !!(reduce && reduce.matches);
  const tryPlay = v => {
    if (reduced()) { v.pause(); return; }
    const p = v.play();
    if (p && typeof p.catch === 'function') p.catch(() => {});
  };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
    entries.forEach(en => (en.isIntersecting ? tryPlay(en.target) : en.target.pause()));
  }, { threshold: 0.15 }) : null;

  function scan() {
    document.querySelectorAll('video[data-transport-video]').forEach(v => {
      if (seen.has(v)) return;
      seen.add(v);
      if (v.preload === 'none') v.preload = 'metadata';
      if (io) io.observe(v); else tryPlay(v);
    });
  }
  new MutationObserver(scan).observe(document.body, { childList: true, subtree: true });
  if (reduce && reduce.addEventListener) reduce.addEventListener('change', scan);
  scan();
})();
