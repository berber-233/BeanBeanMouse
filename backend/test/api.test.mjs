/* BeanBeanMouse 后端接口测试：启动内存 SQLite + HTTP 服务，逐接口断言 */
process.env.DB_PATH = ':memory:';
process.env.TRANSLATION_PROVIDER = 'mock';
process.env.TRANSLATION_DAILY_QUOTA = '10';
process.env.REGISTER_LIMIT = '100';
process.env.LOGIN_LIMIT = '100';
/* 测试需要反复用一次性地址注册（test.com / example.com），生产默认拦截 */
process.env.BLOCK_DISPOSABLE_EMAIL = '0';
/* 用非 mock 的通道名 => 视为"邮件通道已就绪"，这样"忘记密码"的正路也能测；
 * 实际发送仍然只是写进 mail_outbox（本地不会真发信）。 */
process.env.MAIL_TRANSPORT = 'noop';
process.env.FORGOT_LIMIT = '100';
process.env.MAIL_READY = '1';

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
  const r = await req('/products?kw=fountain');
  check('products keyword search', r.status === 200 && r.data.items.length === 1 && /fountain/i.test(r.data.items[0].translations.en.title));
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
  /* 货号（SKU）：BBM-<品类码>-<4 位序号>，客服/仓库按货号找货 */
  check('新商品自动分配货号 BBM-XXX-0001', /^BBM-[A-Z]+-\d{4}$/.test(r.data.code || ''));
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
  /* 买家回执：外贸询盘最怕"发出去没回音"，新询盘要给买家发一封确认信 */
  const ack = get("SELECT * FROM mail_outbox WHERE recipient = ? AND subject LIKE ? ORDER BY created_at DESC LIMIT 1", 'buyer@demo.com', '%询盘%');
  check('询盘后给买家发回执邮件', !!ack && /We received your inquiry/.test(ack.subject || ''));
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

/* ---- 货物物流：卖家创建、更新事件，买卖双方可见 ---- */
let shipmentId;
{
  const r = await req('/orders/' + orderId + '/shipments', {
    method: 'POST', token: sellerToken,
    body: { carrier: 'COSCO', trackingNo: 'COSU1234567', mode: 'sea', origin: 'Ningbo, CN', destination: 'Hamburg, DE', eta: Date.now() + 30 * 864e5 }
  });
  check('卖家创建物流单 -> 201 processing (sea)', r.status === 201 && r.data.status === 'processing' && r.data.mode === 'sea' && r.data.events.length === 1);
  shipmentId = r.data.id;
}
{
  const r = await req('/orders/' + orderId + '/shipments', { method: 'POST', token: buyerToken, body: { carrier: 'X' } });
  check('买家创建物流单 -> 403', r.status === 403 && r.data.error === 'FORBIDDEN');
}
{
  const r = await req('/orders/' + orderId + '/shipments', { token: buyerToken });
  check('买家可见物流单（买卖双方可见）', r.status === 200 && Array.isArray(r.data) && r.data.some(s => s.id === shipmentId));
}
{
  const r = await req('/orders/' + orderId + '/shipments/' + shipmentId + '/events', {
    method: 'POST', token: sellerToken,
    body: { status: 'shipped', location: 'Ningbo Port', note: 'Loaded on vessel, B/L issued' }
  });
  check('卖家更新物流事件 -> shipped', r.status === 200 && r.data.status === 'shipped' && r.data.current_location === 'Ningbo Port' && r.data.events.length === 2);
}
{
  const r = await req('/orders/' + orderId + '/shipments/' + shipmentId + '/events', {
    method: 'POST', token: sellerToken, body: { status: 'teleport', location: 'X' }
  });
  check('非法物流状态 -> 400', r.status === 400 && r.data.error === 'INVALID_STATUS');
}
{
  const r = await req('/orders/' + orderId + '/shipments/' + shipmentId + '/events', {
    method: 'POST', token: buyerToken, body: { status: 'delivered', location: 'Hamburg' }
  });
  check('买家更新物流事件 -> 403', r.status === 403);
}

/* ---- 第三方保险：试点计划 + 合作商框架 ---- */
let insuranceId;
{
  const r = await req('/insurances/providers');
  check('保险商列表（试点 + 合作占位）', r.status === 200 && r.data.length >= 3 && r.data[0].enabled === 1);
  const prov = r.data.find(p => p.enabled === 1);
  const buy = await req('/insurances', { method: 'POST', token: buyerToken, body: { orderId, providerId: prov.id, tier: 'standard' } });
  check('买家投保 -> 201 active', buy.status === 201 && buy.data.status === 'active' && buy.data.premium > 0);
  insuranceId = buy.data && buy.data.id;
  const dup = await req('/insurances', { method: 'POST', token: buyerToken, body: { orderId, providerId: prov.id, tier: 'basic' } });
  check('重复投保 -> 400', dup.status === 400 && dup.data.error === 'DUPLICATE');
  const sellerBuy = await req('/insurances', { method: 'POST', token: sellerToken, body: { orderId, providerId: prov.id, tier: 'basic' } });
  check('非买家投保 -> 403', sellerBuy.status === 403);
  const badTier = await req('/insurances', { method: 'POST', token: buyerToken, body: { orderId: 'o-none', providerId: prov.id, tier: 'basic' } });
  check('非本人订单投保 -> 403', badTier.status === 403);
}
{
  const r = await req('/insurances/' + insuranceId, { token: sellerToken });
  check('卖家可见保单（双方可见）', r.status === 200 && r.data.order_id === orderId);
  const r2 = await req('/insurances/' + insuranceId + '/cancel', { method: 'POST', token: buyerToken });
  check('买家取消保单 -> cancelled', r2.status === 200 && r2.data.status === 'cancelled');
}

/* ---- 合同草案保管：30 天电子保管 + 哈希留痕 ---- */
let custodyId;
{
  const draft = 'DRAFT v1: Buyer Thomas, Seller Wang, product P1, qty 100, total 13500 USD, Incoterm FOB, payment TT 30% deposit, delivery 45 days.';
  const r = await req('/contracts/custody', { method: 'POST', token: buyerToken, body: { orderId, draftText: draft } });
  check('买家申请合同保管 -> 201 active', r.status === 201 && r.data.status === 'active' && r.data.contract_hash.length === 64);
  custodyId = r.data && r.data.id;
  const days = Math.round((r.data.expires_at - r.data.created_at) / (24 * 3600 * 1000));
  check('保管期限为 30 天', days === 30);
  const dup = await req('/contracts/custody', { method: 'POST', token: buyerToken, body: { orderId, draftText: draft } });
  check('重复申请返回既有保管记录', dup.status === 200 && dup.data.id === custodyId);
}
{
  const r = await req('/contracts/' + custodyId, { token: sellerToken });
  check('卖家可见保管记录（双方可见）', r.status === 200 && r.data.id === custodyId);
  const r2 = await req('/contracts/' + custodyId, { token: adminToken });
  check('管理员可见保管记录', r2.status === 200);
}

/* ---- 第三方存证：自动记录 + 手动快照 + 哈希链验证 ---- */
let evidenceCount, evidenceId;
{
  const r = await req('/evidence?orderId=' + orderId, { token: sellerToken });
  check('订单自动生成存证链', r.status === 200 && r.data.total >= 4 && r.data.verified === true);
  evidenceCount = r.data.total;
}
{
  const r = await req('/evidence', {
    method: 'POST', token: buyerToken,
    body: { orderId, kind: 'manual_snapshot', refId: orderId, snapshot: { note: '双方确认最终条款', amount: 13500 } }
  });
  check('手动保存存证快照 -> 201', r.status === 201 && r.data.kind === 'manual_snapshot');
  evidenceId = r.data.id;
}
{
  const r = await req('/evidence?orderId=' + orderId, { token: sellerToken });
  check('新增后存证链仍有效', r.status === 200 && r.data.total === evidenceCount + 1 && r.data.verified === true);
}
{
  const r = await req('/evidence/' + evidenceId + '/verify', { method: 'POST', token: sellerToken });
  check('单条存证验证 -> 链有效', r.status === 200 && r.data.chainValid === true && r.data.total >= 5);
}
{
  const r = await req('/evidence?orderId=no-such-order', { token: sellerToken });
  check('不存在订单的存证 -> 404', r.status === 404);
}

/* ---- 卖家推广：提交 → 管理员审核 → 产品标记 promoted ---- */
let promoId;
{
  const r = await req('/promotions', {
    method: 'POST', token: sellerToken,
    body: { productId: createdProductId, days: 14, budget: 'basic', note: '新品上市推广' }
  });
  check('卖家提交推广申请 -> 201 pending', r.status === 201 && r.data.status === 'pending' && r.data.days === 14);
  promoId = r.data.id;
}
{
  const r = await req('/promotions', { method: 'POST', token: buyerToken, body: { productId: createdProductId, days: 7 } });
  check('买家提交推广申请 -> 403', r.status === 403 && r.data.error === 'FORBIDDEN');
}
{
  const r = await req('/promotions', { token: adminToken });
  check('管理员可见全部推广申请', r.status === 200 && r.data.items.some(x => x.id === promoId));
}
{
  const r = await req('/promotions', { token: sellerToken });
  check('卖家可见自己的推广申请', r.status === 200 && r.data.items.some(x => x.id === promoId));
}
{
  const r = await req('/products/' + createdProductId);
  check('审核前产品 promoted = false', r.status === 200 && r.data.promoted === false);
}
{
  const r = await req('/promotions/' + promoId + '/review', { method: 'POST', token: adminToken, body: { action: 'approve' } });
  check('管理员通过推广 -> approved', r.status === 200 && r.data.status === 'approved');
}
{
  const r = await req('/products/' + createdProductId);
  check('审核后产品 promoted = true', r.status === 200 && r.data.promoted === true);
}
{
  const r = await req('/promotions/' + promoId + '/review', { method: 'POST', token: sellerToken, body: { action: 'approve' } });
  check('卖家审核推广 -> 403', r.status === 403);
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
/* ---- 只填一种语言也能发布：另一种由服务端补齐（"发布后客户看不懂/搜不到"的根因修复） ---- */
let oneLangProductId = null, oneLangCode = '';
{
  const r = await req('/products', {
    method: 'POST', token: adminToken,
    body: { category: 'pet', sub: 'pet-hamster', country: 'CN', priceMin: 3, priceMax: 5, moq: 100, unit: 'pcs', leadTime: 15, srcLang: 'zh', translations: { zh: { title: '仓鼠静音跑轮 21cm', description: '静音轴承，直径 21cm。' } } }
  });
  check('只填中文也能发布 -> 201', r.status === 201 && r.data.id);
  oneLangProductId = r.data.id;
  oneLangCode = r.data.code || '';
  check('另一种语言被自动补齐（英文标题非空）', !!(r.data.translations && r.data.translations.en && r.data.translations.en.title));
  check('细分类推导出货号前缀 HAM', /^BBM-HAM-\d{4}$/.test(r.data.code || ''));
}
{
  /* 新商品默认待审核，前台只列已上架：这里带管理员令牌看全部 */
  const r = await req('/products?status=all&kw=' + encodeURIComponent(oneLangCode), { token: adminToken });
  check('按货号能搜到商品', r.status === 200 && (r.data.items || []).some(p => p.id === oneLangProductId));
}
{
  const r = await req('/products', { method: 'POST', token: adminToken, body: { category: 'pet', country: 'CN', translations: {} } });
  check('两种语言都没填 -> 400', r.status === 400 && r.data.error === 'VALIDATION');
}
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
  const r = await req('/news/auto', { token: adminToken });
  check('admin 查看资讯自动刷新状态 -> 200', r.status === 200 && typeof r.data.enabled === 'boolean' && typeof r.data.intervalMs === 'number');
}
{
  const r = await req('/news/auto', { token: buyerToken });
  check('非管理员查看自动刷新状态 -> 403', r.status === 403);
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

/* ---- v0.2 模块：资料/名片、建议、售后、单据、出口资质、模板、合规、物流 ---- */
{
  const r = await req('/profile', { method: 'PUT', token: buyerToken, body: { accountType: 'company', jobTitle: 'Purchasing Manager', company: 'Müller GmbH', country: 'DE', bio: 'Kitchenware imports' } });
  check('profile PUT -> 200', r.status === 200 && r.data.ok === true);
  const g = await req('/profile', { method: 'GET', token: buyerToken });
  check('profile GET -> fields + completeness', g.status === 200 && g.data.fields.jobTitle === 'Purchasing Manager' && g.data.completeness > 0);
  const c = await req('/profile', { method: 'PUT', token: buyerToken, body: { businessCard: 'data:image/png;base64,AAAA', businessCardName: 'card.png' } });
  const g2 = await req('/profile', { method: 'GET', token: buyerToken });
  check('profile business card saved', c.status === 200 && g2.data.card === 'data:image/png;base64,AAAA' && g2.data.cardName === 'card.png');
}
{
  const r = await req('/suggestions', { method: 'POST', token: buyerToken, body: { type: 'ux', content: 'Please add dark mode', contact: 'b@b.com' } });
  check('suggestions create -> 201', r.status === 201 && r.data.status === 'new');
  const list = await req('/suggestions', { method: 'GET', token: buyerToken });
  check('suggestions list (buyer own)', list.status === 200 && list.data.items.some(x => x.id === r.data.id));
  const st = await req('/suggestions/' + r.data.id + '/status', { method: 'POST', token: adminToken, body: { status: 'done' } });
  check('suggestions admin status -> done', st.status === 200 && st.data.status === 'done');
}
{
  const r = await req('/after-sales', { method: 'POST', token: buyerToken, body: { orderId: orderId, type: 'quality', description: 'broken hinge', resolution: 'reship parts' } });
  check('after-sales create -> 201 new', r.status === 201 && r.data.status === 'new' && !!r.data.id);
  const resp = await req('/after-sales/' + r.data.id + '/respond', { method: 'POST', token: sellerToken, body: { action: 'accept', reply: 'will reship' } });
  check('after-sales seller accept -> resolved', resp.status === 200 && resp.data.status === 'resolved');
  const d = await req('/after-sales', { method: 'POST', token: buyerToken, body: { orderId: orderId, type: 'other', description: 'delay claim', dispute: true } });
  check('after-sales dispute -> arbitrating', d.status === 201 && d.data.status === 'arbitrating' && d.data.dispute === 1);
  const ar = await req('/after-sales/' + d.data.id + '/arbitrate', { method: 'POST', token: adminToken, body: { ruling: 'buyer', note: 'per evidence' } });
  check('after-sales admin arbitrate -> resolved', ar.status === 200 && ar.data.ruling === 'buyer' && ar.data.status === 'resolved');
}
{
  const r = await req('/orders/' + orderId + '/documents', { method: 'POST', token: buyerToken, body: { type: 'CI' } });
  check('order documents generate -> 201', r.status === 201 && r.data.items.some(x => x.doc_type === 'CI'));
  const g = await req('/orders/' + orderId + '/documents', { method: 'GET', token: sellerToken });
  check('order documents list (both sides)', g.status === 200 && g.data.items.length >= 1);
}
{
  const r = await req('/exports/readiness', { method: 'GET', token: sellerToken });
  check('exports readiness GET -> score', r.status === 200 && r.data.items.length >= 7);
  const u = await req('/exports/readiness', { method: 'PUT', token: sellerToken, body: { itemId: 'customs-reg', done: true } });
  check('exports readiness PUT -> updated', u.status === 200 && u.data.items.find(x => x.id === 'customs-reg').done === true);
}
{
  const r = await req('/card-templates', { method: 'GET' });
  check('card-templates -> 5 presets', r.status === 200 && Array.isArray(r.data) && r.data.length === 5);
  const s = await req('/compliance/screen', { method: 'POST', body: { text: 'Military drone with night vision' } });
  check('compliance screen -> flags', s.status === 200 && s.data.clean === false && s.data.hits.length >= 3);
  const e = await req('/logistics/estimate', { method: 'POST', body: { mode: 'sea', weight: 500, volume: 3, container: 'LCL' } });
  check('logistics estimate -> ranges', e.status === 200 && e.data.currency === 'USD' && e.data.lo > 0 && e.data.hi >= e.data.lo);
}
{
  await req('/conversations/conv-read-1/messages', { method: 'POST', token: buyerToken, body: { text: 'hello' } });
  const rd = await req('/conversations/conv-read-1/read', { method: 'POST', token: buyerToken, body: { lastReadAt: Date.now() } });
  check('conversation read receipt -> 200', rd.status === 200 && !!rd.data.lastReadAt);
  const readers = await req('/conversations/conv-read-1/read', { method: 'GET', token: buyerToken });
  check('conversation readers list', readers.status === 200 && Array.isArray(readers.data.readers) && readers.data.readers.length >= 1);
}
{
  const r = await req('/verify-turnstile', { method: 'POST', body: { token: 'x' } });
  check('verify-turnstile disabled without secret -> ok', r.status === 200 && r.data.ok === true && r.data.disabled === true);
  const reg = await req('/auth/register', { method: 'POST', body: { email: 'ts@test.com', password: 'Passw0rd', role: 'buyer', name: 'TS User', turnstileToken: 'x' } });
  check('register with turnstile token (secret off) -> 201', reg.status === 201);
}

/* ---- 忘记密码：邮件重置全流程（放最后，因为它会让该账号旧令牌失效） ---- */
/* ---- 询盘附件：文件存对象存储，清单入库（之前附件提交即丢） ---- */
{
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const up = await req('/files', { method: 'POST', token: buyerToken, body: { data: png, mime: 'image/png', filename: 'spec.png' } });
  check('买方上传询盘附件 -> 201', up.status === 201 && !!up.data.id);
  const inq = await req('/inquiries', {
    method: 'POST', token: buyerToken,
    body: { productId: 'p1', qty: 10, unit: 'pcs', message: '带附件的询盘（测试）', attachments: [{ fileId: up.data.id, name: 'spec.png', size: 120, type: 'image/png' }] }
  });
  check('带附件的询盘 -> 201', inq.status === 201 && !!inq.data.id);
  const row = get('SELECT attachments FROM inquiries WHERE id = ?', inq.data.id);
  const list = row && row.attachments ? JSON.parse(row.attachments) : [];
  check('附件清单已入库', list.length === 1 && list[0].fileId === up.data.id, JSON.stringify(list).slice(0, 80));
  const detail = await req('/inquiries', { token: buyerToken });
  const mine = (detail.data || []).find(x => x.id === inq.data.id);
  check('接口回读时带 attachments 字段', !!mine && !!mine.attachments, mine ? String(mine.attachments).slice(0, 60) : 'missing');
}

/* ---- 商品图片：上传文件 → 挂到商品 → 公开可读 → 摘除 ---- */
{
  const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
  const up = await req('/files', { method: 'POST', token: adminToken, body: { data: png, mime: 'image/png', filename: 'probe.png' } });
  check('上传商品图片 -> 201', up.status === 201 && !!up.data.id);
  const fileId = up.data && up.data.id;
  if (fileId) {
    const attach = await req('/products/p1/images', { method: 'POST', token: adminToken, body: { fileIds: [fileId] } });
    check('把图片挂到商品 -> 200 且 images 有记录', attach.status === 200 && Array.isArray(attach.data.images) && attach.data.images.length >= 1);
    const imgUrl = attach.data.images[0].url;
    const served = await fetch(base + imgUrl);
    check('商品图可公开访问（无需登录）', served.status === 200 && /image\/png/.test(served.headers.get('content-type') || ''));
    const detail = await req('/products/p1');
    check('商品详情带 images 字段', Array.isArray(detail.data.images) && detail.data.images.length >= 1);
    const imgId = attach.data.images[0].id;
    const rm = await req('/products/p1/images/' + imgId, { method: 'DELETE', token: adminToken });
    check('摘除商品图 -> 200', rm.status === 200);
  }
  const bad = await req('/products/p1/images', { method: 'POST', token: adminToken, body: { fileIds: ['not-exist'] } });
  check('挂不存在的文件被拒', bad.status === 400);
}

{
  const ready = await req('/auth/mail-ready');
  check('mail-ready 报告邮件通道就绪', ready.status === 200 && ready.data.ready === true);

  /* 用先前已通过验证的 new@test.com，先拿一个"旧令牌" */
  const before = await req('/auth/login', { method: 'POST', body: { email: 'new@test.com', password: 'Passw0rd' } });
  check('重置前可登录', before.status === 200 && !!before.data.token);
  const oldToken = before.data.token;

  const forgot = await req('/auth/forgot-password', { method: 'POST', body: { email: 'new@test.com' } });
  check('forgot-password -> 200（不暴露邮箱是否存在）', forgot.status === 200 && forgot.data.ok === true);
  const unknown = await req('/auth/forgot-password', { method: 'POST', body: { email: 'nobody-here@test.com' } });
  check('未注册邮箱同样返回 200', unknown.status === 200 && unknown.data.ok === true);

  const mail = get("SELECT * FROM mail_outbox WHERE recipient = ? AND subject LIKE ? ORDER BY created_at DESC LIMIT 1", 'new@test.com', '%重置%');
  const m = mail ? /token=([0-9a-f]+)/.exec(mail.body || '') : null;
  check('重置邮件里带 token 链接', !!(mail && m));

  const reset = await req('/auth/reset-password', { method: 'POST', body: { token: m[1], password: 'NewPass1234' } });
  check('reset-password -> 200', reset.status === 200 && reset.data.ok === true);

  const weak = await req('/auth/reset-password', { method: 'POST', body: { token: m[1], password: 'abc' } });
  check('弱密码被拒', weak.status === 400);
  const reuse = await req('/auth/reset-password', { method: 'POST', body: { token: m[1], password: 'Another1234' } });
  check('同一重置链接不能重复使用', reuse.status === 400);

  const loginNew = await req('/auth/login', { method: 'POST', body: { email: 'new@test.com', password: 'NewPass1234' } });
  check('新密码可以登录', loginNew.status === 200 && !!loginNew.data.token);
  const loginOld = await req('/auth/login', { method: 'POST', body: { email: 'new@test.com', password: 'Passw0rd' } });
  check('旧密码已失效', loginOld.status === 401);

  const meOld = await req('/auth/me', { token: oldToken });
  check('改密前签发的旧令牌立即失效', meOld.status === 401, 'status=' + meOld.status);
}

/* ---- 客服快捷短语 / 聊天话术 ---- */
{
  const r = await req('/quick-replies', { method: 'POST', token: adminToken, body: { scene: 'quote', title: '报价口径', body: '报价：{{price}}' } });
  check('快捷短语新建 -> 201', r.status === 201 && !!r.data.id && r.data.scene === 'quote');
  const id = r.data && r.data.id;
  const list = await req('/quick-replies', { token: adminToken });
  check('快捷短语列表（含刚建的）', list.status === 200 && (list.data.items || []).some(x => x.id === id));
  const other = await req('/quick-replies', { token: buyerToken });
  check('快捷短语按账号隔离（买家看不到管理员的）', other.status === 200 && !(other.data.items || []).some(x => x.id === id));
  const bad = await req('/quick-replies', { method: 'POST', token: adminToken, body: { title: '', body: '' } });
  check('快捷短语缺字段 -> 400', bad.status === 400 && bad.data.error === 'VALIDATION');
  const upd = await req('/quick-replies/' + id, { method: 'PUT', token: adminToken, body: { body: '更新后的报价' } });
  check('快捷短语修改 -> 200', upd.status === 200 && upd.data.body === '更新后的报价');
  const steal = await req('/quick-replies/' + id, { method: 'DELETE', token: buyerToken });
  check('别人的短语不能删 -> 403', steal.status === 403);
  const del = await req('/quick-replies/' + id, { method: 'DELETE', token: adminToken });
  check('快捷短语删除 -> 200', del.status === 200 && del.data.ok === true);
  const anon = await req('/quick-replies');
  check('未登录访问快捷短语 -> 401', anon.status === 401);
}

/* ---- 地址管理 / 表单记录（pet0.3） ---- */
{
  const auto = await req('/addresses', { token: adminToken });
  check('地址簿：询盘后自动收录客户', auto.status === 200 && (auto.data.items || []).length >= 1);

  const created = await req('/addresses', { method: 'POST', token: adminToken, body: { name: '测试联系人', company: 'Unit Test Co', country: 'DE', city: 'Berlin', phone: '+49 30 0000' } });
  check('地址簿：手动新增 -> 201', created.status === 201 && !!created.data.id);
  const addrId = created.data && created.data.id;

  const upd = await req('/addresses/' + addrId, { method: 'PUT', token: adminToken, body: { note: '唛头按客户版' } });
  check('地址簿：修改 -> 200', upd.status === 200 && upd.data.note === '唛头按客户版');

  const buyerList = await req('/addresses', { token: buyerToken });
  check('地址簿：买家看不到平台地址', buyerList.status === 200 && !(buyerList.data.items || []).some(x => x.id === addrId));

  const del = await req('/addresses/' + addrId, { method: 'DELETE', token: adminToken });
  check('地址簿：删除 -> 200', del.status === 200 && del.data.ok === true);

  const anon = await req('/addresses');
  check('地址簿：未登录 -> 401', anon.status === 401);

  const rec = await req('/records', { token: adminToken });
  check('表单记录：有询盘/报价/订单记录', rec.status === 200 && (rec.data.items || []).length >= 1);
  check('表单记录：每条都带类型与关联单号', (rec.data.items || []).every(x => !!x.kind && !!x.refId));
  const recKw = await req('/records?kw=' + encodeURIComponent('zzz-不存在-zzz'), { token: adminToken });
  check('表单记录：关键词过滤生效', recKw.status === 200 && (recKw.data.items || []).length === 0);
}

console.log(results.map(([n, ok]) => (ok ? 'PASS' : 'FAIL') + ' | ' + n).join('\n'));
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed === 0 ? 'ALL BACKEND TESTS PASSED (' + results.length + ')' : failed + ' CHECKS FAILED');

server.close();
process.exit(failed === 0 ? 0 : 1);
