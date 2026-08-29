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
