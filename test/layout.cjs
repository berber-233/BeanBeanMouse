const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const base = 'file:///C:/Users/LENOVO/Documents/Codex/2026-08-10/gai/outputs/globetrade/index.html';
  const box = sel => page.locator(sel).first().boundingBox();
  const log = (name, b) => console.log(name + ': ' + (b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(' x ') : 'MISSING'));

  await page.goto(base);
  await page.waitForTimeout(400);
  log('hero h1', await box('.hero h1'));
  log('hero search', await box('.hero-search'));
  log('hero deals placeholder', await box('.hero-deals'));
  log('cat card1', await box('.cat-card'));
  log('product card1', await box('.product-card'));

  await page.evaluate(() => { location.hash = '#/products'; });
  await page.waitForTimeout(300);
  log('filter panel', await box('#filterPanel'));
  log('results bar', await box('.results-bar'));
  log('product card1 (list)', await box('.product-card'));

  await page.evaluate(() => { location.hash = '#/product/p1'; });
  await page.waitForTimeout(300);
  log('gallery main', await box('.gallery .main-img'));
  log('detail main card', await box('.detail-main'));
  log('inquiry button', await box('.detail-actions .btn-primary'));

  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
    s.user = { id: 'u-seller', role: 'seller', name: '王经理', email: 'seller@demo.com', sellerId: 's1' };
    localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForTimeout(300);
  await page.evaluate(() => { location.hash = '#/dashboard'; });
  await page.waitForTimeout(300);
  log('dash sidebar', await box('.dash-side'));
  log('stat card1', await box('.stat-card'));
  log('recent inquiry item', await box('.inquiry-item'));

  await browser.close();
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
