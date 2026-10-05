#!/usr/bin/env node
/**
 * 线上巡检（2026-10-06）
 *
 *   node scripts\health-check.mjs            # 基础项：首页/接口/静态页/sitemap/路径路由
 *   node scripts\health-check.mjs --full     # 追加：翻译接口、邮件通道状态
 *
 * 退出码：0 全部通过；1 有失败项（可挂到任务计划/监控里，失败时发通知）。
 */
const BASE = (process.env.BBM_ORIGIN || 'https://beanbeanmouse.com').replace(/\/+$/, '');
const FULL = process.argv.includes('--full');
const results = [];
const check = (name, ok, extra) => results.push([name, !!ok, extra || '']);

async function get(pathname, opts) {
  try {
    const res = await fetch(BASE + pathname, Object.assign({ redirect: 'manual' }, opts));
    const text = await res.text().catch(() => '');
    return { status: res.status, text, headers: res.headers };
  } catch (e) {
    return { status: 0, text: '', headers: new Map(), error: e.message };
  }
}

(async () => {
  const home = await get('/');
  check('首页 200', home.status === 200, 'status=' + home.status);
  check('首页有品牌名', home.text.indexOf('BeanBeanMouse') >= 0);

  const api = await get('/api/products?size=1');
  let first = null;
  try { first = (JSON.parse(api.text).items || [])[0] || null; } catch (e) { /* 忽略 */ }
  check('商品接口 200 且有数据', api.status === 200 && !!first, 'status=' + api.status);

  const routes = ['/products', '/about', '/login', '/verify'];
  for (const r of routes) {
    const res = await get(r);
    check('路径路由 ' + r + ' 200', res.status === 200, 'status=' + res.status);
  }

  if (first) {
    const landing = await get('/p/' + first.id);
    check('商品静态落地页 /p/' + first.id + ' 200', landing.status === 200, 'status=' + landing.status);
    check('落地页含 Product 结构化数据', landing.text.indexOf('application/ld+json') >= 0 && landing.text.indexOf('"@type":"Product"') >= 0);
  }

  const sm = await get('/sitemap.xml');
  const locs = (sm.text.match(/<loc>/g) || []).length;
  check('sitemap 可访问且含商品页', sm.status === 200 && locs >= 10 && sm.text.indexOf('/p/') > 0, 'loc=' + locs);

  const spa = await get('/spa.html');
  check('SPA 外壳不被收录（noindex）', String(spa.headers.get('x-robots-tag') || '').indexOf('noindex') >= 0, 'tag=' + spa.headers.get('x-robots-tag'));

  const api404 = await get('/api/__healthcheck__');
  check('未知接口返回 4xx（不是 500/200）', api404.status >= 400 && api404.status < 500, 'status=' + api404.status);

  if (FULL) {
    const tr = await get('/api/translate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: '仓鼠笼', target: 'en' })
    });
    let provider = '';
    try { provider = (JSON.parse(tr.text) || {}).provider || ''; } catch (e) { /* 忽略 */ }
    check('翻译接口可用', tr.status === 200 && provider !== 'offline', 'provider=' + provider);

    const mail = await get('/api/mail/status');
    check('邮件通道接口可访问', mail.status === 200 || mail.status === 401 || mail.status === 404, 'status=' + mail.status);
  }

  let failed = 0;
  for (const [n, ok, extra] of results) {
    if (!ok) failed++;
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + n + (extra ? '  [' + extra + ']' : ''));
  }
  console.log(failed ? failed + ' 项失败' : '全部通过（' + results.length + ' 项）');
  process.exit(failed ? 1 : 0);
})();
