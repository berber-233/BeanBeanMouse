/* BeanBeanMouse 后端接口测试：启动内存 SQLite + HTTP 服务，逐接口断言 */
process.env.DB_PATH = ':memory:';
process.env.TRANSLATION_PROVIDER = 'mock';
process.env.TRANSLATION_DAILY_QUOTA = '10';
process.env.REGISTER_LIMIT = '100';
process.env.LOGIN_LIMIT = '100';

const { startServer } = await import('../src/server.mjs');
const { get } = await import('../src/db.mjs');

const server = await startServer(0);
const base = 'http://127.0.0.1:' + server.address().port;

const results = [];
const check = (name, ok) => results.push([name, !!ok]);

async function req(path, { method = 'GET', body, token } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = 'Bearer ' + token;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  let data = null;
  try { data = await res.json(); } catch (e) { /* 无响应体 */ }
  return { status: res.status, data, headers: res.headers };
}

function lastVerifyToken(email) {
  const mail = get('SELECT * FROM mail_outbox WHERE recipient = ? AND subject LIKE ? ORDER BY created_at DESC LIMIT 1', email, '%验证%');
  const m = mail ? /token=([0-9a-f]+)/.exec(mail.body || '') : null;
  return m ? m[1] : null;
}

let sellerToken, adminToken, buyerToken, createdProductId, inquiryId, orderId;

/* ---- 认证 ---- */
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'seller@demo.com', password: 'seller123' } });
  check('login seller -> 200 + token', r.status === 200 && !!r.data.token && r.data.user.role === 'seller');
  sellerToken = r.data.token;
}
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'admin@demo.com', password: 'admin123' } });
  check('login admin -> 200', r.status === 200 && !!r.data.token);
  adminToken = r.data.token;
}
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'buyer@demo.com', password: 'buyer123' } });
  check('login buyer -> 200', r.status === 200 && !!r.data.token);
  buyerToken = r.data.token;
}
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'buyer@demo.com', password: 'wrong' } });
  check('login wrong password -> 401', r.status === 401 && r.data.error === 'INVALID_CREDENTIALS');
}
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'tanaka@tokyo-trading.jp', password: 'frozen123' } });
  check('login frozen user -> 401 ACCOUNT_FROZEN', r.status === 401 && r.data.error === 'ACCOUNT_FROZEN');
}

/* 注册 → 邮箱验证 → 登录 */
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'new@test.com', password: 'Passw0rd', role: 'buyer', name: 'New User' } });
  check('register -> 201 + 未验证（无 token）', r.status === 201 && r.data.emailVerified === false && !r.data.token);
}
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'new@test.com', password: 'Passw0rd' } });
  check('未验证邮箱登录 -> 403 VERIFY_EMAIL_REQUIRED', r.status === 403 && r.data.error === 'VERIFY_EMAIL_REQUIRED');
}
{
  const token = lastVerifyToken('new@test.com');
  const r = await req('/auth/verify-email', { method: 'POST', body: { token } });
  check('邮箱验证 -> 200', r.status === 200 && r.data.ok === true && r.data.user.email_verified === undefined);
}
{
  const r = await req('/auth/login', { method: 'POST', body: { email: 'new@test.com', password: 'Passw0rd' } });
  check('验证后登录 -> 200', r.status === 200 && !!r.data.token);
}
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'new@test.com', password: 'Passw0rd', role: 'buyer', name: 'Dup' } });
  check('register duplicate email -> 409', r.status === 409 && r.data.error === 'EMAIL_EXISTS');
}
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'bot@test.com', password: 'Passw0rd', role: 'buyer', name: 'Bot', homepage: 'http://spam.example' } });
  check('蜜罐字段注册 -> 400 BOT_DETECTED', r.status === 400 && r.data.error === 'BOT_DETECTED');
}
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'weak@test.com', password: 'abc', role: 'buyer', name: 'Weak' } });
  check('弱密码注册 -> 400 VALIDATION', r.status === 400 && r.data.error === 'VALIDATION');
}
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'bad-email', password: 'Passw0rd', role: 'buyer', name: 'Bad' } });
  check('非法邮箱注册 -> 400 VALIDATION', r.status === 400 && r.data.error === 'VALIDATION');
}
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'fac@test.com', password: 'Passw0rd', role: 'seller', name: 'Factory', companyName: '', country: '' } });
  check('卖家注册缺公司资料 -> 400 VALIDATION', r.status === 400 && r.data.error === 'VALIDATION');
}

/* 卖家注册 + 公司审核（真实可查证）→ 审核通过后才能发布产品 */
let newSellerToken, newSellerUserId;
{
  const r = await req('/auth/register', {
    method: 'POST',
    body: {
      email: 'factory@test.com', password: 'Passw0rd', role: 'seller', name: 'Factory Owner',
      companyName: 'Suzhou Precision Factory Co., Ltd.', country: 'CN', city: 'Suzhou',
      registrationNo: '91320594MA1X000000', licenseNo: 'LIC-2026-088', companyWebsite: 'https://example-factory.cn',
      contact: '+86 138 0000 0000', businessScope: 'CNC machining, sheet metal fabrication'
    }
  });
  check('卖家注册（含公司资料）-> 201', r.status === 201 && r.data.user.role === 'seller' && r.data.emailVerified === false);
  newSellerUserId = r.data.user.id;
  const vtoken = lastVerifyToken('factory@test.com');
  await req('/auth/verify-email', { method: 'POST', body: { token: vtoken } });
  const login = await req('/auth/login', { method: 'POST', body: { email: 'factory@test.com', password: 'Passw0rd' } });
  newSellerToken = login.data.token;
}
{
  const r = await req('/companies/mine', { token: newSellerToken });
  check('卖家查看公司资料 -> pending', r.status === 200 && r.data.status === 'pending' && r.data.registration_no === '91320594MA1X000000');
}
{
  const r = await req('/products', {
    method: 'POST', token: newSellerToken,
    body: { category: 'auto', country: 'CN', translations: { en: { title: 'X' }, zh: { title: 'X' } } }
  });
  check('公司未审核时发布产品 -> 403 COMPANY_NOT_VERIFIED', r.status === 403 && r.data.error === 'COMPANY_NOT_VERIFIED');
}
{
  const r = await req('/companies/' + newSellerUserId + '/verify', { method: 'PUT', token: adminToken, body: { action: 'approve' } });
  check('管理员通过公司审核 -> approved', r.status === 200 && r.data.status === 'approved');
}
{
  const r = await req('/products', {
    method: 'POST', token: newSellerToken,
    body: { category: 'auto', country: 'CN', translations: { en: { title: 'Y' }, zh: { title: 'Y' } } }
  });
  check('公司审核后发布产品 -> 201', r.status === 201);
}
{
  const r = await req('/auth/me', { token: buyerToken });
  check('auth/me -> buyer', r.status === 200 && r.data.email === 'buyer@demo.com');
}
{
  const r = await req('/auth/me');
  check('auth/me without token -> 401', r.status === 401);
}

/* ---- 产品 ---- */
{
  const r = await req('/products');
  check('products list -> paginated live products', r.status === 200 && Array.isArray(r.data.items) && r.data.items.length === 2 && r.data.total === 2 && r.data.items.every(p => p.status === 'on'));
}
{
  const r = await req('/products?kw=charger');
  check('products keyword search', r.status === 200 && r.data.items.length === 1 && /charger/i.test(r.data.items[0].translations.en.title));
}
{
  const r = await req('/products/p1');
  check('product detail has translations + antiFakeCode', r.status === 200 && !!r.data.translations.zh && /^TB-/.test(r.data.antiFakeCode));
}
{
  const r = await req('/products', {
    method: 'POST',
    token: sellerToken,
    body: {
      category: 'auto', country: 'CN', priceMin: 28, priceMax: 42, moq: 100, unit: 'pcs', leadTime: 18,
      terms: ['FOB'], certs: ['CE'], srcLang: 'en',
      translations: {
        en: { title: 'EV Charging Cable Type 2', description: '32A AC charging cable with TÜV & CE.', features: ['32A', 'TÜV & CE'] },
        zh: { title: '电动汽车充电线 Type 2', description: '32A 交流充电线，TÜV/CE 认证。', features: ['32A', 'TÜV/CE'] }
      }
    }
  });
  check('seller create product -> 201 pending', r.status === 201 && r.data.status === 'pending' && !!r.data.antiFakeCode);
  createdProductId = r.data.id;
}
{
  const r = await req('/products', { method: 'POST', token: buyerToken, body: { category: 'auto', country: 'CN', translations: { en: { title: 'X' }, zh: { title: 'X' } } } });
  check('buyer create product -> 403', r.status === 403);
}
{
  const r = await req('/products/' + createdProductId + '/review', { method: 'POST', token: sellerToken, body: { action: 'approve' } });
  check('seller review product -> 403', r.status === 403);
}
{
  const r = await req('/products/' + createdProductId + '/review', { method: 'POST', token: adminToken, body: { action: 'approve' } });
  check('admin approve product -> on', r.status === 200 && r.data.status === 'on');
}
{
  const r = await req('/products?kw=EV%20Charging');
  check('approved product goes live', r.status === 200 && r.data.items.length === 1);
}

/* ---- 询盘与报价 ---- */
{
  const r = await req('/inquiries', {
    method: 'POST',
    token: buyerToken,
    body: { productId: 'p1', qty: 2, unit: 'set', payment: 'T/T', message: 'Please quote CIF Hamburg.' }
  });
  check('buyer create inquiry -> 201', r.status === 201 && r.data.status === 'new');
  inquiryId = r.data.id;
}
{
  const r = await req('/inquiries', { token: buyerToken });
  check('buyer inquiry list contains own', r.status === 200 && r.data.some(i => i.id === inquiryId));
}
{
  const r = await req('/inquiries', { token: sellerToken });
  check('seller inquiry list contains received', r.status === 200 && r.data.some(i => i.id === inquiryId));
  const notif = await req('/notifications', { token: sellerToken });
  check('seller notified on new inquiry', notif.status === 200 && notif.data.some(n => n.type === 'inquiry'));
}
{
  const r = await req('/inquiries/' + inquiryId + '/quote', {
    method: 'POST',
    token: sellerToken,
    body: { price: 13500, incoterm: 'FOB', payment: 'T/T', validity: 15, leadTime: 30, note: 'Including export packing.' }
  });
  check('seller quote -> inquiry quoted', r.status === 200 && r.data.status === 'quoted');
}
{
  const r = await req('/inquiries/' + inquiryId + '/quote', { method: 'POST', token: buyerToken, body: { price: 1, incoterm: 'FOB' } });
  check('buyer quote -> 403', r.status === 403);
}

/* ---- 订单：买家确认签收 = 交易达成 ---- */
{
  const r = await req('/orders', { method: 'POST', token: buyerToken, body: { inquiryId } });
  check('buyer create order from quoted inquiry -> 201 created', r.status === 201 && r.data.status === 'created' && r.data.total === 13500);
  orderId = r.data.id;
}
{
  const r = await req('/orders', { token: buyerToken });
  check('buyer order list contains own', r.status === 200 && r.data.items.some(o => o.id === orderId));
}
{
  const r = await req('/orders', { token: sellerToken });
  check('seller order list contains received', r.status === 200 && r.data.items.some(o => o.id === orderId));
}
{
  const r = await req('/orders/' + orderId + '/confirm-receipt', { method: 'POST', token: sellerToken });
  check('卖家确认签收 -> 403', r.status === 403);
}
{
  const r = await req('/orders/' + orderId + '/confirm-receipt', { method: 'POST', token: buyerToken });
  check('买家确认签收 -> complete（交易达成）', r.status === 200 && r.data.status === 'complete' && !!r.data.receipt_confirmed_at);
}

/* ---- 小费打赏：双方可见、可取消 ---- */
let tipId;
{
  const r = await req('/orders/' + orderId + '/tips', { method: 'POST', token: buyerToken, body: { amount: 25, note: 'Great service!' } });
  check('买家打赏卖家 -> 201 active', r.status === 201 && r.data.status === 'active' && r.data.to_user_id !== r.data.from_user_id);
  tipId = r.data.id;
}
{
  const r = await req('/orders/' + orderId, { token: sellerToken });
  check('卖家可见订单小费（双方可见）', r.status === 200 && r.data.tips.length >= 1 && r.data.tips[0].status === 'active');
}
{
  const r = await req('/orders/' + orderId + '/tips', { method: 'POST', token: buyerToken, body: { amount: 0 } });
  check('非法打赏金额 -> 400', r.status === 400);
}
{
  const r = await req('/orders/' + orderId + '/tips', { method: 'POST', token: sellerToken, body: { amount: 5 } });
  check('卖家也可打赏买家 -> 201', r.status === 201);
}
{
  const r = await req('/orders/' + orderId + '/tips/' + tipId + '/cancel', { method: 'POST', token: sellerToken });
  check('非打赏方取消 -> 403', r.status === 403);
}
{
  const r = await req('/orders/' + orderId + '/tips/' + tipId + '/cancel', { method: 'POST', token: buyerToken });
  check('打赏方取消 -> cancelled', r.status === 200 && r.data.status === 'cancelled');
}
{
  const r = await req('/orders/' + orderId + '/cancel', { method: 'POST', token: buyerToken });
  check('已达成订单不可取消 -> 400', r.status === 400);
}

/* ---- 品类需求 ---- */
let catReqId;
{
  const r = await req('/category-requests', { method: 'POST', token: buyerToken, body: { name: 'Solar inverters', description: 'Looking for 5kW hybrid inverters', targetMarkets: ['DE', 'NL'] } });
  check('用户提交品类需求 -> 201 new', r.status === 201 && r.data.status === 'new');
  catReqId = r.data.id;
}
{
  const r = await req('/category-requests', { token: buyerToken });
  check('用户可见自己的品类需求', r.status === 200 && r.data.items.some(x => x.id === catReqId));
}
{
  const r = await req('/category-requests', { token: adminToken });
  check('管理员可见全部品类需求', r.status === 200 && r.data.items.some(x => x.id === catReqId));
}
{
  const r = await req('/category-requests/' + catReqId + '/status', { method: 'POST', token: adminToken, body: { status: 'invited', note: '已联系 2 家逆变器厂商' } });
  check('管理员标记已邀请 -> invited', r.status === 200 && r.data.status === 'invited');
}

/* ---- 防伪验真 ---- */
{
  const code = (await req('/products/p1')).data.antiFakeCode;
  const r = await req('/anti-fake/verify', { method: 'POST', body: { code } });
  check('anti-fake verify valid', r.status === 200 && r.data.genuine === true && r.data.productId === 'p1');
}
{
  const r = await req('/anti-fake/verify', { method: 'POST', body: { code: 'TB-NOTEXIST-00' } });
  check('anti-fake verify invalid -> 404', r.status === 404 && r.data.error === 'CODE_NOT_FOUND');
}

/* ---- 翻译 / 资讯 / 通知 / 管理 / 安全头 ---- */
{
  const r = await req('/translate', { method: 'POST', body: { text: 'Hello', target: 'zh' } });
  check('translate proxy -> 200', r.status === 200 && r.data.target === 'zh' && r.data.provider === 'offline');
}
{
  const t1 = await req('/translate', { method: 'POST', token: buyerToken, body: { text: 'Hi', target: 'zh' } });
  const t2 = await req('/translate', { method: 'POST', token: buyerToken, body: { text: 'Hi', target: 'zh' } });
  const t3 = await req('/translate', { method: 'POST', token: buyerToken, body: { text: 'Hello', target: 'zh' } });
  const t4 = await req('/translate', { method: 'POST', token: buyerToken, body: { text: 'World', target: 'zh' } });
  check('translate daily quota enforced (429)', t1.status === 200 && t2.status === 200 && t3.status === 200 && t4.status === 429 && t4.data.error === 'QUOTA_EXCEEDED');
}
{
  const r = await req('/news');
  check('news list 带来源与更新时间', r.status === 200 && r.data.items.length >= 2 && !!r.data.items[0].source_name && !!r.data.items[0].source_url && typeof r.data.updatedAt === 'number');
}
{
  const r = await req('/news?region=EU');
  check('news region filter', r.status === 200 && r.data.items.length === 1 && r.data.items[0].region === 'EU');
}
{
  const r = await req('/news/sources');
  check('news sources', r.status === 200 && r.data.length >= 2);
}
{
  const r = await req('/news', { method: 'POST', token: adminToken, body: { title: 'US announces new tariff timeline', url: 'https://ustr.gov/news/2026/tariffs', region: 'US', category: 'policy', sourceName: 'USTR' } });
  check('admin 发布资讯 -> 201', r.status === 201 && r.data.source_id);
}
{
  const r = await req('/news', { method: 'POST', token: buyerToken, body: { title: 'x', url: 'https://x.example/1' } });
  check('非管理员发布资讯 -> 403', r.status === 403);
}
{
  const r = await req('/news/refresh', { method: 'POST', token: adminToken });
  check('news refresh 尽力而为 -> 200', r.status === 200 && typeof r.data.added === 'number' && typeof r.data.failed === 'number');
}
{
  const r = await req('/notifications', { token: buyerToken });
  check('notifications -> 200', r.status === 200 && Array.isArray(r.data));
}
{
  const r = await req('/auth/register', { method: 'POST', body: { email: 'factory2@test.com', password: 'Passw0rd', role: 'seller', name: 'F2', companyName: 'Ningbo Hardware Co., Ltd.', country: 'CN' } });
  check('新增待审卖家公司', r.status === 201);
}
{
  const r = await req('/admin/overview', { token: adminToken });
  check('admin overview 含新增统计', r.status === 200 && r.data.products >= 3 && r.data.pendingReviews >= 1 && r.data.orders >= 1 && r.data.tips >= 1 && r.data.categoryRequests >= 1 && r.data.pendingCompanies >= 1);
}
{
  const r = await req('/admin/overview', { token: buyerToken });
  check('buyer admin overview -> 403', r.status === 403);
}
{
  const r = await req('/admin/logs', { token: adminToken });
  check('admin logs paginated', r.status === 200 && Array.isArray(r.data.items) && r.data.items.length >= 5 && r.data.total >= 5);
}
{
  const r = await req('/products');
  check('API 安全头存在', r.headers.get('x-content-type-options') === 'nosniff' && r.headers.get('x-frame-options') === 'SAMEORIGIN');
}
{
  const fd = new FormData();
  fd.append('file', new Blob([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3])], { type: 'image/png' }), 'test.png');
  const r = await fetch(base + '/files', { method: 'POST', headers: { Authorization: 'Bearer ' + sellerToken }, body: fd });
  const data = await r.json();
  check('file upload multipart -> 201', r.status === 201 && data.id && data.mime === 'image/png' && data.size > 0);
  const dl = await fetch(base + data.url);
  check('file download -> content matches', dl.status === 200 && (await dl.arrayBuffer()).byteLength === data.size);
}
{
  const r = await req('/files', { method: 'POST', token: sellerToken, body: { data: Buffer.from('not an image').toString('base64'), mime: 'text/html' } });
  check('file upload unsupported type -> 400', r.status === 400 && r.data.error === 'UNSUPPORTED_TYPE');
}

/* ---- DeepL 真实通道（本地假端点：验证鉴权头、表单与响应解析） ---- */
{
  const savedProvider = process.env.TRANSLATION_PROVIDER;
  const savedKey = process.env.DEEPL_API_KEY;
  const savedUrl = process.env.DEEPL_API_URL;

  process.env.TRANSLATION_PROVIDER = 'deepl';
  delete process.env.DEEPL_API_KEY;
  const r0 = await req('/translate', { method: 'POST', body: { text: 'Hello', target: 'zh' } });
  check('deepl missing key -> 503 CONFIG_MISSING', r0.status === 503 && r0.data.error === 'CONFIG_MISSING');

  const http = await import('node:http');
  let seen = null;
  const fake = http.createServer((q, s) => {
    let b = '';
    q.on('data', c => { b += c; });
    q.on('end', () => {
      seen = { auth: q.headers.authorization, type: q.headers['content-type'], body: b };
      s.writeHead(200, { 'Content-Type': 'application/json' });
      s.end(JSON.stringify({ translations: [{ text: '你好' }] }));
    });
  });
  await new Promise(r => fake.listen(0, '127.0.0.1', r));
  process.env.TRANSLATION_PROVIDER = 'deepl';
  process.env.DEEPL_API_KEY = 'test-key-123';
  process.env.DEEPL_API_URL = 'http://127.0.0.1:' + fake.address().port + '/translate';

  const r1 = await req('/translate', { method: 'POST', body: { text: 'Hello', target: 'zh' } });
  check('deepl proxy -> 200 + translated text', r1.status === 200 && r1.data.text === '你好' && r1.data.provider === 'deepl');
  check('deepl auth header', !!seen && seen.auth === 'DeepL-Auth-Key test-key-123');
  check('deepl form body', !!seen && seen.body.includes('target_lang=ZH') && seen.body.includes('text=Hello'));

  fake.close();
  process.env.TRANSLATION_PROVIDER = savedProvider;
  if (savedKey) process.env.DEEPL_API_KEY = savedKey; else delete process.env.DEEPL_API_KEY;
  if (savedUrl) process.env.DEEPL_API_URL = savedUrl; else delete process.env.DEEPL_API_URL;
}

console.log(results.map(([n, ok]) => (ok ? 'PASS' : 'FAIL') + ' | ' + n).join('\n'));
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed === 0 ? 'ALL BACKEND TESTS PASSED (' + results.length + ')' : failed + ' CHECKS FAILED');

server.close();
process.exit(failed === 0 ? 0 : 1);
