/* BeanBeanMouse 页面与交互渲染（产品 / 资讯 / 询盘 / 工作台 / 名片等）——由拆分脚本生成 */
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
    '<div class="modal-head"><h3> ' + t('fakeCheck') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
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
    '<div class="modal-head"><h3> ' + t('fakeOkTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
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
    '<div class="modal-head"><h3> ' + t('fakeSiteTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
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
/* 演示身份对应的后端账号（公开的演示凭据） */
const DEMO_CRED = {
  admin: ['admin@demo.com', 'admin123'],
  seller: ['seller@demo.com', 'seller123'],
  buyer: ['buyer@demo.com', 'buyer123']
};

/* 登录成功后把 token 与用户写进本地状态（token 是调用受保护接口的前提） */
function applyLogin(r) {
  if (!r) return;
  if (r.token) state.token = r.token;
  /* 整体替换而不是合并：避免残留上一个账号的字段（一个邮箱一个号） */
  if (r.user) state.user = Object.assign({}, r.user);
  else state.user = null;
  saveState();
  if (typeof reloadState === 'function') { try { reloadState(); } catch (e) { /* 忽略 */ } }
}

/* 邮箱 + 密码登录 */
async function submitLogin(f) {
  const fd = new FormData(f);
  const email = String(fd.get('email') || '').trim();
  const password = String(fd.get('password') || '');
  if (!email || !password) { toast(t('askNeedContact')); return; }
  try {
    const r = await api.auth.login({ email, password });
    applyLogin(r);
    toast(t('signedIn') + ((r && r.user && r.user.name) || ''));
    go('/dashboard');
  } catch (e) {
    toast(t('loginFailed') + '：' + (e && e.message ? e.message : ''));
  }
}

async function loginAs(role) {
  /* 线上（http 模式）：演示身份也走真实登录，拿到 token 才能用受保护接口 */
  if (api.config && api.config.mode === 'http') {
    const cred = DEMO_CRED[role];
    if (cred) {
      try {
        const r = await api.auth.login({ email: cred[0], password: cred[1] });
        applyLogin(r);
        toast(t('signedIn') + ((r && r.user && r.user.name) || ''));
        go('/dashboard');
      } catch (e) {
        toast(t('loginFailed') + '：' + (e && e.message ? e.message : ''));
      }
      return;
    }
  }
  const rec = (state.users || []).find(x => x.id === DEMO_USERS[role].id);
  if (rec && rec.status === 'frozen') { toast(t('frozenBlocked')); return; }
  state.user = JSON.parse(JSON.stringify(DEMO_USERS[role]));
  saveState();
  toast(t('signedIn') + state.user.name);
  go('/dashboard');
}
function logout(guest, goLogin) {
  state.user = null;
  saveState();
  toast(guest ? t('guestName') : t('signedOut'));
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
  else if (path === '/news') { app.innerHTML = renderHome(); }   /* 贸易资讯模块已封存（2026-09-17），暂不展示 */
  else if (path === '/guide') { app.innerHTML = renderGuide(); }
  else if (path === '/export') { app.innerHTML = renderExport(); }
  else if (path === '/logistics') { app.innerHTML = renderLogistics(); bindLogisticsPage(); }
  else if (path === '/compliance') { app.innerHTML = renderCompliance(); bindCompliancePage(); }
  else if (path === '/disputes') { app.innerHTML = renderDisputes(); bindDisputesPage(); }
  else if (path === '/feedback') { app.innerHTML = renderFeedback(); }
  else if (path === '/videos') { app.innerHTML = renderVideos(); }
  else if (path === '/about') { app.innerHTML = renderAbout(); }
  else if (path === '/verify-email') { app.innerHTML = renderVerifyEmail(params); bindVerifyEmail(params); }
  else if (path === '/customs') { app.innerHTML = renderCustoms(); }
  else if (path === '/recruit') { app.innerHTML = renderRecruit(); }
  else if (path === '/insurance') { app.innerHTML = renderInsurance(); bindInsurancePage(); }
  else if (path === '/contracts') { app.innerHTML = renderContracts(); }
  else if (path.indexOf('/product/') === 0) { const _pid = path.slice(9); app.innerHTML = renderDetail(_pid) + stickyAskBar(_pid); }
  else if (path === '/login') app.innerHTML = renderLogin();
  else if (path.indexOf('/seller/') === 0) app.innerHTML = renderSellerPage(path.slice(8));
  else if (path === '/dashboard' || path.indexOf('/dashboard/') === 0) app.innerHTML = renderDashboard(path);
  else app.innerHTML = renderHome();
  applyViewerLang(app);
  if (path === '' || path === '/') fitHeroTitle();
  window.scrollTo(0, 0);
  setMetaDesc(pageMetaDesc(path));
}

function setMetaDesc(desc) {
  let m = document.querySelector('meta[name="description"]');
  if (!m) { m = document.createElement('meta'); m.name = 'description'; document.head.appendChild(m); }
  m.content = desc;
}
function pageMetaDesc(path) {
  const map = {
    '/products': t('marketplace'), '/news': t('navNews'), '/guide': t('navGuide'),
    '/export': t('navExport'), '/logistics': t('navLogistics'), '/compliance': t('navCompliance'),
    '/disputes': t('navDisputes'), '/feedback': t('navFeedback'), '/customs': t('customsTitle'),
    '/recruit': t('navRecruit'), '/insurance': t('insurancePageTitle'), '/contracts': t('contractsTitle')
  };
  if (path.indexOf('/product/') === 0) {
    const p = productById(path.slice(9));
    return (p ? langObj(p).title : t('marketplace')) + ' · BeanBeanMouse';
  }
  const base = map[path] || t('heroTitle');
  return base + ' · BeanBeanMouse 豆豆鼠外贸平台';
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
  + '<span class="badge demo" title="' + esc(t('demoTagNote')) + '">' + t('demoTag') + '</span>'
    + '<img src="' + productMainImg(p, 640, 480) + '" alt="' + esc(langObj(p).title) + '" loading="lazy">'
    + '<button type="button" class="fav-btn ' + (fav ? 'on' : '') + '" data-action="toggle-fav" data-id="' + p.id + '" aria-label="' + t('favorite') + '">' + icon(fav ? 'heart' : 'heart', fav ? 'fill' : '') + '</button>'
    + '</div>'
    + '<div class="body">'
    + '<h3 class="title oneline" title="' + esc(viewProductText(p, 'title')) + '"' + l10nAttrs(p.id, 'title', baseContentLang(p), viewProductText(p, 'title')) + '>' + esc(viewProductText(p, 'title')) + '</h3>'
  + petFitRow(p)
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
    ['贸易流程参考', '从询盘到售后的规范流程、贸易术语与风险提示，帮助新手安全完成跨国交易。'],
    ['出口准备', '核对经营资质、收汇、退税、许可证与商检清单，发布前先查缺补漏。'],
    ['物流与订舱', '选择运输方式、拼箱/整柜，了解目的港费用与电放提单。'],
    ['合规筛查', '出口管制、制裁名单与产品环保法规演示筛查，降低海关扣货风险。'],
    ['售后与纠纷', '订单交付后申请售后或发起纠纷，平台依据存证链仲裁。'],
    ['订单单据中心', '按订单生成商业发票、装箱单、原产地证与提单参考件，自动核对单证一致性。'],
    ['对话导出与附件', '询盘往来可导出 TXT / HTML 留档；支持发送图片与 ZIP/RAR/7Z 压缩包附件。'],
    ['身份与名片', '注册时选择个体户或公司代表，完善个人信息并上传名片，询盘时可选择附上名片。'],
    ['建议反馈', '页面右下角帮助与页脚入口均可提交优化建议，运营团队会定期整理。']
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
    ['Trade process guide', 'Standard flow from inquiry to after-sales, Incoterms and risk alerts to help you trade safely.'],
    ['Export readiness', 'Review trading rights, FX receipts, tax rebate, licences and inspection before you publish.'],
    ['Logistics & booking', 'Choose a transport mode, LCL/FCL, destination charges and telex release.'],
    ['Compliance screening', 'Demo screening for export control, sanctions and product environmental rules.'],
    ['After-sales & disputes', 'Request after-sales or open a dispute after delivery; the platform arbitrates on the evidence chain.'],
    ['Order document center', 'Generate commercial invoice, packing list, certificate of origin and B/L reference per order with consistency checks.'],
    ['Conversation export & attachments', 'Export inquiry threads as TXT / HTML; send images and ZIP / RAR / 7Z attachments.'],
    ['Identity & business card', 'Choose individual or company at signup, complete your profile and attach your business card to inquiries.'],
    ['Feedback', 'Submit optimization suggestions from the help widget or footer; our team reviews them periodically.']
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

/* ---------- 门面（pet0.2 首页） ---------- */
const VIDEO_SHOWCASE = [
  { id: 'v1', platform: 'bilibili', url: '', pet: 'hamster',
    zh: { title: '仓鼠用三层笼入住实拍', by: '客户投稿 · 上海' },
    en: { title: 'Hamster moving into the 3-tier cage', by: 'Customer video · Shanghai' } },
  { id: 'v2', platform: 'youtube', url: '', pet: 'cat',
    zh: { title: '猫爬架组装与承重测试', by: '客户投稿 · 德国' },
    en: { title: 'Cat tree assembly & weight test', by: 'Customer video · Germany' } },
  { id: 'v3', platform: 'douyin', url: '', pet: 'dog-large',
    zh: { title: '金毛试用加厚胸背带', by: '客户投稿 · 加拿大' },
    en: { title: 'Golden retriever testing the padded harness', by: 'Customer video · Canada' } }
];

function storefrontArt() {
  return 'assets/pet/hero-desk-hamster.png';
}

function renderHome() {
  document.title = 'BeanBeanMouse · ' + t('sfTitle');
  const live = liveProducts();
  const subs = (CATEGORIES[0] && CATEGORIES[0].subs) || [];
  /* 精选：推广位优先（否则新上架的推广商品订单数为 0，永远进不了首页，推广位就白买了），其余按订单量 */
  const promotedFirst = live.filter(p => p.promoted)
    .concat(live.filter(p => !p.promoted).sort((a, b) => (b.orders || 0) - (a.orders || 0)));
  const featured = promotedFirst.slice(0, 8);
  const hotKw = state.lang === 'zh'
    ? ['仓鼠笼', '猫爬架', '大型犬胸背带', '猫砂', '智能喂食器']
    : ['hamster cage', 'cat tree', 'large dog harness', 'cat litter', 'smart feeder'];
  const subIco = id => 'assets/pixel/sub/' + id.replace('pet-', '') + '.png';
  return '<section class="storefront">'
    + '<div class="store-inner">'
    + '<div class="store-copy">'
    + '<p class="store-eyebrow">' + esc(t('sfEyebrow')) + '</p>'
    + '<h1 class="store-title">' + t('sfTitle') + '</h1>'
    + '<p class="store-sub">' + t('sfSub') + '</p>'
    + '<form class="hero-search" data-form="home-search">'
    + '<input type="search" id="homeKw" placeholder="' + t('searchPlaceholder') + '" aria-label="' + t('searchPlaceholder') + '">'
    + '<button type="submit" class="btn btn-accent">' + icon('search') + t('searchBtn') + '</button>'
    + '</form>'
    + '<div class="store-cta">'
    + '<a class="btn btn-accent btn-lg" href="#/products" data-nav="/products">' + t('sfCtaShop') + '</a>'
    + '<a class="btn btn-ghost btn-lg" href="#/videos" data-nav="/videos">' + t('sfCtaVideo') + '</a>'
    + '<button type="button" class="btn btn-ghost btn-lg" data-action="ask-open">' + t('sfCtaAsk') + '</button>'
    + '</div>'
    + '<div class="store-trust">'
    + ['trustOem', 'trustShip', 'trustInspect', 'trustAfter'].map(k => '<span class="trust-chip">' + t(k) + '</span>').join('')
    + '</div>'
    + '<div class="hero-popular">' + t('popular') + hotKw.map(k => '<a href="#/products?kw=' + encodeURIComponent(k) + '" data-nav="/products?kw=' + encodeURIComponent(k) + '">' + esc(k) + '</a>').join('') + '</div>'
    + '</div>'
    + '<div class="store-art">'
    + '<img src="' + storefrontArt() + '" alt="' + esc(t('sfArtAlt')) + '" width="720" height="720" decoding="async">'
    + '<div class="store-art-note">' + esc(t('sfArtNote')) + '</div>'
    + '</div>'
    + '</div>'
    + '</section>'
    + '<div class="container page">'
    /* 8 个细分 */
    + '<section class="section"><div class="section-head"><h2>' + t('catStripTitle') + '</h2><a href="#/products" class="small" data-nav="/products">' + t('viewAllCats') + ' →</a></div>'
    + '<div class="sub-grid">' + subs.map(s => {
      const count = live.filter(p => p.sub === s.id).length;
      return '<a class="sub-card" href="#/products?cat=pet&sub=' + s.id + '" data-nav="/products?cat=pet&sub=' + s.id + '">'
        + '<img class="sub-ico" src="' + subIco(s.id) + '" alt="" width="44" height="44" loading="lazy" decoding="async">'
        + '<span class="sub-name">' + langObj(s) + '</span>'
        + '<span class="sub-count">' + count + ' ' + t('totalProducts') + '</span>'
        + '</a>';
    }).join('') + '</div></section>'
    /* 精选商品 */
    + '<section class="section"><div class="section-head"><h2>' + t('featuredTitle') + '</h2><a href="#/products" class="small" data-nav="/products">' + t('viewAll') + ' →</a></div>'
    + '<div class="product-grid">' + featured.map(productCard).join('') + '</div></section>'
    /* 视频墙预告 */
    + '<section class="section"><div class="section-head"><h2>' + t('videoWallTitle') + '</h2><a href="#/videos" class="small" data-nav="/videos">' + t('videoWallMore') + ' →</a></div>'
    + '<p class="section-note">' + t('videoWallDesc') + '</p>'
    + '<div class="video-grid">' + VIDEO_SHOWCASE.map(videoCard).join('') + '</div></section>'
    /* 服务承诺 */
    + '<section class="section"><div class="section-head"><h2>' + t('promiseTitle') + '</h2></div>'
    + '<div class="promise-grid">' + [
      ['promise1T', 'promise1D'], ['promise2T', 'promise2D'], ['promise3T', 'promise3D'], ['promise4T', 'promise4D']
    ].map(x => '<div class="promise-card"><h3>' + t(x[0]) + '</h3><p>' + t(x[1]) + '</p></div>').join('') + '</div></section>'
    + '<div class="cta-band">'
    + '<div><h2>' + t('askCtaTitle') + '</h2><p>' + t('askCtaDesc') + '</p></div>'
    + '<button type="button" class="btn btn-accent btn-lg" data-action="ask-open">' + t('askCtaBtn') + '</button>'
    + '</div>'
    /* 关于我们预告 */
    + '<section class="section about-teaser">'
    + '<div class="about-teaser-art"><img src="assets/pet/about-hamster.png" alt="" width="360" height="360" loading="lazy" decoding="async"></div>'
    + '<div class="about-teaser-copy"><h2>' + t('aboutTeaserTitle') + '</h2><p>' + t('aboutTeaserDesc') + '</p>'
    + '<a class="btn btn-accent" href="#/about" data-nav="/about">' + t('aboutMore') + '</a></div></section>'
    + '</div>';
}

function videoCard(v) {
  /* 视频封面：优先用作者上传的封面，否则用该细分概念图（避免 404） */
  const thumbFallback = { hamster: 'hamster', cat: 'cat', 'dog-small': 'dog-small', 'dog-large': 'dog-large' }[v.pet] || 'hamster';
  const x = langObj(v);
  const badge = { bilibili: 'B站', youtube: 'YouTube', douyin: '抖音', upload: '自营' }[v.platform] || v.platform;
  const play = v.url ? '<a class="video-play" href="' + esc(v.url) + '" target="_blank" rel="noopener noreferrer">▶</a>'
    : '<span class="video-play video-play--soon" aria-hidden="true">▶</span>';
  return '<article class="video-card">'
    + '<div class="video-thumb"><img src="' + esc(videoThumbSrc(v)) + '" alt="" width="480" height="270" loading="lazy" decoding="async">'
    + play + '<span class="video-badge">' + esc(badge) + '</span></div>'
    + '<h3 class="oneline" title="' + esc(x.title) + '">' + esc(x.title) + '</h3>'
    + '<p class="video-by oneline" title="' + esc(x.by) + '">' + esc(x.by) + '</p>'
    + '</article>';
}

/* 视频封面地址：有上传封面用上传的，否则回落到细分概念图 */
function videoThumbSrc(v) {
  const map = { hamster: 'hamster', cat: 'cat', 'dog-small': 'dog-small', 'dog-large': 'dog-large' };
  return 'assets/pet/products/' + (map[v.pet] || 'hamster') + '.png';
}

function renderVideos() {
  document.title = t('videoWallTitle') + ' · BeanBeanMouse';
  const list = (state.videos && state.videos.length) ? state.videos : VIDEO_SHOWCASE;
  return '<div class="container page">'
    + '<section class="section"><h1 class="page-title">' + t('videoWallTitle') + '</h1>'
    + '<p class="section-note">' + t('videoWallDesc') + '</p>'
    + '<div class="video-grid video-grid--full">' + list.map(videoCard).join('') + '</div>'
    + '<div class="notice"><strong>' + t('videoNoticeTitle') + '</strong><p>' + t('videoNoticeDesc') + '</p></div>'
    + '<div class="section-actions"><button type="button" class="btn btn-accent" data-action="catreq-open">' + t('videoSubmit') + '</button></div>'
    + '</section></div>';
}

function renderAbout() {
  document.title = t('aboutTitle') + ' · BeanBeanMouse';
  const c = [
    { k: 'aboutContactEmail', v: 'beanbeanmouse.trade@outlook.com', href: 'mailto:beanbeanmouse.trade@outlook.com' },
    { k: 'aboutContactWechat', v: 'beanbeanmouse', href: '' },
    { k: 'aboutContactPhone', v: '13725078850', href: 'tel:13725078850' },
    { k: 'aboutContactAddress', v: t('aboutPending'), href: '' }
  ];
  return '<div class="container page">'
    + '<section class="section about-hero">'
    + '<div class="about-art"><img src="assets/pet/about-hamster.png" alt="' + esc(t('aboutArtAlt')) + '" width="520" height="520" decoding="async"></div>'
    + '<div class="about-copy"><h1>' + t('aboutTitle') + '</h1>'
    + '<p>' + t('aboutP1') + '</p><p>' + t('aboutP2') + '</p>'
    + '<h2 class="about-sub">' + t('aboutContactTitle') + '</h2>'
    + '<ul class="contact-list">' + c.map(x => {
        const val = x.href ? '<a href="' + x.href + '">' + esc(x.v) + '</a>' : '<span class="muted">' + esc(x.v) + '</span>';
        return '<li><span class="contact-k">' + t(x.k) + '</span>' + val + '</li>';
      }).join('') + '</ul>'
    + '<p class="small muted">' + t('aboutContactNote') + '</p>'
    + '</div></section>'
    + '<section class="section"><div class="section-head"><h2>' + t('promiseTitle') + '</h2></div>'
    + '<div class="promise-grid">' + [
      ['promise1T', 'promise1D'], ['promise2T', 'promise2D'], ['promise3T', 'promise3D'], ['promise4T', 'promise4D']
    ].map(x => '<div class="promise-card"><h3>' + t(x[0]) + '</h3><p>' + t(x[1]) + '</p></div>').join('') + '</div></section>'
    + '</div>';
}

/* ---------- 产品市场 ---------- */
function liveProducts() { return state.products.filter(isLive); }
function productRelevance(p, tokens) {
  const en = ((p.en && p.en.title) || '').toLowerCase();
  const zh = (p.zh && p.zh.title) || '';
  const ed = ((p.en && p.en.desc) || '').toLowerCase();
  const zd = (p.zh && p.zh.desc) || '';
  const sub = subOf(p);
  const hay = (en + ' ' + zh + ' ' + ed + ' ' + zd + ' ' + ((sub && sub.zh) || '') + ' ' + ((sub && sub.en) || '')
    + ' ' + langObj(catById(p.cat)) + ' ' + p.cat + ' ' + (langObj(sellerOf(p)).company || '') + ' ' + sellerOf(p).country).toLowerCase();
  let score = 0;
  let matched = false;
  for (const tk of tokens) {
    if (!tk) continue;
    if (en.includes(tk) || zh.includes(tk)) { score += 8; matched = true; }
    else if (ed.includes(tk) || zd.includes(tk)) { score += 4; matched = true; }
    else if (hay.includes(tk)) { score += 2; matched = true; }
    else if (tk.length >= 3 && hay.includes(tk.slice(0, -1))) { score += 1; matched = true; }
  }
  if (!matched) return 0;
  if (p.featured) score += 1;
  if (p.hot) score += 1;
  return score;
}
function relatedProducts(kw, cat, sub) {
  const tokens = String(kw || '').toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return [];
  const pool = liveProducts().filter(p => (!cat || p.cat === cat) && (!sub || p.sub === sub));
  return pool.map(p => ({ p, s: productRelevance(p, tokens) }))
    .filter(x => x.s > 0)
    .sort((a, b) => b.s - a.s || b.p.rating - a.p.rating)
    .slice(0, 8)
    .map(x => x.p);
}
function renderProducts(params) {
  document.title = t('marketplace') + ' · BeanBeanMouse';
  const kw = (params.get('kw') || '').trim();
  const cat = params.get('cat') || '';
  const sub = params.get('sub') || '';
  const sort = params.get('sort') || 'recommended';
  const min = params.get('min') ? +params.get('min') : null;
  const max = params.get('max') ? +params.get('max') : null;
  const moqMin = params.get('moq') ? +params.get('moq') : null;
  const origin = params.get('origin') || '';
  const certs = (params.get('certs') || '').split(',').filter(Boolean);
  const origins = Array.from(new Set(liveProducts().map(p => p.country)));
  const catObj = CATEGORIES.find(c => c.id === cat) || null;
  const catSubs = catObj ? (catObj.subs || []) : (CATEGORIES[0] ? (CATEGORIES[0].subs || []) : []);

  let list = liveProducts();
  if (kw) {
    const k = kw.toLowerCase();
    list = list.filter(p => p.en.title.toLowerCase().includes(k) || p.zh.title.includes(kw) || p.en.desc.toLowerCase().includes(k) || p.zh.desc.includes(kw));
  }
  if (cat) list = list.filter(p => p.cat === cat);
  if (sub) list = list.filter(p => p.sub === sub);
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
  if (sub) chips.push('<span class="active-filter" data-action="remove-filter" data-key="sub">' + esc((catById(cat).subs || []).find(s => s.id === sub) ? langObj((catById(cat).subs || []).find(s => s.id === sub)) : sub) + ' ✕</span>');
  if (min != null || max != null) chips.push('<span class="active-filter" data-action="remove-filter" data-key="minmax">$' + (min != null ? min : '0') + '–' + (max != null ? max : '∞') + ' ✕</span>');
  if (moqMin != null) chips.push('<span class="active-filter" data-action="remove-filter" data-key="moq">MOQ ≥ ' + moqMin + ' ✕</span>');
  if (origin) chips.push('<span class="active-filter" data-action="remove-filter" data-key="origin">' + esc(countryName(origin)) + ' ✕</span>');
  certs.forEach(c => chips.push('<span class="active-filter" data-action="remove-filter" data-key="certs" data-value="' + esc(c) + '">' + esc(c) + ' ✕</span>'));

  const related = kw ? relatedProducts(kw, cat, sub) : [];
  const grid = list.length
    ? '<div class="product-grid">' + list.map(productCard).join('') + '</div>'
    : '<div class="empty-state"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/search.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><h3>' + t('noResults') + '</h3><p>' + t('noResultsHint') + '</p></div>'
      + (related.length
        ? '<section class="related-section"><div class="section-head"><h2>✨ ' + t('relatedTitle') + '</h2><p class="small muted">' + t('relatedSub') + '</p></div>'
          + '<div class="product-grid">' + related.map(productCard).join('') + '</div></section>'
        : '');
  const searchSuggest = Array.from(new Set(
    liveProducts().map(p => (langObj(p).title || '')).filter(Boolean)
      .concat(CATEGORIES.flatMap(c => (c.subs || []).map(s => langObj(s))))
  )).slice(0, 12);

  return '<div class="container page">'
    + '<div class="page-head">'
    + '<h1>' + (kw ? t('searchResultsFor', { kw }) : t('marketplace')) + '</h1>'
    + '<div class="sub">' + t('statsProducts') + ' · ' + liveProducts().length + '+</div>'
    + '<form class="products-search" data-form="products-search" novalidate>'
    + '<input type="search" id="productKw" placeholder="' + t('searchBarPlaceholder') + '" value="' + esc(kw) + '" aria-label="' + t('searchBarPlaceholder') + '">'
  + '<button type="submit" class="btn btn-accent">' + icon('search') + t('searchBtn') + '</button>'
  + '</form>'
  + (searchSuggest.length ? '<div class="search-suggest">' + searchSuggest.slice(0, 6).map(sg => '<a class="chip" href="#/products?kw=' + encodeURIComponent(sg) + '" data-nav="/products?kw=' + encodeURIComponent(sg) + '">' + esc(sg) + '</a>').join('') + '</div>' : '')
  + '</div>'
    + '<div class="products-layout">'
    + '<aside class="card filter-panel" id="filterPanel">'
    + '<h3>' + icon('filter') + t('filters') + '</h3>'
    + (catSubs.length
      ? '<div class="filter-group"><h4>' + t('subFilter') + '</h4><div class="radio-row">'
        + '<label class="' + (sub === '' ? 'active' : '') + '"><input type="radio" name="sub" value="" ' + (sub === '' ? 'checked' : '') + '>' + t('allSubs') + '</label>'
        + catSubs.map(s => '<label class="' + (sub === s.id ? 'active' : '') + '"><input type="radio" name="sub" value="' + s.id + '" ' + (sub === s.id ? 'checked' : '') + '>' + langObj(s) + '</label>').join('')
        + '</div></div>'
      : '')
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
  panel.querySelectorAll('input[name="cat"]').forEach(r => r.addEventListener('change', () => {
    const { params } = parseHash();
    params.delete('sub');
    if (r.value) params.set('cat', r.value); else params.delete('cat');
    const qs = params.toString();
    location.hash = '#/products' + (qs ? '?' + qs : '');
  }));
  panel.querySelectorAll('input[name="sub"]').forEach(r => r.addEventListener('change', () => setFilter('sub', r.value)));
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
      : '<div class="empty-state"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/news.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noNews') + '</p></div>')
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
function detailRelatedHtml(p) {
  let others = liveProducts().filter(x => x.id !== p.id && x.cat === p.cat && p.sub && x.sub === p.sub).sort((a, b) => b.rating - a.rating);
  if (!others.length) others = liveProducts().filter(x => x.id !== p.id && x.cat === p.cat).sort((a, b) => b.rating - a.rating);
  others = others.slice(0, 4);
  if (!others.length) return '';
  return '<section class="related-section detail-related"><div class="section-head"><h2>✨ ' + t('relatedTitle') + '</h2>'
    + '<a class="btn btn-sm" href="#/products?cat=' + p.cat + '" data-nav="/products?cat=' + p.cat + '">' + t('viewAll') + ' →</a></div>'
    + '<div class="product-grid">' + others.map(productCard).join('') + '</div></section>';
}
function renderSellerPage(sid) {
  const seller = SELLERS.find(s => s.id === sid);
  if (!seller) return renderHome();
  document.title = langObj(seller).company + ' · BeanBeanMouse';
  const verified = isVerifiedSeller(seller.id);
  const company = (state.companies || []).find(c => c.sellerId === seller.id) || null;
  const products = liveProducts().filter(p => p.sellerId === seller.id);
  const certs = Array.from(new Set(products.flatMap(p => p.certs || [])));
  const markets = Array.from(new Set(products.flatMap(p => p.markets || [])));
  const readiness = exportReadinessOf(seller.id);
  const companyName = langObj(seller).company;
  const companyEn = seller.en && seller.en.company ? seller.en.company : companyName;
  const certChips = certs.length ? certs.map(c => '<span class="chip cert">' + esc(c) + '</span>').join('') : '<span class="small muted">—</span>';
  const marketChips = markets.length ? markets.map(m => '<span class="chip">' + esc(MARKET_COMPLIANCE[m] ? langObj(MARKET_COMPLIANCE[m]) : m) + '</span>').join('') : '<span class="small muted">—</span>';
  const statusPill = verified
    ? '<span class="status-pill done">' + icon('check') + ' ' + t('verified') + '</span>'
    : '<span class="status-pill pend">' + t('pendingVerify') + '</span>';
  const firstProduct = products[0] || null;
  const stat = (n, l) => '<div class="sp-stat"><b>' + n + '</b><span>' + esc(l) + '</span></div>';
  return '<div class="container page">'
    + '<nav class="breadcrumb"><a href="#/" data-nav="/">' + t('home') + '</a> / <a href="#/products" data-nav="/products">' + t('marketplace') + '</a> / <span>' + esc(companyName) + '</span></nav>'
    + '<section class="card panel seller-profile-head">'
    + '<span class="sp-logo">' + esc(initialsOf(companyName)) + '</span>'
    + '<div class="sp-main"><div class="sp-title">' + esc(companyName) + ' ' + statusPill + '</div>'
    + '<div class="sp-en">' + esc(companyEn) + '</div>'
    + '<div class="sp-meta">' + flagEmoji(seller.country) + ' ' + countryName(seller.country) + ' · ' + esc(langObj(seller).city) + ' · ' + t('since') + ' ' + seller.since + '</div>'
    + (company && company.businessScope ? '<div class="sp-scope">' + esc(company.businessScope) + '</div>' : '')
    + '</div>'
    + '<div class="sp-stats">'
    + stat(seller.rating.toFixed(1), '★ ' + t('statsSuppliers'))
    + stat(seller.orders.toLocaleString(), t('orders'))
    + stat(seller.responseRate + '%', t('responseRate'))
    + stat(seller.responseTime, t('responseTime'))
    + '</div>'
    + '</section>'
    + '<div class="seller-trust-grid">'
    + '<section class="card panel"><div class="panel-head"><h2> ' + t('sellerTrustTitle') + '</h2></div>'
    + '<div class="trust-cell"><b>' + (verified ? t('verified') : t('pendingVerify')) + '</b><span>' + (verified ? t('companyApproved') : t('companyTip')) + '</span></div>'
    + '<div class="trust-cell"><b>' + t('exportReadinessScore') + '</b><span>' + readiness.score + '%（' + readiness.coreDone + '/' + readiness.coreTotal + '）</span></div>'
    + '<div class="trust-cell"><b>' + t('statLive') + '</b><span>' + products.length + '</span></div>'
    + '<p class="small muted" style="margin-top:10px">' + t('sellerTrustNote') + '</p></section>'
    + '<section class="card panel"><div class="panel-head"><h2>📜 ' + t('sellerCertsTitle') + '</h2></div>'
    + '<div class="cert-block">' + certChips + '</div>'
    + (company && company.docs && company.docs.length ? '<p class="small muted">' + t('docsLabel') + '：' + esc(company.docs.join('、')) + '</p>' : '')
    + '<div class="panel-head mt-20"><h2>🌍 ' + t('sellerMarketsTitle') + '</h2></div><div class="cert-block">' + marketChips + '</div>'
    + '</section>'
    + '</div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('sellerProductsTitle') + ' (' + products.length + ')</h2>'
    + (firstProduct ? '<button type="button" class="btn btn-primary btn-sm" data-action="open-inquiry" data-id="' + firstProduct.id + '">' + icon('message') + ' ' + t('sellerContact') + '</button>' : '')
    + '</div>'
    + (products.length ? '<div class="product-grid">' + products.map(productCard).join('') + '</div>' : '<p class="muted">' + t('noProducts') + '</p>')
    + '</section>'
    + '<p class="small muted" style="margin-top:14px">' + t('sellerPageNote') + '</p>'
    + '</div>';
}
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
  const imgs = productImages(p);
  const galleryN = imgs.length ? imgs.length : 3;
  const mainSrc = imgs.length ? productImgUrl(p, variant) : productImg(p, 800, 600, variant);
  const thumbs = Array.from({ length: galleryN }, (_, v) =>
    '<img src="' + (imgs.length ? productImgUrl(p, v) : productImg(p, 640, 480, v)) + '" alt="' + (v + 1) + '" class="' + (v === variant ? 'on' : '') + '" data-action="gallery" data-id="' + p.id + '" data-v="' + v + '">'
  ).join('');
  return '<div class="container page">'
    + '<nav class="breadcrumb"><a href="#/" data-nav="/">' + t('home') + '</a> / <a href="#/products" data-nav="/products">' + t('marketplace') + '</a> / <a href="#/products?cat=' + p.cat + '" data-nav="/products?cat=' + p.cat + '">' + esc(langObj(cat)) + '</a> / <span>' + esc(langObj(p).title) + '</span></nav>'
    + '<div class="detail-layout">'
    + '<div class="gallery">'
    + '<div class="main-img"><img src="' + mainSrc + '" alt="' + esc(langObj(p).title) + '" id="mainImg"></div>'
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
    + petFitBlock(p)
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
    + '<div class="info"><div class="name">' + esc(langObj(seller).company) + (isVerifiedSeller(p.sellerId) ? ' ' + icon('shield') + '<span style="color:#126A33;font-size:12px">' + t('verified') + '</span>' : '') + '</div>'
    + '<div class="sub">' + esc(langObj(seller).city) + ', ' + countryName(seller.country) + ' · ' + t('responseRate') + ' ' + seller.responseRate + '%</div>'
    + '<a class="seller-page-link" href="#/seller/' + seller.id + '" data-nav="/seller/' + seller.id + '">' + t('viewSellerPage') + ' →</a></div>'
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
      ? '<details class="src-text"><summary> ' + t('sourceLang') + '（' + langLabel(base) + '）</summary>'
        + '<div class="src-text-body"><h4>' + esc(srcTitle) + '</h4><p>' + esc(srcDesc) + '</p><ul class="feature-list">'
        + srcFeatures.map(f => '<li><span class="tick">✓</span><span>' + esc(f) + '</span></li>').join('')
        + '</ul></div></details>'
      : '')
    + '</div>'
    + '<div class="card detail-block fake-card"><h2> ' + t('fakeTitle') + '</h2>'
    + '<div class="fake-card-body">'
    + '<div class="fake-qr">' + fakeQrSvg(fakeCodeOf(p)) + '</div>'
    + '<div class="fake-card-info">'
    + '<div class="fake-status"><span class="fake-badge">✓ ' + t('fakeGenuine') + '</span></div>'
    + '<div class="fake-code-row"><span>' + t('fakeCode') + '：</span><b class="fake-code">' + fakeCodeOf(p) + '</b></div>'
    + '<p class="small muted">' + t('fakeInfo') + '</p>'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="verify-product" data-id="' + p.id + '"> ' + t('fakeVerify') + '</button>'
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
    + (function () {
      const flags = productScreenFlags(p);
      return '<div class="card detail-block"><h2>🔎 ' + t('compliancePanelTitle') + '</h2>'
        + '<div class="compliance-screen">'
        + (flags.length
          ? '<span class="status-pill rej">' + t('complianceFlagLabel') + ' ' + flags.length + '</span>'
          : '<span class="status-pill done">' + t('compliancePassLabel') + '</span>')
        + (flags.length ? '<div class="risk-box">' + flags.map(k => '<span class="risk-chip">' + esc(k) + '</span>').join('') + '</div>' : '')
        + '<p class="small muted">' + t('compliancePanelNote') + '</p>'
        + '<a class="btn btn-sm" href="#/compliance" data-nav="/compliance">' + t('complianceScreenDemo') + ' →</a>'
        + '</div></div>';
    })()
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
    + '</div>'
    + detailRelatedHtml(p)
    + '</div>';
}

function setGallery(el) {
  const p = productById(el.dataset.id);
  if (!p) return;
  const v = el.dataset.v;
  const main = $('#mainImg');
  if (main) main.src = productImages(p).length ? productImgUrl(p, +v) : productImg(p, 800, 600, +v);
  $$('.gallery-thumbs img').forEach(i => i.classList.toggle('on', i === el));
}

/* ---------- 询盘 ---------- */
/* 附件暂存：提交前暂存在内存，提交后写入询盘/报价记录 */
const pendingFiles = { inquiry: [], quote: {} };
const ATTACH_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ATTACH_ARCHIVE_RE = /\.(zip|rar|7z)$/i;
const ATTACH_TOTAL_LIMIT = 2.5 * 1024 * 1024;
function attachAllowed(file) {
  return ATTACH_IMAGE_TYPES.includes(file && file.type) || ATTACH_ARCHIVE_RE.test(String(file && file.name || ''));
}
function fmtSize(n) {
  const v = Number(n) || 0;
  return v >= 1048576 ? (v / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(v / 1024)) + ' KB';
}
function downscaleImage(dataUrl, maxSide) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth, h = img.naturalHeight;
      if (!w || !h || Math.max(w, h) <= maxSide) return resolve({ dataUrl, type: '' });
      const scale = maxSide / Math.max(w, h);
      const c = document.createElement('canvas');
      c.width = Math.round(w * scale); c.height = Math.round(h * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve({ dataUrl: c.toDataURL('image/jpeg', 0.85), type: 'image/jpeg' });
    };
    img.onerror = () => resolve({ dataUrl, type: '' });
    img.src = dataUrl;
  });
}
function readAttachFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => {
      const dataUrl = String(r.result);
      const finish = (opt) => resolve({
        id: 'at' + Date.now() + Math.random().toString(36).slice(2, 6),
        fileId: null,
        storage: 'local',
        name: String(file.name || 'file'),
        type: opt && opt.type ? opt.type : (file.type || ''),
        size: opt && opt.dataUrl && opt.dataUrl !== dataUrl ? Math.max(1, Math.round(opt.dataUrl.length * 0.75)) : (file.size || 0),
        dataUrl: opt && opt.dataUrl ? opt.dataUrl : dataUrl
      });
      if (ATTACH_IMAGE_TYPES.includes(file.type)) {
        downscaleImage(dataUrl, 1400).then(finish).catch(() => finish(null));
      } else {
        finish(null);
      }
    };
    r.onerror = () => reject(new Error('READ_ERROR'));
    r.readAsDataURL(file);
  });
}
function currentPending(storeKey) {
  if (storeKey === 'inquiry') return pendingFiles.inquiry;
  if (storeKey && storeKey.indexOf('quote:') === 0) return pendingFiles.quote[storeKey.slice(6)] || [];
  return [];
}
function renderAttachPreview(wrap, storeKey) {
  if (!wrap) return;
  const box = wrap.querySelector('.attach-preview');
  if (!box) return;
  const list = currentPending(storeKey);
  box.innerHTML = list.map(a =>
    '<span class="attach-chip"><span class="attach-ico">' + (ATTACH_IMAGE_TYPES.includes(a.type) ? '🖼️' : '🗜️') + '</span>'
    + '<span class="attach-name">' + esc(a.name) + ' · ' + fmtSize(a.size) + '</span>'
    + '<button type="button" class="attach-x" data-action="attach-remove" data-store="' + esc(storeKey) + '" data-name="' + esc(a.name) + '" aria-label="' + t('attachRemove') + '">✕</button>'
    + '</span>').join('');
}
function removePendingAttach(storeKey, name) {
  const list = currentPending(storeKey);
  const idx = list.findIndex(a => a.name === name);
  if (idx >= 0) list.splice(idx, 1);
  if (storeKey && storeKey.indexOf('quote:') === 0) {
    const qid = storeKey.slice(6);
    pendingFiles.quote[qid] = list;
  }
}
document.addEventListener('change', async e => {
  const input = e.target;
  const wrap = input.closest('.attach-field');
  if (!wrap || !input.files || !input.files.length) return;
  const storeKey = input.dataset.attachStore || '';
  const added = [];
  for (const f of Array.from(input.files)) {
    if (!attachAllowed(f)) { toast(t('attachTypeNotAllowed')); continue; }
    if (f.size > 4 * 1024 * 1024) { toast(t('attachSizeTooBig')); continue; }
    try { added.push(await readAttachFile(f)); } catch (err) { /* 跳过不可读文件 */ }
  }
  const existing = currentPending(storeKey);
  const budget = existing.reduce((s, a) => s + (a.size || 0), 0);
  const kept = [];
  for (const a of added) {
    if (budget + kept.reduce((s, x) => s + (x.size || 0), 0) + (a.size || 0) > ATTACH_TOTAL_LIMIT) {
      toast(t('attachTotalTooBig'));
      continue;
    }
    kept.push(a);
  }
  if (storeKey === 'inquiry') pendingFiles.inquiry = pendingFiles.inquiry.concat(kept);
  else if (storeKey && storeKey.indexOf('quote:') === 0) {
    const qid = storeKey.slice(6);
    pendingFiles.quote[qid] = (pendingFiles.quote[qid] || []).concat(kept);
  } else if (storeKey === 'card' && kept.length) {
    await saveBusinessCard(kept[0]);
    const wrap2 = input.closest('.attach-field');
    renderBusinessCardPreview(wrap2);
  }
  renderAttachPreview(wrap, storeKey);
  input.value = '';
});

/* 注册表单：CSP 安全的主体类型/角色切换（替代内联 onchange） */
document.addEventListener('change', e => {
  const el = e.target;
  if (!el || !el.checked) return;
  if (el.dataset.regToggle !== undefined) {
    const box = document.getElementById(el.dataset.regToggle);
    if (box) box.hidden = el.value !== 'seller';
  }
  if (el.dataset.regType !== undefined) {
    const company = document.getElementById('companyFields');
    const individual = document.getElementById('individualFields');
    if (company) company.hidden = el.value !== 'company';
    if (individual) individual.hidden = el.value !== 'individual';
  }
});

/* 名片模板自定义：Logo 上传 */
document.addEventListener('change', e => {
  const input = e.target;
  if (!input || !input.dataset.cardOpt) return;
  const f = input.files && input.files[0];
  if (!f) return;
  if (!ATTACH_IMAGE_TYPES.includes(f.type)) { toast(t('attachTypeNotAllowed')); return; }
  readAttachFile(f).then(att => {
    saveCardOpts({ logo: att.dataUrl, logoName: att.name });
    toast('✓ ' + t('cardLogoUpload'));
    renderPage();
  }).catch(() => toast(t('attachSizeTooBig')));
  input.value = '';
});

/* 产品发布：真实商品图上传 */
document.addEventListener('change', e => {
  const input = e.target;
  if (!input || !input.hasAttribute('data-product-imgs')) return;
  if (!input.files || !input.files.length) return;
  const files = Array.from(input.files);
  Promise.all(files.map(f => {
    if (!ATTACH_IMAGE_TYPES.includes(f.type)) { toast(t('attachTypeNotAllowed')); return null; }
    return readAttachFile(f).catch(() => null);
  })).then(list => {
    list.forEach(a => {
      if (!a) return;
      if (productImgFiles.length >= 8) { toast(t('imgMax')); return; }
      productImgFiles.push(a);
    });
    refreshProductImgWrap();
  });
  input.value = '';
});

function attachUrl(a) {
  if (!a) return '';
  if (a.dataUrl) return a.dataUrl;
  if (a.fileId && state.files && state.files[a.fileId]) return state.files[a.fileId].dataUrl || '';
  return '';
}

function attachmentChipsHtml(list, inquiryId) {
  if (!list || !list.length) return '';
  return '<div class="attach-list"><span class="small muted">' + icon('file') + ' ' + t('attachmentLabel') + '：</span>'
    + list.map(a => {
      const url = attachUrl(a);
      return '<span class="attach-chip">'
      + (ATTACH_IMAGE_TYPES.includes(a.type)
        ? '<button type="button" class="attach-img-btn" data-action="view-attach" data-id="' + esc(inquiryId || '') + '" data-name="' + esc(a.name) + '" aria-label="' + esc(a.name) + '"><img src="' + url + '" alt="' + esc(a.name) + '"></button>'
        : '<span class="attach-ico">🗜️</span>')
      + '<a href="' + url + '" download="' + esc(a.name) + '">' + esc(a.name) + ' <span class="small muted">' + fmtSize(a.size) + '</span></a>'
      + '</span>';
    }).join('')
    + '</div>';
}
function identityBadgeHtml(i) {
  if (!i || !i.buyerType) return '';
  const label = i.buyerType === 'individual' ? t('accountTypeIndividual') : t('accountTypeCompany');
  return '<span class="chip identity-chip">' + '' + esc(label) + (i.jobTitle ? ' · ' + esc(i.jobTitle) : '') + '</span>';
}
function cardButtonHtml(i) {
  if (!i || !i.card) return '';
  return '<button type="button" class="btn btn-sm" data-action="view-card" data-id="' + i.id + '">' + icon('users') + ' ' + t('viewCard') + '</button>';
}
function exportButtonsHtml(i) {
  return '<div class="conv-export"><span class="small muted">' + t('exportConvHint') + '</span>'
    + '<button type="button" class="btn btn-sm" data-action="export-conv" data-id="' + i.id + '" data-format="txt">' + icon('file') + ' ' + t('exportTxt') + '</button>'
    + '<button type="button" class="btn btn-sm" data-action="export-conv" data-id="' + i.id + '" data-format="html">' + icon('file') + ' ' + t('exportHtml') + '</button></div>';
}
function attachmentsTextForExport(list) {
  if (!list || !list.length) return '';
  const zh = state.lang === 'zh';
  return '\n\n## ' + (zh ? '附件' : 'Attachments') + '\n' + list.map(a => '- ' + a.name + ' (' + fmtSize(a.size) + ')').join('\n');
}
function attachmentsHtmlForExport(list) {
  if (!list || !list.length) return '';
  return '<h2>' + esc(t('attachmentLabel')) + '</h2>'
    + list.map(a => '<p>' + esc(a.name) + ' (' + esc(fmtSize(a.size)) + ')<br>'
      + (ATTACH_IMAGE_TYPES.includes(a.type) ? '<img src="' + attachUrl(a) + '" alt="' + esc(a.name) + '" style="max-width:480px">' : '')
      + '</p>').join('');
}
function exportConversation(i, format) {
  if (!i) return;
  const p = productById(i.productId);
  const zh = state.lang === 'zh';
  const title = zh ? '豆豆鼠询盘往来记录' : 'BeanBeanMouse Inquiry Thread';
  const buyer = (i.company ? i.company + ' / ' : '') + i.name;
  const seller = p ? partyNameOf({ sellerId: p.sellerId }, 'seller') : '—';
  const date = ts => new Date(ts).toLocaleString(uiLocale());
  const all = (i.attachments || []).concat(i.replyAttachments || []);
  const meta = [
    (zh ? '询盘编号' : 'Inquiry ID') + '：' + i.id,
    (zh ? '产品' : 'Product') + '：' + (p ? langObj(p).title : i.productId),
    (zh ? '买家' : 'Buyer') + '：' + buyer,
    (zh ? '卖家' : 'Seller') + '：' + seller,
    (zh ? '数量' : 'Quantity') + '：' + i.qty + ' ' + i.unit,
    (zh ? '发送时间' : 'Sent at') + '：' + date(i.createdAt)
  ].join(format === 'html' ? '<br>' : '\n');
  let body;
  if (format === 'html') {
    body = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>' + esc(title) + '</title></head>'
      + '<body style="font-family:Segoe UI,Arial,sans-serif;max-width:720px;margin:24px auto;line-height:1.6">'
      + '<h1>' + esc(title) + '</h1><p>' + meta + '</p>'
      + '<h2>' + esc(zh ? '买家询盘' : 'Buyer inquiry') + '</h2><blockquote style="border-left:3px solid #C8860B;padding-left:12px;color:#3D2E1A">' + esc(i.message) + '</blockquote>'
      + (i.quote
        ? '<h2>' + esc(zh ? '卖家报价' : 'Seller quotation') + '</h2><p>'
          + esc((zh ? '单价' : 'Unit price') + '：' + i.quote.price + ' ' + (i.quote.incoterm || '')) + '<br>'
          + esc((zh ? '付款' : 'Payment') + '：' + langObj(i.quote.payment)) + '<br>'
          + esc((zh ? '有效期' : 'Validity') + '：' + i.quote.validity + (zh ? ' 天' : ' days')) + '<br>'
          + esc((zh ? '交期' : 'Lead time') + '：' + i.quote.leadTime + (zh ? ' 天' : ' days')) + '</p>'
          + (i.quote.note ? '<p>' + esc(i.quote.note) + '</p>' : '')
        : '')
      + (i.reply ? '<h2>' + esc(zh ? '卖家回复' : 'Seller reply') + '</h2><blockquote style="border-left:3px solid #2E9E5B;padding-left:12px">' + esc(i.reply) + '</blockquote>' : '')
      + attachmentsHtmlForExport(all)
      + '<p style="color:#8A7654;font-size:12px">' + esc(zh ? '由 BeanBeanMouse 导出 · 演示原型' : 'Exported from BeanBeanMouse · demo') + '</p>'
      + '</body></html>';
  } else {
    body = '# ' + title + '\n\n' + meta + '\n\n## ' + (zh ? '买家询盘' : 'Buyer inquiry') + '\n' + i.message
      + (i.quote
        ? '\n\n## ' + (zh ? '卖家报价' : 'Quotation') + '\n'
          + (zh ? '单价' : 'Unit price') + '：' + i.quote.price + ' ' + (i.quote.incoterm || '') + '\n'
          + (zh ? '付款' : 'Payment') + '：' + langObj(i.quote.payment) + '\n'
          + (zh ? '有效期' : 'Validity') + '：' + i.quote.validity + (zh ? ' 天' : ' days') + '\n'
          + (zh ? '交期' : 'Lead time') + '：' + i.quote.leadTime + (zh ? ' 天' : ' days')
          + (i.quote.note ? '\n' + (zh ? '备注' : 'Note') + '：' + i.quote.note : '')
        : '')
      + (i.reply ? '\n\n## ' + (zh ? '卖家回复' : 'Seller reply') + '\n' + i.reply : '')
      + attachmentsTextForExport(all);
  }
  const blob = new Blob([body], { type: format === 'html' ? 'text/html;charset=utf-8' : 'text/plain;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'bbm-inquiry-' + String(i.id).replace(/[^A-Za-z0-9]/g, '') + '.' + format;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function openAttachModal(a) {
  if (!a) return;
  const url = attachUrl(a);
  showModal('<div class="modal-head"><h3>' + icon('file') + ' ' + esc(a.name) + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><div class="attach-view"><img src="' + url + '" alt="' + esc(a.name) + '"></div>'
    + '<div class="doc-actions"><a class="btn btn-primary" href="' + url + '" download="' + esc(a.name) + '">' + t('download') + '</a>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('close') + '</button></div></div>');
}
function findInquiryAttachment(i, name) {
  return (i.attachments || []).concat(i.replyAttachments || []).find(a => a.name === name);
}
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
    + '<div class="trans-preview"><span class="trans-label">' + icon('sparkle') + ' ' + t('translateLabel') + '</span><p data-trans-target="msg">' + t('translating') + '</p><div class="trans-note">' + t('translateNote') + '</div></div>'
    + '<div class="field"><label>' + t('payment') + ' <span class="hint">' + t('paymentHint') + '</span></label><select class="select" name="payment">' + PAYMENT_TERMS.map((pt, i) => '<option value="' + i + '">' + esc(langObj(pt)) + '</option>').join('') + '</select></div>'
    + (u ? '<div class="identity-box">'
      + '<div class="field"><label>' + t('identityLabel') + '</label><div class="check-group">'
      + '<label class="check-pill"><input type="radio" name="identity" value="public" checked>' + t('identityPublic') + '</label>'
      + '<label class="check-pill"><input type="radio" name="identity" value="hidden">' + t('identityHidden') + '</label>'
      + '</div></div>'
      + (hasBusinessCard() ? '<label class="checkbox-label send-card-label"><input type="checkbox" name="sendCard" value="1" checked>' + t('sendCard') + '</label>' : '')
      + '</div>' : '')
    + '<div class="field attach-field"><label>' + t('attachLabel') + ' <span class="hint">' + t('attachHint') + '</span></label>'
    + '<input type="file" name="attachments" multiple accept="image/jpeg,image/png,image/gif,image/webp,.zip,.rar,.7z" data-attach-store="inquiry">'
    + '<div class="attach-preview"></div></div>'
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
  const identity = (fd.get('identity') || 'public') === 'public';
  const card = identity && fd.get('sendCard') === '1' && hasBusinessCard()
    ? (state.user.businessCard || ((state.profiles || {})[state.user.id] || {}).businessCard) : null;
  const inquiry = {
    id: 'i' + Date.now(),
    productId: pid, sellerId: p.sellerId,
    buyerId: state.user ? state.user.id : 'guest',
    name, email, company: (fd.get('company') || '').trim(), country: fd.get('country') || '',
    qty, unit: fd.get('unit'), message,
    payment: PAYMENT_TERMS[+(fd.get('payment') || 0)] || PAYMENT_TERMS[0],
    attachments: pendingFiles.inquiry.slice(),
    buyerType: identity && state.user ? (state.user.accountType || 'company') : null,
    jobTitle: identity && state.user ? (state.user.jobTitle || '') : '',
    card: card || null,
    cardName: card ? (state.user.businessCardName || 'business-card') : '',
    createdAt: Date.now(), status: 'new', reply: ''
  };
  pendingFiles.inquiry = [];
  state.inquiries.unshift(inquiry);
  saveState();
  const sellerUser = sellerUserOf(inquiry.sellerId);
  if (sellerUser) {
    pushNotification({
      toUserId: sellerUser.id,
      title: t('notifNewInquiry'),
      body: (inquiry.company ? inquiry.company + ' · ' : '') + inquiry.name + '：' + inquiry.message.slice(0, 80),
      link: '/dashboard/inquiries'
    });
  }
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
function profileFieldsOf(u) {
  const p = (state.profiles || {})[u.id] || {};
  return {
    name: p.name != null ? p.name : (u.name || ''),
    accountType: p.accountType != null ? p.accountType : (u.accountType || 'company'),
    jobTitle: p.jobTitle != null ? p.jobTitle : (u.jobTitle || ''),
    company: p.company != null ? p.company : (u.company || u.buyerCompany || ''),
    country: p.country != null ? p.country : (u.country || u.buyerCountry || ''),
    contact: p.contact != null ? p.contact : (u.contact || u.email || ''),
    bio: p.bio || '',
    bizName: p.bizName != null ? p.bizName : (u.bizName || '')
  };
}
function profileCompletenessOf(u) {
  const f = profileFieldsOf(u);
  const keys = ['name', 'accountType', 'jobTitle', 'company', 'country', 'contact', 'bio'];
  return Math.round(keys.filter(k => String(f[k] || '').trim()).length / keys.length * 100);
}
function businessCardOf() {
  if (!state.user) return null;
  return state.user.businessCard || ((state.profiles || {})[state.user.id] || {}).businessCard || null;
}
function hasBusinessCard() { return !!businessCardOf(); }
async function saveBusinessCard(att) {
  if (!att || !att.dataUrl) return;
  try {
    await api.profile.save({ businessCard: att.dataUrl, businessCardName: att.name });
    toast('✓ ' + t('cardUploadBtn'));
    renderPage();
  } catch (e) { toast(e.message || String(e)); }
}
function renderBusinessCardPreview(wrap) {
  if (!wrap) return;
  const box = wrap.querySelector('.card-preview');
  if (!box) return;
  const card = businessCardOf();
  box.innerHTML = card
    ? '<div class="card-preview-box"><img src="' + card + '" alt="' + esc(t('cardPreviewLabel')) + '">'
      + '<div class="flex gap-10"><a class="btn btn-sm" href="' + card + '" download="' + esc(state.user.businessCardName || 'business-card') + '">' + t('downloadCard') + '</a>'
      + '<button type="button" class="btn btn-sm" data-action="card-remove">' + t('cardRemoveBtn') + '</button></div></div>'
    : '<p class="small muted">' + t('cardNoCard') + '</p>';
}
function cardWatermarkLine(name) {
  return (state.lang === 'zh' ? '豆豆鼠展示 · ' : 'BeanBeanMouse · ') + (name || '');
}
function watermarkImage(dataUrl, name) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      try {
        const maxW = 1600;
        const scale = Math.min(1, maxW / Math.max(1, img.naturalWidth || 1));
        const w = Math.round((img.naturalWidth || 1) * scale);
        const h = Math.round((img.naturalHeight || 1) * scale);
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, w, h);
        const line = cardWatermarkLine(name);
        const fontPx = Math.max(11, Math.round(h * 0.034));
        ctx.save();
        ctx.globalAlpha = 0.075;
        ctx.font = '600 ' + fontPx + 'px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(30, 20, 5, 0.55)';
        ctx.shadowBlur = 3;
        ctx.fillStyle = '#FFFFFF';
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-Math.PI / 6);
        const stepX = Math.max(150, Math.round(w * 0.42));
        const stepY = Math.max(80, Math.round(h * 0.30));
        for (let y = -h; y <= h * 2; y += stepY) {
          for (let x = -w; x <= w * 2; x += stepX) {
            ctx.fillText(line, x, y);
          }
        }
        ctx.globalAlpha = 0.13;
        ctx.fillText(line, 0, 0);
        ctx.restore();
        resolve(c.toDataURL(String(dataUrl || '').indexOf('image/png') >= 0 ? 'image/png' : 'image/jpeg', 0.92));
      } catch (err) { reject(err); }
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}
function templateCompanyEn(company) {
  const map = {
    '杭州云帆机械有限公司': 'HANGZHOU YUNFAN MACHINERY CO., LTD.',
    '深圳新星电子科技有限公司': 'SHENZHEN NOVA ELECTRONICS CO., LTD.',
    'Müller GmbH': 'MÜLLER GMBH',
    'Muller GmbH': 'MÜLLER GMBH'
  };
  return map[String(company || '').trim()] || 'BEANBEANMOUSE MEMBER';
}
function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
function hexMix(hex, target, p) {
  const n = s => parseInt(String(s).slice(0, 2), 16);
  const h = String(hex || '#C8860B').replace('#', '');
  const t = String(target).replace('#', '');
  if (h.length !== 6 || t.length !== 6) return String(hex || '#C8860B');
  return '#' + [0, 2, 4].map(i => Math.round(n(h.slice(i)) + (n(t.slice(i)) - n(h.slice(i))) * p).toString(16).padStart(2, '0')).join('');
}
function hexA(hex, a) {
  const h = String(hex || '#000000').replace('#', '');
  if (h.length !== 6) return 'rgba(0,0,0,' + a + ')';
  return 'rgba(' + [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16)).join(',') + ',' + a + ')';
}
function drawLogoImage(ctx, dataUrl, cx, cy, r) {
  return new Promise(resolve => {
    const img = new Image();
    img.onload = () => {
      try {
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.clip();
        ctx.drawImage(img, cx - r, cy - r, r * 2, r * 2);
        ctx.restore();
      } catch (e) { /* 忽略 */ }
      resolve();
    };
    img.onerror = () => resolve();
    img.src = dataUrl;
  });
}
function cardOptsOf(u) {
  return ((state.profiles || {})[u.id] || {}).cardOpts || {};
}
function saveCardOpts(patch) {
  const u = state.user;
  if (!u) return;
  state.profiles = state.profiles || {};
  state.profiles[u.id] = state.profiles[u.id] || {};
  state.profiles[u.id].cardOpts = Object.assign({}, state.profiles[u.id].cardOpts || {}, patch || {});
  saveState();
}
async function renderCardTemplate(tplId, fields, opts) {
  const W = 1050, H = 600;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const ctx = c.getContext('2d');
  const o = opts || {};
  const name = String(fields.name || '').trim() || 'YOUR NAME';
  const title = String(fields.jobTitle || '').trim() || 'BUSINESS';
  const company = String(fields.company || '').trim() || String(fields.bizName || '').trim();
  const companyEn = templateCompanyEn(company);
  const contact = String(fields.contact || '').trim();
  const email = state.user ? state.user.email || '' : '';
  const address = fields.country ? countryName(fields.country) : '';
  const brand = 'BeanBeanMouse · beanbeanmouse.com';
  const accent = o.accent || (tplId === 'luxe-ink' || tplId === 'minimal-white' ? '#C8A25B' : tplId === 'modern-blue' ? '#4E9BFF' : tplId === 'oriental-ink' ? '#B3402A' : '#C8860B');
  const accentDark = hexMix(accent, '#000000', 0.35);
  const accentLight = hexMix(accent, '#FFFFFF', 0.55);
  const defFace = (tplId === 'luxe-ink' || tplId === 'oriental-ink') ? '"KaiTi","STKaiti",serif' : '"Microsoft YaHei","Segoe UI",Arial';
  const nf = o.font === 'kai' ? '"KaiTi","STKaiti",serif' : o.font === 'serif' ? 'Georgia, "Times New Roman", serif' : o.font === 'sans' ? '"Microsoft YaHei","Segoe UI",Arial' : defFace;
  const yh = (str, x, y, size, weight, color, family) => {
    ctx.font = weight + ' ' + size + 'px ' + family;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  };
  if (tplId === 'classic-gold') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#FFFDF6'); g.addColorStop(0.6, '#FFF6E0'); g.addColorStop(1, '#FBEBC9');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const band = ctx.createLinearGradient(0, 0, 0, H);
    band.addColorStop(0, accentLight); band.addColorStop(1, accentDark);
    ctx.fillStyle = band; ctx.fillRect(0, 0, 14, H);
    const lg = ctx.createLinearGradient(70, 54, 130, 114);
    lg.addColorStop(0, accent); lg.addColorStop(1, accentDark);
    ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(100, 84, 34, 0, Math.PI * 2); ctx.fill();
    if (!o.logo) yh('YF', 100, 90, 22, '700', '#FFFFFF', '"Segoe UI", Arial');
    yh(company || 'COMPANY', 152, 78, 26, '700', '#4A2E08', '"Microsoft YaHei","Segoe UI"');
    yh(companyEn, 152, 102, 13, '500', '#8A7654', 'Georgia, serif');
    yh(name, 84, 230, 52, '700', '#2E1F0A', '"Microsoft YaHei","Segoe UI"');
    yh(title, 84 + ctx.measureText(name).width + 28, 228, 18, '600', accent, nf);
    ctx.strokeStyle = hexA(accent, .55); ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(84, 272); ctx.lineTo(560, 272); ctx.stroke();
    ['E  ' + (email || '—'), 'T  ' + (contact || '—'), 'W  www.beanbeanmouse.com', 'A  ' + (address || '—')].forEach((t, i) => yh(t, 84, 312 + i * 38, 16, '500', '#5A4A2E', '"Segoe UI", Arial'));
    ctx.strokeStyle = hexA(accent, .25);
    ctx.beginPath(); ctx.moveTo(84, 540); ctx.lineTo(966, 540); ctx.stroke();
    yh(brand, 84, 566, 13, '500', '#8A7654', 'Georgia, serif');
  } else if (tplId === 'luxe-ink') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#1A1D25'); g.addColorStop(0.46, '#20242E'); g.addColorStop(1, '#151820');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    const glow = ctx.createRadialGradient(W * 0.85, -40, 40, W * 0.85, -40, 620);
    glow.addColorStop(0, 'rgba(232,211,160,.10)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = hexA(accent, .45); ctx.lineWidth = 1.5;
    rr(ctx, 8, 8, W - 16, H - 16, 12); ctx.stroke();
    ctx.strokeStyle = hexA(accent, .08); ctx.lineWidth = 1;
    rr(ctx, 18, 18, W - 36, H - 36, 10); ctx.stroke();
    ctx.strokeStyle = hexA(accent, .75); ctx.lineWidth = 1.5;
    rr(ctx, 84, 66, 46, 46, 6); ctx.stroke();
    if (!o.logo) yh('云', 107, 97, 28, '600', accentLight, '"KaiTi","STKaiti",serif');
    ctx.save(); ctx.letterSpacing = '4px';
    yh('BEANBEANMOUSE', 910, 92, 13, '500', accent, 'Georgia, serif');
    ctx.restore();
    const ng = ctx.createLinearGradient(84, 200, 700, 290);
    ng.addColorStop(0, hexMix(accent, '#FFFFFF', .6)); ng.addColorStop(0.4, accent); ng.addColorStop(0.7, accentDark); ng.addColorStop(1, hexMix(accent, '#FFFFFF', .35));
    ctx.font = '600 66px ' + nf;
    ctx.fillStyle = ng; ctx.fillText(name, 84, 258);
    ctx.save(); ctx.letterSpacing = '5px';
    yh((title || '').toUpperCase(), 84, 296, 12, '500', '#A99F8C', 'Georgia, serif');
    ctx.restore();
    const rg = ctx.createLinearGradient(84, 0, 700, 0);
    rg.addColorStop(0, hexA(accent, .75)); rg.addColorStop(1, hexA(accent, 0));
    ctx.strokeStyle = rg; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(84, 330); ctx.lineTo(700, 330); ctx.stroke();
    yh(company || 'COMPANY', 84, 378, 22, '600', '#EFE8D6', '"Microsoft YaHei","Segoe UI"');
    yh(companyEn, 84, 404, 11, '400', '#8E8574', 'Georgia, serif');
    yh('E  ' + (email || '—') + '    T  ' + (contact || '—'), 84, 470, 13, '400', '#C9C0AC', '"Segoe UI", Arial');
    ctx.strokeStyle = hexA(accent, .25);
    ctx.beginPath(); ctx.moveTo(84, 528); ctx.lineTo(966, 528); ctx.stroke();
    yh(brand, 84, 556, 11, '400', '#7D7566', 'Georgia, serif');
  } else if (tplId === 'minimal-white') {
    ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, W, H);
    yh('BEANBEANMOUSE', 84, 84, 12, '500', '#9A9A9A', 'Georgia, serif');
    ctx.fillStyle = accent; ctx.beginPath(); ctx.arc(966, 78, 7, 0, Math.PI * 2); ctx.fill();
    yh(name, 84, 226, 52, '600', '#161616', nf);
    ctx.save(); ctx.letterSpacing = '4px';
    yh((title || '').toUpperCase(), 84, 260, 12, '500', '#A5A5A5', 'Georgia, serif');
    ctx.restore();
    ctx.strokeStyle = '#E7E7E7'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(84, 300); ctx.lineTo(966, 300); ctx.stroke();
    yh(company || 'COMPANY', 84, 348, 20, '600', '#161616', '"Microsoft YaHei","Segoe UI"');
    yh(companyEn, 84, 374, 11, '400', '#A5A5A5', 'Georgia, serif');
    yh('E  ' + (email || '—'), 84, 428, 14, '400', '#777777', '"Segoe UI", Arial');
    yh('T  ' + (contact || '—'), 84, 456, 14, '400', '#777777', '"Segoe UI", Arial');
    yh('W  beanbeanmouse.com', 84, 484, 14, '400', '#777777', '"Segoe UI", Arial');
    ctx.strokeStyle = '#EFEFEF';
    ctx.beginPath(); ctx.moveTo(84, 532); ctx.lineTo(966, 532); ctx.stroke();
    yh('beanbeanmouse.com', 84, 560, 11, '400', '#C0C0C0', 'Georgia, serif');
  } else if (tplId === 'modern-blue') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#0B1B3A'); g.addColorStop(0.55, '#123060'); g.addColorStop(1, '#0A1730');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(120,180,255,.08)'; ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 44) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 44) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    const glow = ctx.createRadialGradient(W * 0.9, -30, 30, W * 0.9, -30, 560);
    glow.addColorStop(0, 'rgba(64,150,255,.22)'); glow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = glow; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent; rr(ctx, 84, 60, 56, 30, 6); ctx.fill();
    yh('BBM', 112, 81, 14, '700', '#FFFFFF', '"Segoe UI", Arial');
    yh('BEANBEANMOUSE', 966, 81, 12, '500', '#9CC4FF', 'Georgia, serif');
    yh(name, 84, 228, 56, '700', '#FFFFFF', nf);
    ctx.save(); ctx.letterSpacing = '3px';
    yh((title || '').toUpperCase(), 84, 262, 12, '500', '#9CC4FF', 'Georgia, serif');
    ctx.restore();
    ctx.strokeStyle = 'rgba(78,155,255,.45)'; ctx.lineWidth = 1;
    rr(ctx, 84, 296, 620, 40, 8); ctx.stroke();
    yh((company || 'COMPANY') + '  ·  ' + companyEn, 104, 321, 13, '500', '#D7E8FF', '"Segoe UI", Arial');
    yh('E  ' + (email || '—') + '    T  ' + (contact || '—'), 84, 452, 14, '400', '#B9D4FF', '"Segoe UI", Arial');
    ctx.strokeStyle = 'rgba(120,180,255,.25)';
    ctx.beginPath(); ctx.moveTo(84, 524); ctx.lineTo(966, 524); ctx.stroke();
    yh('beanbeanmouse.com · 认证供应商', 84, 554, 11, '400', '#7FA8E0', 'Georgia, serif');
  } else if (tplId === 'oriental-ink') {
    const g = ctx.createLinearGradient(0, 0, W, H);
    g.addColorStop(0, '#F7F1E3'); g.addColorStop(0.55, '#F1E8D5'); g.addColorStop(1, '#EAE0C8');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = accent;
    ctx.save(); ctx.translate(914, 84); ctx.rotate(-0.03);
    ctx.fillRect(-26, -26, 52, 52);
    yh('印', 0, 12, 30, '600', '#F7F1E3', '"KaiTi","STKaiti",serif');
    ctx.restore();
    yh('杭州云帆', 84, 92, 20, '600', '#6B5544', '"KaiTi","STKaiti",serif');
    yh(name, 84, 246, 58, '600', '#241D15', nf);
    ctx.save(); ctx.letterSpacing = '3px';
    yh((title || '').toUpperCase(), 84, 282, 11, '500', '#8A7A66', 'Georgia, serif');
    ctx.restore();
    const rg = ctx.createLinearGradient(84, 0, 560, 0);
    rg.addColorStop(0, accent); rg.addColorStop(1, hexA(accent, 0));
    ctx.strokeStyle = rg; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(84, 320); ctx.lineTo(560, 320); ctx.stroke();
    yh(company || 'COMPANY', 84, 368, 20, '600', '#2E2620', '"Microsoft YaHei","Segoe UI"');
    yh(companyEn, 84, 394, 11, '400', '#8A7A66', 'Georgia, serif');
    yh('E  ' + (email || '—') + '    T  ' + (contact || '—'), 84, 456, 14, '400', '#6B5544', '"Segoe UI", Arial');
    ctx.strokeStyle = hexA(accent, .2);
    ctx.beginPath(); ctx.moveTo(84, 528); ctx.lineTo(966, 528); ctx.stroke();
    yh(brand + ' · 精工致远', 84, 556, 11, '400', '#9C8B74', 'Georgia, serif');
  } else {
    ctx.fillStyle = '#F4F1EC'; ctx.fillRect(0, 0, W, H);
    yh('BeanBeanMouse', 84, 90, 22, '600', '#3D2E1A', 'Georgia, serif');
    yh(name, 84, 260, 56, '700', '#1F1F1F', nf);
    yh(company || 'COMPANY', 84, 340, 20, '600', '#3D2E1A', '"Microsoft YaHei","Segoe UI"');
  }
  if (o.logo) {
    const pos = tplId === 'classic-gold' ? [100, 84, 34] : [56, 56, 26];
    await drawLogoImage(ctx, o.logo, pos[0], pos[1], pos[2]);
  }
  return c.toDataURL('image/png');
}
async function applyCardTemplate(tplId) {
  const u = state.user;
  if (!u) return;
  const f = profileFieldsOf(u);
  const opts = cardOptsOf(u);
  const dataUrl = await renderCardTemplate(tplId, f, opts);
  saveCardOpts({ lastTpl: tplId });
  try {
    await api.profile.save({ businessCard: dataUrl, businessCardName: 'card-' + tplId + '.png' });
    toast('✓ ' + t('cardTemplateApplied'));
    renderPage();
  } catch (e) { toast(e.message || String(e)); }
}
function renderProfileBody() {
  const u = state.user;
  if (!u) return '';
  const f = profileFieldsOf(u);
  const pct = profileCompletenessOf(u);
  const level = pct >= 80 ? 'ok' : pct >= 50 ? 'mid' : 'low';
  const opts = cardOptsOf(u);
  const accentVal = opts.accent || '#8F5E0A';
  const fontVal = opts.font || 'kai';
  const logoName = opts.logoName || '';
  const countries = Object.keys(COUNTRY_NAMES).map(c => '<option value="' + c + '" ' + (f.country === c ? 'selected' : '') + '>' + flagEmoji(c) + ' ' + countryName(c) + '</option>').join('');
  const card = businessCardOf();
  const cardPreviewHtml = card
    ? '<div class="card-preview-box"><img src="' + card + '" alt="' + esc(t('cardPreviewLabel')) + '">'
      + '<div class="flex gap-10"><a class="btn btn-sm" href="' + card + '" download="' + esc((state.user && state.user.businessCardName) || 'business-card') + '">' + t('downloadCard') + '</a>'
      + '<button type="button" class="btn btn-sm" data-action="card-remove">' + t('cardRemoveBtn') + '</button></div></div>'
    : '<p class="small muted">' + t('cardNoCard') + '</p>';
  return '<div class="profile-layout">'
    + '<div class="card panel"><div class="panel-head"><h2>👤 ' + t('profileTitle') + '</h2></div>'
    + '<div class="exp-level ' + level + '"><b>' + t('profileCompleteness') + '：' + pct + '%</b><span>' + (pct >= 80 ? t('exportReadyHigh') : pct >= 50 ? t('exportReadyMid') : t('exportReadyLow')) + '</span>'
    + '<div class="profile-progress"><i style="width:' + pct + '%"></i></div></div>'
    + '<form data-form="profile-form" novalidate>'
    + '<div class="form-grid">'
    + '<div class="field"><label>' + t('contactName') + ' *</label><input class="input" name="name" value="' + esc(f.name) + '" required maxlength="80"></div>'
    + '<div class="field"><label>' + t('regAccountType') + '</label><select class="select" name="accountType">'
    + '<option value="company" ' + (f.accountType !== 'individual' ? 'selected' : '') + '> ' + t('accountTypeCompany') + '</option>'
    + '<option value="individual" ' + (f.accountType === 'individual' ? 'selected' : '') + '> ' + t('accountTypeIndividual') + '</option></select></div>'
    + '<div class="field"><label>' + t('jobTitle') + '</label><input class="input" name="jobTitle" value="' + esc(f.jobTitle) + '" maxlength="60" placeholder="Purchasing Manager / 外贸经理"></div>'
    + '<div class="field"><label>' + (f.accountType === 'individual' ? t('regBizName') : t('companyName')) + '</label><input class="input" name="company" value="' + esc(f.company) + '" maxlength="120"></div>'
    + '<div class="field"><label>' + t('countryLabel') + '</label><select class="select" name="country"><option value="">—</option>' + countries + '</select></div>'
    + '<div class="field"><label>' + t('profileContact') + '</label><input class="input" name="contact" value="' + esc(f.contact) + '" maxlength="120" placeholder="电话 / WhatsApp / 微信"></div>'
    + '<div class="field full"><label>' + t('profileBio') + '</label><textarea class="textarea" name="bio" rows="3" maxlength="400">' + esc(f.bio) + '</textarea></div>'
    + '</div>'
    + '<button type="submit" class="btn btn-primary">' + t('profileSave') + '</button>'
    + '</form></div>'
    + '<div>'
    + '<div class="card panel"><div class="panel-head"><h2> ' + t('cardUploadBtn') + '</h2><span class="small muted">' + t('cardAttachHint') + '</span></div>'
    + '<div class="field attach-field">'
    + '<input type="file" name="card" accept="image/jpeg,image/png,image/webp" data-attach-store="card">'
    + '<div class="card-preview">' + cardPreviewHtml + '</div>'
    + '<p class="small muted">' + t('cardUploadHint') + '</p>'
    + '</div></div>'
    + '<div class="card panel mt-20"><div class="panel-head"><h2>🎨 ' + t('cardTemplatesTitle') + '</h2><span class="small muted">' + t('cardTemplatesSub') + '</span></div>'
    + '<div class="tpl-grid">' + (typeof CARD_TEMPLATES !== 'undefined' ? CARD_TEMPLATES : []).map(tpl =>
      '<div class="tpl-card"><span class="tpl-swatch" style="background:' + tpl.swatch + '"></span>'
      + '<b>' + esc(state.lang === 'zh' ? tpl.zh : tpl.en) + '</b>'
      + '<button type="button" class="btn btn-sm" data-action="card-template" data-tpl="' + tpl.id + '">' + t('cardTemplateApply') + '</button></div>'
    ).join('')
    + '<div class="tpl-card custom"><span class="tpl-swatch custom">✦</span><b>' + t('cardCustomTitle') + '</b>'
    + '<span class="small muted">' + t('cardCustomHint') + '</span></div>'
    + '</div>'
    + '<div class="card-customize"><h4>🎛️ ' + t('cardCustomizeTitle') + '</h4>'
    + '<div class="form-grid">'
    + '<div class="field"><label>' + t('cardAccentColor') + '</label><input type="color" class="input" name="cardAccent" value="' + accentVal + '"></div>'
    + '<div class="field"><label>' + t('cardFont') + '</label><select class="select" name="cardFont">'
    + '<option value="kai"' + (fontVal === 'kai' ? ' selected' : '') + '>' + t('cardFontKai') + '</option>'
    + '<option value="serif"' + (fontVal === 'serif' ? ' selected' : '') + '>' + t('cardFontSerif') + '</option>'
    + '<option value="sans"' + (fontVal === 'sans' ? ' selected' : '') + '>' + t('cardFontSans') + '</option></select></div>'
    + '<div class="field"><label>' + t('cardLogoUpload') + '</label><input type="file" class="input" accept="image/png,image/jpeg,image/webp" data-card-opt="logo"></div>'
    + '</div>'
    + '<div class="flex gap-10" style="flex-wrap:wrap;align-items:center">'
    + '<button type="button" class="btn btn-primary" data-action="card-apply-custom">' + t('cardApplyCustom') + '</button>'
    + (logoName ? '<span class="small muted">🖼️ ' + esc(logoName) + '</span>' : '')
    + '</div></div>'
    + '</div></div>'
    + '</div>'
    + '</div>';
}
const card3d = { rx: -6, ry: 0, flipped: false };
function card3dTransform() {
  const el = document.getElementById('card3dInner');
  if (el) el.style.transform = 'rotateX(' + card3d.rx + 'deg) rotateY(' + (card3d.flipped ? 180 + card3d.ry : card3d.ry) + 'deg)';
}
function bindCard3dDrag() {
  const stage = document.getElementById('card3d');
  if (!stage) return;
  let dragging = false, sx = 0, sy = 0;
  stage.addEventListener('pointerdown', e => {
    dragging = true;
    sx = e.clientX; sy = e.clientY;
    stage.setPointerCapture(e.pointerId);
  });
  stage.addEventListener('pointermove', e => {
    if (!dragging) return;
    card3d.ry = Math.max(-75, Math.min(75, card3d.ry + (e.clientX - sx) * 0.45));
    card3d.rx = Math.max(-40, Math.min(40, card3d.rx - (e.clientY - sy) * 0.35));
    sx = e.clientX; sy = e.clientY;
    card3dTransform();
  });
  stage.addEventListener('pointerup', () => { dragging = false; });
  stage.addEventListener('pointercancel', () => { dragging = false; });
}
function cardTemplateIdOf(i) {
  const m = String(i.cardName || '').match(/card-([a-z0-9-]+)\.png/i);
  return m ? m[1] : '';
}
function cardBackHtml(i) {
  const tplId = cardTemplateIdOf(i);
  const tpl = (typeof CARD_TEMPLATES !== 'undefined' ? CARD_TEMPLATES : []).find(t => t.id === tplId);
  const dark = ['luxe-ink', 'modern-blue'].includes(tplId);
  const bg = tpl ? tpl.swatch : 'linear-gradient(158deg,#1A1D25,#20242E 50%,#151820)';
  const fg = dark ? '#E9E2D0' : '#3D2E1A';
  const sub = dark ? '#A99F8C' : '#8A7654';
  const accent = dark ? '#C8A25B' : '#C8860B';
  const line = dark ? 'rgba(200,162,91,.35)' : 'rgba(200,134,11,.3)';
  const holder = (i.company ? i.company + ' · ' : '') + (i.name || '');
  const qr = '<svg viewBox="0 0 64 64" width="74" height="74"><rect width="64" height="64" fill="rgba(0,0,0,0)"/><g fill="' + (dark ? '#C8A25B' : '#4A2E08') + '">'
    + Array.from({ length: 16 }, (_, y) => Array.from({ length: 16 }, (_, x) => ((x * 31 + y * 17 + x * y) % 5 < 2) ? '<rect x="' + (x * 4) + '" y="' + (y * 4) + '" width="4" height="4"/>' : '').join('')).join('')
    + '</g></svg>';
  return '<div class="card-back" style="background:' + bg + ';color:' + fg + '">'
    + '<div class="cb-frame" style="border-color:' + line + '"></div>'
    + '<div class="cb-mark"><img src="assets/mascot-main.jpg" alt="" loading="lazy" decoding="async"><b>BeanBeanMouse</b><span>豆豆鼠外贸平台</span></div>'
    + '<div class="cb-motto" style="color:' + sub + '">以精工，致远方 —— 让每一笔跨国生意更简单。</div>'
    + '<div class="cb-qr">' + qr + '<span style="color:' + sub + '">扫码验真 · 验证本站真伪</span></div>'
    + '<div class="cb-foot" style="border-top-color:' + line + ';color:' + sub + '">beanbeanmouse.com</div>'
    + '<div class="cb-holder" style="color:' + sub + '">' + esc(holder) + '</div>'
    + '</div>';
}
async function openCardModal(i) {
  if (!i || !i.card) return;
  card3d.rx = -6; card3d.ry = 0; card3d.flipped = false;
  showModal('<div class="modal-head"><h3> ' + t('businessCard') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="card3d" id="card3d"><div class="card3d-inner" id="card3dInner">'
    + '<div class="card3d-face front"><div class="holo"></div>'
    + '<img id="cardViewImg" class="card-watermarked" src="' + i.card + '" alt="' + esc(i.cardName || t('businessCard')) + '">'
    + '</div>'
    + '<div class="card3d-face back">' + cardBackHtml(i) + '</div>'
    + '</div></div>'
    + '<div class="card3d-controls">'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="card-flip">🔄 ' + t('cardFlip') + '</button>'
    + '<span class="small muted">' + t('cardDragHint') + '</span>'
    + '</div>'
    + '<p class="small muted" style="text-align:center">' + t('cardWatermarkNote') + '</p>'
    + '<div class="doc-actions"><a class="btn btn-primary" id="cardViewDownload" href="' + i.card + '" download="' + esc(i.cardName || 'business-card') + '">' + t('downloadCard') + '</a>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('close') + '</button></div>'
    + '</div></div>');
  bindCard3dDrag();
  card3dTransform();
  const stage3d = document.getElementById('card3d');
  if (stage3d) {
    stage3d.tabIndex = 0;
    stage3d.setAttribute('role', 'group');
    stage3d.setAttribute('aria-label', t('businessCard'));
    stage3d.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        card3d.flipped = !card3d.flipped;
        card3dTransform();
      }
    });
  }
  try {
    const wm = await watermarkImage(i.card, i.name || '');
    const img = document.getElementById('cardViewImg');
    if (img) img.src = wm;
    const dl = document.getElementById('cardViewDownload');
    if (dl) dl.href = wm;
  } catch (e) { /* 水印失败时保留原图展示 */ }
}
function registerFormHtml() {
  return '<div class="modal-head"><h3>' + t('regTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="register-form" class="full" novalidate>'
    + '<input type="text" name="homepage" style="position:absolute;left:-9999px;opacity:0" tabindex="-1" autocomplete="off">'
    + (window.__TURNSTILE_KEY__
      ? '<div class="field"><div class="cf-turnstile" data-sitekey="' + esc(window.__TURNSTILE_KEY__) + '"></div><input type="hidden" name="turnstileToken"></div>'
      : '')
    + '<div class="field"><label>' + t('regName') + ' *</label><input class="input" name="name" required maxlength="80"></div>'
    + '<div class="field"><label>' + t('regEmail') + ' *</label><input class="input" type="email" name="email" required></div>'
    + '<div class="field"><label>' + t('regPassword') + ' *</label><input class="input" type="password" name="password" required minlength="8"></div>'
    + '<div class="field"><label>' + t('regRole') + ' *</label><div class="check-group">'
    + '<label class="check-pill"><input type="radio" name="role" value="buyer" checked data-reg-toggle="sellerRegFields">' + t('regRoleBuyer') + '</label>'
    + '<label class="check-pill"><input type="radio" name="role" value="seller" data-reg-toggle="sellerRegFields">' + t('regRoleSeller') + '</label>'
    + '</div></div>'
    + '<div class="field"><label>' + t('regAccountType') + '</label><div class="check-group">'
    + '<label class="check-pill"><input type="radio" name="accountType" value="company" checked data-reg-type="company"> ' + t('regCompany') + '</label>'
    + '<label class="check-pill"><input type="radio" name="accountType" value="individual" data-reg-type="individual"> ' + t('regIndividual') + '</label>'
    + '</div></div>'
    + '<div id="companyFields">'
    + '<div class="field"><label>' + t('regJobTitle') + '</label><input class="input" name="jobTitle" maxlength="60" placeholder="Purchasing Manager / 外贸经理"></div>'
    + '</div>'
    + '<div id="individualFields" hidden>'
    + '<div class="field"><label>' + t('regBizName') + '</label><input class="input" name="bizName" maxlength="80" placeholder="如：XX 档口 / 个体经营"></div>'
    + '</div>'
    + '<div class="form-note">' + icon('sparkle') + ' ' + t('regRoleHint') + '</div>'
    + '<div id="sellerRegFields" hidden>'
    + '<div class="field"><label>' + t('regCompanyName') + ' *</label><input class="input" name="companyName" required></div>'
    + '<div class="field"><label>' + t('regCountry') + ' *</label><input class="input" name="country" required></div>'
    + '<div class="field"><label>' + t('regCity') + '</label><input class="input" name="city"></div>'
    + '<div class="field"><label>' + t('regRegNo') + '</label><input class="input" name="registrationNo"></div>'
    + '<div class="field"><label>' + t('regLicenseNo') + '</label><input class="input" name="licenseNo"></div>'
    + '<div class="field"><label>' + t('regCompanyWebsite') + '</label><input class="input" name="companyWebsite"></div>'
    + '<div class="field"><label>' + t('regContact') + '</label><input class="input" name="contact"></div>'
    + '<div class="field"><label>' + t('regScope') + '</label><input class="input" name="businessScope"></div>'
    + '<div class="sup-docs"><h4>' + t('supDocTitle') + '</h4><ul>'
    + ['supDoc1', 'supDoc2', 'supDoc3', 'supDoc4', 'supDoc5', 'supDoc6'].map(k => '<li>' + t(k) + '</li>').join('')
    + '</ul><p class="small">' + t('supDocNote') + '</p></div>'
    + '</div>'
    + '<div class="form-note">' + icon('sparkle') + ' ' + t('regNote') + '</div>'
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
    + '<div class="form-note">' + icon('sparkle') + ' ' + t('companyTip') + '</div>'
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
  return 'assets/video/transport-' + transportKey(mode) + '.webm';
}
function transportKey(mode) {
  return mode === 'sea' ? 'sea' : mode === 'air' ? 'air' : 'land';
}
function transportPoster(mode) {
  return 'assets/video/transport-' + transportKey(mode) + '-poster.png';
}
function escortAvatar(mode) {
  return 'assets/pixel/characters/' + transportKey(mode) + '-icon.jpg';
}
/* 像素风包裹图标：纯内联 SVG，配色取自站点色板（替代 emoji） */
function parcelIcon(size) {
  const s = size || 22;
  return '<svg viewBox="0 0 16 16" width="' + s + '" height="' + s + '" fill="none" shape-rendering="crispEdges" aria-hidden="true">'
    + '<rect x="1" y="4" width="14" height="11" fill="#F7D9A8" stroke="#26304A" stroke-width="1"/>'
    + '<rect x="1" y="4" width="14" height="3" fill="#F59E0B" stroke="#26304A" stroke-width="1"/>'
    + '<rect x="6" y="4" width="4" height="11" fill="#1D4ED8" opacity=".85"/>'
    + '<rect x="6" y="7" width="4" height="2" fill="#FFF6E8"/>'
    + '</svg>';
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
  return (o && hasActiveTipFromMe(o)) ? 'assets/tip-hamster-full.png' : 'assets/tip-hamster-empty.png';
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
    + '<div class="escort-head"><img src="' + escortAvatar(mode) + '" alt="" width="40" height="40" loading="lazy" decoding="async">'
    + '<div class="escort-txt"><b>' + t('escortTitle') + '</b><span class="small muted">' + esc(transportName(mode)) + (shipment.carrier || shipment.tracking_no || shipment.trackingNo ? ' · ' + esc(shipment.carrier || shipment.tracking_no || shipment.trackingNo) : '') + '</span></div>'
    + '<span class="chip sub-chip">' + esc(transportName(mode)) + '</span></div>'
    + '<div class="transport-scene-wrap"><video class="transport-scene" data-transport-video src="' + transportArt(mode) + '" poster="' + transportPoster(mode) + '" width="1280" height="720" muted loop playsinline preload="none" aria-label="' + esc(transportName(mode)) + '"></video>'
    + '<div class="escort-pkg" style="left:calc(' + pct + '% - 22px)">' + parcelIcon(22) + '</div>'
    + '<div class="transport-scene-label">' + esc(transportName(mode)) + '</div></div>'
    + '<div class="phase-bar"><span class="phase' + (phase === 'start' ? ' on' : '') + '">' + t('phaseStart') + '</span>'
    + '<span class="phase' + (phase === 'transit' ? ' on' : '') + '">' + t('phaseTransit') + '</span>'
    + '<span class="phase' + (phase === 'end' ? ' on' : '') + '">' + t('phaseEnd') + '</span>'
    + '<div class="phase-fill" style="width:' + phasePct + '%"></div></div>'
    + '<div class="ship-loc"><span>' + t('shipmentCurrent') + '</span><b>' + esc(shipment.current_location || shipment.currentLocation || shipment.origin || '—') + '</b></div>'
    + (shipment.eta ? '<div class="ship-meta muted">' + t('shipmentEta') + '：' + fmtDate(shipment.eta) + '</div>' : '')
    + (shipment.containerType || shipment.vessel || shipment.telexRelease
      ? '<div class="ship-meta muted">'
        + (shipment.containerType ? esc(shipment.containerType) : '')
        + (shipment.vessel ? ' · ' + t('shpVessel') + ' ' + esc(shipment.vessel) : '')
        + (shipment.billNo ? ' · ' + t('shpBillNo') + ' ' + esc(shipment.billNo) : '')
        + (shipment.telexRelease ? ' · ' + t('shpTelex') : '')
        + (shipment.freightTerms ? ' · ' + t('shpFreightTerms') + ' ' + esc(shipment.freightTerms) : '')
        + '</div>'
      : '')
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
    contract_custody: t('evContractCustody'), insurance_create: t('evInsuranceCreate'),
    after_sales_create: t('evAfterSalesCreate'), after_sales_reply: t('evAfterSalesReply'),
    after_sales_ruling: t('evAfterSalesRuling'), dispute_open: t('evDisputeOpen'),
    document_generated: t('evDocGenerated'), manual: t('evManual')
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
    + '<img src="assets/tip-hamster-empty.png" alt="' + esc(t('tipTitle')) + '" width="56" height="56" loading="lazy" decoding="async">'
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
    + (activeTips.length ? '<div class="tip-list-head"><img src="assets/tip-hamster-full.png" alt="" width="42" height="42" loading="lazy" decoding="async"><span>' + t('tipList') + ' · ' + t('tipAlready') + '</span></div>' : '')
    + insuranceBoxHtml(o)
    + (tips.length ? '<div class="reply-box"><ul style="margin:6px 0 0;padding-left:18px">'
      + tips.map(x => '<li>💛 ' + x.amount + ' ' + (x.currency || 'USD') + (x.note ? ' — ' + esc(x.note) : '') + (x.status === 'cancelled' ? ' <span class="muted">' + t('tipCancelled') + '</span>' : '')
        + (x.fromUserId === state.user.id && x.status === 'active' ? ' <button type="button" class="btn btn-sm" data-action="tip-cancel" data-order="' + o.id + '" data-tip="' + x.id + '">' + t('tipCancel') + '</button>' : '')
        + '</li>').join('')
      + '</ul></div>' : '')
    + (shipments.length ? shipmentTimelineHtml(shipments[0]) : '')
    + orderDocPanelHtml(o)
    + orderAfterSalesPanel(o)
    + evidencePanelHtml(o)
    + '<div class="flex gap-10" style="margin-top:10px;flex-wrap:wrap">'
    + (isBuyer && ['created', 'complete'].includes(o.status)
      ? (o.payment
        ? '<span class="chip ' + (o.payment.status === 'paid' ? 'ok' : '') + '">' + icon('check') + ' ' + t('payProvider') + ' · ' + (o.payment.status === 'paid' ? t('payPaid') : t('payPending')) + '</span>'
        : '<button type="button" class="btn" data-action="pay-open" data-id="' + o.id + '">' + t('payTitle') + '</button>')
      : '')
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
  return '<div class="card panel"><div class="panel-head"><h2>' + t('myOrders') + '</h2>'
    + '<button type="button" class="btn btn-sm" data-action="export-orders">' + icon('file') + ' ' + t('exportCsv') + '</button></div>'
    + (rows.length ? rows.map(orderCard).join('') : '<div class="empty-state" style="padding:36px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/package.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noOrders') + '</p></div>')
    + '</div>';
}
function downloadCsv(filename, rows) {
  const escCell = v => {
    const s = String(v == null ? '' : v);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const body = rows.map(r => r.map(escCell).join(',')).join('\n');
  const blob = new Blob(['\ufeff' + body], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
function exportOrdersCsv() {
  const u = state.user;
  const rows = (state.orders || []).filter(o => !u || u.role === 'admin' || o.buyerId === u.id || o.sellerId === (u.sellerId || u.id));
  const zh = state.lang === 'zh';
  const head = [zh ? '订单号' : 'Order', zh ? '产品' : 'Product', zh ? '买家' : 'Buyer', zh ? '卖家' : 'Seller', zh ? '金额' : 'Total', zh ? '货币' : 'Currency', zh ? '状态' : 'Status', zh ? '创建时间' : 'Created'];
  const data = rows.map(o => {
    const p = productById(o.productId);
    return [o.id, p ? langObj(p).title : o.productId, partyNameOf(o, 'buyer'), partyNameOf(o, 'seller'), Number(o.total || 0), o.currency || 'USD', orderStatusLabel(o.status), fmtDate(o.createdAt)];
  });
  downloadCsv('bbm-orders.csv', [head].concat(data));
}
function exportInquiriesCsv() {
  const u = state.user;
  const rows = (state.inquiries || []).filter(i => !u || u.role === 'admin' || i.buyerId === u.id || i.sellerId === (u.sellerId || u.id));
  const zh = state.lang === 'zh';
  const head = [zh ? '询盘号' : 'Inquiry', zh ? '产品' : 'Product', zh ? '买家' : 'Buyer', zh ? '邮箱' : 'Email', zh ? '公司' : 'Company', zh ? '数量' : 'Qty', zh ? '单位' : 'Unit', zh ? '状态' : 'Status', zh ? '时间' : 'Sent'];
  const data = rows.map(i => {
    const p = productById(i.productId);
    return [i.id, p ? langObj(p).title : i.productId, i.name || '', i.email || '', i.company || '', i.qty || '', i.unit || '', i.status === 'quoted' ? zh ? '已报价' : 'Quoted' : i.status === 'handled' ? zh ? '已回复' : 'Replied' : zh ? '待回复' : 'New', fmtDate(i.createdAt)];
  });
  downloadCsv('bbm-inquiries.csv', [head].concat(data));
}
function tipModalHtml(o) {
  const tippedByMe = hasActiveTipFromMe(o);
  return '<div class="modal-head"><h3>💛 ' + t('tipTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="tip-img-wrap"><img src="' + tipMascotImg(o.id) + '" alt="' + t('tipTitle') + '" width="110" height="110" loading="lazy" decoding="async">'
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
    businessScope: String(fd.get('businessScope') || '').trim(),
    accountType: fd.get('accountType') === 'individual' ? 'individual' : 'company',
    jobTitle: String(fd.get('jobTitle') || '').trim(),
    bizName: String(fd.get('bizName') || '').trim(),
    turnstileToken: String(fd.get('turnstileToken') || '')
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
function openPayModal(o) {
  if (!o) return;
  showModal('<div class="modal-head"><h3>💳 ' + t('payTitle') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">'
    + '<div class="pay-order"><b>' + esc(o.id) + '</b><span>' + t('orderTotal') + '：' + (o.currency || 'USD') + ' ' + Number(o.total || 0).toLocaleString() + '</span></div>'
    + '<div class="pay-provider"><span class="pay-logo">P</span><div><b>PayPal</b><span class="small muted">Sandbox · USD/EUR/GBP</span></div>'
    + '<span class="chip sub-chip">' + t('payFirstChannel') + '</span></div>'
    + '<button type="button" class="btn btn-primary btn-lg btn-block" data-action="pay-paypal" data-id="' + o.id + '">' + t('payWith') + '</button>'
    + '<p class="small muted" style="text-align:center;margin-top:10px">' + t('payNote') + '</p>'
    + '</div>');
}
async function doPaypalPay(orderId) {
  try {
    await api.payments.checkout(orderId, 'paypal');
    await api.payments.markPaid(orderId);
    closeModal();
    toast('✓ ' + t('payDone'));
    render();
  } catch (e) { toast(e.message || String(e)); }
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
    + '<div class="field"><label>' + t('shpContainer') + '</label><select class="input" name="containerType">' + CONTAINER_TYPES.map(c => '<option value="' + c.id + '">' + esc(langObj(c)) + '</option>').join('') + '</select></div>'
    + '<div class="grid-2"><div class="field"><label>' + t('shipmentOrigin') + '</label><input class="input" name="origin" maxlength="120" placeholder="Ningbo, CN"></div>'
    + '<div class="field"><label>' + t('shipmentDestination') + '</label><input class="input" name="destination" maxlength="120" placeholder="Hamburg, DE"></div></div>'
    + '<div class="grid-2"><div class="field"><label>' + t('shpVessel') + '</label><input class="input" name="vessel" maxlength="80" placeholder="COSCO Vessel / Flight"></div>'
    + '<div class="field"><label>' + t('shpBillNo') + '</label><input class="input" name="billNo" maxlength="60"></div></div>'
    + '<div class="grid-2"><div class="field"><label>' + t('shpFreightTerms') + '</label><select class="input" name="freightTerms"><option value="Prepaid">' + t('freightPrepaid') + '</option><option value="Collect">' + t('freightCollect') + '</option></select></div>'
    + '<div class="field"><label class="checkbox-label"><input type="checkbox" name="telexRelease" value="1"> ' + t('shpTelex') + '</label></div></div>'
    + '<div class="field"><label>' + t('shipmentEta') + '</label><input class="input" name="eta" type="date"></div>'
    + '<div class="field"><label>' + t('shipmentRemark') + '</label><input class="input" name="remark" maxlength="500"></div>'
    + '<p class="small muted">' + t('shpCostHint') + '</p>'
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
    containerType: form.containerType ? form.containerType.value : 'LCL',
    origin: form.origin.value.trim(),
    destination: form.destination.value.trim(),
    vessel: form.vessel ? form.vessel.value.trim() : '',
    billNo: form.billNo ? form.billNo.value.trim() : '',
    freightTerms: form.freightTerms ? form.freightTerms.value : 'Prepaid',
    telexRelease: !!(form.telexRelease && form.telexRelease.checked),
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
    + '<section class="card panel guide-section"><div class="panel-head"><h2>' + (zh ? '配套工具' : 'Related tools') + '</h2></div>'
    + '<div class="flex gap-10" style="flex-wrap:wrap">'
    + '<a class="btn" href="#/export" data-nav="/export">' + t('navExport') + ' →</a>'
    + '<a class="btn" href="#/logistics" data-nav="/logistics">' + t('navLogistics') + ' →</a>'
    + '<a class="btn" href="#/compliance" data-nav="/compliance">' + t('navCompliance') + ' →</a>'
    + '<a class="btn" href="#/disputes" data-nav="/disputes">' + t('navDisputes') + ' →</a>'
    + '</div></section>'
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
    ['', zh ? '企业实名审核' : 'Verified companies', zh ? '真实可查证公司/工厂才能发品，建立信任' : 'Only real, verifiable companies can list'],
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

/* ============================================================
 * 出口准备 / 物流指南 / 合规中心 / 售后纠纷（2026-08-21 新增）
 * ============================================================ */

/* ---------- 出口资质：就绪度与清单 ---------- */
function exportReadinessOf(sellerId) {
  const rows = (state.exportReadiness || {})[sellerId] || {};
  const items = (typeof EXPORT_READINESS_ITEMS !== 'undefined' ? EXPORT_READINESS_ITEMS : [])
    .map(x => ({ id: x.id, optional: !!x.optional, zh: x.zh, en: x.en, done: !!rows[x.id] }));
  const core = items.filter(x => !x.optional);
  const done = items.filter(x => x.done).length;
  return {
    items,
    done,
    total: items.length,
    score: items.length ? Math.round(done / items.length * 100) : 0,
    coreDone: core.filter(x => x.done).length,
    coreTotal: core.length
  };
}

function exportLevelHtml(score) {
  const cls = score >= 80 ? 'ok' : score >= 50 ? 'mid' : 'low';
  const txt = score >= 80 ? t('exportReadyHigh') : score >= 50 ? t('exportReadyMid') : t('exportReadyLow');
  return '<div class="exp-level ' + cls + '"><b>' + t('exportReadinessScore') + '：' + score + '%</b><span>' + esc(txt) + '</span></div>';
}

function exportChecklistHtml(sellerId) {
  const r = exportReadinessOf(sellerId);
  return '<div class="card panel"><div class="panel-head"><h2>' + icon('shield') + ' ' + t('exportChecklistTitle') + '</h2>'
    + '<span class="small muted">' + r.coreDone + '/' + r.coreTotal + ' · ' + t('exportTabHint') + '</span></div>'
    + exportLevelHtml(r.score)
    + (r.items.length ? r.items.map(it => {
      const L = langObj(it);
      return '<div class="exp-item' + (it.done ? ' done' : '') + '">'
        + '<div class="exp-item-head"><span class="exp-check">' + (it.done ? '✓' : '○') + '</span>'
        + '<b>' + esc(L.name) + '</b>' + (it.optional ? '<span class="chip sub-chip">' + t('exportOptional') + '</span>' : '')
        + '<button type="button" class="btn btn-sm ' + (it.done ? '' : 'btn-primary') + '" data-action="export-toggle" data-id="' + it.id + '" data-done="' + (it.done ? '1' : '0') + '">' + (it.done ? t('exportMarkUndone') : t('exportMarkDone')) + '</button>'
        + '</div>'
        + '<div class="exp-item-grid">'
        + '<span><b>' + t('exportWhat') + '</b>' + esc(L.what) + '</span>'
        + '<span><b>' + t('exportWho') + '</b>' + esc(L.who) + '</span>'
        + '<span><b>' + t('exportWhen') + '</b>' + esc(L.when) + '</span>'
        + '<span class="full"><b>' + t('exportTip') + '</b>' + esc(L.tip) + '</span>'
        + '</div></div>';
    }).join('') : '')
    + '<p class="small muted" style="margin-top:10px">' + t('exportGuideNote') + '</p></div>';
}

function renderExport() {
  document.title = t('navExport') + ' · BeanBeanMouse';
  const u = state.user;
  const checklist = u && u.role === 'seller' ? exportChecklistHtml(u.sellerId || u.id) : '';
  const guideItems = (typeof EXPORT_READINESS_ITEMS !== 'undefined' ? EXPORT_READINESS_ITEMS : []);
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>📋 ' + t('exportTitle') + '</h1><p>' + t('exportSub') + '</p></div>'
    + (u && u.role === 'seller'
      ? checklist
      : '<div class="card panel"><div class="panel-head"><h2>🏭 ' + t('exportChecklistTitle') + '</h2></div>'
        + '<p class="muted">' + t('exportNoLoginHint') + '</p>'
        + '<a class="btn btn-primary" href="#/login" data-nav="/login">' + t('exportLoginBtn') + '</a></div>')
    + '<section class="card panel guide-section"><div class="panel-head"><h2>' + t('exportChecklistTitle') + '</h2>'
    + '<span class="small muted">' + t('exportChecklistSub') + '</span></div>'
    + (guideItems.length ? guideItems.map(it => {
      const L = langObj(it);
      return '<div class="exp-item"><div class="exp-item-head"><span class="exp-check">' + (it.optional ? '◇' : '◆') + '</span><b>' + esc(L.name) + '</b>'
        + (it.optional ? '<span class="chip sub-chip">' + t('exportOptional') + '</span>' : '') + '</div>'
        + '<div class="exp-item-grid">'
        + '<span><b>' + t('exportWhat') + '</b>' + esc(L.what) + '</span>'
        + '<span><b>' + t('exportWho') + '</b>' + esc(L.who) + '</span>'
        + '<span><b>' + t('exportWhen') + '</b>' + esc(L.when) + '</span>'
        + '<span class="full"><b>' + t('exportTip') + '</b>' + esc(L.tip) + '</span>'
        + '</div></div>';
    }).join('') : '<p class="muted">—</p>')
    + '<p class="small muted" style="margin-top:10px">' + t('exportGuideNote') + '</p></section>'
    + '<section class="card panel"><div class="panel-head"><h2>🏷️ ' + t('exportProductHint') + '</h2></div>'
    + '<p class="small muted">' + t('exportChecklistSub') + '</p>'
    + '<div class="flex gap-10" style="flex-wrap:wrap">'
    + '<a class="btn" href="#/guide" data-nav="/guide">' + t('navGuide') + ' →</a>'
    + '<a class="btn" href="#/compliance" data-nav="/compliance">' + t('navCompliance') + ' →</a>'
    + '<a class="btn" href="#/logistics" data-nav="/logistics">' + t('navLogistics') + ' →</a></div></section>'
    + '</div>';
}

async function toggleExportItem(el) {
  const sid = state.user ? (state.user.sellerId || state.user.id) : '';
  if (!sid) return;
  const done = el.dataset.done === '1';
  try {
    await api.exports.setItem(sid, el.dataset.id, !done);
    toast(t('exportReadinessScore') + ' ✓');
    renderPage();
  } catch (e) { toast(e.message || String(e)); }
}

/* ---------- 物流与订舱指南 ---------- */
function renderLogistics() {
  document.title = t('navLogistics') + ' · BeanBeanMouse';
  const zh = state.lang === 'zh';
  const { params } = parseHash();
  const portCode = params.get('port') || 'Hamburg';
  const port = PORT_CHARGES.find(x => x.code === portCode) || PORT_CHARGES[0];
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>🚢 ' + t('logisticsTitle') + '</h1><p>' + t('logisticsSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('logisticsModeTitle') + '</h2><span class="small muted">' + t('logisticsModeNote') + '</span></div>'
    + '<div class="table-responsive"><table class="table guide-table logistics-table"><thead><tr><th>' + t('logisticsFieldMode') + '</th><th>' + t('logisticsSpeed') + '</th><th>' + t('logisticsCost') + '</th><th>' + t('logisticsBestFor') + '</th></tr></thead><tbody>'
    + LOGISTICS_MODES.map(m => '<tr><td><b>' + esc(langObj(m).name) + '</b></td><td>' + esc(langObj(m).speed) + '</td><td>' + esc(langObj(m).cost) + '</td><td>' + esc(langObj(m).bestFor) + '</td></tr>').join('')
    + '</tbody></table></div></section>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('logisticsContainerTitle') + '</h2></div>'
    + '<p class="small muted">' + t('logisticsContainerNote') + '</p>'
    + '<div class="container-grid">' + CONTAINER_TYPES.map(c => '<div class="container-card"><b>' + esc(langObj(c)) + '</b></div>').join('') + '</div></section>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('logisticsCostTitle') + '</h2><span class="small muted">' + t('logisticsCostNote') + '</span></div>'
    + '<div class="customs-grid">' + PORT_CHARGES.map(c =>
      '<a class="customs-card' + (c.code === port.code ? ' on' : '') + '" href="#/logistics?port=' + c.code + '" data-nav="/logistics?port=' + c.code + '">'
      + '<span class="lang-flag">' + flagEmoji(c.flag) + '</span><span>' + esc(zh ? c.zh : c.en) + '</span></a>'
    ).join('') + '</div>'
    + '<div class="port-charge-card"><h3>' + flagEmoji(port.flag) + ' ' + esc(zh ? port.zh : port.en) + '</h3>'
    + '<p class="small muted">' + esc(port.note) + '</p>'
    + '<div class="table-responsive"><table class="table"><tbody>' + port.items.map(r =>
      '<tr><td>' + esc(r[0]) + '</td><td><b>' + esc(r[1]) + '</b></td></tr>').join('') + '</tbody></table></div></div></section>'
    + '<section class="card panel"><div class="panel-head"><h2>' + icon('sparkle') + ' ' + t('logisticsTelexTitle') + '</h2></div>'
    + '<p class="small">' + t('logisticsTelexNote') + '</p></section>'
    + '<section class="card panel"><div class="panel-head"><h2>🧮 ' + t('logisticsEstimateTitle') + '</h2><span class="small muted">' + t('logisticsEstimateHint') + '</span></div>'
    + '<form data-form="logistics-estimate-form" novalidate>'
    + '<div class="form-grid">'
    + '<div class="field"><label>' + t('logisticsFieldMode') + '</label><select class="select" name="mode">' + LOGISTICS_MODES.map(m => '<option value="' + m.id + '">' + esc(langObj(m).name) + '</option>').join('') + '</select></div>'
    + '<div class="field"><label>' + t('logisticsFieldContainer') + '</label><select class="select" name="container">' + CONTAINER_TYPES.map(c => '<option value="' + c.id + '">' + esc(langObj(c)) + '</option>').join('') + '</select></div>'
    + '<div class="field"><label>' + t('logisticsFieldWeight') + '</label><input class="input" name="weight" type="number" min="0" step="0.1" value="500"></div>'
    + '<div class="field"><label>' + t('logisticsFieldVolume') + '</label><input class="input" name="volume" type="number" min="0" step="0.01" value="3"></div>'
    + '<div class="field"><label>' + t('logisticsFieldOrigin') + '</label><input class="input" name="origin" maxlength="80" placeholder="Ningbo, CN"></div>'
    + '<div class="field"><label>' + t('logisticsFieldDestination') + '</label><input class="input" name="destination" maxlength="80" placeholder="Hamburg, DE"></div>'
    + '</div>'
    + '<button type="submit" class="btn btn-primary">' + t('logisticsEstimateBtn') + '</button>'
    + '<div id="logisticsEstimateResult" class="screen-result"></div>'
    + '</form></section>'
    + '<p class="small muted" style="margin:14px 0 0">' + t('logisticsEstimateNote') + '</p>'
    + '</div>';
}

async function runLogisticsEstimate(form) {
  const wrap = document.getElementById('logisticsEstimateResult');
  if (!wrap) return;
  const fd = new FormData(form);
  wrap.innerHTML = '<p class="muted">…</p>';
  try {
    const r = await api.logistics.estimate({
      mode: fd.get('mode') || 'sea',
      container: fd.get('container') || 'LCL',
      weight: fd.get('weight'),
      volume: fd.get('volume'),
      origin: fd.get('origin'),
      destination: fd.get('destination')
    });
    const mode = LOGISTICS_MODES.find(m => m.id === r.mode);
    wrap.innerHTML = '<div class="estimate-result"><b>' + t('logisticsEstimateResult') + '</b>'
      + '<div class="n">USD ' + Number(r.lo).toLocaleString() + ' – ' + Number(r.hi).toLocaleString() + '</div>'
      + '<div class="small muted">' + (mode ? esc(langObj(mode).name) : r.mode)
      + (r.container ? ' · ' + esc(r.container) : '') + (r.origin ? ' · ' + esc(r.origin) : '')
      + (r.destination ? ' → ' + esc(r.destination) : '') + '</div>'
      + '<p class="small muted">' + t('logisticsEstimateNote') + '</p></div>';
  } catch (e) {
    wrap.innerHTML = '<p class="muted">' + esc(e.message || 'ERROR') + '</p>';
  }
}

function bindLogisticsPage() { /* 港口切换由 hash 路由完成 */ }

/* ---------- 合规中心 ---------- */
function productScreenFlags(p) {
  const txt = (((p.en && p.en.title) || '') + ' ' + ((p.en && p.en.desc) || '') + ' '
    + ((p.zh && p.zh.title) || '') + ' ' + ((p.zh && p.zh.desc) || '')).toLowerCase();
  return (typeof SANCTION_KEYWORDS !== 'undefined' ? SANCTION_KEYWORDS : [])
    .filter(kw => txt.includes(String(kw).toLowerCase()));
}

function renderCompliance() {
  document.title = t('navCompliance') + ' · BeanBeanMouse';
  const demo = state.products.filter(isLive).slice(0, 4);
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1> ' + t('complianceTitle') + '</h1><p>' + t('complianceSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>🔎 ' + t('complianceControlTitle') + '</h2><span class="small muted">' + t('complianceControlNote') + '</span></div>'
    + '<form data-form="compliance-screen-form" novalidate>'
    + '<div class="field"><label>' + t('complianceScreenHint') + '</label><textarea class="textarea" name="text" rows="3" maxlength="2000" placeholder="e.g. 3000W fiber laser cutting machine with automatic focus"></textarea></div>'
    + '<div class="flex gap-10" style="flex-wrap:wrap;margin:8px 0">'
    + (demo.length ? demo.map(p => '<button type="button" class="chip" data-action="screen-sample" data-id="' + p.id + '" title="' + esc(langObj(p).title) + '">' + esc(langObj(p).title) + '</button>').join('') : '')
    + '</div>'
    + '<button type="submit" class="btn btn-primary">' + t('complianceScreenBtn') + '</button>'
    + '<div id="complianceResult" class="screen-result"></div>'
    + '</form></section>'
    + '<section class="card panel"><div class="panel-head"><h2>📋 ' + t('complianceListTitle') + '</h2></div>'
    + '<div class="compliance-grid">' + COMPLIANCE_RULES.map(r =>
      '<div class="compliance-card"><div class="compliance-ico">' + r.icon + '</div><b>' + esc(langObj(r).name) + '</b>'
      + '<ul>' + langObj(r).items.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>'
    ).join('') + '</div></section>'
    + '<p class="small muted" style="margin:14px 0 0">' + t('complianceDisclaimer') + '</p>'
    + '</div>';
}

async function runComplianceScreen(form) {
  const wrap = document.getElementById('complianceResult');
  if (!wrap) return;
  const text = (form ? new FormData(form).get('text') : '') || '';
  wrap.innerHTML = '<p class="muted">…</p>';
  try {
    const r = await api.compliance.screen(text);
    wrap.innerHTML = r.clean
      ? '<div class="screen-verdict ok">✓ ' + esc(t('complianceClear')) + '</div>'
      : '<div class="screen-verdict bad">⚠ ' + esc(t('complianceHits')) + '</div>'
        + '<div class="risk-box">' + r.hits.map(h => '<span class="risk-chip">' + esc(h) + '</span>').join('') + '</div>'
        + '<p class="small muted">' + t('complianceDisclaimer') + '</p>';
  } catch (e) {
    wrap.innerHTML = '<p class="muted">' + esc(e.message || 'ERROR') + '</p>';
  }
}

function bindCompliancePage() {
  const ta = document.querySelector('form[data-form="compliance-screen-form"] textarea');
  $$('[data-action="screen-sample"]').forEach(btn => {
    btn.addEventListener('click', () => {
      const p = productById(btn.dataset.id);
      if (!p || !ta) return;
      ta.value = ((p.en && p.en.title) || '') + ' — ' + ((p.en && p.en.desc) || '');
    });
  });
}

/* ---------- 售后与纠纷 ---------- */
function afterSalesStatusLabel(st) {
  const key = { new: 'afterSalesNew', responded: 'afterSalesResponded', arbitrating: 'afterSalesArbitrating', resolved: 'afterSalesResolved', closed: 'afterSalesClosed' }[st] || 'afterSalesNew';
  return t(key);
}
function afterSalesStatusCls(st) {
  return st === 'resolved' ? 'done' : st === 'arbitrating' ? 'pend' : st === 'closed' ? '' : 'new';
}
function afterSalesTypeLabel(id) {
  const x = AFTER_SALES_TYPES.find(y => y.id === id);
  return x ? langObj(x) : String(id || '');
}
function afterSalesCaseHtml(c) {
  const o = (state.orders || []).find(x => x.id === c.orderId);
  const p = o ? productById(o.productId) : null;
  const isBuyer = state.user && c.buyerId === state.user.id;
  const isSeller = state.user && c.sellerId === (state.user.sellerId || state.user.id);
  const isAdmin = state.user && state.user.role === 'admin';
  return '<div class="as-card">'
    + '<div class="as-head"><b>' + (c.dispute ? '⚖️ ' : '🔧 ') + esc(afterSalesTypeLabel(c.type)) + '</b>'
    + '<span class="status-pill ' + afterSalesStatusCls(c.status) + '">' + esc(afterSalesStatusLabel(c.status)) + '</span></div>'
    + '<p class="small muted">' + t('afterSalesCaseNo') + '：' + esc(c.id) + ' · ' + t('afterSalesOrder') + '：' + esc(c.orderId)
    + (p ? ' · ' + esc(langObj(p).title) : '') + '</p>'
    + '<p class="small">' + t('afterSalesDescLabel') + '：' + esc(c.description) + '</p>'
    + (c.resolution ? '<p class="small muted">' + t('afterSalesResolution') + '：' + esc(c.resolution) + '</p>' : '')
    + (c.sellerReply ? '<div class="reply-box"><div class="reply-msg"><b>' + t('sellerReply') + '：</b>' + esc(c.sellerReply) + '</div></div>' : '')
    + (c.ruling ? '<div class="arbitration-box"><b>' + t('afterSalesRuling') + '：</b>'
      + esc(t(c.ruling === 'buyer' ? 'arbitrateBuyer' : c.ruling === 'seller' ? 'arbitrateSeller' : 'arbitrateCompromise'))
      + (c.rulingNote ? ' — ' + esc(c.rulingNote) : '') + '</div>' : '')
    + '<div class="flex gap-10" style="margin-top:8px;flex-wrap:wrap">'
    + (isBuyer && (c.status === 'new' || c.status === 'responded') ? '<button type="button" class="btn btn-sm" data-action="as-escalate" data-id="' + c.id + '">' + t('afterSalesOpen') + '</button>' : '')
    + (isSeller && (c.status === 'new' || c.status === 'responded') ? '<button type="button" class="btn btn-sm btn-primary" data-action="as-respond" data-id="' + c.id + '">' + t('afterSalesRespond') + '</button>' : '')
    + (isAdmin && c.status === 'arbitrating' ? '<button type="button" class="btn btn-sm btn-primary" data-action="as-arbitrate" data-id="' + c.id + '">' + t('afterSalesArbitrate') + '</button>' : '')
    + (c.orderId ? '<button type="button" class="btn btn-sm" data-action="as-evidence" data-id="' + c.orderId + '">' + icon('shield') + ' ' + t('afterSalesEvidence') + '</button>' : '')
    + '</div></div>';
}
function renderDisputes() {
  document.title = t('navDisputes') + ' · BeanBeanMouse';
  if (!state.user) {
    return '<div class="container page"><div class="card panel"><p>' + t('afterSalesNeedLogin') + '</p>'
      + '<a class="btn btn-primary" href="#/login" data-nav="/login">' + t('login') + '</a></div></div>';
  }
  const u = state.user;
  let rows = state.afterSales || [];
  if (u.role === 'seller') rows = rows.filter(c => c.sellerId === (u.sellerId || u.id));
  else if (u.role !== 'admin') rows = rows.filter(c => c.buyerId === u.id);
  rows = rows.slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const eligible = (state.orders || []).filter(o =>
    (u.role === 'buyer' ? o.buyerId === u.id : u.role === 'seller' ? o.sellerId === (u.sellerId || u.id) : false)
    && (o.status === 'created' || o.status === 'complete'));
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>⚖️ ' + t('disputesTitle') + '</h1><p>' + t('disputesSub') + '</p></div>'
    + (u.role === 'buyer' && eligible.length
      ? '<section class="card panel"><div class="panel-head"><h2>' + t('afterSalesCreate') + '</h2></div>'
        + '<div class="as-order-grid">' + eligible.map(o => {
          const p = productById(o.productId);
          return '<div class="as-order-card"><b>' + esc(p ? langObj(p).title : o.id) + '</b>'
            + '<span class="small muted">' + esc(o.id) + ' · ' + (o.currency || 'USD') + ' ' + Number(o.total || 0).toLocaleString() + '</span>'
            + '<div class="flex gap-10"><button type="button" class="btn btn-sm btn-primary" data-action="after-sales-open" data-id="' + o.id + '">' + t('afterSalesCreate') + '</button>'
            + '<button type="button" class="btn btn-sm" data-action="dispute-open" data-id="' + o.id + '">' + t('afterSalesOpen') + '</button></div></div>';
        }).join('') + '</div></section>'
      : '')
    + '<section class="card panel"><div class="panel-head"><h2>' + t('asMyCases') + '</h2><span class="small muted">' + t('afterSalesNote') + '</span></div>'
    + (rows.length ? rows.map(afterSalesCaseHtml).join('') : '<div class="empty-state" style="padding:32px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/tools.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('afterSalesEmpty') + '</p></div>')
    + '</section></div>';
}
function bindDisputesPage() { /* 数据来自本地状态，动作走全局委托 */ }

/* ---------- 优化建议收集 ---------- */
function feedbackTypeLabel(type) {
  const m = { page: 'feedbackTypePage', feature: 'feedbackTypeFeature', content: 'feedbackTypeContent', ux: 'feedbackTypeUx', other: 'feedbackTypeOther' }[type];
  return m ? t(m) : String(type || '');
}
function feedbackStatusLabel(st) {
  return st === 'done' ? t('feedbackDone') : st === 'seen' ? t('feedbackSeen') : t('feedbackNew');
}
function renderFeedback() {
  document.title = t('navFeedback') + ' · BeanBeanMouse';
  const types = [['page', t('feedbackTypePage')], ['feature', t('feedbackTypeFeature')], ['content', t('feedbackTypeContent')], ['ux', t('feedbackTypeUx')], ['other', t('feedbackTypeOther')]];
  const mine = state.user ? (state.suggestions || []).filter(s => s.userId === state.user.id).slice().sort((a, b) => b.updatedAt - a.updatedAt) : [];
  return '<div class="container page">'
    + '<div class="page-head guide-head"><h1>💬 ' + t('feedbackTitle') + '</h1><p>' + t('feedbackSub') + '</p></div>'
    + '<section class="card panel"><div class="panel-head"><h2>' + t('feedbackSubmit') + '</h2></div>'
    + '<form data-form="feedback-form" novalidate>'
    + '<div class="field"><label>' + t('feedbackType') + '</label><select class="select" name="type">' + types.map(([v, l]) => '<option value="' + v + '">' + esc(l) + '</option>').join('') + '</select></div>'
    + '<div class="field"><label>' + t('feedbackContent') + ' *</label><textarea class="textarea" name="content" rows="4" required maxlength="2000" placeholder="…"></textarea></div>'
    + '<div class="field"><label>' + t('feedbackContact') + '</label><input class="input" name="contact" maxlength="120" placeholder="email / WhatsApp（可选）"></div>'
    + '<p class="small muted">' + t('feedbackPrivacy') + '</p>'
    + '<button type="submit" class="btn btn-primary">' + t('feedbackSubmit') + '</button>'
    + '<div id="feedbackResult" class="screen-result"></div>'
    + '</form></section>'
    + (state.user && mine.length
      ? '<section class="card panel mt-20"><div class="panel-head"><h2>' + t('asMyCases') + '</h2></div>'
        + mine.map(s => '<div class="as-card"><div class="as-head"><b>' + esc(feedbackTypeLabel(s.type)) + '</b>'
          + '<span class="status-pill ' + (s.status === 'done' ? 'done' : s.status === 'seen' ? '' : 'pend') + '">' + esc(feedbackStatusLabel(s.status)) + '</span></div>'
          + '<p class="small">' + esc(s.content) + '</p>'
          + '<p class="small muted">' + fmtDate(s.createdAt) + (s.contact ? ' · ' + esc(s.contact) : '') + '</p></div>').join('')
        + '</section>'
      : '')
    + '</div>';
}
async function submitFeedback(form) {
  const fd = new FormData(form);
  const content = String(fd.get('content') || '').trim();
  if (!content) { toast(t('required')); return; }
  try {
    await api.suggestions.create({ type: fd.get('type') || 'other', content, contact: String(fd.get('contact') || '').trim() });
    form.reset();
    toast(t('feedbackThanks'));
    render();
    const wrap = document.getElementById('feedbackResult');
    if (wrap) wrap.innerHTML = '<div class="screen-verdict ok">✓ ' + esc(t('feedbackThanks')) + ' ' + esc(t('feedbackThanksDesc')) + '</div>';
  } catch (e) { toast(e.message || String(e)); }
}
function adminFeedbackBody() {
  const rows = (state.suggestions || []).slice().sort((a, b) => b.updatedAt - a.updatedAt);
  return '<div class="card panel"><div class="panel-head"><h2>' + t('adminFeedback') + '</h2>'
    + '<span class="small muted">' + rows.filter(s => s.status === 'new').length + ' ' + t('feedbackNew') + '</span></div>'
    + (rows.length ? rows.map(s => {
      const u = (state.users || []).find(x => x.id === s.userId);
      return '<div class="as-card"><div class="as-head"><b>' + esc(feedbackTypeLabel(s.type)) + '</b>'
        + '<span class="status-pill ' + (s.status === 'done' ? 'done' : s.status === 'seen' ? '' : 'pend') + '">' + esc(feedbackStatusLabel(s.status)) + '</span></div>'
        + '<p class="small">' + esc(s.content) + '</p>'
        + '<p class="small muted">' + fmtDate(s.createdAt) + (s.contact ? ' · ' + esc(s.contact) : '') + ' · ' + esc(u ? u.name : t('guestName')) + '</p>'
        + '<div class="flex gap-10">'
        + (s.status === 'new' ? '<button type="button" class="btn btn-sm" data-action="feedback-status" data-id="' + s.id + '" data-status="seen">' + t('feedbackMarkSeen') + '</button>' : '')
        + (s.status !== 'done' ? '<button type="button" class="btn btn-sm btn-primary" data-action="feedback-status" data-id="' + s.id + '" data-status="done">' + t('feedbackMarkDone') + '</button>' : '')
        + '</div></div>';
    }).join('') : '<div class="empty-state" style="padding:30px"><p>' + t('feedbackEmpty') + '</p></div>')
    + '</div>';
}
async function submitProfile(form) {
  const fd = new FormData(form);
  try {
    await api.profile.save({
      name: fd.get('name'), accountType: fd.get('accountType'), jobTitle: fd.get('jobTitle'),
      company: fd.get('company'), country: fd.get('country'), contact: fd.get('contact'), bio: fd.get('bio')
    });
    toast(t('profileSaved'));
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function removeBusinessCard() {
  try {
    await api.profile.save({ businessCard: null });
    toast(t('cardRemoveBtn') + ' ✓');
    render();
  } catch (e) { toast(e.message || String(e)); }
}

function openAfterSalesModal(orderId, dispute) {
  const o = (state.orders || []).find(x => x.id === orderId);
  if (!o) return;
  showModal('<div class="modal-head"><h3>' + (dispute ? '⚖️ ' + t('afterSalesOpen') : '🔧 ' + t('afterSalesCreate')) + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="after-sales-form" data-order="' + orderId + '" data-dispute="' + (dispute ? 1 : 0) + '" novalidate>'
    + '<p class="small muted">' + esc(o.id) + ' · ' + (dispute ? t('afterSalesOpen') : t('afterSalesCreate')) + '</p>'
    + '<div class="field"><label>' + t('afterSalesTypeLabel') + ' *</label><select class="select" name="type">'
    + AFTER_SALES_TYPES.map(x => '<option value="' + x.id + '">' + esc(langObj(x)) + '</option>').join('') + '</select></div>'
    + '<div class="field"><label>' + t('afterSalesDescLabel') + ' *</label><textarea class="textarea" name="description" rows="3" required maxlength="1000" placeholder="…"></textarea></div>'
    + '<div class="field"><label>' + t('afterSalesResolution') + '</label><input class="input" name="resolution" maxlength="300" placeholder="e.g. replacement / reship / refund / discount"></div>'
    + (dispute ? '<p class="small muted">' + t('afterSalesNote') + '</p>' : '')
    + '<button type="submit" class="btn btn-primary btn-block">' + t('afterSalesSubmit') + '</button>'
    + '</form></div>');
}
async function submitAfterSales(form) {
  const fd = new FormData(form);
  const desc = String(fd.get('description') || '').trim();
  if (!desc) { toast(t('required')); return; }
  try {
    const rec = await api.afterSales.create({
      orderId: form.dataset.order,
      type: fd.get('type') || 'other',
      description: desc,
      resolution: String(fd.get('resolution') || '').trim(),
      dispute: form.dataset.dispute === '1'
    });
    const su = sellerUserOf(rec.sellerId);
    if (su) pushNotification({ toUserId: su.id, title: t('notifAfterSales'), body: rec.description.slice(0, 80), link: '/dashboard/messages' });
    closeModal();
    toast(form.dataset.dispute === '1' ? t('afterSalesOpen') + ' ✓' : t('afterSalesCreate') + ' ✓');
    render();
  } catch (e) { toast(e.message || String(e)); }
}
function openAfterSalesRespondModal(id) {
  const c = (state.afterSales || []).find(x => x.id === id);
  if (!c) return;
  showModal('<div class="modal-head"><h3>' + t('afterSalesRespond') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="aftersales-respond-form" data-id="' + id + '" novalidate>'
    + '<p class="small muted">' + esc(c.id) + ' · ' + esc(afterSalesTypeLabel(c.type)) + '</p>'
    + '<p class="small">' + t('afterSalesDescLabel') + '：' + esc(c.description) + '</p>'
    + '<div class="field"><label>' + t('afterSalesResolution') + '</label><input class="input" name="reply" maxlength="600" placeholder="…"></div>'
    + '<div class="flex gap-10"><button type="submit" class="btn btn-primary" name="action" value="accept">' + t('afterSalesAccept') + '</button>'
    + '<button type="submit" class="btn" name="action" value="reject">' + t('afterSalesReject') + '</button></div>'
    + '</form></div>');
}
async function submitAfterSalesRespond(form) {
  const fd = new FormData(form);
  try {
    const rec = await api.afterSales.respond(form.dataset.id, { action: fd.get('action') || 'accept', reply: fd.get('reply') });
    if (rec.buyerId) pushNotification({ toUserId: rec.buyerId, title: t('notifAfterSales'), body: rec.sellerReply.slice(0, 80), link: '/dashboard/messages' });
    closeModal();
    toast(t('afterSalesRespond') + ' ✓');
    render();
  } catch (e) { toast(e.message || String(e)); }
}
function openAfterSalesArbitrateModal(id) {
  const c = (state.afterSales || []).find(x => x.id === id);
  if (!c) return;
  showModal('<div class="modal-head"><h3>⚖️ ' + t('afterSalesArbitrate') + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body"><form data-form="aftersales-arbitrate-form" data-id="' + id + '" novalidate>'
    + '<p class="small muted">' + esc(c.id) + ' · ' + esc(c.orderId) + '</p>'
    + '<p class="small">' + t('afterSalesDescLabel') + '：' + esc(c.description) + '</p>'
    + (c.sellerReply ? '<div class="reply-box"><div class="reply-msg"><b>' + t('sellerReply') + '：</b>' + esc(c.sellerReply) + '</div></div>' : '')
    + '<p class="small muted">' + t('afterSalesArbitrateTip') + '</p>'
    + '<div class="field"><label>' + t('afterSalesRuling') + ' *</label><select class="select" name="ruling">'
    + '<option value="buyer">' + t('arbitrateBuyer') + '</option><option value="seller">' + t('arbitrateSeller') + '</option><option value="compromise">' + t('arbitrateCompromise') + '</option></select></div>'
    + '<div class="field"><label>' + t('afterSalesDescLabel') + '（' + t('afterSalesRuling') + '）</label><textarea class="textarea" name="note" rows="2" maxlength="600"></textarea></div>'
    + '<button type="submit" class="btn btn-primary btn-block">' + t('afterSalesArbitrate') + '</button>'
    + '</form></div>');
}
async function submitAfterSalesArbitrate(form) {
  const fd = new FormData(form);
  try {
    const rec = await api.afterSales.arbitrate(form.dataset.id, { ruling: fd.get('ruling'), note: fd.get('note') });
    [rec.buyerId, rec.sellerId].forEach(uid => {
      if (uid) pushNotification({
        toUserId: uid,
        title: t('notifAfterSales'),
        body: t('afterSalesRuling') + '：' + t(rec.ruling === 'buyer' ? 'arbitrateBuyer' : rec.ruling === 'seller' ? 'arbitrateSeller' : 'arbitrateCompromise'),
        link: '/dashboard/messages'
      });
    });
    closeModal();
    toast(t('afterSalesArbitrate') + ' ✓');
    render();
  } catch (e) { toast(e.message || String(e)); }
}
async function escalateAfterSales(id) {
  try {
    await api.afterSales.escalate(id);
    toast(t('afterSalesOpen') + ' ✓');
    render();
  } catch (e) { toast(e.message || String(e)); }
}
function adminAfterSalesBody() {
  const rows = (state.afterSales || []).slice().sort((a, b) => b.updatedAt - a.updatedAt);
  const pending = rows.filter(c => c.status === 'arbitrating');
  const rest = rows.filter(c => c.status !== 'arbitrating');
  return '<div class="card panel"><div class="panel-head"><h2>' + t('adminAfterSales') + '</h2><span class="small muted">' + t('adminAfterSalesHint') + '</span></div>'
    + (pending.length ? pending.map(afterSalesCaseHtml).join('') : '')
    + (rest.length ? '<div class="section-divider">' + t('asMyCases') + ' · ' + rest.length + '</div>' + rest.map(afterSalesCaseHtml).join('') : '')
    + (!rows.length ? '<div class="empty-state" style="padding:32px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/tools.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('afterSalesEmpty') + '</p></div>' : '')
    + '</div>';
}

/* ---------- 订单单据中心（商业发票/装箱单/原产地证/提单参考） ---------- */
function orderDocRecord(o) {
  return (state.orderDocs || {})[o.id] || { generated: {}, consistency: null, checkedAt: null };
}
function orderDocPanelHtml(o) {
  const rec = orderDocRecord(o);
  const types = [['CI', t('docCI')], ['PL', t('docPL')], ['CO', t('docCO')], ['BL', t('docBL')]];
  const cons = rec.consistency;
  return '<div class="doc-center-box">'
    + '<div class="doc-center-head"><b>' + icon('file') + ' ' + t('docCenter') + '</b>'
    + (cons
      ? '<span class="status-pill ' + (cons === 'pass' ? 'done' : 'pend') + '">' + (cons === 'pass' ? '✓ ' + t('docConsistencyPass') : '⚠ ' + t('docConsistencyWarn')) + '</span>'
      : '<span class="chip sub-chip">' + t('docCheckHint') + '</span>')
    + '</div>'
    + '<div class="doc-type-grid">' + types.map(([type, label]) => {
      const gen = rec.generated && rec.generated[type];
      return '<div class="doc-type"><b>' + esc(label) + '</b>'
        + '<span class="small muted">' + (gen ? t('docGenerated') + ' · ' + fmtDate(gen) : '—') + '</span>'
        + '<button type="button" class="btn btn-sm ' + (gen ? '' : 'btn-primary') + '" data-action="' + (gen ? 'doc-print' : 'doc-gen') + '" data-order="' + o.id + '" data-type="' + type + '">' + (gen ? '🖨' : t('docGenerate')) + '</button>'
        + '</div>';
    }).join('') + '</div>'
    + '<div class="flex gap-10">'
    + '<button type="button" class="btn btn-sm" data-action="doc-check" data-order="' + o.id + '">' + icon('check') + ' ' + t('docConsistencyCheck') + '</button>'
    + '<span class="small muted" style="align-self:center">' + t('docCheckHint') + '</span>'
    + '</div></div>';
}
function orderDocNo(prefix) {
  const d = new Date();
  const ymd = '' + d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
  return prefix + '-' + ymd + '-' + Math.floor(1000 + Math.random() * 9000);
}
function buildOrderDoc(o, type) {
  const p = productById(o.productId);
  if (!p) return '';
  const seller = sellerOf(p);
  const lang = state.lang;
  const buyerName = partyNameOf(o, 'buyer');
  const sellerName = partyNameOf(o, 'seller');
  const qty = Number(o.quantity) || 1;
  const unit = p.unit || 'pcs';
  const price = qty > 0 ? Number(o.total || 0) / qty : p.priceMin;
  const amount = Number(o.total || 0);
  const marks = o.shippingMarks || 'N/M';
  const shipment = (o.shipments && o.shipments.length ? o.shipments[0] : (state.shipments || []).find(s => s.orderId === o.id)) || null;
  const dateFmt = ts => new Date(ts).toLocaleDateString(lang === 'zh' ? 'zh-CN' : 'en-US', { year: 'numeric', month: '2-digit', day: '2-digit' });
  const titleMap = { CI: t('docCI'), PL: t('docPL'), CO: t('docCO'), BL: t('docBL') };
  const title = titleMap[type] || type;
  let body = '';
  if (type === 'CI') {
    body = '<div class="doc-meta"><span><b>' + t('docNo') + '：</b>' + orderDocNo('CI') + '</span>'
      + '<span><b>' + t('docDate') + '：</b>' + dateFmt(Date.now()) + '</span>'
      + '<span><b>' + t('docCurrency') + '</b></span></div>'
      + '<div class="doc-parties"><div><div class="doc-party-label">' + t('docSeller') + '</div><b>' + esc(sellerName) + '</b><div>' + esc(seller[lang] ? seller[lang].city : '') + '</div></div>'
      + '<div><div class="doc-party-label">' + t('docBuyer') + '</div><b>' + esc(buyerName) + '</b></div></div>'
      + '<table class="doc-table"><thead><tr><th>' + t('docItem') + '</th><th>HS Code</th><th>' + t('docQty') + '</th><th>' + t('docUnitPrice') + '</th><th>' + t('docAmount') + '</th></tr></thead>'
      + '<tbody><tr><td>' + esc(langObj(p).title) + '</td><td>' + esc(p.hsCode || '—') + '</td><td>' + qty + ' ' + esc(unit) + '</td><td>' + fmtPrice(price) + '</td><td>' + fmtPrice(amount) + '</td></tr></tbody>'
      + '<tfoot><tr><td colspan="4" class="doc-total-label">' + t('docTotal') + '</td><td><b>' + fmtPrice(amount) + '</b></td></tr></tfoot></table>'
      + '<div class="doc-terms"><span><b>' + t('docMarks') + '：</b>' + esc(marks) + '</span>'
      + '<span><b>' + t('quoteIncoterm') + '：</b>' + esc((p.incoterm || 'FOB')) + '</span>'
      + (shipment ? '<span><b>' + t('shpVessel') + '：</b>' + esc(shipment.vessel || shipment.carrier || '—') + '</span>' : '')
      + '<span><b>' + t('docOriginClaim') + '：</b>' + esc(countryName(seller.country)) + '</span></div>';
  } else if (type === 'PL') {
    const cartons = Math.max(1, Math.ceil(qty / Math.max(1, o.perCarton || 10)));
    const gross = Number(o.grossWeight) || Math.max(1, Math.round(qty * 1.5));
    const net = Number(o.netWeight) || Math.max(1, Math.round(gross * 0.92));
    body = '<div class="doc-meta"><span><b>' + t('docNo') + '：</b>' + orderDocNo('PL') + '</span>'
      + '<span><b>' + t('docDate') + '：</b>' + dateFmt(Date.now()) + '</span></div>'
      + '<div class="doc-parties"><div><div class="doc-party-label">' + t('docSeller') + '</div><b>' + esc(sellerName) + '</b></div>'
      + '<div><div class="doc-party-label">' + t('docBuyer') + '</div><b>' + esc(buyerName) + '</b></div></div>'
      + '<table class="doc-table"><thead><tr><th>' + t('docItem') + '</th><th>HS Code</th><th>' + t('docQty') + '</th><th>' + t('docCartons') + '</th><th>' + t('docGrossWeight') + '</th><th>' + t('docNetWeight') + '</th></tr></thead>'
      + '<tbody><tr><td>' + esc(langObj(p).title) + '</td><td>' + esc(p.hsCode || '—') + '</td><td>' + qty + ' ' + esc(unit) + '</td><td>' + cartons + '</td><td>' + gross + ' kg</td><td>' + net + ' kg</td></tr></tbody></table>'
      + '<div class="doc-terms"><span><b>' + t('docMarks') + '：</b>' + esc(marks) + '</span>'
      + '<span><b>' + t('docOriginClaim') + '：</b>' + esc(countryName(seller.country)) + '</span></div>';
  } else if (type === 'CO') {
    body = '<div class="doc-meta"><span><b>' + t('docNo') + '：</b>' + orderDocNo('CO') + '</span>'
      + '<span><b>' + t('docDate') + '：</b>' + dateFmt(Date.now()) + '</span></div>'
      + '<div class="doc-parties"><div><div class="doc-party-label">' + t('docSeller') + '</div><b>' + esc(sellerName) + '</b><div>' + esc(seller[lang] ? seller[lang].city : '') + ', ' + countryName(seller.country) + '</div></div>'
      + '<div><div class="doc-party-label">' + t('docConsignee') + '</div><b>' + esc(buyerName) + '</b></div></div>'
      + '<table class="doc-table"><thead><tr><th>' + t('docItem') + '</th><th>HS Code</th><th>' + t('docQty') + '</th><th>' + t('docOriginClaim') + '</th></tr></thead>'
      + '<tbody><tr><td>' + esc(langObj(p).title) + '</td><td>' + esc(p.hsCode || '—') + '</td><td>' + qty + ' ' + esc(unit) + '</td><td>' + esc(countryName(seller.country)) + '</td></tr></tbody></table>'
      + '<div class="doc-terms"><span><b>' + t('docMarks') + '：</b>' + esc(marks) + '</span>'
      + '<span><b>' + t('docIssue') + '：</b>CCPIT / Customs</span></div>'
      + '<p class="small muted">' + t('docCOHint') + '</p>';
  } else if (type === 'BL') {
    body = '<div class="doc-meta"><span><b>' + t('docNo') + '：</b>' + orderDocNo('BL') + '</span>'
      + '<span><b>' + t('docDate') + '：</b>' + dateFmt(Date.now()) + '</span></div>'
      + '<div class="doc-parties"><div><div class="doc-party-label">' + t('docConsignee') + '</div><b>' + esc(buyerName) + '</b></div>'
      + '<div><div class="doc-party-label">' + t('docNotify') + '</div><b>' + esc(buyerName) + '</b></div></div>'
      + '<div class="doc-meta"><span><b>' + t('shpVessel') + '：</b>' + esc((shipment && (shipment.vessel || shipment.carrier)) || 'TBD') + '</span>'
      + '<span><b>' + t('docBillNo') + '：</b>' + esc((shipment && shipment.trackingNo) || 'TBD') + '</span>'
      + '<span><b>' + t('shpPortLoading') + '：</b>' + esc((shipment && shipment.origin) || (o.portLoading || 'TBD')) + '</span>'
      + '<span><b>' + t('shpPortDischarge') + '：</b>' + esc((shipment && shipment.destination) || (o.portDischarge || 'TBD')) + '</span>'
      + '<span><b>' + t('shpContainer') + '：</b>' + esc((shipment && shipment.containerType) || o.containerType || 'LCL') + '</span>'
      + '<span><b>' + t('docMarks') + '：</b>' + esc(marks) + '</span></div>'
      + '<table class="doc-table"><thead><tr><th>' + t('docItem') + '</th><th>HS Code</th><th>' + t('docQty') + '</th><th>' + t('docGrossWeight') + '</th></tr></thead>'
      + '<tbody><tr><td>' + esc(langObj(p).title) + '</td><td>' + esc(p.hsCode || '—') + '</td><td>' + qty + ' ' + esc(unit) + '</td><td>' + (o.grossWeight || '—') + ' kg</td></tr></tbody></table>'
      + '<div class="doc-terms"><span><b>' + t('shpTelex') + '：</b>' + (((shipment && shipment.telexRelease) || o.telexRelease) ? t('yes') : t('no')) + '</span>'
      + '<span><b>' + t('shpFreightTerms') + '：</b>' + esc((shipment && shipment.freightTerms) || t('freightPrepaid')) + '</span></div>'
      + '<p class="small muted">' + t('docBLHint') + '</p>';
  }
  return '<div class="doc" id="docSheet">'
    + '<div class="doc-head"><div class="doc-brand"><b>BeanBeanMouse</b><div>' + esc(t('docCenter')) + '</div><div class="doc-web">beanbeanmouse.com</div></div>'
    + '<div class="doc-title"><h2>' + esc(title) + '</h2><div>ORDER · ' + esc(o.id) + '</div></div></div>'
    + body
    + '<div class="doc-sign"><div>' + t('docSellerSign') + '</div><div>' + t('docBuyerSign') + '</div></div>'
    + '<div class="doc-disclaimer">' + t('docDisclaimer') + '</div>'
    + '</div>';
}
function openOrderDocPrint(orderId, type) {
  const o = (state.orders || []).find(x => x.id === orderId);
  if (!o) return;
  const doc = buildOrderDoc(o, type);
  if (!doc) return;
  const printEl = document.getElementById('printDoc');
  if (printEl) printEl.innerHTML = doc;
  const titleMap = { CI: t('docCI'), PL: t('docPL'), CO: t('docCO'), BL: t('docBL') };
  showModal('<div class="modal doc-modal"><div class="modal-head"><h3>' + icon('file') + ' ' + esc(titleMap[type] || type) + '</h3><button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body">' + doc
    + '<p class="small muted">' + icon('file') + ' ' + t('printHint') + '</p>'
    + '<div class="doc-actions"><button type="button" class="btn btn-primary" data-action="print-now">🖨 ' + t('printNow') + '</button>'
    + '<button type="button" class="btn" data-action="close-modal">' + t('close') + '</button></div>'
    + '</div></div>');
}
async function generateOrderDoc(orderId, type) {
  try {
    await api.documents.generate(orderId, type);
    openOrderDocPrint(orderId, type);
  } catch (e) { toast(e.message || String(e)); }
}
async function checkOrderDocConsistency(orderId) {
  try {
    const r = await api.documents.consistency(orderId);
    toast(r.status === 'pass' ? '✓ ' + t('docConsistencyPass') : '⚠ ' + t('docConsistencyWarn'));
    renderPage();
  } catch (e) { toast(e.message || String(e)); }
}
function orderAfterSalesPanel(o) {
  const cases = (state.afterSales || []).filter(c => c.orderId === o.id);
  const isBuyer = state.user && o.buyerId === state.user.id;
  return '<div class="as-order-panel">'
    + '<div class="as-order-head"><b>🛠 ' + t('asPanelTitle') + '</b>'
    + (isBuyer && (o.status === 'created' || o.status === 'complete')
      ? '<span class="flex gap-10"><button type="button" class="btn btn-sm" data-action="after-sales-open" data-id="' + o.id + '">' + t('asApplyBtn') + '</button>'
        + '<button type="button" class="btn btn-sm" data-action="dispute-open" data-id="' + o.id + '">' + t('asDisputeBtn') + '</button></span>'
      : '')
    + '</div>'
    + (cases.length ? cases.map(afterSalesCaseHtml).join('') : '<p class="small muted">' + t('afterSalesEmpty') + '</p>')
    + '</div>';
}

/* ---------- 卖家推广 / 管理员推广审核 ---------- */
/* ---------- 站内消息与通知（v0.2） ---------- */
const convAutoReplied = {};
let chatLiveUnsub = null;
function bindChatLive(convId) {
  if (api.config.mode !== 'http') return;
  if (chatLiveUnsub) chatLiveUnsub();
  chatLiveUnsub = api.messages.live(convId, ev => {
    if (ev && (ev.type === 'message' || ev.type === 'read') && ev.conversationId === convId) {
      refreshConvReaders(convId);
      renderPage();
    }
  });
}
function pushNotification({ toUserId, title, body, link }) {
  if (!toUserId) return;
  state.notifications = state.notifications || [];
  state.notifications.unshift({
    id: 'n' + Date.now() + Math.random().toString(36).slice(2, 5),
    toUserId,
    title: String(title || '').slice(0, 80),
    body: String(body || '').slice(0, 200),
    link: link || '',
    read: false,
    createdAt: Date.now()
  });
  if (state.notifications.length > 120) state.notifications.length = 120;
  saveState();
}
function sellerUserOf(sellerId) {
  return (state.users || []).find(u => (u.sellerId || u.id) === sellerId) || null;
}
function ensureConversationFromInquiry(i) {
  state.conversations = state.conversations || {};
  if (!i || !i.id || state.conversations[i.id]) return;
  const msgs = [];
  const buyerName = i.name || (state.lang === 'zh' ? '买家' : 'Buyer');
  const sellerName = (state.lang === 'zh' ? '供应商' : 'Supplier');
  msgs.push({ id: 'm0-' + i.id, conversationId: i.id, fromUserId: i.buyerId || 'guest', fromName: buyerName, text: i.message, attachments: i.attachments || [], at: i.createdAt });
  if (i.reply) msgs.push({ id: 'm1-' + i.id, conversationId: i.id, fromUserId: i.sellerId, fromName: sellerName, text: i.reply, attachments: i.replyAttachments || [], at: i.createdAt + 3600e3 });
  if (i.quote) msgs.push({
    id: 'm2-' + i.id, conversationId: i.id, fromUserId: i.sellerId, fromName: sellerName,
    text: (state.lang === 'zh' ? '报价：' : 'Quote: ') + i.quote.price + ' ' + (i.quote.incoterm || '') + ' · ' + langObj(i.quote.payment)
      + ' · ' + (state.lang === 'zh' ? '交期 ' : 'Lead time ') + i.quote.leadTime + (state.lang === 'zh' ? ' 天' : ' days')
      + (i.quote.note ? '（' + i.quote.note + '）' : ''),
    attachments: i.replyAttachments || [], at: i.createdAt + 7200e3
  });
  state.conversations[i.id] = { id: i.id, inquiryId: i.id, messages: msgs };
}
function myConversations() {
  const u = state.user;
  if (!u) return [];
  (state.inquiries || []).forEach(ensureConversationFromInquiry);
  const rows = Object.values(state.conversations || {}).filter(c => {
    const i = (state.inquiries || []).find(x => x.id === c.id);
    if (!i) return false;
    if (u.role === 'admin') return true;
    if (u.role === 'seller') return (i.sellerId || '') === (u.sellerId || u.id);
    return i.buyerId === u.id;
  });
  return rows.sort((a, b) => lastMsgAt(b) - lastMsgAt(a));
}
function lastMsgAt(c) {
  const ms = c.messages || [];
  return ms.length ? ms[ms.length - 1].at : 0;
}
function convUnread(c) {
  const u = state.user;
  if (!u) return 0;
  const lastRead = ((state.convReadAt || {})[c.id] || {})[u.id] || 0;
  return (c.messages || []).filter(m => m.fromUserId !== u.id && m.at > lastRead).length;
}
function totalUnread() {
  return myConversations().reduce((s, c) => s + convUnread(c), 0);
}
function counterpartyOf(i) {
  const u = state.user;
  if (!i || !u) return null;
  if (u.id === i.buyerId) return i.sellerId || null;
  if (i.sellerId === (u.sellerId || u.id)) return i.buyerId || null;
  return null;
}
function counterpartReadAt(c) {
  const i = (state.inquiries || []).find(x => x.id === c.id);
  const cp = counterpartyOf(i);
  if (!cp) return 0;
  const rows = (state.convReadAt || {})[c.id] || {};
  let at = rows[cp] || 0;
  const cpUser = (state.users || []).find(x => (x.sellerId || x.id) === cp);
  if (cpUser && (rows[cpUser.id] || 0) > at) at = rows[cpUser.id];
  return at;
}
async function refreshConvReaders(convId) {
  if (api.config.mode !== 'http') return;
  try {
    const r = await api.messages.readers(convId);
    state.convReadAt = state.convReadAt || {};
    state.convReadAt[convId] = state.convReadAt[convId] || {};
    (r.readers || []).forEach(x => { state.convReadAt[convId][x.userId] = x.lastReadAt; });
    saveState();
  } catch (e) { /* 忽略 */ }
}
function renderMessagesBody(convId) {
  const u = state.user;
  if (!u) return '';
  const convs = myConversations();
  const active = convs.find(c => c.id === convId) || convs[0] || null;
  if (active) {
    state.convReadAt = state.convReadAt || {};
    state.convReadAt[active.id] = state.convReadAt[active.id] || {};
    const last = lastMsgAt(active);
    if (last > (state.convReadAt[active.id][u.id] || 0)) {
      state.convReadAt[active.id][u.id] = last;
      saveState();
      api.messages.markRead(active.id, last).catch(() => {});
    }
    refreshConvReaders(active.id);
    bindChatLive(active.id);
  }
  const listHtml = convs.length
    ? convs.map(c => {
      const i = (state.inquiries || []).find(x => x.id === c.id);
      const p = i ? productById(i.productId) : null;
      const lm = (c.messages || []).slice(-1)[0];
      const unread = convUnread(c);
      return '<button type="button" class="conv-row' + (active && c.id === active.id ? ' on' : '') + '" data-action="open-conv" data-id="' + c.id + '">'
      + '<span class="conv-ico">' + (p ? productImg(p, 80, 80) : icon('message')) + '</span>'
      + '<span class="conv-info"><b class="oneline" title="' + esc(p ? langObj(p).title : c.id) + '">' + esc(p ? langObj(p).title : c.id) + '</b>'
      + '<span class="small muted oneline" title="' + esc((lm ? lm.fromName + '：' : '') + (lm ? lm.text : '')) + '">' + esc((lm ? lm.fromName + '：' : '') + (lm ? lm.text : '')) + '</span></span>'
        + (unread ? '<span class="badge-dot">' + unread + '</span>' : '')
        + '</button>';
    }).join('')
    : '<p class="small muted" style="padding:18px">' + t('messagesEmpty') + '</p>';
  const chatHtml = active
    ? '<div class="chat-pane">'
      + '<div class="chat-head"><b>' + esc((function () { const i = (state.inquiries || []).find(x => x.id === active.id); const p = i ? productById(i.productId) : null; return p ? langObj(p).title : active.id; })()) + '</b>'
      + '<a class="btn btn-sm" href="#/dashboard/inquiries" data-nav="/dashboard/inquiries">' + t('viewAll') + ' →</a></div>'
      + '<div class="chat-msgs" aria-live="polite">' + (active.messages || []).map(m => {
        const mine = m.fromUserId === u.id;
        const read = mine && counterpartReadAt(active) >= m.at;
        return '<div class="chat-msg ' + (mine ? 'mine' : 'theirs') + '"><div class="chat-bubble">'
          + (mine ? '' : '<b>' + esc(m.fromName || '') + '</b>')
          + '<p>' + esc(m.text) + '</p>'
          + (m.attachments && m.attachments.length ? attachmentChipsHtml(m.attachments, active.id) : '')
      + '<span class="small muted">' + fmtDate(m.at) + (read ? '<i class="dot-sep"></i><b class="chat-read">' + t('chatRead') + '</b>' : '') + '</span></div></div>';
      }).join('') + '</div>'
      + '<form data-form="chat-send" data-conv="' + active.id + '" class="chat-input" novalidate>'
      + '<input class="input" name="text" maxlength="2000" placeholder="' + t('chatPlaceholder') + '" autocomplete="off">'
      + '<button type="submit" class="btn btn-primary">' + t('chatSend') + '</button></form>'
      + '</div>'
    : '<div class="chat-pane empty"><p class="muted">' + t('messagesEmpty') + '</p></div>';
  return '<div class="card panel"><div class="panel-head"><h2>💬 ' + t('messagesTab') + '</h2>'
    + '<span class="small muted">' + totalUnread() + ' ' + t('unreadLabel') + '</span></div>'
    + '<div class="messages-layout">' + '<div class="conv-list">' + listHtml + '</div>' + chatHtml + '</div>'
    + '<div class="card panel mt-20"><div class="panel-head"><h2>🔔 ' + t('notificationsTitle') + '</h2>'
    + '<button type="button" class="btn btn-sm" data-action="notif-read-all">' + t('markAllRead') + '</button></div>'
    + notificationsListHtml() + '</div></div>';
}
function notificationsListHtml() {
  const rows = (state.notifications || []).filter(n => {
    const u = state.user;
    return !u || u.role === 'admin' || n.toUserId === u.id;
  }).slice(0, 20);
  return rows.length
    ? rows.map(n => '<div class="notif-row' + (n.read ? ' read' : '') + '"' + (n.link ? ' data-nav="' + esc(n.link) + '"' : '') + '>'
      + '<b>' + esc(n.title) + '</b><p>' + esc(n.body) + '</p>'
      + '<span class="small muted">' + fmtDate(n.createdAt) + '</span></div>').join('')
    : '<p class="small muted" style="padding:14px">' + t('notificationsEmpty') + '</p>';
}
async function sendChatMessage(form) {
  const convId = form.dataset.conv;
  const text = String((form.querySelector('input[name="text"]') || {}).value || '').trim();
  if (!convId || !text) return;
  try {
    await api.messages.send(convId, text);
    form.querySelector('input[name="text"]').value = '';
    if (api.config.mode !== 'http' && !convAutoReplied[convId]) {
      convAutoReplied[convId] = true;
      const i = (state.inquiries || []).find(x => x.id === convId);
      const cp = counterpartyOf(i);
      setTimeout(() => {
        api.messages.send(convId, t('chatAutoReply'), { sender: cp, fromName: state.lang === 'zh' ? '对方' : 'Them' })
          .then(() => renderPage())
          .catch(() => {});
      }, 1200);
    }
    renderPage();
  } catch (e) { toast(e.message || String(e)); }
}
async function markAllNotificationsRead() {
  try {
    await api.notifications.markAllRead();
    toast(t('markAllRead') + ' ✓');
    renderPage();
  } catch (e) { toast(e.message || String(e)); }
}
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
  return '<div class="container login-page"><div class="login-card">'
    + '<div class="login-brand"><img class="login-mascot" src="assets/mascot-icon.png" alt="BeanBeanMouse" width="58" height="58" decoding="async">'
    + '<div class="login-brand-txt"><b>BeanBean<span>Mouse</span></b><span>' + t('loginTag') + '</span></div></div>'
    + '<h1>' + t('loginTitle') + '</h1>'
    + '<p class="sub">' + t('loginDesc') + '</p>'
    + '<form class="login-form" data-form="login-form" novalidate>'
    + '<div class="field"><label>' + t('regEmail') + '</label><input class="input" type="email" name="email" required autocomplete="username" placeholder="you@example.com"></div>'
    + '<div class="field"><label>' + t('regPassword') + '</label><input class="input" type="password" name="password" required autocomplete="current-password"></div>'
    + '<button type="submit" class="btn btn-accent btn-block">' + t('login') + '</button>'
    + '</form>'
    + '<p class="small muted login-divider">' + t('loginOrDemo') + '</p>'
    + '<div class="role-cards">'
    + '<div class="role-card" data-action="login-role" data-role="buyer">'
    + '<div class="role-ico" style="background:linear-gradient(135deg,#2563EB,#7C3AED)">🛒</div>'
    + '<h3>' + t('asBuyer') + '</h3>'
    + '<p>' + t('asBuyerDesc') + '</p>'
    + '<span class="role-arrow">→</span>'
    + '</div>'
    + '<div class="role-card" data-action="login-role" data-role="seller">'
    + '<div class="role-ico" style="background:linear-gradient(135deg,#F59E0B,#DC2626)">🏭</div>'
    + '<h3>' + t('asSeller') + '</h3>'
    + '<p>' + t('asSellerDesc') + '</p>'
    + '<span class="role-arrow">→</span>'
    + '</div>'
    + '<div class="role-card" data-action="login-role" data-role="admin">'
    + '<div class="role-ico" style="background:linear-gradient(135deg,#0F2145,#1D4ED8)"></div>'
    + '<h3>' + t('asAdmin') + '</h3>'
    + '<p>' + t('adminDesc') + '</p>'
    + '<span class="role-arrow">→</span>'
    + '</div>'
    + '</div>'
    + '<button type="button" class="btn btn-lg guest-btn" data-action="login-guest">' + t('asGuest') + '</button>'
    + '<button type="button" class="btn btn-lg btn-outline" data-action="show-register" style="margin-top:10px">📝 ' + t('registerTab') + '</button>'
    + '<div class="login-trust"><span> ' + t('loginTrust1') + '</span><span> ' + t('loginTrust2') + '</span><span> ' + t('loginTrust3') + '</span></div>'
    + '<div class="login-note"> ' + t('loginNote') + '</div>'
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
  const u = state.user;
  return '<aside class="card dash-side">'
    + '<div class="side-user"><span class="side-avatar">' + esc(String(u.name || '?')[0].toUpperCase()) + '</span>'
    + '<div class="side-user-txt"><div class="name">' + esc(u.name) + '</div>'
    + '<div class="sub">' + esc((u.role === 'seller' ? langObj(sellerById(u.sellerId)).company : u.buyerCompany || u.email)) + '</div></div>'
    + '<span class="side-role">' + (u.role === 'seller' ? t('roleSeller') : u.role === 'admin' ? t('adminRoleTag') : t('roleBuyer')) + '</span></div>'
    + '<nav class="side-nav">'
    + items.map(it =>
      '<a href="#/dashboard/' + it.tab + '" data-nav="/dashboard/' + it.tab + '" class="' + (activeTab === it.tab ? 'active' : '') + '">' + icon(it.icon) + it.label + (it.count ? '<span class="badge-dot">' + it.count + '</span>' : '') + '</a>'
    ).join('')
    + '<a href="#/" data-nav="/" data-action="logout" class="side-out">' + icon('logout') + t('logout') + '</a>'
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
    { tab: 'orders', icon: 'box', label: t('orders'), count: (state.orders || []).filter(o => o.sellerId === sid && o.status === 'created').length || null },
    { tab: 'export', icon: 'shield', label: t('exportTab') },
    { tab: 'profile', icon: 'users', label: t('profileTab') },
    { tab: 'messages', icon: 'message', label: t('messagesTab'), count: totalUnread() || null }
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
      + (myInquiries.length ? myInquiries.slice(0, 4).map(inquiryItem).join('') : '<div class="empty-state" style="padding:30px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/mailbox.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noInquiries') + '</p></div>')
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
        : '<div class="empty-state" style="padding:36px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/package.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noProducts') + '</p></div>')
      + '</div>';
  } else if (activeTab === 'orders') {
    body = companyBannerHtml() + ordersBody();
  } else if (activeTab === 'export') {
    body = exportChecklistHtml(sid)
      + '<div class="card panel mt-20"><div class="panel-head"><h2>🏷️ ' + t('exportProductHint') + '</h2></div>'
      + '<p class="small muted">' + t('exportGuideNote') + '</p>'
      + '<a class="btn" href="#/export" data-nav="/export">' + t('navExport') + ' →</a></div>';
  } else if (activeTab === 'profile') {
    body = renderProfileBody();
  } else if (activeTab === 'messages') {
    body = renderMessagesBody(parseHash().params.get('conv') || '');
  } else if (activeTab === 'promo') {
    body = sellerPromoBody(sid);
  } else if (activeTab === 'publish') {
    body = renderPublishForm();
  } else if (activeTab === 'inquiries') {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('inquiryManage') + '</h2><span class="flex gap-10"><span class="small muted">' + myInquiries.length + ' ' + t('totalInquiries') + '</span>'
      + '<button type="button" class="btn btn-sm" data-action="export-inquiries">' + icon('file') + ' ' + t('exportCsv') + '</button></span></div>'
      + (myInquiries.length ? myInquiries.map(inquiryItem).join('') : '<div class="empty-state" style="padding:36px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/mailbox.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noInquiries') + '</p></div>')
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
    { tab: 'aftersales', icon: 'shield', label: t('adminAfterSales'), count: (state.afterSales || []).filter(c => c.status === 'arbitrating').length || null },
    { tab: 'feedback', icon: 'mail', label: t('adminFeedback'), count: (state.suggestions || []).filter(s => s.status === 'new').length || null },
    { tab: 'users', icon: 'users', label: t('userManage') },
    { tab: 'logs', icon: 'clock', label: t('auditLog') }
  ];
  let body = '';
  if (activeTab === 'review') body = adminReviewBody();
  else if (activeTab === 'verify') body = adminVerifyBody();
  else if (activeTab === 'promo') body = adminPromoBody();
  else if (activeTab === 'catreqs') body = adminCatReqBody();
  else if (activeTab === 'aftersales') body = adminAfterSalesBody();
  else if (activeTab === 'feedback') body = adminFeedbackBody();
  else if (activeTab === 'users') body = adminUsersBody();
  else if (activeTab === 'logs') body = adminLogsBody();
  else body = adminOverviewBody();
  const summary = [
    [t('pendingLabel'), pendingCount, 'pend'],
    [t('pendingVerify'), verifyCount, 'new'],
    [t('adminAfterSales'), (state.afterSales || []).filter(c => c.status === 'arbitrating').length, 'new'],
    [t('adminFeedback'), (state.suggestions || []).filter(s => s.status === 'new').length, 'pend']
  ];
  return '<div class="container page"><div class="page-head admin-head">'
    + '<div><h1> ' + t('adminPanel') + '</h1><p class="sub">' + t('adminDesc') + ' · ' + new Date().toLocaleDateString(uiLocale()) + '</p></div>'
    + '<div class="admin-summary">' + summary.map(([label, n, cls]) =>
      '<span class="admin-summary-chip"><b>' + n + '</b> ' + esc(label) + (n ? ' <i class="dot ' + cls + '"></i>' : '') + '</span>').join('') + '</div>'
    + '</div>'
    + '<div class="dash-layout">' + sideNav(tabs, activeTab) + '<div>' + body + '</div></div></div>';
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
      : '<div class="empty-state" style="padding:36px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/user.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noUsers') + '</p></div>')
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
    + '<div class="meta">' + t('adminScreenLabel') + '：'
    + (productScreenFlags(p).length
      ? productScreenFlags(p).map(k => '<span class="risk-chip">' + esc(k) + '</span>').join('')
      : '<span class="chip ok">' + t('compliancePassLabel') + '</span>')
    + '</div>'
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

/* ---------- 待审核账号（pet0.2）：人工把关替代邮件验证 ---------- */
function authTokenOf() {
  try {
    const raw = (typeof localStorage !== 'undefined') ? localStorage.getItem('bridgetrade_v1') : null;
    const st = raw ? JSON.parse(raw) : {};
    return st.token || (typeof state !== 'undefined' && state.token) || '';
  } catch (e) { return ''; }
}
function adminPendingUsersBody() {
  return '<div class="card panel"><div class="panel-head"><h2>' + t('reviewAccounts') + '</h2>'
    + '<span class="small muted" id="pendingCount"></span></div>'
    + '<div id="pendingUsers"><p class="small muted">' + t('loading') + '</p></div>'
    + '<p class="small muted">' + t('reviewAccountsNote') + '</p></div>';
}
async function loadPendingUsers() {
  const box = $('#pendingUsers');
  const cnt = $('#pendingCount');
  if (!box) return;
  if (!api.config || api.config.mode !== 'http') {
    box.innerHTML = '<p class="small muted">' + t('reviewNeedBackend') + '</p>';
    return;
  }
  try {
    const r = await apiRequest('/admin/users?status=pending', { token: authTokenOf() });
    const items = (r && r.items) || [];
    if (cnt) cnt.textContent = items.length + ' ' + t('pendingUnit');
    box.innerHTML = items.length ? '<div class="table-responsive"><table class="table"><thead><tr><th>'
      + t('regEmail') + '</th><th>' + t('regName') + '</th><th>' + t('roleCol') + '</th><th></th></tr></thead><tbody>'
      + items.map(u => '<tr><td>' + esc(u.email) + '</td><td>' + esc(u.name || '') + '</td><td>' + esc(u.role) + '</td>'
        + '<td class="nowrap"><button type="button" class="btn btn-sm btn-primary" data-action="review-user" data-id="' + esc(u.id) + '" data-verdict="approve">' + t('reviewApprove') + '</button> '
        + '<button type="button" class="btn btn-sm" data-action="review-user" data-id="' + esc(u.id) + '" data-verdict="reject">' + t('reviewReject') + '</button></td></tr>').join('')
      + '</tbody></table></div>' : '<p class="small muted">' + t('reviewEmpty') + '</p>';
  } catch (e) {
    box.innerHTML = '<p class="small muted">' + t('reviewLoadFail') + esc(e && e.message) + '</p>';
  }
}

function adminUsersBody() {
  setTimeout(loadPendingUsers, 0);
  return adminPendingUsersBody() + realUsersBody();
}
function realUsersBody() {
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
    + (i.replyAttachments && i.replyAttachments.length ? attachmentChipsHtml(i.replyAttachments, i.id) : '')
    + '<div class="doc-actions">'
    + '<button type="button" class="btn btn-sm btn-primary" data-action="print-doc" data-id="' + i.id + '" data-type="quotation">' + icon('file') + t('printQuotation') + '</button>'
    + '<button type="button" class="btn btn-sm" data-action="print-doc" data-id="' + i.id + '" data-type="proforma">' + icon('file') + t('printProforma') + '</button>'
    + '</div>';
}

function inquiryMsg(i) {
  return '<div class="msg-wrap"><div class="msg">' + esc(i.message) + '</div>'
    + (msgTransState[i.id]
      ? '<div class="trans-msg" data-trans-box="' + i.id + '"><span class="trans-pill">' + icon('sparkle') + ' ' + t('translateLabel') + '</span><p>' + t('translating') + '</p><div class="trans-note">' + t('translateNote') + '</div></div>'
      : '')
    + '<button type="button" class="trans-toggle" data-action="toggle-msg-trans" data-id="' + i.id + '">' + icon('sparkle') + ' ' + t('translateToggle') + '</button></div>';
}

function inquiryItem(i) {
  const p = productById(i.productId);
  const done = i.status === 'handled' || i.status === 'quoted';
  return '<div class="inquiry-item">'
    + '<div class="top">'
    + '<span class="avatar">' + esc(initialsOf(i.name)) + '</span>'
    + '<div class="who">'
    + '<div class="nm">' + esc(i.name) + (i.country ? ' <span class="flag">' + flagEmoji(i.country) + '</span>' : '') + identityBadgeHtml(i) + '</div>'
    + '<div class="ct">' + esc(i.company || '—') + ' · ' + esc(i.email) + ' · ' + t('sentAt') + ' ' + fmtDate(i.createdAt) + '</div>'
    + '</div>'
    + '<span class="status-pill ' + (done ? 'done' : 'new') + '">' + (i.status === 'quoted' ? t('quotedStatus') : done ? t('statusReplied') : t('statusNew')) + '</span>'
    + '</div>'
    + inquiryMsg(i)
    + attachmentChipsHtml(i.attachments, i.id)
    + '<div class="flex gap-10" style="flex-wrap:wrap;margin:4px 0 0">' + cardButtonHtml(i) + exportButtonsHtml(i) + '</div>'
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
        ? '<div class="reply-box"><div class="reply-msg"><b>' + t('yourReply') + '</b>' + esc(i.reply) + '</div></div>'
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
          + '<div class="trans-preview"><span class="trans-label">' + icon('sparkle') + ' ' + t('translateLabel') + '</span><p data-trans-target="quoteNote' + i.id + '">—</p><div class="trans-note">' + t('translateNote') + '</div></div>'
          + '<div class="field attach-field"><label>' + t('attachLabel') + ' <span class="hint">' + t('attachHint') + '</span></label>'
          + '<input type="file" name="attachments" multiple accept="image/jpeg,image/png,image/gif,image/webp,.zip,.rar,.7z" data-attach-store="quote:' + i.id + '">'
          + '<div class="attach-preview"></div></div>'
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
  const p = productById(i.productId);
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
  i.replyAttachments = (pendingFiles.quote[i.id] || []).slice();
  delete pendingFiles.quote[i.id];
  saveState();
  if (i.buyerId && i.buyerId !== 'guest') {
    pushNotification({ toUserId: i.buyerId, title: t('notifNewQuote'), body: langObj(p).title + ' · ' + incoterm + ' ' + price, link: '/dashboard/inquiries' });
  }
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

function exportPublishHint() {
  if (!state.user || state.user.role !== 'seller') return '';
  const r = exportReadinessOf(state.user.sellerId || state.user.id);
  const level = r.score >= 80 ? 'ok' : r.score >= 50 ? 'mid' : 'low';
  return '<div class="exp-level ' + level + '" style="margin:0 0 14px"><b>' + t('exportReadinessScore') + '：' + r.score + '%</b>'
    + '<span>' + esc(r.score >= 80 ? t('exportReadyHigh') : r.score >= 50 ? t('exportReadyMid') : t('exportReadyLow')) + '</span>'
    + '<a class="btn btn-sm" href="#/dashboard/export" data-nav="/dashboard/export" style="margin-left:auto">' + t('exportTab') + ' →</a></div>';
}
const productImgFiles = [];
function productImgListHtml(p) {
  const own = Array.isArray(p && p.images) ? p.images.filter(x => x && (x.dataUrl || typeof x === 'string')) : [];
  const cur = own.map((it, i) => ({ name: (typeof it === 'string' ? '' : it.name) || t('imgDefaultName') + (i + 1), dataUrl: (typeof it === 'string' ? it : it.dataUrl), base: true, i }));
  const pend = productImgFiles.map((it, i) => ({ name: it.name, dataUrl: it.dataUrl, base: false, i }));
  const all = cur.concat(pend);
  if (!all.length) return '';
  return '<div class="product-imgs">' + all.map((x, idx) =>
    '<span class="product-img-item"><img src="' + x.dataUrl + '" alt="' + esc(x.name) + '">'
    + '<button type="button" class="attach-x" data-action="product-img-remove" data-idx="' + idx + '" aria-label="' + t('imgRemove') + '">✕</button></span>'
  ).join('') + '</div>';
}
function refreshProductImgWrap() {
  const wrap = document.getElementById('productImgsWrap');
  if (!wrap) return;
  const { params } = parseHash();
  const p = params.get('id') ? productById(params.get('id')) : null;
  wrap.innerHTML = productImgListHtml(p);
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
    + exportPublishHint()
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
    + '<div class="field full"><label>' + t('prodImgLabel') + ' <span class="hint">' + t('prodImgHint') + '</span></label>'
    + '<input type="file" class="input" name="images" multiple accept="image/jpeg,image/png,image/webp" data-product-imgs>'
    + '<div id="productImgsWrap">' + productImgListHtml(p) + '</div></div>'
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
    if (productImgFiles.length) {
      p.images = (p.images || []).concat(productImgFiles.splice(0));
    }
  } else {
    const np = Object.assign({ id: 'u' + Date.now(), sellerId: state.user.sellerId, status: 'pending', featured: false, hot: false, addedAt: Date.now() }, data);
    if (productImgFiles.length) np.images = productImgFiles.splice(0);
    state.products.unshift(np);
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
  /* 询盘归属：本人提交的，或未登录时用同一邮箱提交的（注册/登录后仍能看到自己的询盘） */
  const myEmail = String(u.email || '').toLowerCase();
  const myInquiries = state.inquiries.filter(i =>
    i.buyerId === u.id || (!!myEmail && String(i.email || '').toLowerCase() === myEmail)
  ).sort((a, b) => b.createdAt - a.createdAt);
  const favProducts = state.products.filter(p => state.favorites.includes(p.id) && isLive(p));
  const tabs = [
    { tab: 'inquiries', icon: 'message', label: t('myInquiries'), count: myInquiries.filter(i => i.status === 'new').length || null },
    { tab: 'favorites', icon: 'heart', label: t('myFavorites'), count: favProducts.length || null },
    { tab: 'orders', icon: 'box', label: t('orders'), count: (state.orders || []).filter(o => o.buyerId === u.id && o.status === 'created').length || null },
    { tab: 'profile', icon: 'users', label: t('profileTab') },
    { tab: 'messages', icon: 'message', label: t('messagesTab'), count: totalUnread() || null }
  ];
  let body = '';
  if (activeTab === 'favorites') {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('myFavorites') + '</h2></div>'
      + (favProducts.length ? '<div class="product-grid">' + favProducts.map(productCard).join('') + '</div>' : '<div class="empty-state" style="padding:36px"><div class="ico">🤍</div><p>' + t('noFavoritesYet') + '</p></div>')
      + '</div>';
  } else if (activeTab === 'orders') {
    body = ordersBody();
  } else if (activeTab === 'profile') {
    body = renderProfileBody();
  } else if (activeTab === 'messages') {
    body = renderMessagesBody(parseHash().params.get('conv') || '');
  } else {
    body = '<div class="card panel"><div class="panel-head"><h2>' + t('myInquiries') + '</h2>'
      + '<button type="button" class="btn btn-sm" data-action="export-inquiries">' + icon('file') + ' ' + t('exportCsv') + '</button></div>'
      + (myInquiries.length ? myInquiries.map(buyerInquiryItem).join('') : '<div class="empty-state" style="padding:36px"><div class="ico"><img class="pixel-ico" src="assets/pixel/ui/mailbox.png" alt="" width="56" height="56" loading="lazy" decoding="async"></div><p>' + t('noInquiriesYet') + '</p></div>')
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
    + '<div class="ct">' + t('sentAt') + ' ' + fmtDate(i.createdAt) + ' · ' + i.qty + ' ' + i.unit + ' · ' + identityBadgeHtml(i) + ' <span class="status-pill ' + (status ? 'done' : 'new') + '">' + (i.status === 'quoted' ? t('quotedStatus') : status ? t('statusReplied') : t('statusNew')) + '</span></div></div>'
    + (p ? '<a class="btn btn-sm" href="#/product/' + p.id + '" data-nav="/product/' + p.id + '">' + t('viewDetail') + ' →</a>' : '')
    + (i.quote ? '<button type="button" class="btn btn-sm btn-primary" data-action="order-create" data-id="' + i.id + '" style="margin-left:6px">📦 ' + t('orders') + '</button>' : '')
    + '</div>'
    + inquiryMsg(i)
    + attachmentChipsHtml(i.attachments, i.id)
    + '<div class="flex gap-10" style="flex-wrap:wrap;margin:4px 0 0">' + cardButtonHtml(i) + exportButtonsHtml(i) + '</div>'
    + (i.quote ? '<div class="reply-box">' + quoteBlock(i) + '</div>' : status && i.reply ? '<div class="reply-box"><div class="reply-msg"><b>' + t('sellerReply') + '：</b>' + esc(i.reply) + '</div></div>' : '')
    + '</div>';
}


/* ---------- 对话式询价（pet0.2）：分步引导，像聊天一样问需求 ---------- */
const ASK_PETS = [
  { id: 'cat', zh: '🐱 猫', en: 'Cat' },
  { id: 'dog-small', zh: '🐶 小型犬', en: 'Small dog' },
  { id: 'dog-large', zh: '🦮 大型犬', en: 'Large dog' },
  { id: 'hamster', zh: '🐹 仓鼠', en: 'Hamster' },
  { id: 'small-pet', zh: '🐰 小宠（兔 / 豚鼠）', en: 'Small pet' },
  { id: 'other', zh: '还没定 / 其他', en: 'Not sure / other' }
];
const ASK_QTY = [
  { id: 'sample', zh: '样品或 1–10 件', en: 'Sample or 1–10' },
  { id: 'small', zh: '11–100 件', en: '11–100' },
  { id: 'mid', zh: '101–500 件', en: '101–500' },
  { id: 'large', zh: '500 件以上', en: '500+' }
];
let askFlow = null;

function askTxt(o) { return state.lang === 'zh' ? o.zh : o.en; }
function askPetLabel(id) { const o = ASK_PETS.find(x => x.id === id); return o ? askTxt(o) : id; }
function askQtyLabel(id) { const o = ASK_QTY.find(x => x.id === id); return o ? askTxt(o) : id; }
function askSubLabel(id) { const s = (CATEGORIES[0].subs || []).find(x => x.id === id); return s ? langObj(s) : id; }

function openAskFlow(productId) {
  askFlow = { step: 1, pet: '', sub: '', qty: '', country: '', note: '', productId: productId || '', name: '', email: '' };
  if (state.user) { askFlow.name = state.user.name || ''; askFlow.email = state.user.email || ''; }
  renderAskStep();
}

function askOptsHtml(list, field) {
  const cur = askFlow[field];
  return list.map(o => '<button type="button" class="ask-opt' + (cur === o.id ? ' on' : '')
    + '" data-action="ask-pick" data-field="' + field + '" data-value="' + o.id + '">' + esc(askTxt(o)) + '</button>').join('');
}

function renderAskStep() {
  const f = askFlow;
  if (!f) return;
  const bar = '<div class="ask-bar">' + [1, 2, 3].map(n => '<i class="' + (n <= f.step ? 'on' : '') + '"></i>').join('') + '</div>';
  let inner = '';
  if (f.step === 1) {
    inner = '<p class="ask-q">' + t('askQ1') + '</p><div class="ask-opts">' + askOptsHtml(ASK_PETS, 'pet') + '</div>';
  } else if (f.step === 2) {
    const subs = (CATEGORIES[0].subs || []).map(s => ({ id: s.id, zh: langObj(s, 'zh'), en: langObj(s, 'en') }));
    inner = '<p class="ask-q">' + t('askQ2') + '</p><div class="ask-opts">' + askOptsHtml(subs, 'sub') + '</div>';
  } else {
    inner = '<p class="ask-q">' + t('askQ3') + '</p><div class="ask-opts">' + askOptsHtml(ASK_QTY, 'qty') + '</div>'
      + '<div class="field"><label>' + t('askCountry') + '</label><input class="input" id="askCountry" value="' + esc(f.country) + '" placeholder="' + esc(t('askCountryPh')) + '"></div>'
      + '<div class="field"><label>' + t('askNote') + '</label><textarea class="textarea" id="askNote" rows="2" placeholder="' + esc(t('askNotePh')) + '">' + esc(f.note) + '</textarea></div>'
      + '<div class="field"><label>' + t('regName') + ' *</label><input class="input" id="askName" value="' + esc(f.name) + '"></div>'
      + '<div class="field"><label>' + t('regEmail') + ' *</label><input class="input" type="email" id="askEmail" value="' + esc(f.email) + '"></div>'
      + '<div class="ask-summary">' + esc(t('askSummary')) + '：' + esc(askPetLabel(f.pet)) + ' · ' + esc(askSubLabel(f.sub)) + '</div>';
  }
  const nav = '<div class="ask-nav">'
    + (f.step > 1 ? '<button type="button" class="btn btn-ghost" data-action="ask-back">' + t('askBack') + '</button>' : '')
    + (f.step < 3
      ? '<button type="button" class="btn btn-accent" data-action="ask-next">' + t('askNext') + '</button>'
      : '<button type="button" class="btn btn-accent" data-action="ask-submit">' + t('askSubmit') + '</button>')
    + '</div>';
  showModal('<div class="modal-head"><h3>' + t('askTitle') + '</h3>'
    + '<button type="button" class="modal-x" data-action="close-modal" aria-label="' + t('close') + '">✕</button></div>'
    + '<div class="modal-body ask-body">' + bar + inner + nav + '</div>');
}

function askPick(field, value) {
  if (!askFlow) return;
  askFlow[field] = value;
  if (field !== 'qty') askFlow.step = Math.min(3, askFlow.step + 1);
  renderAskStep();
}

function askNext() {
  const f = askFlow;
  if (!f) return;
  if (f.step === 1 && !f.pet) { toast(t('askNeedPick')); return; }
  if (f.step === 2 && !f.sub) { toast(t('askNeedPick')); return; }
  f.step = Math.min(3, f.step + 1);
  renderAskStep();
}

async function askSubmit() {
  const f = askFlow;
  if (!f) return;
  const c = $('#askCountry'), n = $('#askNote'), nm = $('#askName'), em = $('#askEmail');
  f.country = c ? c.value.trim() : '';
  f.note = n ? n.value.trim() : '';
  f.name = nm ? nm.value.trim() : '';
  f.email = em ? em.value.trim() : '';
  if (!f.qty) { toast(t('askNeedPick')); return; }
  if (!f.name || !/^[^s@]+@[^s@]+.[^s@]+$/.test(f.email)) { toast(t('askNeedContact')); return; }
  const body = '【' + t('askSummary') + '】' + t('askPet') + '：' + askPetLabel(f.pet)
    + ' · ' + t('category') + '：' + askSubLabel(f.sub)
    + ' · ' + t('quantity') + '：' + askQtyLabel(f.qty)
    + (f.country ? ' · ' + t('askCountry') + '：' + f.country : '')
    + (f.note ? '\n' + t('askNote') + '：' + f.note : '');
  const pid = f.productId || ((liveProducts()[0] || {}).id);
  try {
    await api.inquiries.create({ productId: pid, qty: Number((f.qty === 'sample' ? 5 : f.qty === 'small' ? 50 : f.qty === 'mid' ? 200 : 800)), unit: 'pcs', message: body, name: f.name, email: f.email, attachments: [], buyerType: state.user ? (state.user.accountType || 'company') : 'individual' });
    closeModal();
    toast(t('askDone'));
    if (typeof reloadState === 'function') reloadState();
  } catch (e) {
    toast(t('askFailed') + (e && e.message ? '：' + e.message : ''));
  }
}

/* ---------- 宠物适配信息（pet0.2）：展示已有的 pets / petSize / material 字段 ---------- */
const PET_ICON_FILE = { cat: 'cat', 'dog-small': 'dog-small', 'dog-large': 'dog-large', hamster: 'hamster', 'small-pet': 'hamster' };
function petFitIcons(p) {
  return (p.pets || []).slice(0, 3).map(code => {
    const file = PET_ICON_FILE[code] || 'hamster';
    return '<span class="fit-chip"><img src="assets/pixel/sub/' + file + '.png" alt="" width="16" height="16" loading="lazy" decoding="async">' + esc(langObj(petLabel(code))) + '</span>';
  }).join('');
}
/* 卡片：一行紧凑标签 */
function petFitRow(p) {
  const icons = petFitIcons(p);
  const size = p.petSize ? '<span class="fit-chip fit-size">' + esc(langObj(petSizeLabel(p.petSize))) + '</span>' : '';
  if (!icons && !size) return '';
  return '<div class="fit-row oneline" title="' + esc(t('fitTitle')) + '">' + icons + size + '</div>';
}
/* 详情页：完整适配信息块 */
function petFitBlock(p) {
  const pets = (p.pets || []).map(code => esc(langObj(petLabel(code)))).join(' / ');
  const rows = [
    pets ? [t('petsLabel'), pets] : null,
    p.petSize ? [t('petSizeLabel'), esc(langObj(petSizeLabel(p.petSize)))] : null,
    p.material ? [t('materialLabel'), esc(p.material)] : null
  ].filter(Boolean);
  if (!rows.length) return '';
  return '<div class="card detail-block fit-block"><h2>' + icon('shield') + ' ' + t('fitTitle') + '</h2>'
    + '<div class="fit-block-icons">' + petFitIcons(p) + '</div>'
    + '<ul class="fit-list">' + rows.map(r => '<li><span class="k">' + r[0] + '</span><span class="v">' + r[1] + '</span></li>').join('') + '</ul>'
    + '<p class="small muted">' + t('fitNote') + '</p></div>';
}

/* ---------- 手机端固定底栏（pet0.2）：价格 + 询问，拇指可达 ---------- */
function stickyAskBar(pid) {
  const p = productById(pid);
  if (!p) return '';
  return '<div class="sticky-ask">'
    + '<div class="sa-price">' + t('priceRange') + ' <b>$' + fmtPrice(p.priceMin) + '–' + fmtPrice(p.priceMax) + '</b> / ' + esc(p.unit || 'pcs') + '</div>'
    + '<button type="button" class="btn btn-accent" data-action="open-inquiry" data-id="' + esc(p.id) + '">' + t('sendInquiry') + '</button>'
    + '</div>';
}

/* ---------- 邮箱验证页（pet0.2）---------- */
function renderVerifyEmail() {
  return '<div class="container page"><section class="section">'
    + '<div class="card panel verify-card">'
    + '<div class="verify-ico" aria-hidden="true">' + icon('shield') + '</div>'
    + '<h1>' + t('verifyTitle') + '</h1>'
    + '<p id="verifyMsg" class="muted">' + t('verifyChecking') + '</p>'
    + '<div id="verifyActions" class="verify-actions" hidden></div>'
    + '</div></section></div>';
}

function verifyResendHtml() {
  return '<div class="field"><label>' + t('regEmail') + '</label>'
    + '<input class="input" id="resendEmail" type="email" placeholder="you@example.com"></div>'
    + '<button type="button" class="btn btn-accent" data-action="resend-verify">' + t('resendVerify') + '</button>';
}

async function bindVerifyEmail(params) {
  const msg = $('#verifyMsg');
  const act = $('#verifyActions');
  if (!msg || !act) return;
  const token = (params && params.get('token')) || '';
  if (!token) {
    msg.textContent = t('verifyNoToken');
    act.innerHTML = verifyResendHtml();
    act.hidden = false;
    return;
  }
  try {
    await api.auth.verifyEmail(token);
    msg.textContent = t('verifyOk');
    act.innerHTML = '<a class="btn btn-accent" href="#/login" data-nav="/login">' + t('gotoLogin') + '</a>';
    act.hidden = false;
  } catch (e) {
    msg.textContent = t('verifyFail') + (e && e.message ? '（' + e.message + '）' : '');
    act.innerHTML = verifyResendHtml();
    act.hidden = false;
  }
}
