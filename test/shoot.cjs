const { chromium } = require('playwright-core');
const path = require('path');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  const base = 'file:///C:/Users/LENOVO/Documents/ChatGPT/trade%20boat/index.html';
  const out = require('path').resolve(__dirname, '..', 'screenshots');
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('pageerror', e => errors.push('pageerror: ' + e.message));

  await page.goto(base);
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, '01-home.png') });

  await page.click('[data-action="lang-more"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '19-lang-modal.png') });
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(300);

  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '02-products.png') });

  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '16-news-top.png') });
  await page.evaluate(() => { window.scrollTo(0, document.body.scrollHeight); });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '17-news-sources.png') });
  await page.evaluate(() => { window.scrollTo(0, 0); });

  await page.evaluate(() => { location.hash = '#/product/p1'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '03-detail.png') });

  await page.locator('.fake-card [data-action="verify-product"]').click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '21-anti-fake.png') });
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(200);

  await page.click('[data-action="lang-more"]');
  await page.waitForTimeout(300);
  await page.click('.lang-opt[data-lang="es"]');
  await page.waitForTimeout(12000);
  await page.screenshot({ path: path.join(out, '20-product-bilingual.png') });
  await page.click('#langSwitch [data-lang="zh"]');
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', sellerId: 's1' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '04-seller-dashboard.png') });

  await page.evaluate(() => { location.hash = '#/dashboard/publish'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '05-publish.png') });

  await page.evaluate(() => { location.hash = '#/dashboard/inquiries'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '06-inquiries.png') });

  const qf = page.locator('form[data-form="quote-form"]').first();
  await qf.locator('input[name="price"]').fill('13500');
  await qf.locator('input[name="validity"]').fill('15');
  await qf.locator('input[name="leadTime"]').fill('20');
  await qf.locator('textarea[name="note"]').fill('报价含出口包装与全套 FOB 单据，可先寄样确认，欢迎进一步沟通。');
  await qf.locator('button[type="submit"]').click();
  await page.waitForTimeout(400);
  await page.locator('[data-action="print-doc"][data-type="quotation"]').first().click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '18-print-quotation.png') });
  await page.click('[data-action="close-modal"]');
  await page.waitForTimeout(300);

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-buyer', role: 'buyer', name: 'Thomas Müller', email: 'buyer@demo.com', buyerCompany: 'Müller GmbH', buyerCountry: 'DE' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/product/p3'; });
  await page.waitForTimeout(400);
  await page.click('[data-action="open-inquiry"]');
  await page.waitForTimeout(20000);
  await page.screenshot({ path: path.join(out, '07-inquiry-modal.png') });

  await page.click('form[data-form="inquiry-form"] button[type="submit"]');
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '08-inquiry-success.png') });

  await page.click('[data-action="close-modal"]');
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '09-buyer-center.png') });

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-admin', role: 'admin', name: '平台管理员', email: 'admin@demo.com' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '11-admin-overview.png') });

  await page.evaluate(() => { location.hash = '#/dashboard/review'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '12-admin-review.png') });

  await page.evaluate(() => { location.hash = '#/dashboard/verify'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '13-admin-verify.png') });

  await page.evaluate(() => { location.hash = '#/dashboard/users'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '14-admin-users.png') });

  await page.evaluate(() => { location.hash = '#/dashboard/logs'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '15-admin-logs.png') });

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = null;
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.evaluate(() => { location.hash = '#/login'; });
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(out, '10-login.png') });

  console.log('ERRORS: ' + JSON.stringify(errors, null, 2));
  await browser.close();
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
