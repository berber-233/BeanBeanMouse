const { chromium } = require('playwright-core');
const path = require('path');
const { pathToFileURL } = require('url');
const errors = [];
let page;

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const base = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept('涉嫌侵犯品牌知识产权'));
  const results = [];
  const check = (name, cond) => results.push([name, !!cond]);
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const waitForTranslated = async (loc, ms) => {
    const deadline = Date.now() + ms;
    while (Date.now() < deadline) {
      const txt = await loc.textContent().catch(() => '');
      if (txt && txt.indexOf('翻译中') === -1 && txt.trim().length > 1) return txt;
      await page.waitForTimeout(500);
    }
    return (await loc.textContent().catch(() => '')) || '';
  };

  await page.goto(base);
  await page.waitForTimeout(400);

  check('i18n: first visit defaults to English', await page.evaluate(() => document.documentElement.lang) === 'en');
  check('i18n: first-visit language hint shown', await page.locator('#langHint').isVisible());
  await page.click('[data-action="dismiss-lang-hint"]');
  await page.waitForTimeout(200);
  check('i18n: language hint dismisses', (await page.locator('#langHint').count()) === 0);
  check('home: hero visible', await page.locator('.hero h1').isVisible());
  check('brand: renamed to BeanBeanMouse', (await page.evaluate(() => document.title)).includes('BeanBeanMouse'));
  check('anti-fake: footer verify links', await page.locator('[data-action="fake-check"]').count() + await page.locator('[data-action="site-verify"]').count() === 2);
  check('help: widget button visible', await page.locator('.help-btn').count() === 1);
  await page.click('[data-action="toggle-help"]');
  await page.waitForTimeout(150);
  check('help: panel opens with 9 items', await page.locator('#helpPanel:visible .help-item').count() === 9);
  await page.click('[data-action="close-help"]');
  await page.waitForTimeout(100);
  check('help: panel closes', await page.locator('#helpPanel:visible').count() === 0);
  check('home: deals ticker placeholder', await page.locator('.hero-deals').count() === 1);
  check('home: 6 categories', await page.locator('.cat-card').count() === 6);
  check('home: product cards >= 4', await page.locator('.product-card').count() >= 4);
  check('home: simplified (no steps section)', await page.locator('.steps').count() === 0);
  check('home: simplified (no trust section)', await page.locator('.trust-grid').count() === 0);
  check('header: language switch has 3 buttons (中文/EN/其他)', await page.locator('#langSwitch .lang-btn').count() === 3);
  check('a11y: language buttons have aria-pressed', await page.locator('#langSwitch .lang-btn[aria-pressed]').count() === 3);
  check('a11y: help button has aria-expanded', (await page.locator('.help-btn').getAttribute('aria-expanded')) === 'false');
  check('home: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(300);
  const allCount = await page.locator('.product-card').count();
  check('products: grid > 0', allCount > 0);
  check('products: filter panel visible', await page.locator('#filterPanel').isVisible());
  check('products: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/products?cat=machinery'; });
  await page.waitForTimeout(300);
  const machCount = await page.locator('.product-card').count();
  check('products: category filter narrows list', machCount > 0 && machCount < allCount);

  await page.evaluate(() => { location.hash = '#/products?kw=charger'; });
  await page.waitForTimeout(300);
  check('products: keyword search works', await page.locator('.product-card').count() > 0);

  // ---- 贸易资讯 ----
  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(300);
  check('news: page renders >= 10 items', await page.locator('.news-card').count() >= 10);
  check('news: policy brief 3 cards', await page.locator('.brief-card').count() === 3);
  check('news: source directory 10', await page.locator('.source-card').count() === 10);
  check('news: every item has source link', await page.locator('.news-card a[href^="http"]').count() >= 10);
  check('news: fx strip visible', await page.locator('.fx-strip').isVisible());
  check('news: disclaimer visible', await page.locator('.news-disclaimer').isVisible());
  check('news: sync bar visible', await page.locator('.news-sync').isVisible());
  check('news: integration note visible', await page.locator('.news-integration').isVisible());
  await page.click('[data-action="refresh-news"]');
  await page.waitForTimeout(300);
  check('news: refresh works', await page.locator('.news-sync').isVisible());
  check('news: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/guide'; });
  await page.waitForTimeout(300);
  check('guide: title visible', await page.locator('.guide-head h1').isVisible());
  check('guide: flow steps 12', await page.locator('.guide-flow li').count() === 12);
  check('guide: incoterms table 11 rows', await page.locator('.guide-table tbody tr').count() === 11);
  check('guide: payment terms 5', await page.locator('.guide-payment').count() === 5);
  check('guide: risk list >= 8', await page.locator('.risk-list li').count() >= 8);
  check('guide: disclaimer visible', await page.locator('.guide-disclaimer').isVisible());
  check('guide: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/customs'; });
  await page.waitForTimeout(300);
  check('customs: country cards >= 10', await page.locator('.customs-card').count() >= 10);
  check('customs: document checklist shown', await page.locator('.customs-main .guide-list li').count() >= 3);
  check('customs: official sources shown', await page.locator('.customs-main .source-card').count() >= 2);
  await page.click('.customs-card[href="#/customs?country=JP"]');
  await page.waitForTimeout(300);
  check('customs: country switch works', /Japan|日本/.test(await page.locator('.customs-side h3').textContent()));

  await page.evaluate(() => { location.hash = '#/recruit'; });
  await page.waitForTimeout(300);
  check('recruit: 3 steps', await page.locator('.guide-flow li').count() === 3);
  check('recruit: 3 benefits', await page.locator('.benefit-card').count() === 3);
  check('recruit: CTA present', await page.locator('.recruit-cta [data-nav="/login"]').count() === 1);
  check('footer: customs & recruit links', await page.locator('[data-nav="/customs"]').count() >= 1 && await page.locator('[data-nav="/recruit"]').count() >= 1);

  await page.evaluate(() => { location.hash = '#/news?cat=tariff'; });
  await page.waitForTimeout(300);
  const tariffCount = await page.locator('.news-card').count();
  check('news: category filter works', tariffCount > 0 && tariffCount < 10);

  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(300);
  await page.locator('#newsRegionGroup input[value="GLOBAL"]').uncheck();
  await page.waitForTimeout(300);
  check('news: region filter works', await page.locator('.news-card').count() === 6);
  await page.locator('#newsRegionGroup input[value="GLOBAL"]').check();
  await page.waitForTimeout(300);

  await page.evaluate(() => { location.hash = '#/product/p3'; });
  await page.waitForTimeout(300);
  check('detail: title visible', await page.locator('.detail-main h1').isVisible());
  check('detail: inquiry button', await page.locator('[data-action="open-inquiry"]').count() === 1);
  check('detail: gallery thumbs 3', await page.locator('.gallery-thumbs img').count() === 3);
  check('detail: HS code shown', (await page.locator('.spec-list').textContent()).includes('8504.40'));
  check('detail: subcategory with HS ref shown', (await page.locator('.spec-list').textContent()).includes('HS '));
  check('detail: fx strip', await page.locator('.detail-main .fx-strip').count() === 1);
  check('detail: incoterms legend', await page.locator('details.term-legend').count() === 1);
  check('detail: compliance tip', await page.locator('.tip-box').count() === 1);
  check('detail: compliance checklist', await page.locator('.compliance-market').count() >= 1);
  check('anti-fake: product authenticity card', await page.locator('.fake-card').count() === 1);
  check('anti-fake: code format BBM-', /^BBM-[A-Z0-9]+-\d{2}$/.test((await page.locator('.fake-code-row .fake-code').textContent() || '').trim()));
  await page.click('.fake-card [data-action="verify-product"]');
  await page.waitForTimeout(300);
  check('anti-fake: verification result modal', await page.locator('.fake-result .fake-genuine').isVisible());
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(200);

  await page.click('[data-action="fake-check"]');
  await page.waitForTimeout(300);
  check('anti-fake: verification query modal', await page.locator('#fakeCodeInput').isVisible());
  check('anti-fake: sample codes listed', (await page.locator('.fake-chip').count()) >= 4);
  await page.fill('#fakeCodeInput', 'BBM-NOTEXIST-00');
  await page.click('[data-action="fake-verify"]');
  await page.waitForTimeout(300);
  check('anti-fake: wrong code rejected', await page.locator('.fake-ico--bad').isVisible());
  await page.click('[data-action="close-modal"]');
  await page.click('[data-action="fake-check"]');
  await page.waitForTimeout(300);
  const sampleCode = (await page.locator('.fake-chip').first().textContent()).trim();
  await page.fill('#fakeCodeInput', sampleCode);
  await page.click('[data-action="fake-verify"]');
  await page.waitForTimeout(300);
  check('anti-fake: valid code verified', await page.locator('.fake-result .fake-genuine').isVisible());
  await page.click('[data-action="close-modal"]');
  await page.click('[data-action="site-verify"]');
  await page.waitForTimeout(300);
  check('anti-fake: official site verification', await page.locator('.fake-result').isVisible());
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(200);

  await page.click('#langSwitch [data-lang="zh"]');
  await page.waitForTimeout(200);
  await page.click('[data-action="open-inquiry"]');
  await page.waitForTimeout(300);
  check('inquiry: modal opens', await page.locator('form[data-form="inquiry-form"]').isVisible());
  check('inquiry: real translation preview', await page.locator('.trans-preview').count() >= 1);
  check('inquiry: translation disclaimer shown', await page.locator('.trans-preview .trans-note').isVisible());
  await page.fill('form[data-form="inquiry-form"] textarea[name="message"]', '您好，我对产品很感兴趣，请报价。');
  const transText = await waitForTranslated(page.locator('form[data-form="inquiry-form"] [data-trans-target="msg"]'), 20000);
  check('inquiry: live translation updates (remote or offline fallback)', /please quote|quote/i.test(transText || '') && (transText || '').indexOf('翻译中') === -1);
  await page.fill('form[data-form="inquiry-form"] input[name="name"]', 'Anna Chen');
  await page.fill('form[data-form="inquiry-form"] input[name="email"]', 'anna@sample.com');
  await page.fill('form[data-form="inquiry-form"] textarea[name="message"]', 'Hello, please quote your best price for 1,000 pcs with custom logo. FOB price please.');
  await page.click('form[data-form="inquiry-form"] button[type="submit"]');
  await page.waitForTimeout(300);
  check('inquiry: success modal', await page.locator('.modal-success').isVisible());

  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(200);
  await page.click('#langSwitch [data-lang="en"]');
  await page.waitForTimeout(200);
  const detailTitleEn = await page.locator('.detail-main h1').textContent();
  check('i18n: toggle to English', /GaN Fast Charger/.test(detailTitleEn || ''));
  check('i18n: html lang updated', await page.evaluate(() => document.documentElement.lang) === 'en');
  await page.click('[data-action="lang-more"]');
  await page.waitForTimeout(300);
  check('i18n: "其他" opens language picker', await page.locator('.lang-grid').isVisible());
  check('i18n: 20+ languages offered', (await page.locator('.lang-opt').count()) >= 20);
  check('i18n: browser-language option shown', await page.locator('.lang-auto').isVisible());
  await page.click('.lang-opt[data-lang="es"]');
  await page.waitForTimeout(300);
  check('i18n: switch to Spanish', (await page.evaluate(() => document.documentElement.lang)) === 'es');
  check('i18n: Spanish nav label applied', (await page.locator('.main-nav a').first().textContent()) === 'Inicio');
  check('i18n: bilingual original/translation block', await page.locator('.detail-main h1').isVisible() && (await page.locator('.src-text').count()) === 1);
  check('i18n: product title marked for viewer translation', (await page.locator('.detail-main h1').getAttribute('data-l10n')) !== null);
  await page.click('#langSwitch [data-lang="zh"]');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', sellerId: 's1' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  check('seller: overview 4 stat cards', await page.locator('.stat-card').count() === 4);

  await page.evaluate(() => { location.hash = '#/dashboard/publish'; });
  await page.waitForTimeout(300);
  check('seller: target market checkboxes', await page.locator('input[name="markets"]').count() === 6);
  check('seller: product source language field', await page.locator('select[name="srcLang"]').count() === 1);
  check('seller: subcategory select with HS options', await page.locator('select[name="sub"] optgroup').count() === 6);
  await page.click('form[data-form="product-form"] button[type="submit"]');
  await page.waitForTimeout(300);
  check('validation: empty publish shows inline errors', await page.locator('.field-error').count() >= 4);
  await page.fill('input[name="titleEn"]', 'Solar LED Street Light 60W');
  await page.fill('input[name="titleZh"]', '太阳能 LED 路灯 60W');
  await page.fill('input[name="priceMin"]', '45');
  await page.fill('input[name="priceMax"]', '68');
  await page.fill('input[name="moq"]', '50');
  await page.fill('input[name="leadTime"]', '25');
  await page.fill('textarea[name="descEn"]', 'All-in-one solar street light with 60W LED, motion sensor, IP65. CE certified, 3-year warranty.');
  await page.fill('textarea[name="descZh"]', '一体化太阳能路灯，60W LED，人体感应，IP65 防护，CE 认证，质保 3 年。');
  await page.click('form[data-form="product-form"] button[type="submit"]');
  await page.waitForTimeout(300);
  check('seller: publish saved (pending review)', await page.locator('.status-pill.pend').count() >= 1);

  await page.evaluate(() => { location.hash = '#/products?kw=solar'; });
  await page.waitForTimeout(300);
  check('marketplace: pending product not live yet', await page.locator('.product-card').count() === 0);

  await page.evaluate(() => { location.hash = '#/dashboard/inquiries'; });
  await page.waitForTimeout(300);
  check('seller: quote form has doc reference', await page.locator('.doc-ref').count() >= 1);
  check('seller: quote form has translation preview', await page.locator('form[data-form="quote-form"] .trans-preview').count() >= 1);
  const quoteForms = await page.locator('form[data-form="quote-form"]').count();
  check('seller: pending inquiries show quote form', quoteForms >= 1);
  const qf = page.locator('form[data-form="quote-form"]').first();
  await qf.locator('input[name="price"]').fill('13500');
  await qf.locator('input[name="validity"]').fill('15');
  await qf.locator('input[name="leadTime"]').fill('20');
  await qf.locator('textarea[name="note"]').fill('Including export packing and full FOB documents.');
  await qf.locator('button[type="submit"]').click();
  await page.waitForTimeout(300);
  check('seller: structured quote saved', await page.locator('.quote-grid').count() >= 1);
  check('seller: status shows quoted', await page.locator('.status-pill.done').count() >= 1);
  check('seller: quote print buttons', await page.locator('[data-action="print-doc"]').count() >= 2);

  await page.locator('[data-action="print-doc"][data-type="quotation"]').first().click();
  await page.waitForTimeout(300);
  check('print: quotation document opens', await page.locator('.doc-table').count() >= 1);
  check('print: print sheet prepared', await page.evaluate(() => document.getElementById('printDoc').innerHTML.length > 200));
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-buyer', role: 'buyer', name: 'Thomas Müller', email: 'buyer@demo.com', buyerCompany: 'Müller GmbH', buyerCountry: 'DE' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  check('buyer: inquiry list >= 3', await page.locator('.inquiry-item').count() >= 3);
  check('buyer: sees supplier reply', await page.locator('.reply-msg').count() >= 1);
  check('buyer: sees structured quote', await page.locator('.quote-grid').count() >= 1);
  check('buyer: can print quote', await page.locator('[data-action="print-doc"]').count() >= 2);
  await page.locator('.trans-toggle').first().click();
  check('buyer: message translation toggle', await page.locator('.trans-msg').count() >= 1);
  const transMsgText = await waitForTranslated(page.locator('.trans-msg p').first(), 20000);
  check('buyer: translation filled (not pending)', (transMsgText || '').length > 1 && (transMsgText || '').indexOf('翻译中') === -1);

  // ---- 交易达成：下单 → 确认签收 → 小费打赏（可选） ----
  const createBtn = page.locator('[data-action="order-create"]').first();
  check('buyer: quoted inquiry has create-order button', await createBtn.count() === 1);
  await createBtn.click();
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/dashboard/orders'; });
  await page.waitForTimeout(400);
  check('buyer: order appears in orders tab', await page.locator('.card.panel').filter({ has: page.locator('[data-action="order-confirm"]') }).count() >= 1);
  await page.click('[data-action="order-confirm"]');
  await page.waitForTimeout(500);
  check('buyer: receipt confirm does NOT force tip modal', await page.locator('#tipAmountInput').count() === 0);
  check('buyer: optional tip callout shown', await page.locator('.tip-callout').count() >= 1);
  check('buyer: evidence panel auto-sealed', await page.locator('.evidence-box').count() >= 1);
  check('buyer: evidence chain valid badge', await page.locator('.ev-badge.ok').count() >= 1);
  await page.click('.tip-callout [data-action="tip-open"]');
  await page.waitForTimeout(300);
  check('buyer: tip opens as separate window', await page.locator('#tipAmountInput').count() === 1);
  check('buyer: tip modal has skip button', await page.locator('[data-action="tip-skip"]').count() === 1);
  check('buyer: tip modal shows empty bowl before tip', await page.locator('#modalRoot img[src="assets/tip-mascot-empty.png"]').count() === 1);
  await page.click('.tip-chips [data-amount="25"]');
  check('buyer: quick amount chip fills input', (await page.inputValue('#tipAmountInput')) === '25');
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  check('a11y: focus stays inside modal (trap)', await page.evaluate(() => document.querySelector('#modalRoot').contains(document.activeElement)));
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  check('a11y: ESC closes modal', await page.locator('#tipAmountInput').count() === 0);
  await page.click('.tip-callout [data-action="tip-open"]');
  await page.waitForTimeout(200);
  await page.fill('#tipAmountInput', '25');
  await page.click('[data-action="tip-send"]');
  await page.waitForTimeout(400);
  check('buyer: tip saved on order (both sides visible)', await page.locator('[data-action="tip-cancel"]').count() >= 1);
  check('buyer: tip callout hidden after tipping', await page.locator('.tip-callout').count() === 0);
  check('buyer: coins image appears after tip', await page.locator('.tip-list-head img[src="assets/tip-mascot-256.png"]').count() >= 1);
  check('buyer: shipment timeline visible on completed order', await page.locator('.shipment-box').count() >= 1);
  check('buyer: tracking animation bar present', await page.locator('.track-bar').count() >= 1);
  check('buyer: order thumbnail shown', await page.locator('.order-thumb').count() >= 1);
  await page.locator('.evidence-box [data-action="evidence-print"]').first().click();
  await page.waitForTimeout(300);
  check('evidence: print report opens', await page.locator('.doc-modal .doc-table').count() === 1);
  check('evidence: report shows verdict', await page.locator('.ev-report-verdict.ok').count() >= 1);
  check('evidence: report seal & QR present', await page.locator('.doc-modal .ev-seal').count() === 1 && await page.locator('.doc-modal .ev-qr svg').count() === 1);
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: 'Wang', email: 'seller@demo.com', sellerId: 's1' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard/orders'; });
  await page.waitForTimeout(400);
  const shipCreateBtn = page.locator('[data-action="shipment-create"]').first();
  check('seller: create-shipment button on new order', await shipCreateBtn.count() === 1);
  await shipCreateBtn.click();
  await page.waitForTimeout(300);
  check('seller: shipment form modal opens', await page.locator('form[data-form="shipment-create-form"]').isVisible());
  await page.fill('form[data-form="shipment-create-form"] input[name="carrier"]', 'COSCO');
  await page.fill('form[data-form="shipment-create-form"] input[name="trackingNo"]', 'COSU9988776');
  await page.fill('form[data-form="shipment-create-form"] input[name="origin"]', 'Ningbo, CN');
  await page.fill('form[data-form="shipment-create-form"] input[name="destination"]', 'Rotterdam, NL');
  await page.click('form[data-form="shipment-create-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('seller: shipment created & timeline shown', await page.locator('.shipment-box').count() >= 1);
  await page.locator('[data-action="shipment-event"]').first().click();
  await page.waitForTimeout(300);
  await page.selectOption('form[data-form="shipment-event-form"] select[name="status"]', 'shipped');
  await page.fill('form[data-form="shipment-event-form"] input[name="location"]', 'Ningbo Port');
  await page.fill('form[data-form="shipment-event-form"] input[name="note"]', 'Loaded on vessel');
  await page.click('form[data-form="shipment-event-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('seller: tracking event updated', (await page.locator('.ship-loc b').first().textContent()).includes('Ningbo Port'));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-buyer', role: 'buyer', name: 'Thomas', email: 'buyer@demo.com', buyerCompany: 'Muller GmbH', buyerCountry: 'DE' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard/orders'; });
  await page.waitForTimeout(400);
  check('buyer: sees seller shipment updates', await page.locator('.shipment-box').count() >= 2);

  // ---- 平台管理员后台 ----
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-admin', role: 'admin', name: '平台管理员', email: 'admin@demo.com' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  check('admin: overview stat cards', await page.locator('.stat-card').count() === 4);
  check('admin: chart bars rendered', await page.locator('.bar-row').count() >= 2);
  check('admin: latest activity table', await page.locator('.panel table tbody tr').count() >= 1);

  await page.evaluate(() => { location.hash = '#/dashboard/review'; });
  await page.waitForTimeout(300);
  check('admin: pending review list >= 2', await page.locator('.review-card').count() >= 2);
  check('admin: risk hints flagged', await page.locator('.risk-chip').count() >= 1);

  await page.locator('.review-card', { hasText: '太阳能' }).locator('[data-action="approve-product"]').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/products?kw=solar'; });
  await page.waitForTimeout(300);
  check('admin: approved product goes live', await page.locator('.product-card').count() === 1);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: 'Wang', email: 'seller@demo.com', sellerId: 's1' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard/promo'; });
  await page.waitForTimeout(300);
  const promoBtn = page.locator('[data-action="promo-open"]').first();
  check('seller: promo tab lists live products', await promoBtn.count() >= 1);
  await promoBtn.click();
  await page.waitForTimeout(300);
  check('seller: promo modal opens', await page.locator('form[data-form="promo-form"]').isVisible());
  await page.fill('form[data-form="promo-form"] input[name="days"]', '14');
  await page.click('form[data-form="promo-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('seller: promo request pending', await page.locator('.promo-req .status-pill.pend').count() >= 1);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-admin', role: 'admin', name: 'Admin', email: 'admin@demo.com' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard/promo'; });
  await page.waitForTimeout(300);
  check('admin: promo review list', await page.locator('[data-action="promo-review"]').count() >= 1);
  await page.locator('[data-action="promo-review"][data-action2="approve"]').first().click();
  await page.waitForTimeout(400);
  check('admin: promo approved', await page.locator('.promo-req .status-pill.done').count() >= 1);
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(400);
  check('home: promoted badge appears', await page.locator('.badge.promo').count() >= 1);

  await page.evaluate(() => { location.hash = '#/dashboard/review'; });
  await page.waitForTimeout(300);
  await page.locator('.review-card', { hasText: '仿牌' }).locator('[data-action="reject-product"]').click();
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/dashboard/review?status=rejected'; });
  await page.waitForTimeout(300);
  check('admin: rejected product shows reason', await page.locator('.reject-reason').count() === 1);

  await page.evaluate(() => { location.hash = '#/dashboard/verify'; });
  await page.waitForTimeout(300);
  check('admin: pending companies >= 1', await page.locator('.status-pill.pend').count() >= 1);
  await page.locator('[data-action="verify-company"]').first().click();
  await page.waitForTimeout(300);
  check('admin: company verified', await page.locator('.status-pill.pend').count() === 0);

  await page.evaluate(() => { location.hash = '#/dashboard/users'; });
  await page.waitForTimeout(300);
  check('admin: user list >= 8', await page.locator('.table tbody tr').count() >= 8);
  await page.locator('.table tbody tr', { hasText: 'tanaka@tokyo-trading.jp' }).locator('button').click();
  await page.waitForTimeout(300);
  check('admin: freeze user works', await page.locator('.status-pill.rej').count() >= 1);
  await page.locator('.table tbody tr', { hasText: 'tanaka@tokyo-trading.jp' }).locator('button').click();
  await page.waitForTimeout(300);

  await page.locator('.table tbody tr', { hasText: 'buyer@demo.com' }).locator('button').click();
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = null;
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/login'; });
  await page.waitForTimeout(300);
  await page.click('[data-role="buyer"]');
  await page.waitForTimeout(300);
  check('admin: frozen user login blocked', await page.locator('.login-wrap').isVisible());

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-admin', role: 'admin', name: '平台管理员', email: 'admin@demo.com' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard/users'; });
  await page.waitForTimeout(300);
  await page.locator('.table tbody tr', { hasText: 'buyer@demo.com' }).locator('button').click();
  await page.waitForTimeout(300);

  await page.evaluate(() => { location.hash = '#/dashboard/logs'; });
  await page.waitForTimeout(300);
  check('admin: audit log entries >= 5', await page.locator('.table tbody tr').count() >= 5);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(300);
  check('mobile: no horizontal overflow at 390px', await noOverflow());
  await page.evaluate(() => { location.hash = '#/dashboard/review'; });
  await page.waitForTimeout(300);
  check('mobile: admin review no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(300);
  check('mobile: news no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/guide'; });
  await page.waitForTimeout(300);
  check('mobile: guide no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/dashboard/orders'; });
  await page.waitForTimeout(300);
  check('mobile: orders no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(300);
  check('mobile: home no horizontal overflow', await noOverflow());
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(300);
  check('mobile: no overflow at 320px', await noOverflow());

  console.log(results.map(([n, ok]) => (ok ? 'PASS' : 'FAIL') + ' | ' + n).join('\n'));
  const failed = results.filter(([, ok]) => !ok).length;
  console.log('PAGE ERRORS: ' + JSON.stringify(errors));
  console.log(failed === 0 ? 'ALL CHECKS PASSED' : failed + ' CHECKS FAILED');
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch(async e => {
  console.error('FATAL: ' + e.message);
  try {
    console.error('APP HTML: ' + (await page.evaluate(() => document.querySelector('#app').innerHTML)).slice(0, 800));
  } catch (_) { /* ignore */ }
  console.error('PAGE ERRORS: ' + JSON.stringify(errors));
  process.exit(1);
});
