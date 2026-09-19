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
    pets: p.pets || [], petSize: p.petSize || 'medium', material: p.material || '',
    status: p.status || 'on',
    en: { title: txt(p, 'en', 'title') || p.id, desc: txt(p, 'en', 'desc'), features: txt(p, 'en', 'features') || [] },
    zh: { title: txt(p, 'zh', 'title') || txt(p, 'en', 'title') || p.id, desc: txt(p, 'zh', 'desc'), features: txt(p, 'zh', 'features') || [] }
  });
  api.products.list().then(res => {
    const items = (res && res.items) || [];
    if (items.length < MIN_EXPECTED) {
      console.warn('[hydrate] 服务器商品仅 ' + items.length + ' 款，保留本地演示数据');
      return;
    }
    state.products = items.map(toFrontend);
    render();
    console.log('[hydrate] 已切换到服务器商品：' + items.length + ' 款');
  }).catch(e => console.warn('[hydrate] 拉取失败，保留本地演示数据：' + (e && e.message)));
})();

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
