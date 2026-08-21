/* BeanBeanMouse 数据层（api.js）冒烟测试：在浏览器里直接调用 window.api */
const { chromium } = require('playwright-core');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    headless: true
  });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  await page.goto('file:///C:/Users/LENOVO/Documents/ChatGPT/trade%20boat/index.html');
  await page.waitForTimeout(500);

  const results = [];
  const check = (name, ok) => results.push([name, !!ok]);
  const run = async (name, fn) => {
    try { check(name, await fn()); }
    catch (e) { check(name + ' (ERR ' + e.message + ')', false); }
  };

  await run('api exposed on window', async () =>
    page.evaluate(() => typeof window.api === 'object' && typeof window.api.products.list === 'function'));

  await run('auth.login valid user', async () =>
    page.evaluate(async () => {
      const r = await api.auth.login({ email: 'buyer@demo.com' });
      return !!r.token && r.user.email === 'buyer@demo.com';
    }));

  await run('auth.login frozen user rejected', async () =>
    page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      const u = s.users.find(x => x.email === 'tanaka@tokyo-trading.jp');
      u.status = 'frozen';
      localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
      try { await api.auth.login({ email: 'tanaka@tokyo-trading.jp' }); return false; }
      catch (e) { return e.message === 'ACCOUNT_FROZEN'; }
    }));

  await run('products.list keyword filter', async () =>
    page.evaluate(async () => {
      const r = await api.products.list({ kw: 'charger' });
      return Array.isArray(r) && r.length > 0;
    }));

  await run('products.list excludes pending', async () =>
    page.evaluate(async () => {
      const r = await api.products.list({ kw: 'solar' });
      return r.length === 0;
    }));

  await run('products.get', async () =>
    page.evaluate(async () => (await api.products.get('p3')).id === 'p3'));

  await run('products.create pending', async () =>
    page.evaluate(async () => {
      const p = await api.products.create({ cat: 'machinery', country: 'CN', priceMin: 10, priceMax: 20, moq: 5, unit: 'set', leadTime: 15, en: { title: 'API Test Product', desc: 'created via api' }, zh: { title: '接口测试产品', desc: '通过 api 创建' } });
      return p.status === 'pending' && !!p.id;
    }));

  await run('products.review approve', async () =>
    page.evaluate(async () => {
      const created = (await api.products.list({ includeOffline: true })).find(p => p.zh && p.zh.title === '接口测试产品');
      if (!created) return false;
      const r = await api.products.review(created.id, { action: 'approve' });
      return r.status === 'on';
    }));

  await run('inquiries.create persists', async () =>
    page.evaluate(async () => {
      const before = (await api.inquiries.list()).length;
      const inq = await api.inquiries.create({ productId: 'p3', qty: 100, unit: 'pcs', message: 'Hello from api smoke test', name: 'Tester', email: 't@t.com' });
      const after = (await api.inquiries.list()).length;
      return !!inq.id && inq.status === 'new' && after === before + 1;
    }));

  await run('quotes.addQuote marks quoted', async () =>
    page.evaluate(async () => {
      const inq = (await api.inquiries.list())[0];
      const r = await api.inquiries.addQuote(inq.id, { price: 12.5, incoterm: 'FOB', payment: 'T/T', validity: 15, leadTime: 20, note: 'test quote' });
      return r.status === 'quoted' && r.quote.price === 12.5;
    }));

  await run('antiFake.verify valid code', async () =>
    page.evaluate(async () => {
      const code = api.antiFake.codeOf('p3');
      const r = await api.antiFake.verify(code);
      return r.genuine === true && r.code === code;
    }));

  await run('antiFake.verify invalid code', async () =>
    page.evaluate(async () => {
      try { await api.antiFake.verify('BBM-NOTEXIST-00'); return false; }
      catch (e) { return e.message === 'CODE_NOT_FOUND'; }
    }));

  await run('translate mock response', async () =>
    page.evaluate(async () => {
      const r = await api.translate.text('Hello', 'zh');
      return r.text === 'Hello' && r.mode === 'mock';
    }));

  await run('news.list', async () =>
    page.evaluate(async () => (await api.news.list()).length >= 10));

  await run('admin.overview + logs', async () =>
    page.evaluate(async () => {
      const o = await api.admin.overview();
      const l = await api.admin.logs();
      return o.products > 0 && Array.isArray(l);
    }));

  await run('api:changed triggers re-render', async () =>
    page.evaluate(async () => {
      await api.products.create({ cat: 'auto', country: 'CN', priceMin: 1, priceMax: 2, moq: 1, unit: 'pcs', leadTime: 5, en: { title: 'Render Test', desc: 'x' }, zh: { title: '渲染测试', desc: 'x' } });
      return document.querySelector('#app').innerHTML.length > 100;
    }));

  await run('exports.getReadiness defaults', async () =>
    page.evaluate(async () => {
      const r = await api.exports.getReadiness('s1');
      return r.sellerId === 's1' && r.score >= 0 && r.items.length >= 7 && r.coreTotal >= 6;
    }));

  await run('exports.setItem updates readiness', async () =>
    page.evaluate(async () => {
      await api.exports.setItem('s1', 'customs-reg', true);
      const r = await api.exports.getReadiness('s1');
      return r.items.find(x => x.id === 'customs-reg').done === true && r.score > 0;
    }));

  await run('documents.generate + consistency', async () =>
    page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      const oid = (s.orders || [])[0].id;
      if (!oid) return false;
      const rec = await api.documents.generate(oid, 'CI');
      return !!rec.generated.CI && ['pass', 'warn'].includes(rec.consistency);
    }));

  await run('afterSales.create forbidden for seller', async () =>
    page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      s.user = { id: 'u-seller', role: 'seller', sellerId: 's1' };
      localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
      try {
        await api.afterSales.create({ orderId: s.orders[0].id, type: 'quality', description: 'x' });
        return false;
      } catch (e) { return e.message === 'FORBIDDEN'; }
    }));

  await run('afterSales buyer create + seller respond', async () =>
    page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      const oid = s.orders[0].id;
      s.user = { id: 'u-buyer', role: 'buyer', name: 'B' };
      localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
      const c = await api.afterSales.create({ orderId: oid, type: 'damage', description: 'broken on arrival' });
      const s2 = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      s2.user = { id: 'u-seller', role: 'seller', sellerId: 's1' };
      localStorage.setItem('bridgetrade_v1', JSON.stringify(s2));
      const r = await api.afterSales.respond(c.id, { action: 'accept', reply: 'reship' });
      return r.status === 'resolved' && r.sellerReply === 'reship';
    }));

  await run('afterSales.escalate + arbitrate', async () =>
    page.evaluate(async () => {
      const s = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      const oid = s.orders[0].id;
      s.user = { id: 'u-buyer', role: 'buyer', name: 'B' };
      localStorage.setItem('bridgetrade_v1', JSON.stringify(s));
      const c = await api.afterSales.create({ orderId: oid, type: 'other', description: 'delay' });
      const esc = await api.afterSales.escalate(c.id);
      const s2 = JSON.parse(localStorage.getItem('bridgetrade_v1'));
      s2.user = { id: 'u-admin', role: 'admin', name: 'Admin' };
      localStorage.setItem('bridgetrade_v1', JSON.stringify(s2));
      const r = await api.afterSales.arbitrate(c.id, { ruling: 'compromise', note: 'split' });
      return esc.status === 'arbitrating' && r.status === 'resolved' && r.ruling === 'compromise';
    }));

  await run('compliance.screen flags keywords', async () =>
    page.evaluate(async () => {
      const r = await api.compliance.screen('Military drone with night vision camera');
      return r.hits.length >= 3 && r.clean === false;
    }));

  await run('compliance.screen clean text', async () =>
    page.evaluate(async () => {
      const r = await api.compliance.screen('Cotton t-shirt with custom logo');
      return r.clean === true && r.hits.length === 0;
    }));

  await run('logistics.estimate returns ranges', async () =>
    page.evaluate(async () => {
      const r = await api.logistics.estimate({ mode: 'sea', weight: 500, volume: 3, container: 'LCL' });
      return r.currency === 'USD' && r.lo > 0 && r.hi >= r.lo;
    }));

  console.log(results.map(([n, ok]) => (ok ? 'PASS' : 'FAIL') + ' | ' + n).join('\n'));
  const failed = results.filter(([, ok]) => !ok).length;
  console.log('PAGE ERRORS: ' + JSON.stringify(errors));
  console.log(failed === 0 ? 'ALL API SMOKE CHECKS PASSED' : failed + ' CHECKS FAILED');
  await browser.close();
  process.exit(failed === 0 ? 0 : 1);
})().catch(e => {
  console.error('FATAL: ' + e.message);
  process.exit(1);
});
