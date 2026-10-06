#!/usr/bin/env node
/**
 * 线上主链路冒烟（2026-10-06）
 *
 *   node scripts\smoke-live.mjs
 *
 * 作用：对生产站点跑一遍"登录 → 读商品 → 读图 → 读询盘 → 看自检"，
 * 只读为主（唯一的写入是登录产生的会话令牌），用来回答"现在到底能不能用"。
 *
 * 可用环境变量覆盖：
 *   BBM_ORIGIN / BBM_ADMIN_EMAIL / BBM_ADMIN_PASS / BBM_BUYER_EMAIL / BBM_BUYER_PASS
 *
 * 退出码：0 全部通过；1 有失败项。
 */
const BASE = (process.env.BBM_ORIGIN || 'https://beanbeanmouse.com').replace(/\/+$/, '');
const ADMIN = {
  email: process.env.BBM_ADMIN_EMAIL || 'admin@beanbeanmouse.com',
  password: process.env.BBM_ADMIN_PASS || 'BbmAdmin2026'
};
const BUYER = {
  email: process.env.BBM_BUYER_EMAIL || 'buyer@beanbeanmouse.com',
  password: process.env.BBM_BUYER_PASS || 'BbmBuyer2026'
};

const results = [];
const check = (name, ok, extra) => results.push([name, !!ok, extra || '']);

async function req(path, { method = 'GET', body, token, raw } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = 'Bearer ' + token;
  let res;
  try {
    res = await fetch(BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (e) {
    return { status: 0, error: e.message, data: null, text: '' };
  }
  if (raw) return { status: res.status, headers: res.headers, buffer: Buffer.from(await res.arrayBuffer()) };
  const text = await res.text().catch(() => '');
  let data = null;
  try { data = JSON.parse(text); } catch (e) { /* 非 JSON */ }
  return { status: res.status, data, text, headers: res.headers };
}

async function login(who, label) {
  const r = await req('/api/auth/login', { method: 'POST', body: { email: who.email, password: who.password } });
  const token = r.data && (r.data.token || (r.data.user && r.data.user.token));
  check(label + '登录成功', r.status === 200 && !!token, 'status=' + r.status + (r.data && r.data.error ? ' ' + r.data.error : ''));
  return token || null;
}

(async () => {
  /* ① 公开商品数据（未登录也该能看） */
  const list = await req('/api/products?size=24');
  const items = (list.data && (list.data.items || list.data.products || list.data)) || [];
  const arr = Array.isArray(items) ? items : [];
  check('商品列表可读', list.status === 200 && arr.length > 0, 'status=' + list.status + ' n=' + arr.length);

  /* 列表里未必带图，逐件回详情找一张真实图片来验证对象存储链路 */
  let imgUrl = null;
  let withImg = 0;
  const scanned = Math.min(arr.length, 12);
  for (const p of arr.slice(0, scanned)) {
    let imgs = p.images || [];
    if (!imgs.length && p.id) {
      const d = await req('/api/products/' + encodeURIComponent(p.id));
      imgs = (d.data && d.data.images) || [];
    }
    const url = imgs.map(x => (x && (x.url || x.src)) || x).filter(x => typeof x === 'string' && x.indexOf('/files/') === 0)[0];
    if (url) { withImg++; if (!imgUrl) imgUrl = url; }
  }
  console.log('  抽查 ' + scanned + ' 件商品，其中 ' + withImg + ' 件挂了图片');

  const first = arr[0];
  const firstId = first && (first.id || first.productId);
  if (firstId) {
    const detail = await req('/api/products/' + encodeURIComponent(firstId));
    check('商品详情可取', detail.status === 200, 'id=' + firstId + ' status=' + detail.status);
  } else {
    check('商品详情可取', false, '没有商品可验证');
  }
  if (imgUrl) {
    const img = await req(imgUrl, { raw: true });
    const type = String(img.headers && img.headers.get ? img.headers.get('content-type') : '');
    check('商品图片可访问（对象存储 R2 通）', img.status === 200 && /^image\//.test(type) && img.buffer.length > 1000,
      'status=' + img.status + ' ' + type + ' ' + Math.round((img.buffer ? img.buffer.length : 0) / 1024) + 'KB');
  } else {
    /* 这里不是故障：库里还没有挂图的商品，图片链路本身由
     * work/probe-live-product-flow.mjs（建商品→传图→挂图→读回）单独验证。 */
    console.log('  ℹ 内容准备度：抽查的 ' + scanned + ' 件商品都没有图片，跳过图片可访问性检查');
  }
  if (withImg === 0) console.log('  ℹ 内容准备度：' + withImg + '/' + scanned + ' 件商品有真实图片（等真实商品图上传后这里会自动变成硬校验）');

  /* ② 管理员：自检 + 邮件发信记录 */
  const adminToken = await login(ADMIN, '管理员');
  if (adminToken) {
    const sc = await req('/api/admin/system-check', { token: adminToken });
    const d = sc.data || {};
    check('系统自检接口可取', sc.status === 200 && !!d.counts, 'status=' + sc.status);
    if (d.mail) check('邮件通道就绪', !!d.mail.ready, d.mail.transport + ' ready=' + d.mail.ready);
    if (d.storage) check('对象存储就绪', !!d.storage.ready, d.storage.kind + ' ' + Math.round((d.storage.maxFileSize || 0) / 1048576) + 'MB');
    if (d.policy) check('注册策略：邮箱验证已开', !!d.policy.requireEmailVerify, 'review=' + d.policy.requireAccountReview);
    if (d.counts) console.log('  数据概览：' + JSON.stringify(d.counts));

    const ms = await req('/api/admin/mail-status', { token: adminToken });
    if (ms.status === 200 && ms.data) {
      const recent = ms.data.recent || [];
      const sent = recent.filter(x => x.status === 'sent').length;
      check('邮件最近有成功发送记录', sent > 0, '近 ' + recent.length + ' 封里成功 ' + sent + ' 封，累计失败 ' + (ms.data.failed || 0));
      if (recent[0]) console.log('  最近一封：' + recent[0].status + ' → ' + recent[0].recipient + ' · ' + String(recent[0].subject || '').slice(0, 40));
    } else {
      check('邮件最近有成功发送记录', false, 'mail-status status=' + ms.status);
    }

    const inq = await req('/api/inquiries', { token: adminToken });
    check('管理端询盘列表可读', inq.status === 200 && Array.isArray(inq.data), 'status=' + inq.status + ' n=' + (Array.isArray(inq.data) ? inq.data.length : '-'));

    const me = await req('/api/auth/me', { token: adminToken });
    check('管理端令牌有效', me.status === 200 && me.data && (me.data.role === 'admin' || (me.data.user && me.data.user.role === 'admin')), 'status=' + me.status);
  } else {
    check('系统自检接口可取', false, '管理员登录失败，跳过');
  }

  /* ③ 买家：登录 + 我的询盘 */
  const buyerToken = await login(BUYER, '买家');
  if (buyerToken) {
    const mine = await req('/api/inquiries', { token: buyerToken });
    check('买家「我的询盘」可读', mine.status === 200 && Array.isArray(mine.data), 'status=' + mine.status + ' n=' + (Array.isArray(mine.data) ? mine.data.length : '-'));
  }

  /* ④ 越权检查：没有令牌不能读管理端数据 */
  const noAuth = await req('/api/admin/system-check');
  check('未登录读管理端被拦（401/403）', noAuth.status === 401 || noAuth.status === 403, 'status=' + noAuth.status);
  const buyerToAdmin = buyerToken ? await req('/api/admin/mail-status', { token: buyerToken }) : { status: 0 };
  check('买家令牌读管理端被拦（401/403）', buyerToAdmin.status === 401 || buyerToAdmin.status === 403, 'status=' + buyerToAdmin.status);

  console.log('\n线上主链路冒烟（' + BASE + '）');
  let failed = 0;
  for (const [n, ok, extra] of results) {
    if (!ok) failed++;
    console.log((ok ? 'PASS' : 'FAIL') + ' | ' + n + (extra ? '  [' + extra + ']' : ''));
  }
  console.log(failed ? failed + ' 项失败' : '全部通过（' + results.length + ' 项）');
  process.exit(failed ? 1 : 0);
})();
