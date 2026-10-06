const { chromium } = require('playwright-core');
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const errors = [];
let page;
/* 注意：不要用 count() 预检——那会关掉 Playwright 的自动等待，页面还没渲染完就被判成失败。
 * 这里保留自动等待，只把等待上限压到 6 秒，超时才记为失败。 */
const safeClick = async (sel) => { try { await page.locator(sel).first().click({ timeout: 6000 }); return true; } catch (e) { return false; } };
const safeFill = async (sel, val) => { try { await page.locator(sel).first().fill(val, { timeout: 6000 }); return true; } catch (e) { return false; } };

const safeCloseModal = async () => { if (await page.locator('[data-action="close-modal"]').count()) await page.click('[data-action="close-modal"]').catch(() => {}); };


function resolveBrowser() {
  const candidates = [
    process.env.PLAYWRIGHT_EXECUTABLE,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser'
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  try { return require('playwright-core').chromium.executablePath(); } catch (e) { return undefined; }
}

(async () => {
  const browser = await chromium.launch({
    executablePath: resolveBrowser(),
    headless: true
  });
  page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.setDefaultTimeout(5000);   // 缺元素快速失败（容错包装会记为 FAIL），避免整轮被 30s 默认超时拖死
  /* 容错包装：单个元素缺失时记为失败而不是中断整轮回归（脚本改版后要能看到全部问题） */
  const RAW = page;
  const isLocator = v => v && typeof v === 'object' && typeof v.count === 'function' && typeof v.click === 'function';
  const wrapLocator = (loc) => new Proxy(loc, {
    get(t, k) {
      const v = t[k];
      if (typeof v !== 'function') return v;
      if (k === 'click' || k === 'fill' || k === 'setInputFiles' || k === 'check' || k === 'selectOption') {
        return async (...args) => { try { return await v.apply(t, args); } catch (e) { return false; } };
      }
      if (k === 'textContent' || k === 'innerText' || k === 'inputValue') {
        return async (...args) => { try { return await v.apply(t, args); } catch (e) { return ''; } };
      }
      if (k === 'getAttribute') {
        return async (...args) => { try { return await v.apply(t, args); } catch (e) { return null; } };
      }
      if (k === 'isVisible' || k === 'isEnabled' || k === 'isChecked') {
        return async (...args) => { try { return await v.apply(t, args); } catch (e) { return false; } };
      }
      return (...args) => { const r = v.apply(t, args); return isLocator(r) ? wrapLocator(r) : r; };
    }
  });
  page = new Proxy(RAW, {
    get(t, k) {
      if (k === 'locator') return (...args) => wrapLocator(t.locator(...args));
      const v = t[k];
      if (typeof v !== 'function') return v;
      if (k === 'click' || k === 'fill' || k === 'setInputFiles' || k === 'inputValue' || k === 'selectOption' || k === 'waitForSelector' || k === 'press' || k === 'hover') {
        return async (...args) => { try { return await v.apply(t, args); } catch (e) { return false; } };
      }
      return v.bind(t);
    }
  });
  const base = pathToFileURL(path.resolve(__dirname, '..', 'index.html')).href;
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('dialog', d => d.accept('涉嫌侵犯品牌知识产权'));
  const results = [];
  /* 边跑边写日志：Node 重定向到文件时会缓冲，写文件才能实时看到进度与卡点 */
  const logPath = path.join(__dirname, '..', 'work', 'verify-live.txt');
  try { fs.writeFileSync(logPath, ''); } catch (e) { /* 忽略 */ }
  const check = (name, cond) => {
    results.push([name, !!cond]);
    const line = (cond ? 'PASS | ' : 'FAIL | ') + name + '\n';
    process.stdout.write(line);
    try { fs.appendFileSync(logPath, line); } catch (e) { /* 忽略 */ }
  };
  const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
  const waitForTranslated = async (loc, ms) => {
    const deadline = Date.now() + Math.min(ms, 6000);
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
  check('trial: beta banner visible on first visit', await page.locator('#trialBanner:visible').count() === 1);
  check('trial: partner mailto link present', (await page.locator('#trialBannerMail').getAttribute('href')).includes('mailto:'));
  await safeClick('[data-action="dismiss-lang-hint"]');
  await page.waitForTimeout(200);
  check('i18n: language hint dismisses', (await page.locator('#langHint').count()) === 0);
  await safeClick('[data-action="dismiss-trial"]');
  await page.waitForTimeout(150);
  check('trial: banner dismisses', (await page.locator('#trialBanner:visible').count()) === 0);
  check('home: storefront hero visible', await page.locator('.storefront .store-title').isVisible());
  check('brand: renamed to BeanBeanMouse', (await page.evaluate(() => document.title)).includes('BeanBeanMouse'));
  check('anti-fake: footer verify links', await page.locator('[data-action="fake-check"]').count() + await page.locator('[data-action="site-verify"]').count() === 2);
  check('help: widget button visible', await page.locator('.help-btn').count() === 1);
  await safeClick('[data-action="toggle-help"]');
  await page.waitForTimeout(150);
  check('help: panel opens with 17 items', await page.locator('#helpPanel:visible .help-item').count() === 17);
  await safeClick('[data-action="close-help"]');
  await page.waitForTimeout(100);
  check('help: panel closes', await page.locator('#helpPanel:visible').count() === 0);
  check('home: storefront section rendered', await page.locator('.storefront').count() === 1);
  /* 2026-10-01 新增"犬通用"分类 → 9 个 */
  check('pet0.2: 9 pet sub-categories', await page.locator('.sub-card').count() === 9);
  check('pet0.2: sub-category icons use pixel assets', await page.locator('.sub-card img[src^="assets/pixel/sub/"]').count() === 9);
  check('pet0.2: sub-category icon loads', await page.locator('.sub-card img').first().evaluate(img => img.complete && img.naturalWidth > 0));
  check('pet0.2: hero asks warm/pet framing', (await page.locator('.store-eyebrow').textContent()).length > 4);
  check('pet0.2: trust chips present', await page.locator('.trust-chip').count() === 4);
  /* 首页不再铺视频卡（太占版面、和"客户实拍视频墙"重复）：只保留一个入口，
   * 视频内容集中在 /videos 页。 */
  check('pet0.2: 首页不再铺视频卡', await page.locator('.video-card').count() === 0);
  check('pet0.2: 首页保留视频墙入口', await page.locator('.section-links [data-nav="/videos"]').count() === 1);
  check('pet0.2: 首页精选只 4 个', await page.locator('.product-grid .product-card').count() === 4);
  check('pet0.2: 首页搜索框单层结构', await page.locator('.store-copy .hero-search').count() === 1);
  check('pet0.2: service promises on home', await page.locator('.promise-card').count() === 4);
  check('home: product cards >= 4', await page.locator('.product-card').count() >= 4);
  check('home: simplified (no steps section)', await page.locator('.steps').count() === 0);
  check('home: simplified (no trust section)', await page.locator('.trust-grid').count() === 0);
  check('header: language switch has 3 buttons (中文/EN/其他)', await page.locator('#langSwitch .lang-btn').count() === 3);
  check('a11y: language buttons have aria-pressed', await page.locator('#langSwitch .lang-btn[aria-pressed]').count() === 3);
  check('a11y: help button has aria-expanded', (await page.locator('.help-btn').getAttribute('aria-expanded')) === 'false');
  check('home: brand icon image loads', await page.locator('.brand-mark-img').evaluate(img => img.complete && img.naturalWidth > 0));
  check('help: panel banner + mascot image bound', await page.locator('.help-banner[src="assets/help-banner.jpg"]').count() === 1
    && await page.locator('.help-btn img[src="assets/mascot-icon.png"]').count() === 1);
  check('home: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(300);
  const allCount = await page.locator('.product-card').count();
  check('products: grid > 0', allCount > 0);
  check('products: filter panel visible', await page.locator('#filterPanel').isVisible());
  check('products: search bar present', await page.locator('.products-search').count() === 1);
  /* 品类筛选已简化为细分（原来的"全部用品/宠物用品"与站点单品类重复，已删除） */
  check('products: category filter covers all', await page.locator('#filterPanel input[name="sub"]').count() >= 2);
  check('products: AI demo image used on cards', await page.locator('.product-card img[src^="assets/products/"]').count() > 0);
  const firstCardImg = page.locator('.product-card img[src^="assets/products/"]').first();
  await firstCardImg.scrollIntoViewIfNeeded();
  await page.waitForTimeout(500);
  check('products: AI demo image actually loads', await firstCardImg.evaluate(img => img.complete && img.naturalWidth > 0));
  check('products: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/products?cat=pet&sub=pet-cat'; });
  await page.waitForTimeout(300);
  const catCount = await page.locator('.product-card').count();
  check('products: category filter narrows list', catCount > 0 && catCount < allCount);

  await page.evaluate(() => { location.hash = '#/products?kw=litter'; });
  await page.waitForTimeout(300);
  check('products: keyword search works', await page.locator('.product-card').count() > 0);
  await page.evaluate(() => { location.hash = '#/products?kw=fiber%20cutter'; });
  await page.waitForTimeout(300);
  check('products: no-result shows empty state or related recommendations',
    (await page.locator('.empty-state').count()) >= 1 || (await page.locator('.related-section .product-card').count()) > 0);
  check('pixel-ui: empty state uses pixel icon', await page.locator('.empty-state .ico img[src*="pixel/ui/"]').count() >= 1);

  // ---- 贸易资讯 ----
  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(300);
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: page renders >= 10 items', await page.locator('.news-card */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: policy brief 3 cards', await page.locator('.brief-card'). */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: source directory 10', await page.locator('.source-card'). */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: every item has source link', await page.locator('.news-ca */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: fx strip visible', await page.locator('.fx-strip').isVisi */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: disclaimer visible', await page.locator('.news-disclaimer */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: sync bar visible', await page.locator('.news-sync').isVis */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: integration note visible', await page.locator('.news-inte */
  await safeClick('[data-action="refresh-news"]');
  await page.waitForTimeout(300);
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: refresh works', await page.locator('.news-sync').isVisibl */
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: no horizontal overflow', await noOverflow()); */

  await page.evaluate(() => { location.hash = '#/guide'; });
  await page.waitForTimeout(300);
  check('guide: title visible', await page.locator('.guide-head h1').isVisible());
  check('guide: flow steps 12', await page.locator('.guide-flow li').count() === 12);
  check('guide: incoterms table 11 rows', await page.locator('.guide-table tbody tr').count() === 11);
  check('guide: payment terms 5', await page.locator('.guide-payment').count() === 5);
  check('guide: risk list >= 8', await page.locator('.risk-list li').count() >= 8);
  check('guide: disclaimer visible', await page.locator('.guide-disclaimer').isVisible());
  check('guide: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/export'; });
  await page.waitForTimeout(300);
  check('export: page renders', await page.locator('.guide-head h1').isVisible());
  check('export: checklist items >= 7', await page.locator('.exp-item').count() >= 7);
  check('export: item details shown', (await page.locator('.exp-item-grid span').count()) >= 14);
  check('export: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/logistics'; });
  await page.waitForTimeout(300);
  check('logistics: mode table 4 rows', await page.locator('.guide-table tbody tr').count() === 4);
  check('logistics: container cards 4', await page.locator('.container-card').count() === 4);
  check('logistics: port charges selectable', await page.locator('.customs-card').count() >= 6 && await page.locator('.port-charge-card').count() === 1);
  check('logistics: estimator form', await page.locator('form[data-form="logistics-estimate-form"]').isVisible());
  await safeFill('form[data-form="logistics-estimate-form"] input[name="weight"]', '800');
  await safeClick('form[data-form="logistics-estimate-form"] button[type="submit"]');
  await page.waitForTimeout(500);
  check('logistics: estimate result', await page.locator('.estimate-result').isVisible());
  check('logistics: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/compliance'; });
  await page.waitForTimeout(300);
  check('compliance: rules cards >= 4', await page.locator('.compliance-card').count() >= 4);
  check('compliance: screen form', await page.locator('form[data-form="compliance-screen-form"]').isVisible());
  await safeFill('form[data-form="compliance-screen-form"] textarea[name="text"]', 'Military-grade drone with night vision camera');
  await safeClick('form[data-form="compliance-screen-form"] button[type="submit"]');
  await page.waitForTimeout(500);
  check('compliance: screening flags keywords', await page.locator('.screen-verdict.bad').isVisible());
  check('compliance: no horizontal overflow', await noOverflow());

  await page.evaluate(() => { location.hash = '#/customs'; });
  await page.waitForTimeout(300);
  check('customs: country cards >= 10', await page.locator('.customs-card').count() >= 10);
  check('customs: document checklist shown', await page.locator('.customs-main .guide-list li').count() >= 3);
  check('customs: official sources shown', await page.locator('.customs-main .source-card').count() >= 2);
  await safeClick('.customs-card[href="/customs?country=JP"]');
  await page.waitForTimeout(300);
  check('customs: country switch works', /Japan|日本/.test(await page.locator('.customs-side h3').textContent()));

  await page.evaluate(() => { location.hash = '#/recruit'; });
  await page.waitForTimeout(300);
  check('recruit: 3 steps', await page.locator('.guide-flow li').count() === 3);
  check('recruit: 3 benefits', await page.locator('.benefit-card').count() === 3);
  check('recruit: CTA present', await page.locator('.recruit-cta [data-nav="/login"]').count() === 1);
  /* 2026-10-01：平台转为自营+面向买家，页脚去掉"招商入驻"入口（页面本身保留） */
  check('footer: customs link', await page.locator('[data-nav="/customs"]').count() >= 1);
  check('footer: insurance & contracts & partnership links', await page.locator('[data-nav="/insurance"]').count() + await page.locator('[data-nav="/contracts"]').count() + await page.locator('footer a[href^="mailto:"]').count() === 3);
  check('footer: version v1.000 shown', /v1\.000/.test(await page.locator('.version-line').textContent()));
  check('footer: new trade tool links', await page.locator('[data-nav="/export"]').count() >= 1 && await page.locator('[data-nav="/logistics"]').count() >= 1 && await page.locator('[data-nav="/compliance"]').count() >= 1 && await page.locator('[data-nav="/disputes"]').count() >= 1);
  check('footer: feedback link', await page.locator('[data-nav="/feedback"]').count() >= 1);

  /* 2026-10-01 起：建议箱要求登录后才显示表单（未登录显示引导） */
  await page.evaluate(() => { location.hash = '#/feedback'; });
  await page.waitForTimeout(300);
  check('feedback: 未登录时给出登录引导', (await page.locator('.notice-box').count()) === 1);
  await page.evaluate(() => { location.hash = '#/login'; });
  await page.waitForTimeout(300);
  await safeFill('form[data-form="login-form"] input[name="email"]', 'buyer@demo.com');
  await safeFill('form[data-form="login-form"] input[name="password"]', 'buyer123');
  await safeClick('form[data-form="login-form"] button[type="submit"]');
  await page.waitForTimeout(700);
  await page.evaluate(() => { location.hash = '#/feedback'; });
  await page.waitForTimeout(300);
  check('feedback: page renders form', await page.locator('form[data-form="feedback-form"]').isVisible());
  await page.selectOption('form[data-form="feedback-form"] select[name="type"]', 'ux');
  await safeFill('form[data-form="feedback-form"] textarea[name="content"]', 'Please add dark mode and a better mobile nav.');
  await safeFill('form[data-form="feedback-form"] input[name="contact"]', 'tester@beanbeanmouse.com');
  await safeClick('form[data-form="feedback-form"] button[type="submit"]');
  await page.waitForTimeout(500);
  check('feedback: submit shows thanks', await page.locator('#feedbackResult .screen-verdict.ok').isVisible());

  await page.evaluate(() => { location.hash = '#/news?cat=tariff'; });
  await page.waitForTimeout(300);
  const tariffCount = await page.locator('.news-card').count();
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: category filter works', tariffCount > 0 && tariffCount <  */

  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(300);
  /* 贸易资讯模块已封存（用户 2026-09-17）：该元素不再存在，容错跳过，避免整轮中断 */
  await page.locator('#newsRegionGroup input[value="GLOBAL"]').uncheck({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);
  /* 贸易资讯模块已封存（用户 2026-09-17）：check('news: region filter works', await page.locator('.news-card').co */
  await page.locator('#newsRegionGroup input[value="GLOBAL"]').check({ timeout: 3000 }).catch(() => {});
  await page.waitForTimeout(300);

  await page.evaluate(() => { location.hash = '#/product/p33'; });
  await page.waitForTimeout(300);
  check('detail: title visible', await page.locator('.detail-main h1').isVisible());
  check('detail: inquiry button', await page.locator('.detail-main [data-action="open-inquiry"]').count() === 1);
  check('detail: gallery thumbs >= 1', await page.locator('.gallery-thumbs img').count() >= 1);
  check('detail: HS code shown', (await page.locator('.spec-list').textContent()).includes('9403'));
  check('detail: subcategory with HS ref shown', (await page.locator('.spec-list').textContent()).includes('HS '));
  check('detail: fx strip', await page.locator('.detail-main .fx-strip').count() === 1);
  check('detail: incoterms legend', await page.locator('details.term-legend').count() === 1);
  check('detail: compliance tip', await page.locator('.tip-box').count() === 1);
  check('detail: compliance checklist', await page.locator('.compliance-market').count() >= 1);
  check('anti-fake: product authenticity card', await page.locator('.fake-card').count() === 1);
  check('anti-fake: code format BBM-', /^BBM-[A-Z0-9]+-\d{2}$/.test((await page.locator('.fake-code-row .fake-code').textContent() || '').trim()));
  await safeClick('.fake-card [data-action="verify-product"]');
  await page.waitForTimeout(300);
  check('anti-fake: verification result modal', await page.locator('.fake-result .fake-genuine').isVisible());
  if (await page.locator('[data-action="close-modal"]').count()) await safeCloseModal();
  await page.waitForTimeout(200);

  await safeClick('[data-action="fake-check"]');
  await page.waitForTimeout(300);
  check('anti-fake: verification query modal', await page.locator('#fakeCodeInput').isVisible());
  check('anti-fake: sample codes listed', (await page.locator('.fake-chip').count()) >= 4);
  await safeFill('#fakeCodeInput', 'BBM-NOTEXIST-00');
  await safeClick('[data-action="fake-verify"]');
  await page.waitForTimeout(300);
  check('anti-fake: wrong code rejected', await page.locator('.fake-ico--bad').isVisible());
  await safeCloseModal();
  await safeClick('[data-action="fake-check"]');
  await page.waitForTimeout(300);
  const sampleCode = (await page.locator('.fake-chip').first().textContent()).trim();
  await safeFill('#fakeCodeInput', sampleCode);
  await safeClick('[data-action="fake-verify"]');
  await page.waitForTimeout(300);
  check('anti-fake: valid code verified', await page.locator('.fake-result .fake-genuine').isVisible());
  await safeCloseModal();
  await safeClick('[data-action="site-verify"]');
  await page.waitForTimeout(300);
  check('anti-fake: official site verification', await page.locator('.fake-result').isVisible());
  await safeCloseModal();
  await page.waitForTimeout(200);

  await safeClick('#langSwitch [data-lang="zh"]');
  await page.waitForTimeout(200);
  /* 以买家身份登录后再询盘：这样询盘归属买家（buyerId=u-buyer），卖家报价后买家能看到。
     否则记为 guest，卖家报价会报在访客询盘上，买家侧看不到。 */
  await page.evaluate(() => {
    state.user = {
      id: 'u-buyer', role: 'buyer', name: 'Thomas Müller', email: 'buyer@demo.com',
      buyerCompany: 'Müller GmbH', buyerCountry: 'DE', accountType: 'company'
    };
    saveState();
  });
  await page.waitForTimeout(200);
  await safeClick('[data-action="open-inquiry"]');
  await page.waitForTimeout(300);
  check('inquiry: modal opens', await page.locator('form[data-form="inquiry-form"]').isVisible());
  check('inquiry: real translation preview', await page.locator('.trans-preview').count() >= 1);
  check('inquiry: translation disclaimer shown', await page.locator('.trans-preview .trans-note').isVisible());
  await page.setInputFiles('form[data-form="inquiry-form"] input[name="attachments"]', {
    name: 'sample.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
  });
  await page.waitForTimeout(300);
  check('inquiry: attachment preview added', await page.locator('form[data-form="inquiry-form"] .attach-preview .attach-chip').count() === 1);
  await safeFill('form[data-form="inquiry-form"] textarea[name="message"]', '您好，我对产品很感兴趣，请报价。');
  const transText = await waitForTranslated(page.locator('form[data-form="inquiry-form"] [data-trans-target="msg"]'), 20000);
  check('inquiry: live translation updates (remote or offline fallback)', /please quote|quote/i.test(transText || '') && (transText || '').indexOf('翻译中') === -1);
  await safeFill('form[data-form="inquiry-form"] input[name="name"]', 'Anna Chen');
  await safeFill('form[data-form="inquiry-form"] input[name="email"]', 'anna@sample.com');
  await safeFill('form[data-form="inquiry-form"] textarea[name="message"]', 'Hello, please quote your best price for 1,000 pcs with custom logo. FOB price please.');
  await safeClick('form[data-form="inquiry-form"] button[type="submit"]');
  await page.waitForTimeout(300);
  check('inquiry: success modal', await page.locator('.modal-success').isVisible());

  await safeCloseModal();
  await page.waitForTimeout(200);
  await safeClick('#langSwitch [data-lang="en"]');
  await page.waitForTimeout(200);
  const detailTitleEn = await page.locator('.detail-main h1').textContent();
  check('i18n: toggle to English', /Hamster Cage/i.test(detailTitleEn || ''));
  check('i18n: html lang updated', await page.evaluate(() => document.documentElement.lang) === 'en');
  await safeClick('[data-action="lang-more"]');
  await page.waitForTimeout(300);
  check('i18n: "其他" opens language picker', await page.locator('.lang-grid').isVisible());
  check('i18n: 20+ languages offered', (await page.locator('.lang-opt').count()) >= 20);
  check('i18n: browser-language option shown', await page.locator('.lang-auto').isVisible());
  await safeClick('.lang-opt[data-lang="es"]');
  await page.waitForTimeout(300);
  check('i18n: switch to Spanish', (await page.evaluate(() => document.documentElement.lang)) === 'es');
  /* 导航已去掉冗余的"首页"项（Logo 即回首页），改为按词典取值比对第一个导航项 */
  check('i18n: Spanish nav label applied', await page.evaluate(() => {
    const el = document.querySelector('.main-nav a');
    return !!el && el.textContent.trim() === ((I18N.es && I18N.es.marketplace) || I18N.en.marketplace);
  }));
  check('i18n: bilingual original/translation block', await page.locator('.detail-main h1').isVisible() && (await page.locator('.src-text').count()) === 1);
  check('i18n: product title marked for viewer translation', (await page.locator('.detail-main h1').getAttribute('data-l10n')) !== null);
  await safeClick('#langSwitch [data-lang="zh"]');
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', sellerId: 'bbm' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  check('seller: overview 4 stat cards', await page.locator('.stat-card').count() === 4);
  await page.evaluate(() => { location.hash = '#/dashboard/export'; });
  await page.waitForTimeout(300);
  check('seller: export tab checklist', await page.locator('.exp-item').count() >= 7);
  check('seller: readiness score shown', await page.locator('.exp-level').count() === 1);
  await page.locator('[data-action="export-toggle"]').first().click();
  await page.waitForTimeout(400);
  check('seller: export item toggles done', await page.locator('.exp-item.done').count() >= 1);
  await page.evaluate(() => { location.hash = '#/login'; });
  await page.waitForTimeout(200);
  await safeClick('[data-action="show-register"]');
  await page.waitForTimeout(200);
  check('register: account type options shown', await page.locator('input[name="accountType"]').count() === 2 && await page.locator('#companyFields').isVisible());
  await safeCloseModal();
  await page.waitForTimeout(200);

  await page.evaluate(() => { location.hash = '#/dashboard/publish'; });
  await page.waitForTimeout(300);
  check('seller: target market checkboxes', await page.locator('input[name="markets"]').count() === 6);
  check('seller: product source language field', await page.locator('select[name="srcLang"]').count() === 1);
  check('seller: subcategory select with pet options', await page.locator('select[name="sub"] optgroup').count() >= 1 && await page.locator('select[name="sub"] option').count() >= 8);
  await safeClick('form[data-form="product-form"] button[type="submit"]');
  await page.waitForTimeout(300);
  check('validation: empty publish shows inline errors', await page.locator('.field-error').count() >= 4);
  await safeFill('input[name="titleEn"]', 'Solar LED Street Light 60W');
  await safeFill('input[name="titleZh"]', '太阳能 LED 路灯 60W');
  await safeFill('input[name="priceMin"]', '45');
  await safeFill('input[name="priceMax"]', '68');
  await safeFill('input[name="moq"]', '50');
  await safeFill('input[name="leadTime"]', '25');
  await safeFill('textarea[name="descEn"]', 'All-in-one solar street light with 60W LED, motion sensor, IP65. CE certified, 3-year warranty.');
  await safeFill('textarea[name="descZh"]', '一体化太阳能路灯，60W LED，人体感应，IP65 防护，CE 认证，质保 3 年。');
  await safeClick('form[data-form="product-form"] button[type="submit"]');
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
  await safeCloseModal();
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

  // ---- 个人信息、名片、附件与对话导出 ----
  await page.evaluate(() => { location.hash = '#/dashboard/profile'; });
  await page.waitForTimeout(300);
  check('buyer: profile form renders', await page.locator('form[data-form="profile-form"]').isVisible());
  check('buyer: completeness level shown', await page.locator('.exp-level').count() >= 1);
  await page.selectOption('form[data-form="profile-form"] select[name="accountType"]', 'company');
  await safeFill('form[data-form="profile-form"] input[name="jobTitle"]', 'Purchasing Manager');
  await safeFill('form[data-form="profile-form"] textarea[name="bio"]', 'Kitchenware & home imports');
  await safeClick('form[data-form="profile-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  await page.setInputFiles('input[name="card"]', {
    name: 'card.png', mimeType: 'image/png',
    buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64')
  });
  await page.waitForTimeout(500);
  check('buyer: business card uploaded', await page.locator('.card-preview-box img').count() === 1);
  check('buyer: card template options shown', await page.locator('[data-action="card-template"]').count() === 5);
  const cardBefore = await page.locator('.card-preview-box img').getAttribute('src');
  await page.locator('[data-action="card-template"]').first().click();
  await page.waitForTimeout(600);
  const cardAfter = await page.locator('.card-preview-box img').getAttribute('src');
  check('buyer: template generates new card', !!cardAfter && cardAfter !== cardBefore && cardAfter.length > 1000);

  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  const dlPromise = page.waitForEvent('download');
  await page.locator('[data-action="export-conv"][data-format="txt"]').first().click();
  const dl = await dlPromise;
  check('buyer: conversation exported as txt', (dl.suggestedFilename() || '').indexOf('.txt') > 0);

  // ---- 站内消息 ----
  await page.evaluate(() => { location.hash = '#/dashboard/messages'; });
  await page.waitForTimeout(400);
  check('buyer: messages tab shows conversations', await page.locator('.conv-row').count() >= 1);
  await safeFill('.chat-input input[name="text"]', 'Any update on delivery schedule?');
  await safeClick('.chat-input button[type="submit"]');
  await page.waitForTimeout(2200);
  check('buyer: chat sends message + auto reply', await page.locator('.chat-msg').count() >= 2);

  await page.evaluate(() => { location.hash = '#/product/p34'; });
  await page.waitForTimeout(300);
  await safeClick('[data-action="open-inquiry"]');
  await page.waitForTimeout(300);
  check('buyer: identity section in inquiry modal', await page.locator('.identity-box').count() === 1);
  check('buyer: send-card option shown', await page.locator('input[name="sendCard"]').count() === 1);
  await page.setInputFiles('form[data-form="inquiry-form"] input[name="attachments"]', {
    name: 'specs.zip', mimeType: 'application/zip',
    buffer: Buffer.from([0x50, 0x4B, 0x03, 0x04, 0, 0, 0, 0, 0, 0])
  });
  await page.waitForTimeout(300);
  await safeFill('form[data-form="inquiry-form"] textarea[name="message"]', 'Hello, we are interested in TPE yoga mats. Please quote FOB for 1,000 pcs.');
  await safeClick('form[data-form="inquiry-form"] button[type="submit"]');
  await page.waitForTimeout(300);
  await safeCloseModal();
  await page.waitForTimeout(200);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  check('buyer: attachments visible on own inquiry', await page.locator('.attach-list').count() >= 1);

  // ---- 交易达成：下单 → 确认签收 → 小费打赏（可选） ----
  const createBtn = page.locator('[data-action="order-create"]').first();
  check('buyer: quoted inquiry has create-order button', await createBtn.count() === 1);
  await createBtn.click();
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/dashboard/orders'; });
  await page.waitForTimeout(400);
  check('buyer: order appears in orders tab', await page.locator('.card.panel').filter({ has: page.locator('[data-action="order-confirm"]') }).count() >= 1);
  await safeClick('[data-action="order-confirm"]');
  await page.waitForTimeout(500);
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: receipt confirm does NOT force tip modal', awa */
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: optional tip callout shown', await page.locato */
  check('buyer: evidence panel auto-sealed', await page.locator('.evidence-box').count() >= 1);
  check('buyer: evidence chain valid badge', await page.locator('.ev-badge.ok').count() >= 1);
  /* 打赏流程已停用（用户 2026-09-17）：await safeClick('.tip-callout [data-action="tip-open"]'); */
  await page.waitForTimeout(300);
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: tip opens as separate window', await page.loca */
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: tip modal has skip button', await page.locator */
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: tip modal shows empty bowl before tip', await  */
  /* 打赏流程已停用（用户 2026-09-17）：await safeClick('.tip-chips [data-amount="25"]'); */
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: quick amount chip fills input', (await page.in */
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  /* 打赏流程已停用（用户 2026-09-17）：该项测的是打赏弹窗的焦点陷阱，弹窗不再打开故一并停用；
     通用弹窗焦点陷阱由后面的注册/报价弹窗覆盖。 */
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  /* 打赏流程已停用（用户 2026-09-17）：check('a11y: ESC closes modal', await page.locator('#tipAmou */
  /* 打赏流程已停用（用户 2026-09-17）：await safeClick('.tip-callout [data-action="tip-open"]'); */
  await page.waitForTimeout(200);
  /* 打赏流程已停用（用户 2026-09-17）：await safeFill('#tipAmountInput', '25'); */
  /* 打赏流程已停用（用户 2026-09-17）：await safeClick('[data-action="tip-send"]'); */
  await page.waitForTimeout(400);
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: tip saved on order (both sides visible)', awai */
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: tip callout hidden after tipping', await page. */
  /* 打赏流程已停用（用户 2026-09-17）：check('buyer: coins image appears after tip', await page.loc */
  check('buyer: shipment timeline visible on completed order', await page.locator('.shipment-box').count() >= 1);
  check('buyer: escort scene & phase bar present', await page.locator('.transport-scene').count() >= 1 && await page.locator('.phase-bar .phase').count() === 3);
  check('buyer: sea shipment scene shown', await page.locator('.transport-scene[src*="transport-sea.webm"]').count() >= 1);
  check('buyer: transport video is muted + looping + playsinline with poster', await page.locator('video.transport-scene').first().evaluate(v =>
    v.hasAttribute('muted') && v.hasAttribute('loop') && v.hasAttribute('playsinline') && /transport-(land|sea|air)-poster\.png$/.test(v.getAttribute('poster') || '')));
  const sceneVideo = page.locator('video.transport-scene').first();
  await sceneVideo.scrollIntoViewIfNeeded();
  check('buyer: transport video starts playing when visible', await sceneVideo.evaluate(async v => {
    for (let i = 0; i < 20 && (v.paused || v.readyState < 2); i++) await new Promise(r => setTimeout(r, 250));
    return !v.paused && v.readyState >= 2 && v.videoWidth > 0;
  }));
  check('buyer: escort avatar uses mode character icon', await page.locator('.escort-head img[src*="characters/sea-icon.jpg"]').count() >= 1);
  check('buyer: tracking parcel uses inline pixel icon (no emoji)', await page.locator('.escort-pkg svg').count() >= 1);
  check('buyer: order thumbnail shown', await page.locator('.order-thumb').count() >= 1);
  check('buyer: insurance box on completed order', await page.locator('.insurance-box').count() >= 1);
  await page.locator('.insurance-box [data-action="insurance-buy"]').first().click();
  await page.waitForTimeout(500);
  check('buyer: insurance purchased (active badge)', await page.locator('.insurance-box.on .status-pill.done').count() >= 1);
  await page.evaluate(() => { location.hash = '#/contracts'; });
  await page.waitForTimeout(350);
  check('contracts: page renders order select', await page.locator('#contractOrderSelect').count() === 1);
  await safeClick('[data-action="contract-gen"]');
  await page.waitForTimeout(250);
  check('contracts: draft preview with warnings', await page.locator('.contract-pre').count() === 1 && await page.locator('.warn-box li').count() >= 5);
  await page.locator('[data-action="contract-custody"]').first().click();
  await page.waitForTimeout(500);
  check('contracts: custody requested & record shown', await page.locator('.custody-row').count() >= 1);
  await page.evaluate(() => { location.hash = '#/dashboard/orders'; });
  await page.waitForTimeout(300);
  await page.locator('.evidence-box [data-action="evidence-print"]').first().click();
  await page.waitForTimeout(300);
  check('evidence: print report opens', await page.locator('.doc-modal .doc-table').count() === 1);
  check('evidence: report shows verdict', await page.locator('.ev-report-verdict.ok').count() >= 1);
  check('evidence: report seal & QR present', await page.locator('.doc-modal .ev-seal').count() === 1 && await page.locator('.doc-modal .ev-qr svg').count() === 1);
  await safeCloseModal();
  await page.waitForTimeout(200);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: 'Wang', email: 'seller@demo.com', sellerId: 'bbm' };
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
  await safeFill('form[data-form="shipment-create-form"] input[name="carrier"]', 'COSCO');
  await safeFill('form[data-form="shipment-create-form"] input[name="trackingNo"]', 'COSU9988776');
  await page.selectOption('form[data-form="shipment-create-form"] select[name="mode"]', 'sea');
  await safeFill('form[data-form="shipment-create-form"] input[name="origin"]', 'Ningbo, CN');
  await safeFill('form[data-form="shipment-create-form"] input[name="destination"]', 'Rotterdam, NL');
  await safeClick('form[data-form="shipment-create-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('seller: shipment created & timeline shown', await page.locator('.shipment-box').count() >= 1);
  await page.locator('[data-action="shipment-event"]').first().click();
  await page.waitForTimeout(300);
  await page.selectOption('form[data-form="shipment-event-form"] select[name="status"]', 'shipped');
  await safeFill('form[data-form="shipment-event-form"] input[name="location"]', 'Ningbo Port');
  await safeFill('form[data-form="shipment-event-form"] input[name="note"]', 'Loaded on vessel');
  await safeClick('form[data-form="shipment-event-form"] button[type="submit"]');
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
  const dlOrders = page.waitForEvent('download');
  await page.locator('[data-action="export-orders"]').first().click();
  const dlo = await dlOrders;
  check('buyer: orders exported as csv', (dlo.suggestedFilename() || '').indexOf('.csv') > 0);

  // ---- 单据中心与售后/纠纷 ----
  check('buyer: document center on orders', await page.locator('.doc-center-box').count() >= 1);
  await page.locator('.doc-center-box [data-action="doc-gen"]').first().click();
  await page.waitForTimeout(500);
  check('buyer: commercial invoice printable', await page.locator('.doc-modal .doc-table').count() >= 1);
  await safeCloseModal();
  await page.waitForTimeout(200);
  await page.locator('.doc-center-box [data-action="doc-check"]').first().click();
  await page.waitForTimeout(400);
  check('buyer: document consistency status shown', await page.locator('.doc-center-box .status-pill').count() >= 1);

  await page.locator('.as-order-panel [data-action="after-sales-open"]').first().click();
  await page.waitForTimeout(300);
  check('buyer: after-sales modal opens', await page.locator('form[data-form="after-sales-form"]').isVisible());
  await page.selectOption('form[data-form="after-sales-form"] select[name="type"]', 'quality');
  await safeFill('form[data-form="after-sales-form"] textarea[name="description"]', 'Two units have scratches and one hinge is broken.');
  await safeFill('form[data-form="after-sales-form"] input[name="resolution"]', 'Please reship replacement parts.');
  await safeClick('form[data-form="after-sales-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('buyer: after-sales case created on order', await page.locator('.as-card').count() >= 1);

  await page.locator('.as-order-panel [data-action="dispute-open"]').first().click();
  await page.waitForTimeout(300);
  await page.selectOption('form[data-form="after-sales-form"] select[name="type"]', 'other');
  await page.fill('form[data-form="after-sales-form"] textarea[name="description"]', 'Delivery delay caused storage cost; requesting compensation.');
  await safeClick('form[data-form="after-sales-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('buyer: dispute escalates to arbitration', await page.locator('.status-pill.pend').count() >= 1);

  await page.evaluate(() => { location.hash = '#/disputes'; });
  await page.waitForTimeout(300);
  check('disputes: page lists cases', await page.locator('.as-card').count() >= 2);
  check('disputes: arbitration pending badge', await page.locator('.status-pill.pend').count() >= 1);

  // ---- 卖家处理售后 ----
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: 'Wang', email: 'seller@demo.com', sellerId: 'bbm' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/disputes'; });
  await page.waitForTimeout(300);
  check('seller: disputes page lists cases', await page.locator('.as-card').count() >= 2);
  await page.locator('[data-action="as-respond"]').first().click();
  await page.waitForTimeout(300);
  check('seller: respond modal opens', await page.locator('form[data-form="aftersales-respond-form"]').isVisible());
  await safeFill('form[data-form="aftersales-respond-form"] input[name="reply"]', 'We will reship replacement parts within 7 days.');
  await safeClick('form[data-form="aftersales-respond-form"] button[value="accept"]');
  await page.waitForTimeout(400);
  check('seller: accepted case resolved', await page.locator('.status-pill.done').count() >= 1);

  // ---- 通知铃铛与已读回执 ----
  check('seller: notification bell shown', await page.locator('[data-action="notif-toggle"]').count() === 1);
  await safeClick('[data-action="notif-toggle"]');
  await page.waitForTimeout(200);
  check('seller: notification panel lists items', await page.locator('#notifPanel .notif-row').count() >= 1);
  await safeClick('[data-action="notif-read-all"]');
  await page.waitForTimeout(300);
  check('seller: mark all read clears badge', await page.locator('.notif-badge').count() === 0);
  await page.evaluate(() => { location.hash = '#/dashboard/messages'; });
  await page.waitForTimeout(400);
  check('seller: messages tab lists conversations', await page.locator('.conv-row').count() >= 1);

  // ---- 卖家查看买家身份与名片 ----
  await page.evaluate(() => { location.hash = '#/dashboard/inquiries'; });
  await page.waitForTimeout(300);
  check('seller: inquiry identity badge shown', await page.locator('.identity-chip').count() >= 1);
  check('seller: buyer attachments visible', await page.locator('.attach-list').count() >= 1);
  check('seller: business card viewable', await page.locator('[data-action="view-card"]').count() >= 1);
  const cardSrc = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    const inq = s.inquiries.find(x => x.card);
    return inq ? inq.card : '';
  });
  await page.locator('[data-action="view-card"]').first().click();
  await page.waitForTimeout(300);
  check('seller: business card modal opens', await page.locator('#cardViewImg').count() === 1);
  const wmSrc = await page.locator('#cardViewImg').getAttribute('src');
  check('seller: business card watermarked', !!wmSrc && wmSrc !== cardSrc && wmSrc.indexOf('data:image/') === 0);
  await safeClick('[data-action="card-flip"]');
  await page.waitForTimeout(350);
  const flipT = await page.locator('#card3dInner').getAttribute('style');
  check('seller: card flips to back view', (flipT || '').indexOf('180') >= 0);
  await safeCloseModal();
  await page.waitForTimeout(200);

  // ---- 买家回看消息：确认已读回执 ----
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-buyer', role: 'buyer', name: 'Thomas', email: 'buyer@demo.com', buyerCompany: 'Müller GmbH', accountType: 'company' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard/messages'; });
  await page.waitForTimeout(400);
  check('buyer: read receipt shown after seller read', await page.locator('.chat-read').count() >= 1);

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

  await page.evaluate(() => { location.hash = '#/dashboard/aftersales'; });
  await page.waitForTimeout(300);
  check('admin: arbitration tab lists cases', await page.locator('.as-card').count() >= 1);
  await page.locator('[data-action="as-arbitrate"]').first().click();
  await page.waitForTimeout(300);
  check('admin: arbitration modal opens', await page.locator('form[data-form="aftersales-arbitrate-form"]').isVisible());
  await page.selectOption('form[data-form="aftersales-arbitrate-form"] select[name="ruling"]', 'buyer');
  await safeFill('form[data-form="aftersales-arbitrate-form"] textarea[name="note"]', 'Compensation for demurrage per evidence chain.');
  await safeClick('form[data-form="aftersales-arbitrate-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  check('admin: ruling recorded on case', await page.locator('.arbitration-box').count() >= 1);

  await page.evaluate(() => { location.hash = '#/dashboard/feedback'; });
  await page.waitForTimeout(300);
  check('admin: feedback list shows suggestions', await page.locator('.as-card').count() >= 1);
  await page.locator('[data-action="feedback-status"][data-status="done"]').first().click();
  await page.waitForTimeout(400);
  /* 建议箱默认只看"待处理"，标记采纳后会从默认列表消失 → 切到"全部"再断言 */
  await page.evaluate(() => { location.hash = '#/dashboard/feedback?status=all'; });
  await page.waitForTimeout(400);
  check('admin: feedback marked adopted', await page.locator('.status-pill.done').count() >= 1);

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
    s.user = { id: 'u-seller', role: 'seller', name: 'Wang', email: 'seller@demo.com', sellerId: 'bbm' };
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
  await safeFill('form[data-form="promo-form"] input[name="days"]', '14');
  await safeClick('form[data-form="promo-form"] button[type="submit"]');
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
  await safeClick('[data-role="buyer"]');
  await page.waitForTimeout(300);
  check('admin: frozen user login blocked', await page.locator('.login-card').isVisible());

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
  await page.evaluate(() => { location.hash = '#/export'; });
  await page.waitForTimeout(300);
  check('mobile: export no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/logistics'; });
  await page.waitForTimeout(300);
  check('mobile: logistics no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/compliance'; });
  await page.waitForTimeout(300);
  check('mobile: compliance no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/disputes'; });
  await page.waitForTimeout(300);
  check('mobile: disputes no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/feedback'; });
  await page.waitForTimeout(300);
  check('mobile: feedback no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/dashboard/profile'; });
  await page.waitForTimeout(300);
  check('mobile: profile no overflow', await noOverflow());
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(300);
  check('mobile: home no horizontal overflow', await noOverflow());
  await page.setViewportSize({ width: 320, height: 700 });
  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(300);
  check('mobile: no overflow at 320px', await noOverflow());

  /* 回归：长语言（俄语）下商品橱窗卡片底栏不能把"向豆豆鼠询问"顶出卡片
   * （实测修复前 390px 宽时按钮右边缘超出卡片 55px） */
  await page.setViewportSize({ width: 390, height: 820 });
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1') || '{}');
    s.lang = 'ru';
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(600);
  const footBad = await page.evaluate(() => Array.from(document.querySelectorAll('.product-card .foot')).filter(f => {
    const r = f.getBoundingClientRect();
    return Array.from(f.children).some(k => {
      const q = k.getBoundingClientRect();
      return q.right > r.right + 1 || q.left < r.left - 1;
    });
  }).length);
  check('i18n: ru 商品卡底栏不溢出卡片', footBad === 0, 'bad=' + footBad);
  const pageOverflow389 = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check('i18n: ru 390px 无横向溢出', pageOverflow389 <= 0, 'overflow=' + pageOverflow389);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1') || '{}');
    s.lang = 'zh';
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.setViewportSize({ width: 1440, height: 1000 });

  /* 回归：静态 HTML 里不能残留 JS 拼接片段
   * （曾有 ' + icon('x') + ' 被直接写进 index.html，帮助面板/试运营条显示这串乱码） */
  const jsLeak = await page.evaluate(() => {
    const re = /'\s*\+\s*icon\(|\+\s*icon\('|'\s*\+\s*t\('|'\s*\+\s*esc\(/;
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let n, hit = [];
    while ((n = w.nextNode())) {
      const s = (n.nodeValue || '').trim();
      if (re.test(s)) hit.push(s.slice(0, 60));
    }
    return hit;
  });
  check('no JS concat leaked into rendered text', jsLeak.length === 0, jsLeak.join(' | '));

  /* 帮助面板的关闭按钮必须是图形（曾经显示成 ' + icon('x') + '） */
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(300);
  if (await page.locator('[data-action="toggle-help"]').count()) await page.locator('[data-action="toggle-help"]').first().click();
  await page.waitForTimeout(300);
  const helpCloseText = await page.evaluate(() => {
    const el = document.querySelector('.help-close');
    return el ? (el.textContent || '').trim() : '(no help close)';
  });
  check('help: close button is an icon, not leaked code', helpCloseText === '' || helpCloseText.length <= 1, 'text=' + helpCloseText);
  check('help: close button renders an svg', await page.locator('.help-close svg').count() === 1);
  if (await page.locator('[data-action="close-help"]').count()) await page.locator('[data-action="close-help"]').first().click().catch(() => {});

  /* 回归：页面上不能把 data:image/... 数据 URI 当文字显示
   * （曾经会话列表的 .conv-ico 直接输出 productImg() 的返回值，
   *   用户看到一长串 "data:image/svg+xml;charset=utf-8,%3Csvg…"） */
  await page.setViewportSize({ width: 1440, height: 1000 });
  for (const hash of ['#/', '#/products', '#/dashboard/messages', '#/dashboard/service', '#/dashboard/products']) {
    await page.evaluate(h => { location.hash = h; }, hash);
    await page.waitForTimeout(350);
    const raw = await page.evaluate(() => {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let n, hit = [];
      while ((n = w.nextNode())) {
        const s = (n.nodeValue || '').trim();
        if (s.indexOf('data:image/') === 0) hit.push(s.slice(0, 40));
      }
      return hit;
    });
    check('no raw data URI as text @ ' + hash, raw.length === 0, raw.join(' | '));
  }

  /* 回归：管理员商品管理按钮写"动作"、审核页计数与"已下架"页签 */
  const adminUi = await page.evaluate(() => {
    const saved = { products: state.products, lang: state.lang };
    state.lang = 'zh';
    const mk = (id, status) => ({ id, status, priceMin: 1, priceMax: 2, moq: 1, unit: 'pcs', addedAt: 1,
      en: { title: 'T' + id, desc: 'd' }, zh: { title: 'T' + id, desc: 'd' } });
    state.products = [mk('a', 'on'), mk('b', 'off'), mk('c', 'pending'), mk('d', 'rejected'), mk('e', 'on')];
    const tableHtml = adminProductsBody();
    const tabsHtml = adminReviewBody();
    state.products = saved.products; state.lang = saved.lang;
    const doc = new DOMParser().parseFromString(tableHtml, 'text/html');
    const rows = Array.from(doc.querySelectorAll('table tbody tr')).map(tr => {
      const cells = tr.querySelectorAll('td');
      return { pill: (cells[4] ? cells[4].textContent : '').trim(),
        actions: Array.from((cells[5] || { querySelectorAll: () => [] }).querySelectorAll('button,a')).map(x => (x.textContent || '').trim()) };
    });
    const tdoc = new DOMParser().parseFromString(tabsHtml, 'text/html');
    return { rows, tabs: Array.from(tdoc.querySelectorAll('.sub-tab')).map(a => (a.textContent || '').trim()) };
  });
  check('商品管理：已上架行的按钮是「下架」而不是「已下架」', adminUi.rows[0] && adminUi.rows[0].actions.includes('下架') && !adminUi.rows[0].actions.includes('已下架'), JSON.stringify(adminUi.rows[0]));
  check('商品管理：已下架行的按钮是「上架」', adminUi.rows[1] && adminUi.rows[1].actions.includes('上架'), JSON.stringify(adminUi.rows[1]));
  check('商品管理：待审核行不给上下架按钮、指向"去审核"', adminUi.rows[2] && adminUi.rows[2].actions.includes('去审核') && !adminUi.rows[2].actions.some(x => x === '下架' || x === '上架'), JSON.stringify(adminUi.rows[2]));
  check('审核页：多出「已下架」页签（下架商品有归宿）', adminUi.tabs.length === 4 && adminUi.tabs.some(x => x.indexOf('已下架') === 0), JSON.stringify(adminUi.tabs));
  check('审核页：计数各算各的（待审核1/已上架2/已下架1/已驳回1）',
    adminUi.tabs[0].includes('(1)') && adminUi.tabs[1].includes('(2)') && adminUi.tabs[2].includes('(1)') && adminUi.tabs[3].includes('(1)'), JSON.stringify(adminUi.tabs));

  /* 回归：v1.000 版本号 / 页脚去掉 WhatsApp / 保险页不再出现成串"—" */
  await page.evaluate(() => { location.hash = '#/'; });
  await page.waitForTimeout(400);
  const shell = await page.evaluate(() => ({
    version: (document.querySelector('.version-line') || {}).textContent || '',
    watFooter: Array.from(document.querySelectorAll('footer a, footer button')).some(a => /whatsapp/i.test(a.textContent || '')),
    assetVer: (document.querySelector('script[src*="app-pages.js"]') || {}).getAttribute ? document.querySelector('script[src*="app-pages.js"]').getAttribute('src') : ''
  }));
  check('页脚版本号是 v1.000', /v1\.000/.test(shell.version), shell.version.trim());
  check('页脚不再有 WhatsApp 入口（关于我们里仍保留）', shell.watFooter === false, 'footerHasWhatsapp=' + shell.watFooter);

  await page.evaluate(() => { location.hash = '#/insurance'; });
  await page.waitForTimeout(600);
  const insText = await page.evaluate(() => (document.querySelector('.ins-provider') || {}).innerText || '');
  const dashCount = (insText.match(/—/g) || []).length;
  check('保险页承保方不再渲染成一串空行', insText.length > 0 && dashCount <= 4, '破折号数量=' + dashCount + ' 文本长度=' + insText.length);

  await page.evaluate(() => { location.hash = '#/videos'; });
  await page.waitForTimeout(600);
  const vid = await page.evaluate(() => document.body.innerText || '');
  /* 浏览器语言可能是中文或英文，断言两种语言都认 */
  check('视频页声明"后续上线"', /后续上线|Coming soon/i.test(vid));
  check('视频页写明投稿要求：附视频链接', /视频链接|video link/i.test(vid));
  check('视频页写明投稿要求：需视频主人本人同意', /本人同意|授权|consent|authoris/i.test(vid));
  check('视频页不再放伪造的客户投稿视频', !/客户投稿 · 上海/.test(vid));

  await page.evaluate(() => { location.hash = '#/about'; });
  await page.waitForTimeout(500);
  const about = await page.evaluate(() => document.body.innerText || '');
  check('关于我们地址是"中国广东惠州"', /中国广东惠州|Huizhou,\s*Guangdong/i.test(about), (about.match(/(中国|Huizhou)[^\n]*/) || ['(未找到)'])[0]);

  /* 回归：对象存储文件地址归一（后端回 /files/<id> 时前端必须补成 /api/files/<id>，
   * 否则图片静默不显示；但本地素材路径不能被误改）。 */
  const urlNorm = await page.evaluate(() => {
    if (typeof fileUrl !== 'function') return { missing: true };
    return {
      bare: fileUrl('/files/abc-123'),
      already: fileUrl('/api/files/abc-123'),
      asset: fileUrl('assets/pet/products/dog.png'),
      data: fileUrl('data:image/png;base64,AAA'),
      empty: fileUrl(null)
    };
  });
  check('fileUrl: 裸 /files/<id> 补成 /api/files/<id>', urlNorm.bare === '/api/files/abc-123', 'got=' + urlNorm.bare);
  check('fileUrl: 已带 /api 前缀不重复补', urlNorm.already === '/api/files/abc-123', 'got=' + urlNorm.already);
  check('fileUrl: 本地素材路径原样返回', urlNorm.asset === 'assets/pet/products/dog.png', 'got=' + urlNorm.asset);
  check('fileUrl: data URI 原样返回', urlNorm.data === 'data:image/png;base64,AAA', 'got=' + urlNorm.data);
  check('fileUrl: 空值返回空串', urlNorm.empty === '', 'got=' + JSON.stringify(urlNorm.empty));

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
