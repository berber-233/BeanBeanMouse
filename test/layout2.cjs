const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const base = 'file:///C:/Users/LENOVO/Documents/Codex/2026-08-10/gai/outputs/globetrade/index.html';
  const box = sel => page.locator(sel).first().boundingBox();
  const log = (name, b) => console.log(name + ': ' + (b ? [Math.round(b.x), Math.round(b.y), Math.round(b.width), Math.round(b.height)].join(' x ') : 'MISSING'));

  await page.goto(base);
  await page.waitForTimeout(400);
  await page.evaluate(() => { location.hash = '#/news'; });
  await page.waitForTimeout(300);
  log('brief card 1', await box('.brief-card'));
  log('brief card 3', await box('.brief-card >> nth=2'));
  log('news filter panel', await box('.news-filter'));
  log('news card 1', await box('.news-card'));
  log('source card 1', await box('.source-card'));
  log('fx strip', await box('.fx-strip'));

  await page.evaluate(() => { location.hash = '#/product/p1'; });
  await page.waitForTimeout(300);
  log('detail fx strip', await box('.detail-main .fx-strip'));
  log('incoterms legend', await box('details.term-legend'));
  log('compliance tip', await box('.tip-box'));

  await browser.close();
})().catch(e => { console.error('FATAL: ' + e.message); process.exit(1); });
