/* 平台无关的 API 应用（由 backend/src/server.mjs 与 functions/api/[[path]].js 共用）。
 *
 * 本文件由 backend/src/server.mjs 机械迁移而来（见 scripts/_port-once.mjs）：
 * Node 专有的 node:http / node:crypto / node:sqlite 已替换为
 *   - 注入的 ENV（各平台配置）
 *   - platform.mjs 的 WebCrypto 实现
 *   - store.mjs 的数据门面（Node=node:sqlite，Workers=D1）
 * 路由与业务逻辑保持不变。
 */
import { randomUUID, randomBytes, toHex, sha256Hex, base64ToBytes } from './platform.mjs';
import { get, run, all } from './store.mjs';
import { seedIfEmpty, antiFakeCode, newAntiFakeCode } from './seed.mjs';
import { hashPassword, verifyPassword, signToken, verifyToken, configureAuth } from './auth.mjs';
import { translateText, translateError } from './translate.mjs';
import { validateFile, putFile, getFile, deleteFile, UPLOAD_DIR, MAX_FILE_SIZE, storageInfo } from './storage.mjs';
import { sendMail, notifyUser, mailerInfo } from './mailer.mjs';
import { verifyEmailContent, resetPasswordContent } from './email-template.mjs';

export function createApp({ env = {}, deps = {} } = {}) {
  const ENV = env;
  /* 试用期可关闭邮箱验证：REQUIRE_EMAIL_VERIFY=0 */
  const REQUIRE_EMAIL_VERIFY = String(ENV.REQUIRE_EMAIL_VERIFY === undefined ? '1' : ENV.REQUIRE_EMAIL_VERIFY) !== '0';
  /* 新账号是否需要管理员审核（试用期用人工把关替代邮件验证） */
  const REQUIRE_ACCOUNT_REVIEW = String(ENV.REQUIRE_ACCOUNT_REVIEW === undefined ? '0' : ENV.REQUIRE_ACCOUNT_REVIEW) !== '0';
  const wsBroadcast = typeof deps.wsBroadcast === 'function' ? deps.wsBroadcast : () => {};
  configureAuth({ secret: ENV.JWT_SECRET, iterations: ENV.PBKDF2_ITERATIONS });
  /* 接口对外前缀：线上是 Pages Functions（/api/*），本地 Node 直起是根路径。
   * 返回给前端的文件地址必须带这个前缀，否则 /files/<id> 直连是 404。 */
  const API_BASE = String(ENV.API_BASE_PATH || '').replace(/\/+$/, '');




/* ---------- 资讯 RSS 源与刷新（手动/自动共用） ---------- */
const NEWS_FEEDS = [
  { url: 'https://www.wto.org/english/news_e/news_e.rss', name: 'WTO News', region: 'global', category: 'policy' },
  { url: 'https://taxation-customs.ec.europa.eu/en/rss-feeds', name: 'EU Taxation & Customs', region: 'EU', category: 'compliance' },
  { url: 'https://www.customs.gov.cn/customs/302249/302274/index.html', name: '中国海关总署', region: 'CN', category: 'logistics' }
];
function parseRss(xml) {
  const out = [];
  const re = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/g;
  let m;
  while ((m = re.exec(xml))) {
    const blk = m[1];
    const title = /<title[^>]*>([\s\S]*?)<\/title>/.exec(blk);
    const link = /<link[^>]*href="([^"]+)"[^>]*>/.exec(blk) || /<link>([\s\S]*?)<\/link>/.exec(blk);
    const pub = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(blk) || /<published>([\s\S]*?)<\/published>/.exec(blk) || /<updated>([\s\S]*?)<\/updated>/.exec(blk);
    if (!title || !link) continue;
    out.push({
      title: title[1].replace(/<!\[CDATA\[|\]\]>/g, '').trim(),
      url: (link[1] || link[2] || '').trim(),
      publishedAt: pub ? pub[1].trim() : new Date().toISOString()
    });
  }
  return out;
}
async function refreshNewsFeeds(actorId) {
  let added = 0, failed = 0;
  for (const feed of NEWS_FEEDS) {
    try {
      const resp = await fetch(feed.url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'BeanBeanMouse/1.0' } });
      if (!resp.ok) { failed++; continue; }
      const xml = await resp.text();
      const items = parseRss(xml);
      let src = await get('SELECT * FROM news_sources WHERE name = ?', feed.name);
      if (!src) {
        const sid = randomUUID();
        await run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)',
          sid, feed.name, feed.url, feed.region, feed.category, 1);
        src = await get('SELECT * FROM news_sources WHERE id = ?', sid);
      }
      for (const it of items.slice(0, 10)) {
        if (!it.url || await get('SELECT id FROM news_items WHERE url = ?', it.url)) continue;
        await run(
          'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, updated_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          randomUUID(), src.id, feed.region, feed.category, it.title, it.title, '', '', it.url, it.publishedAt, Date.now(), 'published'
        );
        added++;
      }
    } catch (e) {
      failed++;
      console.error('[news.refresh] ' + feed.name + ': ' + e.message);
    }
  }
  await audit(actorId, 'news.refresh', 'news', '', 'added=' + added + ' failed=' + failed + (actorId ? '' : ' (auto)'));
  return { added, failed, note: 'RSS 抓取为尽力而为，失败不影响现有资讯' };
}

/* 资讯自动刷新：默认每 6 小时一次，可通过环境变量关闭/调整；避免并发重叠，unref 不阻塞进程退出 */
const NEWS_AUTO_REFRESH = ENV.NODE_ENV !== 'test' && String(ENV.NEWS_AUTO_REFRESH || '1') !== '0';
const NEWS_AUTO_REFRESH_MS = Math.max(60 * 1000, Number(ENV.NEWS_AUTO_REFRESH_MS) || 6 * 3600 * 1000);
const newsAutoState = {
  enabled: NEWS_AUTO_REFRESH,
  intervalMs: NEWS_AUTO_REFRESH_MS,
  lastRunAt: null,
  nextRunAt: NEWS_AUTO_REFRESH ? Date.now() + NEWS_AUTO_REFRESH_MS : null,
  running: false
};
function startNewsAutoRefresh() {
  if (!NEWS_AUTO_REFRESH) return;
  const t = setInterval(async () => {
    if (newsAutoState.running) return;
    newsAutoState.running = true;
    try {
      const r = await refreshNewsFeeds(null);
      newsAutoState.lastRunAt = Date.now();
      console.log('[news.auto] refresh done added=' + r.added + ' failed=' + r.failed);
    } catch (e) {
      console.error('[news.auto] refresh failed: ' + e.message);
    } finally {
      newsAutoState.running = false;
      newsAutoState.nextRunAt = Date.now() + NEWS_AUTO_REFRESH_MS;
    }
  }, NEWS_AUTO_REFRESH_MS);
  t.unref();
}

/* 保险商框架：首次访问自动写入试点计划 + 合作商占位（后续接入真实保险公司时改为后台维护） */
async function ensureInsuranceProviders() {
  const n = (await all('SELECT COUNT(*) AS c FROM insurance_providers'))[0].c;
  if (n > 0) return;
  const now = Date.now();
  const defaults = [
    {
      name: '豆豆鼠护航计划（平台试点）',
      region: 'GLOBAL', sort: 1, enabled: 1,
      tiers: {
        basic:    { label: '基础保障', rate: 0.005, minPremium: 3,  coverage: '运输途中意外损坏（免赔 20%，最高赔偿订单金额）' },
        standard: { label: '标准保障', rate: 0.010, minPremium: 5,  coverage: '损坏 / 灭失 + 延误补贴（免赔 10%）' },
        premium:  { label: '尊享保障', rate: 0.015, minPremium: 10, coverage: '全损 / 损坏 / 延误 + 关税损失（免赔 5%）' }
      }
    },
    { name: '合作保险商 A（接入洽谈中）', region: 'GLOBAL', sort: 2, enabled: 0, tiers: {} },
    { name: '合作保险商 B（接入洽谈中）', region: 'GLOBAL', sort: 3, enabled: 0, tiers: {} }
  ];
  for (const d of defaults) {
    await run(
      'INSERT INTO insurance_providers (id, name, region, tiers, enabled, sort, created_at) VALUES (?,?,?,?,?,?,?)',
      randomUUID(), d.name, d.region, JSON.stringify(d.tiers), d.enabled, d.sort, now
    );
  }
}

/* 简单登录限流：同 IP 每分钟最多 10 次（防暴力破解） */
const loginAttempts = new Map();
const LOGIN_LIMIT = Number(ENV.LOGIN_LIMIT || 10);
function loginRateLimit(ip) {
  const now = Date.now();
  const win = 60 * 1000;
  const rec = loginAttempts.get(ip) || { count: 0, resetAt: now + win };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + win; }
  rec.count++;
  loginAttempts.set(ip, rec);
  return rec.count;
}

/* 管理员登录单独限流：更严（默认 15 分钟 5 次），并把失败尝试写进审计日志。
 * 演示期管理员密码是公开的，这一层是"还没改密码"时的兜底。 */
const adminLoginAttempts = new Map();
const ADMIN_LOGIN_LIMIT = Number(ENV.ADMIN_LOGIN_LIMIT || 8);
function adminLoginRateLimit(ip) {
  const now = Date.now();
  const win = 15 * 60 * 1000;
  const rec = adminLoginAttempts.get(ip) || { count: 0, resetAt: now + win };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + win; }
  rec.count++;
  adminLoginAttempts.set(ip, rec);
  return rec.count;
}
function adminLoginRateReset(ip) { adminLoginAttempts.delete(ip); }

/* 公开的默认管理员密码：登录时若还在用它，前端会提示立即修改 */
const DEFAULT_ADMIN_PASSWORD = String(ENV.DEFAULT_ADMIN_PASSWORD || 'admin123');
/* 登录态有效期：默认 7 天（原先 1 小时，用着用着就被踢回登录页，像"请先登录"的错觉） */
const TOKEN_TTL_SEC = Math.max(300, Number(ENV.TOKEN_TTL_SEC || 7 * 24 * 3600));

/* 邮件通道"真的可用"才算就绪：光配了通道名不够——半开通状态下用户点了
 * "忘记密码"却收不到信，比不显示这个入口更糟。凭据配好后把 MAIL_READY 置 1。 */
function mailReady() {
  const name = mailerInfo().transport;
  if (!name || name === 'mock') return false;
  return String(ENV.MAIL_READY === undefined ? '0' : ENV.MAIL_READY) === '1';
}

/* 注册限流：同 IP 每分钟最多 5 次（防批量机器人注册，可通过 REGISTER_LIMIT 调整） */
const registerAttempts = new Map();
const REGISTER_LIMIT = Number(ENV.REGISTER_LIMIT || 5);
async function registerRateLimit(ip) {
  const now = Date.now();
  const win = 60 * 1000;
  const rec = registerAttempts.get(ip) || { count: 0, resetAt: now + win };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + win; }
  rec.count++;
  registerAttempts.set(ip, rec);
  return rec.count;
}

/* 邮箱验证令牌：只存哈希、单次有效、24 小时过期 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/* 找回密码限流：单独计数（不跟注册混在一起），默认 15 分钟 5 次 */
const forgotAttempts = new Map();
const FORGOT_LIMIT = Number(ENV.FORGOT_LIMIT || 5);
function forgotRateLimit(ip) {
  const now = Date.now();
  const win = 15 * 60 * 1000;
  const rec = forgotAttempts.get(ip) || { count: 0, resetAt: now + win };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + win; }
  rec.count++;
  forgotAttempts.set(ip, rec);
  return rec.count;
}

/* 没有邮件服务时，注册这一关靠"邮箱初筛"兜底：
 * 一次性邮箱直接拒收；常见免费邮箱标 free，企业自有域名标 corporate，
 * 管理员在待审列表一眼能看出"这条注册值不值得放"。（免费域名的正常买家也很多，所以只标记不拦截。） */
const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com', 'guerrillamail.com', 'sharklasers.com', 'grr.la', 'guerrillamail.info',
  '10minutemail.com', 'tempmail.com', 'temp-mail.org', 'temp-mail.io', 'throwawaymail.com',
  'yopmail.com', 'yopmail.fr', 'trashmail.com', 'trash-mail.com', 'getnada.com', 'nada.email',
  'dispostable.com', 'maildrop.cc', 'spam4.me', 'fakeinbox.com', 'mailnesia.com', 'mailcatch.com',
  'mintemail.com', 'mytrashmail.com', 'discard.email', 'mohmal.com', 'tempr.email',
  'example.com', 'example.org', 'example.net', 'test.com', 'test.test', 'invalid.com', 'localhost.com'
]);
/* 自动化测试需要用一次性地址反复注册，可用 BLOCK_DISPOSABLE_EMAIL=0 关闭（生产保持开启） */
const BLOCK_DISPOSABLE_EMAIL = String(ENV.BLOCK_DISPOSABLE_EMAIL === undefined ? '1' : ENV.BLOCK_DISPOSABLE_EMAIL) !== '0';
const FREE_MAIL_DOMAINS = new Set([
  'qq.com', '163.com', '126.com', 'sina.com', 'sina.cn', 'sohu.com', 'aliyun.com', 'foxmail.com',
  'gmail.com', 'googlemail.com', 'outlook.com', 'hotmail.com', 'live.com', 'msn.com', 'yahoo.com',
  'yahoo.co.jp', 'icloud.com', 'me.com', 'aol.com', 'mail.ru', 'yandex.com', 'gmx.com', 'proton.me',
  'protonmail.com', 'zoho.com', 'naver.com', 'daum.net', 'hanmail.net'
]);
function emailDomain(email) {
  const m = /@([^@]+)$/.exec(String(email || ''));
  return m ? m[1].toLowerCase() : '';
}
function classifyEmail(email) {
  const d = emailDomain(email);
  if (DISPOSABLE_DOMAINS.has(d)) return 'disposable';
  if (FREE_MAIL_DOMAINS.has(d)) return 'free';
  return 'corporate';
}
/* 来源 IP：Cloudflare 会带 cf-connecting-ip，Node 本地调试退化到 socket */
function clientIp(req) {
  const h = req && req.headers ? req.headers : {};
  const raw = h['cf-connecting-ip'] || (h['x-forwarded-for'] ? String(h['x-forwarded-for']).split(',')[0] : '') || (req && req.socket && req.socket.remoteAddress) || '';
  return String(raw).trim().slice(0, 64);
}
async function sha256(s) { return await sha256Hex(s); }
async function newEmailToken(userId, purpose, ttlMs) {
  const token = toHex(randomBytes(24));
  await run(
    'INSERT INTO email_tokens (id, user_id, token_hash, purpose, expires_at, created_at) VALUES (?,?,?,?,?,?)',
    randomUUID(), userId, await sha256(token), purpose || 'verify_email',
    Date.now() + (ttlMs || 24 * 3600 * 1000), Date.now()
  );
  return token;
}
async function sendVerifyEmail(userId, email) {
  const token = await newEmailToken(userId);
  const appUrl = ENV.APP_URL || 'https://beanbeanmouse.com';
  const link = appUrl + '/#/verify-email?token=' + token;
  const tpl = verifyEmailContent({ link, name: (await get('SELECT name FROM users WHERE id = ?', userId) || {}).name });
  await sendMail({
    to: email,
    subject: tpl.subject,
    html: tpl.html,
    body: '欢迎注册 BeanBeanMouse！请点击以下链接完成邮箱验证（24 小时内有效）：\n\n' + link + '\n\n如非本人操作，请忽略本邮件。'
  });
  return link;
}

/* ---------- HTTP 基础 ---------- */
const CORS_ORIGIN = ENV.ALLOWED_ORIGINS ? ENV.ALLOWED_ORIGINS.split(',')[0].trim() : '*';
if (!ENV.ALLOWED_ORIGINS) {
  console.warn('[security] ALLOWED_ORIGINS 未配置，CORS 使用 *（仅建议开发/演示；生产请配置白名单）');
}
const CORS = {
  'Access-Control-Allow-Origin': CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'SAMEORIGIN',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};

function send(res, status, data) {
  const body = data === undefined ? '' : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS, ...SECURITY_HEADERS });
  res.end(body);
}
function sendBytes(res, status, buf, contentType, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': buf.length,
    'Cache-Control': 'private, max-age=3600',
    ...CORS,
    ...SECURITY_HEADERS,
    ...extraHeaders
  });
  res.end(buf);
}
function fail(res, status, code, message) {
  send(res, status, { error: code, message });
}
/* 请求体读取：平台入口会把原始体预置到 req.__rawText / req.__rawBuf，
 * Workers 侧则直接走 Fetch Request 的 text()/arrayBuffer()。 */
async function rawText(req) {
  if (typeof req.__rawText === 'string') return req.__rawText;
  if (typeof req.text === 'function') return await req.text();
  return '';
}
async function rawBuffer(req) {
  if (req.__rawBuf) return req.__rawBuf;
  if (typeof req.arrayBuffer === 'function') return new Uint8Array(await req.arrayBuffer());
  return new Uint8Array(0);
}
async function readBody(req) {
  const text = await rawText(req);
  if (!text) return {};
  try { return JSON.parse(text); } catch (e) { throw new Error('INVALID_JSON'); }
}
async function readRawBody(req) {
  return await rawBuffer(req);
}
function parseMultipart(rawBody, boundary) {
  /* 必须转成 Buffer：Cloudflare Workers 里取到的是 Uint8Array，
   * 而 Uint8Array.indexOf 只接受数字，传 Buffer 会得到 -1 →
   * 表现为"缺少文件字段"（本地 Node 正常、线上浏览器上传全失败的真凶）。 */
  const body = Buffer.isBuffer(rawBody)
    ? rawBody
    : (rawBody instanceof Uint8Array
      ? Buffer.from(rawBody.buffer, rawBody.byteOffset, rawBody.byteLength)
      : Buffer.from(rawBody));
  const delim = Buffer.from('--' + boundary);
  const parts = [];
  let pos = 0;
  for (;;) {
    const start = body.indexOf(delim, pos);
    if (start === -1) break;
    const headerEnd = body.indexOf(Buffer.from('\r\n\r\n'), start + delim.length);
    if (headerEnd === -1) break;
    const headerText = body.slice(start + delim.length + 2, headerEnd).toString('utf8');
    const contentStart = headerEnd + 4;
    const nextDelim = body.indexOf(Buffer.from('\r\n--' + boundary), contentStart);
    if (nextDelim === -1) break;
    const name = /name="([^"]+)"/.exec(headerText);
    const filename = /filename="([^"]*)"/.exec(headerText);
    parts.push({
      name: name ? name[1] : '',
      filename: filename ? filename[1] : '',
      contentType: /content-type:\s*([^\r\n]+)/i.exec(headerText)?.[1]?.trim() || 'application/octet-stream',
      content: body.slice(contentStart, nextDelim)
    });
    pos = nextDelim + 2;
  }
  return parts;
}
function pageParams(q) {
  const page = Math.max(1, parseInt(q.get('page') || '1', 10) || 1);
  const size = Math.min(100, Math.max(1, parseInt(q.get('size') || '20', 10) || 20));
  return { page, size };
}
function paginate(list, q) {
  const { page, size } = pageParams(q);
  const total = list.length;
  return { items: list.slice((page - 1) * size, page * size), total, page, size };
}

async function currentUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const payload = await verifyToken(token);
  if (!payload || !payload.uid) return null;
  const user = await get('SELECT * FROM users WHERE id = ?', payload.uid) || null;
  if (!user) return null;
  /* 令牌版本对不上 → 失效（找回密码/改密后，其他设备必须重新登录） */
  if ((payload.ver || 0) !== (user.token_version || 0)) return null;
  return user;
}
async function requireAuth(res, req, roles) {
  const u = await currentUser(req);
  if (!u) { fail(res, 401, 'UNAUTHORIZED', '请先登录'); return null; }
  /* 冻结必须立刻生效：只改数据库状态不够——旧令牌是自包含的，
   * 以前冻结后持旧令牌仍能进后台（用户反馈的"冻结了还能进去看"）。 */
  if (u.status === 'frozen') { fail(res, 401, 'ACCOUNT_FROZEN', '账号已被冻结，请联系平台'); return null; }
  if (roles && !roles.includes(u.role)) { fail(res, 403, 'FORBIDDEN', '权限不足'); return null; }
  return u;
}
function publicUser(u) {
  /* 卖家要把自己的 id 当成 sellerId：商品与询盘都按 users.id 归属，
   * 前端卖家工作台拿不到这个字段就会"一条自己的商品和询盘都看不到"。 */
  return u ? {
    id: u.id, email: u.email, role: u.role, name: u.name, status: u.status,
    sellerId: u.role === 'seller' ? u.id : undefined,
    /* 管理端权限：前端据此隐藏没有权限的菜单（真正的拦截在接口层） */
    permissions: u.role === 'admin' ? adminPermsOf(u) : undefined,
    permissionsFull: u.role === 'admin' ? (u.permissions === null || u.permissions === undefined || u.permissions === '') : undefined
  } : null;
}
async function audit(actor, action, targetType, targetId, detail) {
  await run(
    'INSERT INTO audit_logs (id, actor_id, action, target_type, target_id, detail, created_at) VALUES (?,?,?,?,?,?,?)',
    randomUUID(), actor || null, action, targetType || null, targetId || null, detail || '', Date.now()
  );
}
function safeJson(s, fallback) {
  try { return JSON.parse(s); } catch (e) { return fallback; }
}
/* 安全最佳实践：数值字段显式转换为有限数字，避免类型混淆/注入 */
function toNum(v, dft) {
  const n = Number(v);
  return Number.isFinite(n) ? n : dft;
}

/* ================= 管理端权限细分（2026-10-06） =================
 * 设计：role 仍是 'admin'（既有代码与既有管理员不动），权限放在 users.permissions。
 *   NULL / '' → 全权（老管理员兼容，如 admin@beanbeanmouse.com）
 *   JSON 数组 → 只拥有列出的权限，例如 ["products.review","service"]
 * 关键点：**接口层真的校验**。前端隐藏菜单只是体验，越权请求必须被 403 拦下，
 *        所以每个管理端接口都用 requirePerm()/denyAdminWrite() 过一遍。 */
const ADMIN_PERMS = ['products.publish', 'products.review', 'service', 'orders', 'customers', 'marketing', 'system'];
function adminPermsOf(u) {
  if (!u || u.role !== 'admin') return [];
  const raw = u.permissions;
  if (raw === null || raw === undefined || raw === '') return ADMIN_PERMS.slice();   /* 老管理员 = 全权 */
  const arr = safeJson(raw, []);
  return Array.isArray(arr) ? arr.filter(k => ADMIN_PERMS.indexOf(k) >= 0) : [];
}
function hasPerm(u, key) { return adminPermsOf(u).indexOf(key) >= 0; }
/* 管理端专用接口：要求管理员身份 + 指定权限 */
async function requirePerm(res, req, key) {
  const u = await requireAuth(res, req, ['admin']);
  if (!u) return null;
  if (!hasPerm(u, key)) {
    fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「' + key + '」权限，请联系有系统权限的管理员开通');
    return null;
  }
  return u;
}
/* 卖家/管理员共用的写接口：管理员需要额外具备该权限（卖家保持原有行为） */
function denyAdminWrite(res, u, key) {
  if (u && u.role === 'admin' && !hasPerm(u, key)) {
    fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「' + key + '」权限，请联系有系统权限的管理员开通');
    return true;
  }
  return false;
}

/* ---------------- 商品货号（SKU） ----------------
 * 规则：BBM-<品类码>-<4 位序号>，例如 BBM-HAM-0007 / BBM-DOGL-0012。
 * 品类码来自细分类，仓管与客服只看前缀就知道是哪一类，询盘里报货号即可定位。 */
const CODE_TAG = {
  hamster: 'HAM', cat: 'CAT', 'dog-small': 'DOGS', 'dog-large': 'DOGL',
  food: 'FOOD', grooming: 'GRM', toys: 'TOY', travel: 'TRV'
};
function codeTagOf(sub) {
  return CODE_TAG[String(sub || '').replace(/^pet-/, '')] || 'GEN';
}
async function allocateProductCode(sub) {
  const tag = codeTagOf(sub);
  const prefix = 'BBM-' + tag + '-';
  const row = await get('SELECT COUNT(*) AS c FROM products WHERE code LIKE ?', prefix + '%');
  const base = (row && row.c ? row.c : 0) + 1;
  for (let i = 0; i < 300; i++) {
    const code = prefix + String(base + i).padStart(4, '0');
    if (!(await get('SELECT id FROM products WHERE code = ?', code))) return code;
  }
  return prefix + String(Date.now()).slice(-4);
}

/* ---------------- 发布时补齐双语 ----------------
 * 以前必须中英各填一遍才能发布，只填一种要么发不出去、要么发布后换个语言的客户
 * 看到的是另一种语言（"我发布的产品无法翻译"）。现在只填一种也能发，另一种服务端自动补齐。 */
async function fillMissingTranslations(raw) {
  const trs = {};
  for (const lang of ['en', 'zh']) {
    const t = (raw && raw[lang]) || {};
    trs[lang] = {
      title: String(t.title || '').trim(),
      description: String(t.description || '').trim(),
      features: Array.isArray(t.features) ? t.features.map(x => String(x || '').trim()).filter(Boolean) : []
    };
  }
  const hasEn = !!trs.en.title;
  const hasZh = !!trs.zh.title;
  if (!hasEn && !hasZh) return { ok: false, trs };
  if (hasEn === hasZh) return { ok: true, trs };

  const from = hasZh ? 'zh' : 'en';
  const to = from === 'zh' ? 'en' : 'zh';
  const target = to === 'en' ? 'en' : 'zh-CN';
  const source = from === 'zh' ? 'zh-CN' : 'en';
  const src = trs[from];
  const dst = trs[to];
  const jobs = [];
  const put = (key, text) => {
    jobs.push(translateText({ text, target, source, skipQuota: true })
      .then(r => { if (r && r.text && String(r.text).trim()) dst[key] = String(r.text).trim(); })
      .catch(() => { /* 翻译通道不可用时保持空缺，不阻断发布 */ }));
  };
  if (src.title) put('title', src.title);
  if (src.description) put('description', src.description);
  if (src.features.length) {
    jobs.push(translateText({ text: src.features.join('\n'), target, source, skipQuota: true })
      .then(r => {
        if (!r || !r.text) return;
        const list = String(r.text).split('\n').map(x => x.trim()).filter(Boolean);
        /* 行数对得上才采用，避免模型把几条特性揉成一段 */
        if (list.length === src.features.length) dst.features = list;
      })
      .catch(() => {}));
  }
  await Promise.all(jobs);
  /* 兜底：翻译没回来时至少保证标题非空，否则商品在另一种语言下会显示空白 */
  if (!dst.title) dst.title = src.title;
  dst.autoTranslated = true;
  return { ok: true, trs };
}

/* 地址簿自动收录：询盘/下单时把客户信息存进 addresses。
 * 去重键 = 公司 + 邮箱 + 国家；命中就累加使用次数、补齐空缺字段。 */
async function rememberAddress(ownerId, source, i) {
  try {
    const name = String((i && i.name) || '').trim();
    const company = String((i && i.company) || '').trim();
    const email = String((i && i.email) || '').trim();
    const country = String((i && i.country) || '').trim().toUpperCase().slice(0, 4);
    if (!name && !company) return;
    const key = [company.toLowerCase(), email.toLowerCase(), country].filter(Boolean).join('|');
    if (!key) return;
    const now = Date.now();
    const exist = await get('SELECT * FROM addresses WHERE owner_key = ?', key);
    if (exist) {
      await run(
        `UPDATE addresses SET use_count = use_count + 1, last_used_at = ?, updated_at = ?,
           name = CASE WHEN ? <> '' THEN ? ELSE name END,
           email = CASE WHEN ? <> '' THEN ? ELSE email END,
           source = CASE WHEN source = 'manual' THEN source ELSE ? END
         WHERE id = ?`,
        now, now, name, name, email, email, source, exist.id
      );
      return exist.id;
    }
    const id = randomUUID();
    await run(
      `INSERT INTO addresses (id, user_id, owner_key, name, company, country, email, source, use_count, last_used_at, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      id, ownerId || null, key, name.slice(0, 80), company.slice(0, 120), country, email.slice(0, 160),
      source, 1, now, now, now
    );
    return id;
  } catch (e) {
    /* 收录失败不能影响询盘/下单主流程 */
    console.error('rememberAddress failed:', e && e.message);
    return null;
  }
}

async function productView(row) {
  const trs = await all('SELECT * FROM product_translations WHERE product_id = ?', row.id);
  const translations = {};
  for (const t of trs) {
    translations[t.lang] = {
      title: t.title,
      description: t.description,
      features: safeJson(t.features, [])
    };
  }
  const code = await get('SELECT code FROM anti_fake_codes WHERE product_id = ?', row.id);
  const promo = await get('SELECT id FROM promotion_requests WHERE product_id = ? AND status = ?', row.id, 'approved');
  /* 商品图片：关系在 product_images，文件本体在对象存储；这里只回可访问的 URL */
  const imgRows = await all('SELECT id, file_id FROM product_images WHERE product_id = ? ORDER BY sort ASC, created_at ASC', row.id);
  return {
    ...row,
    /* 前端按 sellerId 归属商品（卖家工作台靠它筛选"我的产品"）；
     * 数据库列名是 seller_id，不映射过去卖家会看到"一件商品都没有"。 */
    sellerId: row.seller_id,
    /* 数据库列是下划线命名，前端读驼峰；不映射的话价格/交期会全变成 0 或默认值
     * （用户反馈的"产品界面显示 0 美元"就是这个）。 */
    priceMin: row.price_min,
    priceMax: row.price_max,
    leadTime: row.lead_time,
    hsCode: row.hs_code,
    companyId: row.company_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    sellerName: (await get('SELECT name FROM users WHERE id = ?', row.seller_id) || {}).name || '',
    paypalUrl: row.paypal_url || '',
    terms: safeJson(row.terms, []),
    certs: safeJson(row.certs, []),
    translations,
    antiFakeCode: code ? code.code : null,
    /* 商品货号（SKU）：客服/仓库按货号找货、买家询盘时报货号 */
    code: row.code || '',
    promoted: !!promo,
    /* 地址带上 /api 前缀：裸 "/files/<id>" 直连是 404（前端曾经靠自己补前缀才显示，
     * 任何新代码直接用这个字段都会踩坑）。 */
    images: imgRows.map(x => ({ id: x.id, fileId: x.file_id, url: API_BASE + '/files/' + x.file_id }))
  };
}

async function orderView(o) {
  const tips = await all('SELECT * FROM tips WHERE order_id = ? ORDER BY created_at DESC', o.id);
  const shipments = (await Promise.all((await all('SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at ASC', o.id)).map(shipmentView)));
  const evidence = await all('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC', o.id);
  const buyer = o.buyer_id ? await get('SELECT id, name, email FROM users WHERE id = ?', o.buyer_id) : null;
  const seller = o.seller_id ? await get('SELECT id, name, email FROM users WHERE id = ?', o.seller_id) : null;
  return { ...o, buyer, seller, tips, shipments, evidence, evidenceVerified: await verifyEvidenceChain(o.id).valid };
}

async function shipmentView(s) {
  const events = await all('SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY event_time ASC, created_at ASC', s.id);
  return { ...s, events };
}

/* ---------- 第三方存证：按订单哈希链记录关键流程 ---------- */
function evidencePayload(kind, refId, snapshot, actorId, at) {
  return { kind: String(kind || '').slice(0, 32), refId: refId || null, snapshot: snapshot || {}, actorId: actorId || null, at };
}
async function lastEvidence(orderId) {
  return await get('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index DESC LIMIT 1', orderId);
}
async function addEvidence(orderId, actorId, kind, refId, snapshot) {
  const prev = await lastEvidence(orderId);
  const prevHash = prev ? prev.content_hash : 'GENESIS';
  const chainIndex = prev ? prev.chain_index + 1 : 0;
  const at = Date.now();
  const payload = evidencePayload(kind, refId, snapshot, actorId, at);
  const contentHash = await sha256(prevHash + '|' + chainIndex + '|' + JSON.stringify(payload));
  await run(
    'INSERT INTO evidence_records (id, order_id, actor_id, kind, ref_id, snapshot, content_hash, prev_hash, chain_index, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    randomUUID(), orderId, actorId || null, payload.kind, payload.refId, JSON.stringify(payload.snapshot), contentHash, prevHash, chainIndex, at
  );
  return await get('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index DESC LIMIT 1', orderId);
}
async function verifyEvidenceChain(orderId) {
  const rows = await all('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC', orderId);
  let prevHash = 'GENESIS';
  const broken = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const payload = evidencePayload(r.kind, r.ref_id, safeJson(r.snapshot, {}), r.actor_id, r.created_at);
    const expect = await sha256(prevHash + '|' + i + '|' + JSON.stringify(payload));
    if (expect !== r.content_hash) broken.push(r.id);
    prevHash = r.content_hash;
  }
  return { total: rows.length, valid: broken.length === 0, broken };
}

/* ---------- v0.2 模块静态数据 ---------- */
const EXPORT_ITEMS = ['customs-reg', 'fx-account', 'tax-rebate', 'export-license', 'inspection', 'co-qualification', 'dangerous-goods'];
const CARD_TEMPLATES = [
  { id: 'classic-gold', zh: '经典暖金', en: 'Classic Gold', swatch: 'linear-gradient(135deg,#FFF6E0,#FBEBC9)' },
  { id: 'luxe-ink', zh: '低调奢华', en: 'Luxe Ink', swatch: 'linear-gradient(135deg,#20242E,#14171E)' },
  { id: 'minimal-white', zh: '简约留白', en: 'Minimal White', swatch: 'linear-gradient(135deg,#FFFFFF,#F2F2F2)' },
  { id: 'modern-blue', zh: '现代科技', en: 'Modern Tech', swatch: 'linear-gradient(135deg,#123060,#0A1730)' },
  { id: 'oriental-ink', zh: '东方雅韵', en: 'Oriental Ink', swatch: 'linear-gradient(135deg,#F7F1E3,#EAE0C8)' }
];
const SANCTION_KEYWORDS = [
  'military', 'defense', 'defence', 'missile', 'nuclear', 'chemical weapon', 'bioweapon',
  'drone', 'night vision', 'radar', 'explosive', 'arms', 'ammunition', 'military-grade',
  '军事', '导弹', '核武器', '生化武器', '无人机', '夜视', '雷达', '炸药', '弹药', '武器级', '军警'
];

async function verifyTurnstile(token) {
  const secret = ENV.TURNSTILE_SECRET || '';
  if (!secret) return { ok: true, disabled: true };
  if (!token) return { ok: false, error: ['missing-input-response'] };
  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret, response: String(token) })
    });
    const j = await r.json();
    return { ok: !!j.success, error: j['error-codes'] || [] };
  } catch (e) {
    return { ok: false, error: ['network-error'] };
  }
}

/* 服务端水印：当前支持 SVG 文本水印（栅格图由前端 Canvas 合成，正式版接对象存储边缘处理） */
function watermarkSvg(buf, name) {
  try {
    let svg = buf.toString('utf8');
    if (!/<\s*svg/i.test(svg)) return buf;
    const safe = String(name || '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const text = '<text x="50%" y="50%" fill="rgba(120,110,90,0.16)" font-size="24" font-family="Georgia,serif" text-anchor="middle" transform="rotate(-30 50% 50%)">BeanBeanMouse · ' + safe + '</text>';
    if (/<svg[^>]*>/i.test(svg)) svg = svg.replace(/<svg([^>]*)>/i, '<svg$1>' + text);
    return Buffer.from(svg, 'utf8');
  } catch (e) { return buf; }
}

/* ---------- Routes ---------- */
async function route(m, segs, q, req, res) {
  const [a, b, c, d, e] = segs;

  /* 认证 */
  if (a === 'auth') {
    if (m === 'POST' && b === 'register') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (await registerRateLimit(ip) > REGISTER_LIMIT) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '注册过于频繁，请稍后再试');
      const body = await readBody(req);
      /* 蜜罐字段：正常用户看不到，机器人填写即拦截 */
      if (String(body.homepage || '').trim() !== '') {
        return fail(res, 400, 'BOT_DETECTED', '检测到异常注册行为');
      }
      const ts = await verifyTurnstile(body.turnstileToken);
      if (!ts.ok) return fail(res, 400, 'TURNSTILE_FAILED', '人机验证未通过，请重试');
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = body.role;
      const name = String(body.name || '').trim();
      if (!EMAIL_RE.test(email)) return fail(res, 400, 'VALIDATION', '邮箱格式不正确');
      const emailFlag = classifyEmail(email);
      if (BLOCK_DISPOSABLE_EMAIL && emailFlag === 'disposable') {
        return fail(res, 400, 'EMAIL_DISPOSABLE', '请使用常用邮箱注册，不支持一次性/临时邮箱');
      }
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return fail(res, 400, 'VALIDATION', '密码至少 8 位，且需同时包含字母和数字');
      }
      if (!['buyer', 'seller'].includes(role)) return fail(res, 400, 'VALIDATION', '角色必须是 buyer 或 seller');
      if (!name || name.length > 80) return fail(res, 400, 'VALIDATION', '姓名为必填且不超过 80 字符');
      const companyData = role === 'seller' ? {
        name: String(body.companyName || '').trim(),
        country: String(body.country || '').trim(),
        city: String(body.city || '').trim(),
        licenseNo: String(body.licenseNo || '').trim(),
        registrationNo: String(body.registrationNo || '').trim(),
        website: String(body.companyWebsite || '').trim(),
        contact: String(body.contact || '').trim(),
        businessScope: String(body.businessScope || '').trim()
      } : null;
      if (companyData && (!companyData.name || !companyData.country)) {
        return fail(res, 400, 'VALIDATION', '卖家注册需填写真实公司/工厂名称与所在国家');
      }
      /* 一个邮箱一个号：注册时按小写邮箱查重（大小写、前后空格都算同一个号） */
      if (await get('SELECT id FROM users WHERE lower(email) = ?', email)) {
        return fail(res, 409, 'EMAIL_EXISTS', '邮箱已存在');
      }
      const id = randomUUID();
      try {
        await run(
      'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, review_state, created_at, signup_ip, signup_ua, email_flag) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
      id, email, await hashPassword(password), role, name, 'active', REQUIRE_EMAIL_VERIFY ? 0 : 1,
      REQUIRE_ACCOUNT_REVIEW ? 'pending' : null, Date.now(),
      clientIp(req) || null, String((req.headers && req.headers['user-agent']) || '').slice(0, 300) || null, emailFlag
        );
      } catch (e) {
        /* 并发注册同一邮箱时唯一索引会拦下来（数据库层面的"一个邮箱一个号"） */
        if (/UNIQUE|constraint/i.test(String(e && e.message))) {
          return fail(res, 409, 'EMAIL_EXISTS', '邮箱已存在');
        }
        throw e;
      }
      if (companyData) {
        await run(
          'INSERT INTO companies (id, user_id, name, country, city, license_no, registration_no, website, contact, business_scope, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          randomUUID(), id, companyData.name, companyData.country, companyData.city, companyData.licenseNo,
          companyData.registrationNo, companyData.website, companyData.contact, companyData.businessScope, 'pending', Date.now()
        );
      }
      const u = await get('SELECT * FROM users WHERE id = ?', id);
      await audit(id, 'auth.register', 'user', id, email);
      /* 邮件发送失败不应让注册半途而废（账号已建好，可用重发接口再试） */
      let mailSent = true;
      if (!REQUIRE_EMAIL_VERIFY) { mailSent = false; }
      else try {
        await sendVerifyEmail(id, email);
      } catch (e) {
        mailSent = false;
        console.error('[auth.register] verify mail failed: ' + (e && e.message));
      }
      return send(res, 201, {
        user: publicUser(u),
        emailVerified: !REQUIRE_EMAIL_VERIFY,
        needVerify: REQUIRE_EMAIL_VERIFY,
        needReview: REQUIRE_ACCOUNT_REVIEW,
        mailSent,
        message: REQUIRE_ACCOUNT_REVIEW
        /* 两道门槛可能同时开着（邮箱验证 + 人工审核），提示必须把两件事都说清楚，
         * 否则用户点了注册却不知道该去查邮箱还是等审核。 */
        ? (REQUIRE_EMAIL_VERIFY
          ? '注册成功：请先查收邮箱完成验证（24 小时内有效），账号还需管理员审核通过后才能登录'
          : '注册成功，账号正在等待管理员审核，通过后即可登录')
        : (!REQUIRE_EMAIL_VERIFY
          ? '注册成功，现在就可以登录了'
          : (mailSent
            ? '注册成功，请查收邮箱完成验证（24 小时内有效）'
            : '注册成功，但验证邮件发送失败，请稍后在登录页点击「重发验证邮件」'))
      });
    }
    if (m === 'POST' && b === 'login') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (loginRateLimit(ip) > LOGIN_LIMIT) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '尝试过于频繁，请稍后再试');
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      /* 按小写邮箱取号，并固定取最早注册的那一个：
       * 历史数据万一有重复邮箱，也不会随机登进另一个账号（串号）。 */
      const dup = await all('SELECT * FROM users WHERE lower(email) = ? ORDER BY created_at ASC', email);
      if (dup.length > 1) {
        console.error('[auth.login] 同一邮箱存在 ' + dup.length + ' 个账号（历史重复数据）：' + email);
      }
      const u = dup[0];
      const isAdminLogin = !!(u && u.role === 'admin');
      if (isAdminLogin && adminLoginRateLimit(ip) > ADMIN_LOGIN_LIMIT) {
        return fail(res, 429, 'TOO_MANY_ATTEMPTS', '管理员登录尝试过于频繁，请 15 分钟后再试');
      }
      if (!u || !await verifyPassword(body.password, u.password_hash)) {
        if (isAdminLogin) await audit(u.id, 'auth.login.failed', 'user', u.id, '管理员密码错误 ip=' + ip);
        return fail(res, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      }
      if (u.status === 'frozen') return fail(res, 401, 'ACCOUNT_FROZEN', '账号已被冻结');
      /* 两道门槛同时开着时，提示要把"还要验证邮箱"一起说清楚 */
      if (u.review_state === 'pending') {
        return fail(res, 403, 'PENDING_REVIEW', REQUIRE_EMAIL_VERIFY && !u.email_verified
          ? '账号正在等待管理员审核；同时请先查收邮箱完成验证，两项都通过后才能登录'
          : '账号正在等待管理员审核，通过后即可登录');
      }
      if (u.review_state === 'rejected') return fail(res, 403, 'ACCOUNT_REJECTED', '注册申请未通过审核，如有疑问请联系我们');
      if (REQUIRE_EMAIL_VERIFY && !u.email_verified) return fail(res, 403, 'VERIFY_EMAIL_REQUIRED', '请先验证邮箱再登录');
      if (isAdminLogin) adminLoginRateReset(ip);
      await run('UPDATE users SET last_login_at = ? WHERE id = ?', Date.now(), u.id);
      /* 还在用公开默认密码的管理员：登录放行，但明确提示去改 */
      const mustChangePassword = isAdminLogin && String(body.password) === DEFAULT_ADMIN_PASSWORD;
      return send(res, 200, {
        token: await signToken({ uid: u.id, role: u.role, ver: u.token_version || 0 }, TOKEN_TTL_SEC),
        user: publicUser(u),
        mustChangePassword
      });
    }
    if (m === 'POST' && b === 'verify-email') {
      const body = await readBody(req);
      const token = String(body.token || '').trim();
      if (!token) return fail(res, 400, 'VALIDATION', '缺少验证令牌');
      const row = await get('SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = ?', await sha256(token), 'verify_email');
      if (!row || row.used_at) return fail(res, 400, 'INVALID_TOKEN', '验证链接无效或已使用');
      if (row.expires_at < Date.now()) return fail(res, 400, 'TOKEN_EXPIRED', '验证链接已过期，请重新发送');
      await run('UPDATE email_tokens SET used_at = ? WHERE id = ?', Date.now(), row.id);
      await run('UPDATE users SET email_verified = 1 WHERE id = ?', row.user_id);
      await audit(row.user_id, 'auth.verify-email', 'user', row.user_id, '');
      const u = await get('SELECT * FROM users WHERE id = ?', row.user_id);
      return send(res, 200, { ok: true, user: publicUser(u) });
    }
    if (m === 'POST' && b === 'resend-verification') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (await registerRateLimit(ip) > 3) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '发送过于频繁，请稍后再试');
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const u = await get('SELECT * FROM users WHERE email = ?', email);
      let mailSent = true;
      if (u && !u.email_verified) {
        try {
          await sendVerifyEmail(u.id, u.email);
        } catch (e) {
          mailSent = false;
          console.error('[auth.resend] verify mail failed: ' + (e && e.message));
        }
      }
      /* 无论邮箱是否存在都返回成功，防止邮箱枚举 */
      return send(res, 200, { ok: true, mailSent, message: '如该邮箱已注册且未验证，验证邮件已重新发送' });
    }
    if (m === 'POST' && b === 'refresh') {
      const u = await requireAuth(res, req);
      if (!u) return;
      return send(res, 200, { token: await signToken({ uid: u.id, role: u.role, ver: u.token_version || 0 }, TOKEN_TTL_SEC), user: publicUser(u) });
    }
    /* 邮件通道是否就绪：前端据此决定要不要显示"忘记密码"入口。
     * 没开通邮件时宁可不显示，也不给用户一个点了就报错的按钮。 */
    if (m === 'GET' && b === 'mail-ready') {
      return send(res, 200, { ready: mailReady(), transport: mailerInfo().transport });
    }
    /* 忘记密码：发重置链接。无论邮箱是否存在都返回成功，避免被人拿来枚举账号。 */
    if (m === 'POST' && b === 'forgot-password') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (forgotRateLimit(ip) > FORGOT_LIMIT) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '请求过于频繁，请稍后再试');
      if (!mailReady()) {
        return fail(res, 503, 'MAIL_NOT_READY', '邮件通道尚未开通，暂时无法自助找回，请联系平台协助');
      }
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      if (!EMAIL_RE.test(email)) return fail(res, 400, 'VALIDATION', '邮箱格式不正确');
      const u = await get('SELECT * FROM users WHERE lower(email) = ?', email);
      if (u && u.status !== 'frozen') {
        try {
          const token = await newEmailToken(u.id, 'reset_password', 3600 * 1000);
          const appUrl = ENV.APP_URL || 'https://beanbeanmouse.com';
          const link = appUrl + '/#/reset-password?token=' + token;
          const tpl = resetPasswordContent({ link, name: u.name });
          await sendMail({
            to: u.email, subject: tpl.subject, html: tpl.html,
            body: '我们收到了重置 BeanBeanMouse 密码的请求。请在 1 小时内打开以下链接设置新密码（只能用一次）：\n\n' + link + '\n\n如非本人操作，请忽略本邮件。'
          });
          await audit(u.id, 'auth.forgot-password', 'user', u.id, '');
        } catch (e) {
          console.error('[auth.forgot] 重置邮件发送失败: ' + (e && e.message));
        }
      }
      return send(res, 200, { ok: true, message: '如果该邮箱已注册，重置链接已发送，请查收（含垃圾邮件箱）' });
    }
    if (m === 'POST' && b === 'reset-password') {
      if (!mailReady()) return fail(res, 503, 'MAIL_NOT_READY', '邮件通道尚未开通');
      const body = await readBody(req);
      const token = String(body.token || '').trim();
      const password = String(body.password || '');
      if (!token) return fail(res, 400, 'VALIDATION', '缺少重置令牌');
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return fail(res, 400, 'VALIDATION', '密码至少 8 位，且需同时包含字母和数字');
      }
      const row = await get('SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = ?', await sha256(token), 'reset_password');
      if (!row || row.used_at) return fail(res, 400, 'INVALID_TOKEN', '重置链接无效或已使用');
      if (row.expires_at < Date.now()) return fail(res, 400, 'TOKEN_EXPIRED', '重置链接已过期，请重新申请');
      await run('UPDATE email_tokens SET used_at = ? WHERE id = ?', Date.now(), row.id);
      await run('UPDATE users SET password_hash = ?, token_version = COALESCE(token_version,0) + 1 WHERE id = ?', await hashPassword(password), row.user_id);
      await audit(row.user_id, 'auth.reset-password', 'user', row.user_id, '');
      return send(res, 200, { ok: true });
    }
    /* 修改密码：演示账号的密码是公开的，正式试用前必须先能改成自己的 */
    if (m === 'POST' && b === 'change-password') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      const current = String(body.currentPassword || '');
      const next = String(body.newPassword || '');
      if (!await verifyPassword(current, u.password_hash)) return fail(res, 400, 'INVALID_CREDENTIALS', '当前密码不正确');
      if (next.length < 8 || !/[A-Za-z]/.test(next) || !/[0-9]/.test(next)) {
        return fail(res, 400, 'VALIDATION', '新密码至少 8 位，且需同时包含字母和数字');
      }
      if (next === current) return fail(res, 400, 'VALIDATION', '新密码不能与当前密码相同');
      await run('UPDATE users SET password_hash = ? WHERE id = ?', await hashPassword(next), u.id);
      /* 版本 +1：其他设备上的登录立即失效 */
      await run('UPDATE users SET token_version = COALESCE(token_version,0) + 1 WHERE id = ?', u.id);
      await audit(u.id, 'auth.change-password', 'user', u.id, '');
      /* 改密会让旧令牌失效（其他设备要重新登录），但当前这台设备要能继续用：
       * 直接换发一个新令牌返回，前端替换掉本地那份。 */
      const fresh = await get('SELECT * FROM users WHERE id = ?', u.id);
      return send(res, 200, { ok: true, token: await signToken({ uid: u.id, role: u.role, ver: fresh.token_version || 0 }, TOKEN_TTL_SEC) });
    }
    if (m === 'GET' && b === 'me') {
      const u = await requireAuth(res, req);
      if (!u) return;
      return send(res, 200, publicUser(u));
    }
    if (m === 'POST' && b === 'logout') return send(res, 200, { ok: true });
  }

  /* 企业/工厂认证：卖家提交真实资料，管理员审核（可查证）后通过 */
  if (a === 'companies') {
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req, ['seller']);
      if (!u) return;
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      const country = String(body.country || '').trim();
      if (!name || !country) return fail(res, 400, 'VALIDATION', '公司/工厂名称与所在国家为必填');
      const exist = await get('SELECT * FROM companies WHERE user_id = ?', u.id);
      if (exist) {
        await run(
          'UPDATE companies SET name=?, country=?, city=?, license_no=?, registration_no=?, website=?, contact=?, business_scope=?, status=?, reject_reason=NULL WHERE id=?',
          name, country, String(body.city || '').trim(), String(body.licenseNo || '').trim(),
          String(body.registrationNo || '').trim(), String(body.website || '').trim(), String(body.contact || '').trim(),
          String(body.businessScope || '').trim(), 'pending', exist.id
        );
        await audit(u.id, 'company.apply', 'company', exist.id, name);
        return send(res, 200, await get('SELECT * FROM companies WHERE id = ?', exist.id));
      }
      const id = randomUUID();
      await run(
        'INSERT INTO companies (id, user_id, name, country, city, license_no, registration_no, website, contact, business_scope, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        id, u.id, name, country, String(body.city || '').trim(), String(body.licenseNo || '').trim(),
        String(body.registrationNo || '').trim(), String(body.website || '').trim(), String(body.contact || '').trim(),
        String(body.businessScope || '').trim(), 'pending', Date.now()
      );
      await audit(u.id, 'company.apply', 'company', id, name);
      return send(res, 201, await get('SELECT * FROM companies WHERE id = ?', id));
    }
    if (b === 'mine' && m === 'GET') {
      const u = await requireAuth(res, req, ['seller']);
      if (!u) return;
      return send(res, 200, await get('SELECT * FROM companies WHERE user_id = ?', u.id) || null);
    }
    if (!b && m === 'GET') {
      const u = await requirePerm(res, req, 'customers');
      if (!u) return;
      const status = q.get('status') || '';
      let rows = await all('SELECT * FROM companies ORDER BY created_at DESC');
      if (status) rows = rows.filter(co => co.status === status);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'verify' && m === 'PUT') {
      const u = await requirePerm(res, req, 'customers');
      if (!u) return;
      const body = await readBody(req);
      const co = await get('SELECT * FROM companies WHERE user_id = ?', b);
      if (!co) return fail(res, 404, 'NOT_FOUND', '企业不存在');
      if (body.action === 'approve') {
        await run('UPDATE companies SET status = ?, verified_at = ?, reject_reason = NULL WHERE id = ?', 'approved', Date.now(), co.id);
        await audit(u.id, 'company.approve', 'company', co.id, co.name);
        const owner = await get('SELECT * FROM users WHERE id = ?', co.user_id);
        if (owner) await notifyUser(owner.id, 'company', '企业认证已通过', '您的公司/工厂资料已审核通过，现在可以发布产品。');
        return send(res, 200, await get('SELECT * FROM companies WHERE id = ?', co.id));
      }
      if (body.action === 'reject') {
        const reason = String(body.reason || '资料未通过审核').slice(0, 300);
        await run('UPDATE companies SET status = ?, reject_reason = ?, verified_at = NULL WHERE id = ?', 'rejected', reason, co.id);
        await audit(u.id, 'company.reject', 'company', co.id, reason);
        const owner = await get('SELECT * FROM users WHERE id = ?', co.user_id);
        if (owner) await notifyUser(owner.id, 'company', '企业认证未通过', '原因：' + reason + '。请修正资料后重新提交。');
        return send(res, 200, await get('SELECT * FROM companies WHERE id = ?', co.id));
      }
      return fail(res, 400, 'INVALID_ACTION', 'action 必须是 approve 或 reject');
    }
  }

  /* 产品 */
  if (a === 'products') {
    if (m === 'GET' && !b) {
      const kw = (q.get('kw') || '').toLowerCase();
      const cat = q.get('cat') || '';
      const origin = q.get('origin') || '';
      const min = q.get('min') != null ? +q.get('min') : null;
      const max = q.get('max') != null ? +q.get('max') : null;
      let list = await all('SELECT * FROM products WHERE status = ?', 'on');
      /* status=all：管理员看全部、卖家看自己的全部（含待审核/已下架）。
       * 没有这个，刚发布的商品在"商品管理/审核"里根本看不到（发布完像消失了一样）。 */
      if (String(q.get('status') || '') === 'all') {
        const u = await currentUser(req);
        if (u && u.role === 'admin') {
          /* 管商品的两种权限之一即可看全部（含待审核/已下架）：发布权或审核权 */
          if (!hasPerm(u, 'products.publish') && !hasPerm(u, 'products.review')) {
            return fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「products.publish / products.review」权限');
          }
          list = await all('SELECT * FROM products');
        }
        else if (u && u.role === 'seller') list = await all('SELECT * FROM products WHERE seller_id = ?', u.id);
      }
      if (cat) list = list.filter(p => p.category === cat);
      if (origin) list = list.filter(p => p.country === origin);
      if (min != null || max != null) {
        list = list.filter(p => (min == null || p.price_max >= min) && (max == null || p.price_min <= max));
      }
      if (kw) {
        /* 关键词扩展：客户用别的语言搜索（俄/日/西/阿…）时先把关键词翻成中/英再匹配，
         * 否则库里只有中英两套译文，非中英客户永远搜不到东西。
         * 同时支持按商品货号搜索（BBM-HAM-0007），客服与仓库按货号找货。 */
        const kws = [kw];
        try {
          const other = /[\u4e00-\u9fff]/.test(kw) ? 'en' : 'zh-CN';
          const tr = await translateText({ text: kw, target: other, skipQuota: true });
          const alt = tr && tr.text ? String(tr.text).trim().toLowerCase() : '';
          if (alt && alt !== kw) kws.push(alt);
        } catch (e) { /* 翻译不可用时按原关键词搜索 */ }
        const ids = new Set();
        for (const k of kws) {
          const rows = await all(
            'SELECT product_id FROM product_translations WHERE lower(title) LIKE ? OR lower(description) LIKE ?',
            '%' + k + '%', '%' + k + '%'
          );
          for (const r of rows) ids.add(r.product_id);
        }
        list = list.filter(p => ids.has(p.id) || String(p.code || '').toLowerCase().indexOf(kw) >= 0);
      }
      return send(res, 200, paginate(await Promise.all(list.map(productView)), q));
    }
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'products.publish')) return;
      if (!u) return;
      if (u.role === 'seller') {
        const co = await get('SELECT * FROM companies WHERE user_id = ?', u.id);
        if (!co || co.status !== 'approved') {
          return fail(res, 403, 'COMPANY_NOT_VERIFIED', '请先提交公司/工厂资料并通过平台审核后再发布产品');
        }
      }
      const body = await readBody(req);
      if (!body.category || !body.country) {
        return fail(res, 400, 'VALIDATION', 'category/country 为必填');
      }
      /* 防重复提交兜底：上传多张图 + 建商品要几十秒，用户等不及再点一次就会
       * 生成两条一模一样的商品（线上真出现过）。同一卖家、同样的英文标题、
       * 60 秒内再次提交时，直接把已有那条退回去，不再新建。 */
      const titleProbe = String(((body.translations || {}).en || {}).title || '').trim();
      if (titleProbe) {
        const dup = await get(
          'SELECT id FROM products WHERE seller_id = ? AND created_at > ? AND id IN (SELECT product_id FROM product_translations WHERE lang = ? AND title = ?) ORDER BY created_at DESC',
          u.id, Date.now() - 60000, 'en', titleProbe
        );
        if (dup) return send(res, 200, { ...(await productView(await get('SELECT * FROM products WHERE id = ?', dup.id))), duplicate: true });
      }
      /* 只填一种语言也能发布：另一种服务端自动补齐（见 fillMissingTranslations） */
      const filled = await fillMissingTranslations(body.translations || {});
      if (!filled.ok) return fail(res, 400, 'VALIDATION', '至少要填写一种语言的标题');
      const trs = filled.trs;
      const id = randomUUID();
      const now = Date.now();
      const code = await allocateProductCode(body.sub);
      const company = await get('SELECT id FROM companies WHERE user_id = ?', u.id);
      const priceMin = toNum(body.priceMin, 0);
      const priceMax = toNum(body.priceMax, 0);
      const moq = Math.max(1, Math.round(toNum(body.moq, 1)));
      const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
      if (!(priceMin >= 0) || !(priceMax >= priceMin)) {
        return fail(res, 400, 'VALIDATION', '价格区间不合法');
      }
      await run(
        'INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, paypal_url, code, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, u.id, company ? company.id : null, body.category, String(body.sub || '').slice(0, 40), body.hsCode || '', body.country,
        priceMin, priceMax, moq, body.unit || 'pcs', leadTime,
        JSON.stringify(body.terms || []), JSON.stringify(body.certs || []), body.srcLang || 'en',
        'pending', String(body.paypalUrl || '').slice(0, 500) || null, code, now, now
      );
      for (const lang of Object.keys(trs)) {
        await run(
          'INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
          randomUUID(), id, lang, trs[lang].title || '', trs[lang].description || '', JSON.stringify(trs[lang].features || []), now
        );
      }
      const enTitle = (trs.en && trs.en.title) || '';
      await run(
        'INSERT INTO anti_fake_codes (id, product_id, code, batch_no, status, issued_at, verify_count) VALUES (?,?,?,?,?,?,?)',
        randomUUID(), id, newAntiFakeCode(), 'B' + new Date().getFullYear(), 'active', now, 0
      );
      await audit(u.id, 'product.create', 'product', id, enTitle);
      /* 所有新发布/修改的商品都要过审核，管理员也一样：
       * 这样"审核"这一步在将来做管理员权限细分时才有意义（发布权与审核权可分开）。 */
      return send(res, 201, await productView(await get('SELECT * FROM products WHERE id = ?', id)));
    }
    if (b && m === 'GET') {
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      /* 未上架（待审核/已驳回/已下架）的商品不能被匿名直接打开：
       * 匿名列表本来就不含它们，但直接猜 id 就能读到草稿/被驳回的内容。
       * 允许本人（卖家）与管理员照常查看，用于编辑和审核。 */
      if (p.status !== 'on') {
        const viewer = await currentUser(req);
        const allowed = viewer && (viewer.role === 'admin' || viewer.id === p.seller_id);
        if (!allowed) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      }
      return send(res, 200, await productView(p));
    }
    /* 编辑商品：卖家改完重新走审核；管理员直接生效（自营） */
    if (b && m === 'PUT') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'products.publish')) return;
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能修改自己的产品');
      const body = await readBody(req);
      if (!body.category || !body.country) {
        return fail(res, 400, 'VALIDATION', 'category/country 为必填');
      }
      const filled = await fillMissingTranslations(body.translations || {});
      if (!filled.ok) return fail(res, 400, 'VALIDATION', '至少要填写一种语言的标题');
      const trs = filled.trs;
      const priceMin = toNum(body.priceMin, 0);
      const priceMax = toNum(body.priceMax, 0);
      if (!(priceMin >= 0) || !(priceMax >= priceMin)) return fail(res, 400, 'VALIDATION', '价格区间不合法');
      const moq = Math.max(1, Math.round(toNum(body.moq, 1)));
      const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
      const now = Date.now();
      /* 修改后统一回到"待审核"（管理员改自己的商品也走审核流） */
      const nextStatus = 'pending';
      await run(
        'UPDATE products SET category=?, sub=?, hs_code=?, country=?, price_min=?, price_max=?, moq=?, unit=?, lead_time=?, terms=?, certs=?, src_lang=?, status=?, paypal_url=?, reject_reason=NULL, updated_at=? WHERE id=?',
        body.category, String(body.sub || '').slice(0, 40), String(body.hsCode || '').slice(0, 40), body.country,
        priceMin, priceMax, moq, String(body.unit || 'pcs').slice(0, 20), leadTime,
        JSON.stringify(body.terms || []), JSON.stringify(body.certs || []), body.srcLang || 'en',
        nextStatus, String(body.paypalUrl || '').slice(0, 500) || null, now, p.id
      );
      /* 老商品（迁移前入库的）没有货号，编辑时补一个 */
      if (!p.code) {
        const code = await allocateProductCode(body.sub);
        await run('UPDATE products SET code = ? WHERE id = ?', code, p.id);
      }
      for (const lang of Object.keys(trs)) {
        const exist = await get('SELECT id FROM product_translations WHERE product_id = ? AND lang = ?', p.id, lang);
        if (exist) {
          await run('UPDATE product_translations SET title=?, description=?, features=?, updated_at=? WHERE id=?',
            trs[lang].title || '', trs[lang].description || '', JSON.stringify(trs[lang].features || []), now, exist.id);
        } else {
          await run('INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
            randomUUID(), p.id, lang, trs[lang].title || '', trs[lang].description || '', JSON.stringify(trs[lang].features || []), now);
        }
      }
      await audit(u.id, 'product.update', 'product', p.id, 'status=' + nextStatus);
      return send(res, 200, await productView(await get('SELECT * FROM products WHERE id = ?', p.id)));
    }
    /* 上架 / 下架 */
    if (b && c === 'status' && m === 'POST') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'products.publish')) return;
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能操作自己的产品');
      const body = await readBody(req);
      const next = body.status === 'on' ? 'on' : 'off';
      /* 待审核/被驳回的商品只有管理员能直接上架 */
      if (next === 'on' && u.role !== 'admin' && !['on', 'off'].includes(p.status)) {
        return fail(res, 400, 'INVALID_STATUS', '商品还没通过审核，不能自己上架');
      }
      await run('UPDATE products SET status = ?, updated_at = ? WHERE id = ?', next, Date.now(), p.id);
      await audit(u.id, next === 'on' ? 'product.on' : 'product.off', 'product', p.id, '');
      return send(res, 200, { ok: true, id: p.id, status: next });
    }
    /* 商品图片：把已上传的文件挂到商品上（文件先走 /files 上传） */
    if (b && c === 'images' && m === 'POST') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'products.publish')) return;
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能改自己的产品');
      const body = await readBody(req);
      const ids = Array.isArray(body.fileIds) ? body.fileIds.slice(0, 12) : (body.fileId ? [body.fileId] : []);
      if (!ids.length) return fail(res, 400, 'VALIDATION', 'fileId 或 fileIds 必填');
      let sort = (await get('SELECT COUNT(*) AS c FROM product_images WHERE product_id = ?', p.id)).c;
      for (const fid of ids) {
        const f = await get('SELECT id, mime, status FROM files WHERE id = ?', fid);
        if (!f || f.status !== 'active') return fail(res, 400, 'VALIDATION', '文件不存在或已失效');
        if (!/^image\//.test(String(f.mime || ''))) return fail(res, 400, 'VALIDATION', '商品图片必须是图片类型');
        await run('INSERT INTO product_images (id, product_id, file_id, sort, created_at) VALUES (?,?,?,?,?)',
          randomUUID(), p.id, f.id, sort++, Date.now());
      }
      await run('UPDATE products SET updated_at = ? WHERE id = ?', Date.now(), p.id);
      await audit(u.id, 'product.image.add', 'product', p.id, ids.length + ' image(s)');
      return send(res, 200, await productView(await get('SELECT * FROM products WHERE id = ?', p.id)));
    }
    if (b && c === 'images' && d && m === 'DELETE') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'products.publish')) return;
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能改自己的产品');
      await run('DELETE FROM product_images WHERE id = ? AND product_id = ?', d, p.id);
      await audit(u.id, 'product.image.remove', 'product', p.id, d);
      return send(res, 200, { ok: true });
    }
    /* 删除商品：已经被询盘引用的不能删（会让历史询盘对不上），提示改下架 */
    if (b && m === 'DELETE') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'products.publish')) return;
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能删除自己的产品');
      const used = (await get('SELECT COUNT(*) AS c FROM inquiries WHERE product_id = ?', p.id)).c;
      if (used > 0) return fail(res, 409, 'PRODUCT_IN_USE', '该商品已有 ' + used + ' 条询盘记录，不能删除；请改为"下架"');
      await run('DELETE FROM product_translations WHERE product_id = ?', p.id);
      await run('DELETE FROM product_images WHERE product_id = ?', p.id);
      await run('DELETE FROM anti_fake_codes WHERE product_id = ?', p.id);
      await run('DELETE FROM products WHERE id = ?', p.id);
      await audit(u.id, 'product.delete', 'product', p.id, '');
      return send(res, 200, { ok: true, id: p.id });
    }
    if (b && c === 'review' && m === 'POST') {
      const u = await requirePerm(res, req, 'products.review');
      if (!u) return;
      const body = await readBody(req);
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (body.action === 'approve') {
        await run('UPDATE products SET status = ?, reject_reason = NULL, updated_at = ? WHERE id = ?', 'on', Date.now(), b);
        await audit(u.id, 'product.approve', 'product', b, p.id);
      } else if (body.action === 'reject') {
        await run('UPDATE products SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ?', 'rejected', String(body.reason || '驳回'), Date.now(), b);
        await audit(u.id, 'product.reject', 'product', b, String(body.reason || ''));
      } else {
        return fail(res, 400, 'INVALID_ACTION', 'action 必须是 approve 或 reject');
      }
      return send(res, 200, await productView(await get('SELECT * FROM products WHERE id = ?', b)));
    }
    if (b && c === 'status' && m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (p.seller_id !== u.id && u.role !== 'admin') return fail(res, 403, 'FORBIDDEN', '只能操作自己的产品');
      const body = await readBody(req);
      if (!['on', 'off'].includes(body.status)) return fail(res, 400, 'INVALID_STATUS', 'status 必须是 on 或 off');
      await run('UPDATE products SET status = ?, updated_at = ? WHERE id = ?', body.status, Date.now(), b);
      await audit(u.id, 'product.status', 'product', b, body.status);
      return send(res, 200, await productView(await get('SELECT * FROM products WHERE id = ?', b)));
    }
    if (b && m === 'PUT') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (p.seller_id !== u.id && u.role !== 'admin') return fail(res, 403, 'FORBIDDEN', '只能编辑自己的产品');
      const body = await readBody(req);
      const priceMin = body.priceMin != null ? toNum(body.priceMin, p.price_min) : p.price_min;
      const priceMax = body.priceMax != null ? toNum(body.priceMax, p.price_max) : p.price_max;
      const moq = body.moq != null ? Math.max(1, Math.round(toNum(body.moq, p.moq))) : p.moq;
      const leadTime = body.leadTime != null ? Math.max(1, Math.round(toNum(body.leadTime, p.lead_time))) : p.lead_time;
      if (!(priceMin >= 0) || !(priceMax >= priceMin)) {
        return fail(res, 400, 'VALIDATION', '价格区间不合法');
      }
      await run(
        'UPDATE products SET category = ?, sub = ?, hs_code = ?, country = ?, price_min = ?, price_max = ?, moq = ?, unit = ?, lead_time = ?, terms = ?, certs = ?, src_lang = ?, status = ?, updated_at = ? WHERE id = ?',
        body.category || p.category, body.sub != null ? String(body.sub).slice(0, 40) : p.sub, body.hsCode != null ? body.hsCode : p.hs_code, body.country || p.country,
        priceMin, priceMax, moq, body.unit || p.unit, leadTime,
        JSON.stringify(body.terms || safeJson(p.terms, [])), JSON.stringify(body.certs || safeJson(p.certs, [])),
        body.srcLang || p.src_lang, 'pending', Date.now(), b
      );
      if (body.translations) {
        for (const lang of Object.keys(body.translations)) {
          const tr = body.translations[lang];
          const exists = await get('SELECT id FROM product_translations WHERE product_id = ? AND lang = ?', b, lang);
          if (exists) {
            await run('UPDATE product_translations SET title = ?, description = ?, features = ?, updated_at = ? WHERE id = ?',
              tr.title || '', tr.description || '', JSON.stringify(tr.features || []), Date.now(), exists.id);
          } else {
            await run('INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
              randomUUID(), b, lang, tr.title || '', tr.description || '', JSON.stringify(tr.features || []), Date.now());
          }
        }
      }
      await audit(u.id, 'product.update', 'product', b, '');
      return send(res, 200, await productView(await get('SELECT * FROM products WHERE id = ?', b)));
    }
  }

  /* 询盘与报价 */
  if (a === 'inquiries') {
    if (m === 'GET' && !b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      let rows;
      if (u.role === 'seller') {
        rows = await all('SELECT i.*, p.seller_id AS seller_id FROM inquiries i JOIN products p ON p.id = i.product_id WHERE p.seller_id = ? ORDER BY i.created_at DESC', u.id);
      } else if (u.role === 'admin') {
        if (!hasPerm(u, 'service')) return fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「service」权限（客服/询盘）');
        rows = await all('SELECT i.*, p.seller_id AS seller_id FROM inquiries i LEFT JOIN products p ON p.id = i.product_id ORDER BY i.created_at DESC');
      } else {
        rows = await all('SELECT i.*, p.seller_id AS seller_id FROM inquiries i LEFT JOIN products p ON p.id = i.product_id WHERE i.buyer_id = ? ORDER BY i.created_at DESC', u.id);
      }
      /* 附上最新报价：否则客户在"我的询盘"里永远看不到运营回的价格 */
      const out = [];
      for (const r of rows) {
        const quote = await get('SELECT * FROM quotes WHERE inquiry_id = ? ORDER BY created_at DESC LIMIT 1', r.id);
        out.push({ ...r, quote: quote || null });
      }
      return send(res, 200, out);
    }
    if (m === 'POST' && !b) {
      const body = await readBody(req);
      const u = await currentUser(req);
      const p = body.productId ? await get('SELECT * FROM products WHERE id = ?', body.productId) : null;
      const qty = toNum(body.qty, 0);
      if (!p || !(qty >= 1) || !body.message) return fail(res, 400, 'VALIDATION', 'productId/qty/message 为必填且 qty 须为正整数');
      const id = randomUUID();
      /* 联系方式随询盘一起入库：否则运营端只看到一段需求文字，无法回信、无法跟进。
       * 登录用户缺省用账号里的姓名/邮箱补齐。 */
      const contactName = String(body.name || (u ? u.name : '') || '').trim().slice(0, 80);
      const contactEmail = String(body.email || (u ? u.email : '') || '').trim().slice(0, 120);
      const contactCompany = String(body.company || '').trim().slice(0, 120);
      const contactCountry = String(body.country || '').trim().slice(0, 60);
      /* 名片：买家在询盘里附带时一起存下来，卖家点开询盘就能看到（原来是丢了） */
      const card = body.card ? String(body.card).slice(0, 400000) : null;
      const cardName = card ? String(body.cardName || 'business-card').slice(0, 120) : null;
      /* 附件清单：[{fileId,name,size,type}]，最多 8 个；文件本体已在 /files 上传到对象存储 */
      const atts = [];
      if (Array.isArray(body.attachments)) {
        for (const a of body.attachments.slice(0, 8)) {
          const fid = a && (a.fileId || a.id);
          if (!fid) continue;
          const f = await get('SELECT id, mime, size, status FROM files WHERE id = ?', fid);
          if (!f || f.status !== 'active') continue;
          atts.push({ fileId: f.id, name: String(a.name || 'attachment').slice(0, 160), size: Number(f.size) || 0, type: f.mime || '' });
        }
      }
      await run(
        'INSERT INTO inquiries (id, product_id, buyer_id, qty, unit, payment_term, message, status, created_at, contact_name, contact_email, contact_company, contact_country, card, card_name, attachments) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, p.id, u ? u.id : null, qty, body.unit || 'pcs', body.payment || null, body.message, 'new', Date.now(),
        contactName || null, contactEmail || null, contactCompany || null, contactCountry || null,
        card, cardName, JSON.stringify(atts)
      );
      await audit(u ? u.id : null, 'inquiry.create', 'inquiry', id, body.message.slice(0, 80));
      /* 顺手把客户地址收进地址簿（同一公司+邮箱+国家只留一条，累加使用次数） */
      await rememberAddress(u ? u.id : null, 'inquiry', {
        name: contactName, email: contactEmail, company: contactCompany, country: contactCountry
      });
      const seller = await get('SELECT * FROM users WHERE id = ?', p.seller_id);
      if (seller) {
        await notifyUser(seller.id, 'inquiry', '收到新询盘', '产品 ' + (body.productId) + ' 收到新询盘：' + String(body.message).slice(0, 120));
        try { await sendMail({ to: seller.email, subject: '[BeanBeanMouse] 收到新询盘', body: String(body.message) }); }
        catch (e) { console.error('邮件发送失败（不影响询盘）:', e.message); }
      }
      /* 自营模式下商品挂在平台名下，管理员也必须收到站内提醒，
       * 否则客户在首页"直接问我"发来的需求只会静静躺在数据库里。 */
      const admins = await all("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
      for (const a of admins) {
        if (seller && a.id === seller.id) continue;
        await notifyUser(a.id, 'inquiry', '收到新询盘', '产品 ' + (body.productId) + ' 收到新询盘：' + String(body.message).slice(0, 120));
      }
      /* 给买家一封回执：外贸询盘最怕"发出去没回音"，一封回执能降低焦虑和重复询盘。
       * 发信失败不影响询盘落库（邮件通道故障时静默跳过）。 */
      if (contactEmail) {
        try {
          const enTr = await get('SELECT title FROM product_translations WHERE product_id = ? AND lang = ?', p.id, 'en')
            || await get('SELECT title FROM product_translations WHERE product_id = ? AND lang = ?', p.id, 'zh') || {};
          const pCode = (await get('SELECT code FROM products WHERE id = ?', p.id) || {}).code || '';
          await sendMail({
            to: contactEmail,
            subject: '[BeanBeanMouse] 已收到您的询盘 / We received your inquiry',
            body: (contactName ? contactName + ' 您好，' : '您好，') + '\n\n'
              + '我们已收到您对「' + (enTr.title || p.id) + '」' + (pCode ? '（货号 ' + pCode + '）' : '') + '的询盘：'
              + (body.qty || '') + ' ' + (body.unit || 'pcs') + '。\n'
              + '外贸客服会在 1 个工作日内回复报价（含包装、交期与运费口径）。\n'
              + '参考号：' + id + '；如需补充，直接回复本邮件即可。\n\n'
              + 'Hello' + (contactName ? ' ' + contactName : '') + ',\n\n'
              + 'We have received your inquiry for "' + (enTr.title || p.id) + '"'
              + (pCode ? ' (item ' + pCode + ')' : '') + ', quantity ' + (body.qty || '') + ' ' + (body.unit || 'pcs') + '.\n'
              + 'Our export team will come back with a quotation (packaging, lead time and freight basis) within one business day.\n'
              + 'Reference: ' + id + '. Just reply to this email if you need to add anything.\n\n'
              + 'BeanBeanMouse 豆豆鼠 · beanbeanmouse.com'
          });
        } catch (e) {
          console.error('买家回执邮件发送失败（不影响询盘）:', e && e.message);
        }
      }
      return send(res, 201, await get('SELECT * FROM inquiries WHERE id = ?', id));
    }
    if (b && c === 'quote' && m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const i = await get('SELECT * FROM inquiries WHERE id = ?', b);
      if (!i) return fail(res, 404, 'NOT_FOUND', '询盘不存在');
      const p = await get('SELECT * FROM products WHERE id = ?', i.product_id);
      if (p.seller_id !== u.id && u.role !== 'admin') return fail(res, 403, 'FORBIDDEN', '只能回复自己产品的询盘');
      const body = await readBody(req);
      if (body.price == null || !body.incoterm) return fail(res, 400, 'VALIDATION', 'price/incoterm 为必填');
      const price = toNum(body.price, NaN);
      const validity = Math.max(1, Math.round(toNum(body.validity, 15)));
      const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
      if (!(price >= 0)) return fail(res, 400, 'VALIDATION', '报价金额不合法');
      await run(
        'INSERT INTO quotes (id, inquiry_id, price, incoterm, payment_term, validity_days, lead_time, note, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        randomUUID(), b, price, body.incoterm, body.payment || 'T/T', validity, leadTime, body.note || null, Date.now()
      );
      await run('UPDATE inquiries SET status = ? WHERE id = ?', 'quoted', b);
      /* 报价附件（规格书/装箱图等）同样存清单，文件已上传到对象存储 */
      const replyAtts = [];
      if (Array.isArray(body.attachments)) {
        for (const a of body.attachments.slice(0, 8)) {
          const fid = a && (a.fileId || a.id);
          if (!fid) continue;
          const f = await get('SELECT id, mime, size, status FROM files WHERE id = ?', fid);
          if (!f || f.status !== 'active') continue;
          replyAtts.push({ fileId: f.id, name: String(a.name || 'attachment').slice(0, 160), size: Number(f.size) || 0, type: f.mime || '' });
        }
      }
      await run('UPDATE inquiries SET reply_attachments = ? WHERE id = ?', JSON.stringify(replyAtts), b);
      await audit(u.id, 'inquiry.quote', 'inquiry', b, String(body.price));
      const buyer = i.buyer_id ? await get('SELECT * FROM users WHERE id = ?', i.buyer_id) : null;
      if (buyer) {
        await notifyUser(buyer.id, 'quote', '收到供应商报价', '您的询盘已收到报价：' + body.incoterm + ' ' + body.price);
        try { await sendMail({ to: buyer.email, subject: '[BeanBeanMouse] 您收到新的报价', body: '询盘 ' + b + ' 的新报价：' + body.incoterm + ' ' + body.price }); }
        catch (e) { console.error('邮件发送失败（不影响报价）:', e.message); }
      }
      return send(res, 200, await get('SELECT * FROM inquiries WHERE id = ?', b));
    }
  }

  /* 交易订单与小费打赏：买家确认签收视为交易达成，之后双方可互打赏（可见、可取消） */
  if (a === 'orders') {
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req, ['buyer', 'admin']);
      if (!u) return;
      const body = await readBody(req);
      const inq = await get('SELECT * FROM inquiries WHERE id = ?', body.inquiryId);
      if (!inq) return fail(res, 404, 'NOT_FOUND', '询盘不存在');
      const product = await get('SELECT * FROM products WHERE id = ?', inq.product_id);
      if (!product) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && inq.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能基于自己的询盘创建订单');
      const quote = await get('SELECT * FROM quotes WHERE inquiry_id = ? ORDER BY created_at DESC', inq.id);
      const total = body.total != null ? Number(body.total) : (quote ? Number(quote.price) : NaN);
      if (!(total > 0)) return fail(res, 400, 'VALIDATION', '需要有效的成交金额（请先报价或传入 total）');
      const id = randomUUID();
      await run(
        'INSERT INTO orders (id, inquiry_id, quote_id, buyer_id, seller_id, status, total, currency, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        id, inq.id, quote ? quote.id : null, inq.buyer_id, product.seller_id, 'created', total, body.currency || 'USD', Date.now(), Date.now()
      );
      await audit(u.id, 'order.create', 'order', id, String(total));
      /* 成交客户也进地址簿（订单来源，权重更高：使用次数 +1） */
      await rememberAddress(inq.buyer_id || u.id, 'order', {
        name: inq.contact_name, email: inq.contact_email, company: inq.contact_company, country: inq.contact_country
      });
      const seller = await get('SELECT * FROM users WHERE id = ?', product.seller_id);
      if (seller) await notifyUser(seller.id, 'order', '收到新订单', '订单金额 ' + (body.currency || 'USD') + ' ' + total);
      await addEvidence(id, u.id, 'order_create', id, { total, currency: body.currency || 'USD', inquiryId: inq.id });
      return send(res, 201, await orderView(await get('SELECT * FROM orders WHERE id = ?', id)));
    }
    if (!b && m === 'GET') {
      const u = await requireAuth(res, req);
      if (!u) return;
      let rows;
      if (u.role === 'admin') rows = await all('SELECT * FROM orders ORDER BY created_at DESC');
      else rows = await all('SELECT * FROM orders WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC', u.id, u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && !c && m === 'GET') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      return send(res, 200, await orderView(o));
    }
    if (b && c === 'confirm-receipt' && m === 'POST') {
      const u = await requireAuth(res, req, ['buyer', 'admin']);
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有买家可以确认签收');
      if (o.status !== 'created') return fail(res, 400, 'INVALID_STATUS', '订单当前状态不可确认签收');
      await run('UPDATE orders SET status = ?, receipt_confirmed_at = ?, updated_at = ? WHERE id = ?', 'complete', Date.now(), Date.now(), b);
      await audit(u.id, 'order.receipt', 'order', b, '交易达成');
      await addEvidence(b, u.id, 'receipt_confirmed', b, { status: 'complete' });
      const seller = await get('SELECT * FROM users WHERE id = ?', o.seller_id);
      if (seller) await notifyUser(seller.id, 'order', '买家已确认签收', '订单 ' + b + ' 交易达成。');
      return send(res, 200, await orderView(await get('SELECT * FROM orders WHERE id = ?', b)));
    }
    if (b && c === 'cancel' && m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有买家可以取消订单');
      if (o.status !== 'created') return fail(res, 400, 'INVALID_STATUS', '订单当前状态不可取消');
      await run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', 'cancelled', Date.now(), b);
      await audit(u.id, 'order.cancel', 'order', b, '');
      return send(res, 200, await orderView(await get('SELECT * FROM orders WHERE id = ?', b)));
    }
    if (b && c === 'tips' && !d && m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权操作该订单');
      if (o.status !== 'complete') return fail(res, 400, 'ORDER_NOT_COMPLETE', '交易达成后才能打赏');
      const body = await readBody(req);
      const amount = Number(body.amount);
      if (!(amount > 0) || amount > 10000) return fail(res, 400, 'VALIDATION', '打赏金额需在 0 到 10000 之间');
      const to = u.id === o.buyer_id ? o.seller_id : o.buyer_id;
      const id = randomUUID();
      await run(
        'INSERT INTO tips (id, order_id, from_user_id, to_user_id, amount, currency, note, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        id, b, u.id, to, amount, o.currency || 'USD', String(body.note || '').slice(0, 200), 'active', Date.now()
      );
      await audit(u.id, 'tip.create', 'tip', id, String(amount));
      await addEvidence(b, u.id, 'tip_create', id, { amount, currency: o.currency || 'USD', note: String(body.note || '').slice(0, 200) });
      const recipient = await get('SELECT * FROM users WHERE id = ?', to);
      if (recipient) await notifyUser(recipient.id, 'tip', '收到小费打赏', '订单 ' + b + ' 收到打赏 ' + (o.currency || 'USD') + ' ' + amount);
      return send(res, 201, await get('SELECT * FROM tips WHERE id = ?', id));
    }
    if (b && c === 'tips' && !d && m === 'GET') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      return send(res, 200, await all('SELECT * FROM tips WHERE order_id = ? ORDER BY created_at DESC', b));
    }
    if (b && c === 'tips' && d && e === 'cancel' && m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const tip = await get('SELECT * FROM tips WHERE id = ?', d);
      if (!tip) return fail(res, 404, 'NOT_FOUND', '打赏记录不存在');
      if (u.role !== 'admin' && tip.from_user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有打赏方可取消');
      if (tip.status !== 'active') return fail(res, 400, 'INVALID_STATUS', '该打赏已不可取消');
      await run('UPDATE tips SET status = ?, cancelled_at = ? WHERE id = ?', 'cancelled', Date.now(), d);
      await audit(u.id, 'tip.cancel', 'tip', d, '');
      await addEvidence(b, u.id, 'tip_cancel', d, {});
      return send(res, 200, await get('SELECT * FROM tips WHERE id = ?', d));
    }
    /* 货物物流：卖家创建物流单，买卖双方实时可见 */
    if (b && c === 'shipments' && !d && m === 'POST') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'orders')) return;
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有卖家可以创建物流单');
      if (o.status !== 'created' && o.status !== 'complete') return fail(res, 400, 'INVALID_STATUS', '订单当前状态不可创建物流单');
      const body = await readBody(req);
      const sid = randomUUID();
      const now = Date.now();
      const origin = String(body.origin || '').slice(0, 120);
      const destination = String(body.destination || '').slice(0, 120);
      const mode = ['land', 'sea', 'air'].includes(body.mode) ? body.mode : 'land';
      await run(
        'INSERT INTO shipments (id, order_id, carrier, tracking_no, mode, status, origin, destination, current_location, etd, eta, remark, created_by, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        sid, b, String(body.carrier || '').slice(0, 80), String(body.trackingNo || '').slice(0, 80), mode,
        'processing', origin, destination, origin, body.etd || null, body.eta || null,
        String(body.remark || '').slice(0, 500), u.id, now, now
      );
      await run(
        'INSERT INTO shipment_events (id, shipment_id, status, location, note, event_time, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
        randomUUID(), sid, 'processing', origin, '物流单已创建，等待卖家发货', now, u.id, now
      );
      await audit(u.id, 'shipment.create', 'shipment', sid, 'order=' + b);
      await addEvidence(b, u.id, 'shipment_create', sid, { carrier: String(body.carrier || ''), trackingNo: String(body.trackingNo || '') });
      const buyer = o.buyer_id ? await get('SELECT * FROM users WHERE id = ?', o.buyer_id) : null;
      if (buyer) await notifyUser(buyer.id, 'shipment', '物流信息已创建', '订单 ' + b + ' 已创建物流单，可查看实时跟进');
      return send(res, 201, await shipmentView(await get('SELECT * FROM shipments WHERE id = ?', sid)));
    }
    if (b && c === 'shipments' && !d && m === 'GET') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const o = await get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      return send(res, 200, (await Promise.all((await all('SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at ASC', b)).map(shipmentView))));
    }
    /* 物流事件：卖家/管理员更新，自动触发存证 */
    if (b && c === 'shipments' && d && e === 'events' && m === 'POST') {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'orders')) return;
      if (!u) return;
      const s = await get('SELECT * FROM shipments WHERE id = ?', d);
      if (!s) return fail(res, 404, 'NOT_FOUND', '物流单不存在');
      const o = await get('SELECT * FROM orders WHERE id = ?', s.order_id);
      if (u.role !== 'admin' && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有卖家可以更新物流');
      const body = await readBody(req);
      const allowed = ['processing', 'packed', 'shipped', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception'];
      const status = String(body.status || '').toLowerCase();
      if (!allowed.includes(status)) return fail(res, 400, 'INVALID_STATUS', 'status 不合法');
      const now = Date.now();
      const location = String(body.location || s.current_location || '').slice(0, 120);
      await run(
        'INSERT INTO shipment_events (id, shipment_id, status, location, note, event_time, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
        randomUUID(), d, status, location, String(body.note || '').slice(0, 500), body.eventTime || now, u.id, now
      );
      await run('UPDATE shipments SET status = ?, current_location = ?, updated_at = ? WHERE id = ?', status, location, now, d);
      await audit(u.id, 'shipment.event', 'shipment', d, status + ' @ ' + location);
      await addEvidence(s.order_id, u.id, 'shipment_event', d, { status, location, note: String(body.note || '').slice(0, 500) });
      return send(res, 200, await shipmentView(await get('SELECT * FROM shipments WHERE id = ?', d)));
    }
  }

  /* 会话消息 */
  if (a === 'conversations' && c === 'messages') {
    if (m === 'GET') {
      const u = await requireAuth(res, req);
      if (!u) return;
      /* 管理员看别人会话 = 客服权限；没有该权限只能看自己的会话 */
      if (u.role === 'admin' && !hasPerm(u, 'service')) return fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「service」权限（客服会话）');
      const conv = await get('SELECT * FROM conversations WHERE id = ?', b);
      if (conv && conv.buyer_id !== u.id && conv.seller_id !== u.id && u.role !== 'admin') {
        return fail(res, 403, 'FORBIDDEN', '无权查看该会话');
      }
      return send(res, 200, conv ? await all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', b) : []);
    }
    if (m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      if (u.role === 'admin' && !hasPerm(u, 'service')) return fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「service」权限（客服会话）');
      const body = await readBody(req);
      if (!body.text) return fail(res, 400, 'VALIDATION', 'text 为必填');
      let conv = await get('SELECT * FROM conversations WHERE id = ?', b);
      if (!conv) {
        /* 会话 id 就是询盘 id：参与方必须按询盘/商品归属来定，
         * 以前把 buyer_id 和 seller_id 都写成"发消息的人"，结果卖家读自己的会话被 403 拦下。 */
        const inq = await get('SELECT * FROM inquiries WHERE id = ?', b);
        const prod = inq ? await get('SELECT * FROM products WHERE id = ?', inq.product_id) : null;
        const buyerId = (inq && inq.buyer_id) || u.id;
        const sellerId = (prod && prod.seller_id) || u.id;
        await run('INSERT INTO conversations (id, buyer_id, seller_id, created_at) VALUES (?,?,?,?)', b, buyerId, sellerId, Date.now());
      }
      const id = randomUUID();
      await run(
        'INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?,?,?,?,?)',
        id, b, u.id, body.text, Date.now()
      );
      const created = await get('SELECT * FROM messages WHERE id = ?', id);
      wsBroadcast(b, { type: 'message', id, conversationId: b, senderId: u.id, text: body.text, createdAt: created.created_at });
      return send(res, 201, created);
    }
  }

  /* 会话已读回执 */
  if (a === 'conversations' && c === 'read') {
    const u = await requireAuth(res, req);
    if (!u) return;
    const conv = await get('SELECT * FROM conversations WHERE id = ?', b);
    if (conv && conv.buyer_id !== u.id && conv.seller_id !== u.id && u.role !== 'admin') {
      return fail(res, 403, 'FORBIDDEN', '无权操作该会话');
    }
    if (m === 'GET') {
      const rows = await all('SELECT user_id, last_read_at FROM conversation_reads WHERE conversation_id = ?', b);
      return send(res, 200, { conversationId: b, readers: rows.map(r => ({ userId: r.user_id, lastReadAt: r.last_read_at })) });
    }
    if (m === 'POST') {
      const body = await readBody(req);
      const lastReadAt = body.lastReadAt ? Number(body.lastReadAt) : Date.now();
      await run('INSERT INTO conversation_reads (conversation_id, user_id, last_read_at) VALUES (?,?,?) ON CONFLICT(conversation_id, user_id) DO UPDATE SET last_read_at = excluded.last_read_at',
        b, u.id, lastReadAt);
      wsBroadcast(b, { type: 'read', conversationId: b, userId: u.id, lastReadAt });
      return send(res, 200, { conversationId: b, userId: u.id, lastReadAt });
    }
  }

  /* 翻译（服务端代理：真实服务链 + 额度 + 缓存 + 离线兜底） */
  if (a === 'translate' && !b && m === 'POST') {
    const body = await readBody(req);
    const u = await currentUser(req);
    try {
      const out = await translateText({ userId: u ? u.id : null, text: body.text, target: body.target, source: body.source });
      return send(res, 200, out);
    } catch (e) {
      if (e && e.code) return fail(res, e.status || 400, e.code, e.message);
      throw e;
    }
  }

  /* 批量翻译：一次请求翻多段（商品标题+描述+特性一次搞定）。
   * 以前前端每段发一次请求，一页 5–8 段就是 5–8 次往返，用户感觉"点了要等很久"。 */
  if (a === 'translate' && b === 'batch' && m === 'POST') {
    const body = await readBody(req);
    const u = await currentUser(req);
    const target = String(body.target || '').trim();
    const texts = Array.isArray(body.texts) ? body.texts.slice(0, 20).map(x => String(x == null ? '' : x)) : [];
    if (!texts.length || !target) return fail(res, 400, 'VALIDATION', 'texts/target 为必填');
    const total = texts.reduce((n, x) => n + x.length, 0);
    if (total > 6000) return fail(res, 400, 'TEXT_TOO_LONG', '单次批量最多 6000 字符');

    const uid = u ? u.id : 'guest';
    const day = new Date().toISOString().slice(0, 10);
    if (total > 0) {
      const used = await get('SELECT COALESCE(SUM(chars),0) AS c FROM translation_usage WHERE user_id = ? AND day = ?', uid, day);
      const quota = Number(process.env.TRANSLATION_DAILY_QUOTA || 5000);
      if ((used ? used.c : 0) + total > quota) return fail(res, 429, 'QUOTA_EXCEEDED', '今日翻译额度已用完');
    }

    const items = new Array(texts.length);
    let cursor = 0;
    /* 并发 3：Workers AI 并发太高会被限流 */
    const lanes = new Array(Math.min(3, texts.length)).fill(0).map(async () => {
      while (cursor < texts.length) {
        const i = cursor++;
        const src = texts[i];
        if (!src.trim()) { items[i] = { text: src, provider: 'empty' }; continue; }
        try {
          const r = await translateText({ userId: uid, text: src, target, source: body.source, skipQuota: true });
          items[i] = { text: r.text, provider: r.provider };
        } catch (e) {
          items[i] = { text: src, provider: 'offline' };
        }
      }
    });
    await Promise.all(lanes);
    if (total > 0) {
      await run(
        'INSERT INTO translation_usage (id, user_id, day, chars, created_at) VALUES (?,?,?,?,?)',
        randomUUID(), uid, day, total, Date.now()
      );
    }
    return send(res, 200, { items, target, source: body.source || null, chars: total });
  }

  /* 防伪验真 */
  if (a === 'anti-fake' && b === 'verify' && m === 'POST') {
    const body = await readBody(req);
    const code = String(body.code || '').trim().toUpperCase();
    const row = await get('SELECT * FROM anti_fake_codes WHERE code = ?', code);
    if (!row || row.status !== 'active') return fail(res, 404, 'CODE_NOT_FOUND', '防伪码不存在或已作废');
    await run('UPDATE anti_fake_codes SET last_verified_at = ?, verify_count = verify_count + 1 WHERE id = ?', Date.now(), row.id);
    const prod = await get('SELECT * FROM products WHERE id = ?', row.product_id);
    const enTr = prod ? await get('SELECT title FROM product_translations WHERE product_id = ? AND lang = ?', prod.id, 'en') : null;
    const zhTr = prod ? await get('SELECT title FROM product_translations WHERE product_id = ? AND lang = ?', prod.id, 'zh') : null;
    return send(res, 200, {
      genuine: true,
      code: row.code,
      productId: row.product_id,
      verifiedAt: new Date().toISOString(),
      verifyCount: (row.verify_count || 0) + 1,
      batchNo: row.batch_no || '',
      productCode: prod ? prod.code : '',
      productTitle: (enTr && enTr.title) || (zhTr && zhTr.title) || '',
      issuedAt: row.issued_at || null
    });
  }

  /* 资讯：实时更新 + 权威来源（全球多区域） */
  if (a === 'news') {
    if (m === 'GET' && !b) {
      const cat = q.get('cat') || '';
      const region = q.get('region') || '';
      let rows = await all(
        'SELECT n.*, s.name AS source_name, s.url AS source_url FROM news_items n LEFT JOIN news_sources s ON s.id = n.source_id WHERE n.status = ?',
        'published'
      );
      if (cat) rows = rows.filter(n => n.category === cat);
      if (region) rows = rows.filter(n => n.region === region);
      rows.sort((x, y) => String(y.published_at || '').localeCompare(String(x.published_at || '')));
      const updatedAt = rows.reduce((mx, n) => {
        const t = n.updated_at || Date.parse(n.published_at || '') || 0;
        return Math.max(mx, t);
      }, 0) || Date.now();
      const page = paginate(rows, q);
      return send(res, 200, { ...page, updatedAt });
    }
    if (b === 'sources' && m === 'GET') {
      return send(res, 200, await all('SELECT * FROM news_sources WHERE enabled = 1'));
    }
    if (m === 'POST' && !b) {
      const u = await requirePerm(res, req, 'marketing');
      if (!u) return;
      const body = await readBody(req);
      const title = String(body.title || '').trim();
      const url = String(body.url || '').trim();
      if (!title || !/^https?:\/\//.test(url)) return fail(res, 400, 'VALIDATION', 'title 与合法 url 为必填');
      let parsedUrl;
      try { parsedUrl = new URL(url); } catch (e) { return fail(res, 400, 'VALIDATION', 'url 格式不正确'); }
      const sourceName = String(body.sourceName || '').trim() || parsedUrl.hostname;
      let source = await get('SELECT * FROM news_sources WHERE name = ?', sourceName);
      if (!source) {
        const sid = randomUUID();
        await run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)',
          sid, sourceName, parsedUrl.origin, body.region || 'global', body.category || 'general', 1);
        source = await get('SELECT * FROM news_sources WHERE id = ?', sid);
      }
      const id = randomUUID();
      await run(
        'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, updated_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        id, source.id, body.region || 'global', body.category || 'general',
        body.titleZh || title, body.titleEn || title, body.summaryZh || '', body.summaryEn || '',
        url, body.publishedAt || new Date().toISOString(), Date.now(), 'published'
      );
      await audit(u.id, 'news.create', 'news', id, title);
      return send(res, 201, await get('SELECT * FROM news_items WHERE id = ?', id));
    }
    if (b === 'auto' && m === 'GET') {
      const u = await requirePerm(res, req, 'marketing');
      if (!u) return;
      return send(res, 200, newsAutoState);
    }
    if (b === 'refresh' && m === 'POST') {
      const u = await requirePerm(res, req, 'marketing');
      if (!u) return;
      return send(res, 200, await refreshNewsFeeds(u.id));
    }
  }

  /* 第三方运输保险：试点自营 + 合作保险商框架（后续接入真实保险公司） */
  if (a === 'insurances') {
    await ensureInsuranceProviders();
    if (m === 'GET' && b === 'providers') {
      const rows = await all('SELECT * FROM insurance_providers ORDER BY sort');
      /* tiers 在库里是 TEXT，直接回给前端会被当成字符串按字符遍历，
       * 页面上就渲染出一长串空行（用户看到的"乱码"）。这里解析成对象再回。 */
      return send(res, 200, rows.map(r => ({ ...r, tiers: safeJson(r.tiers, {}), enabled: !!r.enabled })));
    }
    if (m === 'GET' && !b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      return send(res, 200, await all('SELECT * FROM insurances WHERE user_id = ? ORDER BY created_at DESC', u.id));
    }
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req, ['buyer']);
      if (!u) return;
      const body = await readBody(req);
      const orderId = String(body.orderId || '').trim();
      const providerId = String(body.providerId || '').trim();
      const tier = String(body.tier || '').trim();
      const order = await get('SELECT * FROM orders WHERE id = ?', orderId);
      if (!order || order.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能为本人订单投保');
      if (!['created', 'complete'].includes(order.status)) return fail(res, 400, 'VALIDATION', '当前订单状态不支持投保');
      const exist = await get("SELECT * FROM insurances WHERE order_id = ? AND status = 'active'", orderId);
      if (exist) return fail(res, 400, 'DUPLICATE', '该订单已有生效中的保险');
      const prov = await get('SELECT * FROM insurance_providers WHERE id = ? AND enabled = 1', providerId);
      if (!prov) return fail(res, 404, 'NOT_FOUND', '保险商不存在或暂未开放');
      const t = safeJson(prov.tiers, {})[tier];
      if (!t) return fail(res, 400, 'VALIDATION', '无效的保障档位');
      const total = toNum(order.total, 0);
      const premium = Math.max(toNum(t.minPremium, 3), Math.round(total * toNum(t.rate, 0.01) * 100) / 100);
      const id = randomUUID();
      await run(
        'INSERT INTO insurances (id, order_id, user_id, provider_id, provider_name, tier, tier_label, premium, currency, coverage, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, orderId, u.id, prov.id, prov.name, tier, String(t.label || tier), premium, order.currency || 'USD',
        String(t.coverage || ''), 'active', Date.now(), Date.now()
      );
      await audit(u.id, 'insurance.create', 'insurance', id, 'order=' + orderId + ' tier=' + tier);
      await notifyUser(order.seller_id, 'insurance', '买家已为订单投保',
        '订单 ' + orderId + ' 已投保（' + prov.name + ' · ' + String(t.label || tier) + '），请知悉。');
      return send(res, 201, await get('SELECT * FROM insurances WHERE id = ?', id));
    }
    if (m === 'GET' && b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      const row = await get('SELECT * FROM insurances WHERE id = ?', b);
      if (!row) return fail(res, 404, 'NOT_FOUND', '保单不存在');
      const order = await get('SELECT * FROM orders WHERE id = ?', row.order_id);
      if (!order || (order.buyer_id !== u.id && order.seller_id !== u.id && u.role !== 'admin')) {
        return fail(res, 403, 'FORBIDDEN', '无权查看该保单');
      }
      return send(res, 200, row);
    }
    if (m === 'POST' && c === 'cancel') {
      const u = await requireAuth(res, req, ['buyer']);
      if (!u) return;
      const row = await get('SELECT * FROM insurances WHERE id = ?', b);
      if (!row || row.user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能取消本人投保');
      if (row.status !== 'active') return fail(res, 400, 'INVALID_STATUS', '保单状态不可取消');
      await run('UPDATE insurances SET status = ?, updated_at = ? WHERE id = ?', 'cancelled', Date.now(), b);
      await audit(u.id, 'insurance.cancel', 'insurance', b, 'order=' + row.order_id);
      return send(res, 200, await get('SELECT * FROM insurances WHERE id = ?', b));
    }
  }

  /* 合同草案保管：双方可申请平台保管 30 天（电子版哈希留痕，到期自动标记过期） */
  if (a === 'contracts') {
    if (m === 'POST' && b === 'custody') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      const orderId = String(body.orderId || '').trim();
      const draftText = String(body.draftText || '').trim();
      if (!orderId || !draftText) return fail(res, 400, 'VALIDATION', '订单与合同文本为必填');
      const order = await get('SELECT * FROM orders WHERE id = ?', orderId);
      if (!order || (order.buyer_id !== u.id && order.seller_id !== u.id)) {
        return fail(res, 403, 'FORBIDDEN', '仅订单双方可申请合同保管');
      }
      const exist = await get('SELECT * FROM contract_custodies WHERE order_id = ?', orderId);
      if (exist) return send(res, 200, exist);
      const id = randomUUID();
      const expiresAt = Date.now() + 30 * 24 * 3600 * 1000;
      await run(
        'INSERT INTO contract_custodies (id, order_id, user_id, draft_text, contract_hash, status, expires_at, created_at) VALUES (?,?,?,?,?,?,?,?)',
        id, orderId, u.id, draftText, await sha256(draftText), 'active', expiresAt, Date.now()
      );
      await audit(u.id, 'contract.custody', 'contract', id, 'order=' + orderId + ' keep=30d');
      return send(res, 201, await get('SELECT * FROM contract_custodies WHERE id = ?', id));
    }
    if (m === 'GET' && !b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      return send(res, 200, await all('SELECT * FROM contract_custodies WHERE user_id = ? ORDER BY created_at DESC', u.id));
    }
    if (m === 'GET' && b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      const row = await get('SELECT * FROM contract_custodies WHERE id = ?', b);
      if (!row) return fail(res, 404, 'NOT_FOUND', '保管记录不存在');
      const order = await get('SELECT * FROM orders WHERE id = ?', row.order_id);
      if (!order || (order.buyer_id !== u.id && order.seller_id !== u.id && u.role !== 'admin')) {
        return fail(res, 403, 'FORBIDDEN', '无权查看该保管记录');
      }
      return send(res, 200, row);
    }
  }

  /* 通知 */
  if (a === 'notifications') {
    const u = await requireAuth(res, req);
    if (!u) return;
    if (m === 'GET' && !b) {
      return send(res, 200, await all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', u.id));
    }
    /* 标记全部已读（此前前端有这个按钮，但后端没有对应接口 → 点了报"接口不存在"） */
    if (m === 'POST' && b === 'read-all') {
      await run('UPDATE notifications SET read_at = ? WHERE user_id = ? AND read_at IS NULL', Date.now(), u.id);
      return send(res, 200, { ok: true });
    }
    /* 标记单条已读 */
    if (m === 'POST' && b && c === 'read') {
      const n = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', b, u.id);
      if (!n) return fail(res, 404, 'NOT_FOUND', '消息不存在');
      await run('UPDATE notifications SET read_at = ? WHERE id = ?', Date.now(), b);
      return send(res, 200, { ok: true, id: b });
    }
    /* 删掉一条消息（"点不掉"的另一种解法：直接移除） */
    if (m === 'DELETE' && b) {
      const n = await get('SELECT * FROM notifications WHERE id = ? AND user_id = ?', b, u.id);
      if (!n) return fail(res, 404, 'NOT_FOUND', '消息不存在');
      await run('DELETE FROM notifications WHERE id = ?', b);
      return send(res, 200, { ok: true, id: b });
    }
  }

  /* 品类需求记录：用户没找到想要的品类时提交，平台据此邀请供应商入驻 */
  if (a === 'category-requests') {
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      if (!name || name.length > 120) return fail(res, 400, 'VALIDATION', '品类名称为必填且不超过 120 字符');
      const markets = Array.isArray(body.targetMarkets) ? body.targetMarkets.map(String).slice(0, 20) : [];
      const id = randomUUID();
      await run(
        'INSERT INTO category_requests (id, user_id, name, description, target_markets, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        id, u.id, name, String(body.description || '').slice(0, 1000), JSON.stringify(markets), 'new', Date.now(), Date.now()
      );
      await audit(u.id, 'category.request', 'category_request', id, name);
      return send(res, 201, await get('SELECT * FROM category_requests WHERE id = ?', id));
    }
    if (!b && m === 'GET') {
      const u = await requireAuth(res, req);
      if (!u) return;
      let rows;
      if (u.role === 'admin') rows = await all('SELECT * FROM category_requests ORDER BY created_at DESC');
      else rows = await all('SELECT * FROM category_requests WHERE user_id = ? ORDER BY created_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'status' && m === 'POST') {
      const u = await requirePerm(res, req, 'marketing');
      if (!u) return;
      const body = await readBody(req);
      const r = await get('SELECT * FROM category_requests WHERE id = ?', b);
      if (!r) return fail(res, 404, 'NOT_FOUND', '品类需求不存在');
      if (!['invited', 'done'].includes(body.status)) return fail(res, 400, 'INVALID_STATUS', 'status 必须是 invited 或 done');
      await run('UPDATE category_requests SET status = ?, note = ?, updated_at = ? WHERE id = ?', body.status, String(body.note || '').slice(0, 300), Date.now(), b);
      await audit(u.id, 'category.' + body.status, 'category_request', b, String(body.note || ''));
      const owner = r.user_id ? await get('SELECT * FROM users WHERE id = ?', r.user_id) : null;
      if (owner) {
        await notifyUser(owner.id, 'category', '品类需求有进展',
          body.status === 'invited' ? '平台正在为您邀请该品类的供应商入驻。' : '您的品类需求已完成处理。');
      }
      return send(res, 200, await get('SELECT * FROM category_requests WHERE id = ?', b));
    }
  }

  /* 文件上传与下载（存储抽象：本地磁盘，可换 S3/OSS） */
  if (a === 'files') {
    if (m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const ctype = String(req.headers['content-type'] || '');
      let filename = '', mime = '', data = null;
      if (ctype.startsWith('multipart/form-data')) {
        const boundary = /boundary=(?:"([^"]+)"|([^;]+))/i.exec(ctype);
        if (!boundary) return fail(res, 400, 'INVALID_MULTIPART', '缺少 boundary');
        const raw = await readRawBody(req);
        const parts = parseMultipart(raw, boundary[1] || boundary[2]);
        const filePart = parts.find(p => p.filename);
        if (!filePart) return fail(res, 400, 'VALIDATION', '缺少文件字段');
        filename = filePart.filename;
        mime = filePart.contentType;
        data = filePart.content;
      } else {
        const body = await readBody(req);
        if (!body.data || !body.mime) return fail(res, 400, 'VALIDATION', 'JSON 上传需要 data(base64)/mime');
        filename = body.filename || 'upload';
        mime = body.mime;
        data = base64ToBytes(body.data);
      }
      const { ext, error } = validateFile(mime, data);
      if (error) return fail(res, error.status, error.code, error.message);
      const id = randomUUID();
      const key = id + '.' + ext;
      try {
        await putFile(key, data);
      } catch (e) {
        console.error('[storage] put failed: ' + (e && e.message));
        return fail(res, 503, 'STORAGE_UNAVAILABLE', '文件存储暂不可用（对象存储未启用），请联系管理员');
      }
      await run(
        'INSERT INTO files (id, owner_id, bucket_key, mime, size, status, created_at) VALUES (?,?,?,?,?,?,?)',
        id, u.id, key, mime, data.length, 'active', Date.now()
      );
      await audit(u.id, 'file.upload', 'file', id, filename);
      return send(res, 201, { id, filename, mime, size: data.length, url: API_BASE + '/files/' + id });
    }
    if (b && m === 'GET') {
      const row = await get('SELECT * FROM files WHERE id = ?', b);
      if (!row) return fail(res, 404, 'NOT_FOUND', '文件不存在');
      /* 已删除的文件不能再通过直链读到（否则"删除"只是假动作） */
      if (row.status && row.status !== 'active') return fail(res, 404, 'NOT_FOUND', '文件不存在');
      let buf;
      try {
        buf = await getFile(row.bucket_key);
      } catch (e) {
        console.error('[storage] get failed: ' + (e && e.message));
        return fail(res, 503, 'STORAGE_UNAVAILABLE', '文件存储暂不可用');
      }
      if (!buf) return fail(res, 404, 'NOT_FOUND', '文件不存在');
      const wm = q.get('watermark') ? String(q.get('watermark')).slice(0, 80) : '';
      if (wm && /svg/i.test(row.mime)) buf = watermarkSvg(buf, wm);
      /* 文件按 uuid 命名、内容不会变：让浏览器长期缓存，图片第二次打开就秒出
       * （用户反馈"更新图片后要等很久才显示"）。 */
      return sendBytes(res, 200, buf, row.mime, {
        'Content-Disposition': 'inline',
        'Cache-Control': 'public, max-age=31536000, immutable'
      });
    }
    /* 删除文件：之前只有上传和读取，前端 api.files.remove 调过来是 404，
     * 结果"删了附件"只是记录消失、文件永远留在对象存储里（白占空间）。 */
    if (b && m === 'DELETE') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const row = await get('SELECT * FROM files WHERE id = ?', b);
      if (!row) return fail(res, 404, 'NOT_FOUND', '文件不存在');
      if (u.role !== 'admin' && row.owner_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能删除自己上传的文件');
      let storageDeleted = true;
      try {
        storageDeleted = await deleteFile(row.bucket_key);
      } catch (e) {
        /* 存储层删不掉（比如桶策略变了）也不能把记录留着：先标记 deleted，
         * 读接口只认 active，用户侧不会再看到这个文件。 */
        storageDeleted = false;
      }
      await run("UPDATE files SET status = 'deleted' WHERE id = ?", row.id);
      await audit(u.id, 'file.delete', 'file', row.id, storageDeleted ? 'storage+db' : 'db-only');
      return send(res, 200, { ok: true, id: row.id, storageDeleted });
    }
  }

  /* 第三方存证：保存流程证据快照 + 哈希链验证 */
  if (a === 'evidence') {
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      const o = await get('SELECT * FROM orders WHERE id = ?', body.orderId);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权操作该订单');
      const kind = String(body.kind || 'manual').slice(0, 32);
      const snapshot = (typeof body.snapshot === 'object' && body.snapshot !== null) ? body.snapshot : {};
      const rec = await addEvidence(o.id, u.id, kind, body.refId ? String(body.refId).slice(0, 64) : null, snapshot);
      await audit(u.id, 'evidence.create', 'evidence', rec.id, kind);
      return send(res, 201, rec);
    }
    if (m === 'GET' && !b) {
      const u = await requireAuth(res, req);
      if (!u) return;
      const orderId = String(q.get('orderId') || '');
      const o = await get('SELECT * FROM orders WHERE id = ?', orderId);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      const items = await all('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC', orderId);
      const v = await verifyEvidenceChain(orderId);
      return send(res, 200, { orderId, total: items.length, verified: v.valid, broken: v.broken, items });
    }
    if (b && c === 'verify' && m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const rec = await get('SELECT * FROM evidence_records WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '存证记录不存在');
      const o = await get('SELECT * FROM orders WHERE id = ?', rec.order_id);
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      const v = await verifyEvidenceChain(rec.order_id);
      return send(res, 200, { id: rec.id, orderId: rec.order_id, chainValid: v.valid, total: v.total, broken: v.broken });
    }
  }

  /* 卖家推广：提交 → 管理员审核 → 产品标记 promoted */
  if (a === 'promotions') {
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'marketing')) return;
      if (!u) return;
      const body = await readBody(req);
      const p = await get('SELECT * FROM products WHERE id = ?', body.productId);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能推广自己的产品');
      const days = Math.max(1, Math.min(90, Math.round(toNum(body.days, 7))));
      const id = randomUUID();
      await run(
        'INSERT INTO promotion_requests (id, product_id, seller_id, days, budget, note, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
        id, p.id, u.id, days, String(body.budget || 'basic').slice(0, 40), String(body.note || '').slice(0, 300), 'pending', Date.now()
      );
      await audit(u.id, 'promotion.request', 'promotion', id, 'product=' + p.id);
      return send(res, 201, await get('SELECT * FROM promotion_requests WHERE id = ?', id));
    }
    if (m === 'GET' && !b) {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (denyAdminWrite(res, u, 'marketing')) return;
      if (!u) return;
      const rows = u.role === 'admin'
        ? await all('SELECT * FROM promotion_requests ORDER BY created_at DESC')
        : await all('SELECT * FROM promotion_requests WHERE seller_id = ? ORDER BY created_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'review' && m === 'POST') {
      const u = await requirePerm(res, req, 'marketing');
      if (!u) return;
      const body = await readBody(req);
      const pr = await get('SELECT * FROM promotion_requests WHERE id = ?', b);
      if (!pr) return fail(res, 404, 'NOT_FOUND', '推广申请不存在');
      if (body.action === 'approve') {
        await run('UPDATE promotion_requests SET status = ?, reject_reason = NULL, reviewed_at = ? WHERE id = ?', 'approved', Date.now(), b);
        await audit(u.id, 'promotion.approve', 'promotion', b, '');
      } else if (body.action === 'reject') {
        await run('UPDATE promotion_requests SET status = ?, reject_reason = ?, reviewed_at = ? WHERE id = ?', 'rejected', String(body.reason || '不符合推广要求').slice(0, 300), Date.now(), b);
        await audit(u.id, 'promotion.reject', 'promotion', b, String(body.reason || ''));
      } else {
        return fail(res, 400, 'INVALID_ACTION', 'action 必须是 approve 或 reject');
      }
      return send(res, 200, await get('SELECT * FROM promotion_requests WHERE id = ?', b));
    }
  }

  /* 管理后台 */
  if (a === 'admin') {
    /* ===== 权限细分（2026-10-06）=====
     * 只有具备 system 权限的管理员能看/改权限；并且有"最后一个 system 管理员"保护，
     * 避免把自己或所有人关在权限管理之外。 */
    if (b === 'permissions' && m === 'GET') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const rows = await all("SELECT id, email, name, role, status, permissions, perm_note, created_at, last_login_at FROM users WHERE role = 'admin' ORDER BY created_at ASC");
      return send(res, 200, {
        keys: ADMIN_PERMS,
        items: rows.map(r => ({
          id: r.id, email: r.email, name: r.name, status: r.status,
          full: (r.permissions === null || r.permissions === undefined || r.permissions === ''),
          permissions: adminPermsOf(r),
          note: r.perm_note || '',
          createdAt: r.created_at, lastLoginAt: r.last_login_at,
          isSelf: r.id === u.id
        }))
      });
    }
    /* 新建管理员账号（只有 system 权限能开），权限直接指定 */
    if (b === 'users' && !c && m === 'POST') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const name = String(body.name || '').trim() || '管理员';
      if (!EMAIL_RE.test(email)) return fail(res, 400, 'VALIDATION', '邮箱格式不正确');
      if (password.length < 8 || !/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
        return fail(res, 400, 'VALIDATION', '密码至少 8 位，且需同时包含字母和数字');
      }
      if (await get('SELECT id FROM users WHERE lower(email) = ?', email)) return fail(res, 409, 'EMAIL_EXISTS', '邮箱已存在');
      const perms = Array.isArray(body.permissions) ? body.permissions.filter(k => ADMIN_PERMS.indexOf(k) >= 0) : [];
      const id = randomUUID();
      await run(
        'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, review_state, permissions, perm_note, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        id, email, await hashPassword(password), 'admin', name.slice(0, 80), 'active', 1, 'approved',
        JSON.stringify(perms), String(body.note || '').slice(0, 200), Date.now()
      );
      await audit(u.id, 'admin.user.create', 'user', id, email + ' perms=' + perms.join(','));
      return send(res, 201, { ok: true, id: id, email: email, permissions: perms });
    }
    /* 修改某个管理员的权限 */
    if (b === 'users' && c && d === 'permissions' && m === 'PUT') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const target = await get('SELECT * FROM users WHERE id = ?', c);
      if (!target) return fail(res, 404, 'NOT_FOUND', '账号不存在');
      if (target.role !== 'admin') return fail(res, 400, 'INVALID_TARGET', '只能给管理员账号设置权限');
      const body = await readBody(req);
      if (!Array.isArray(body.permissions)) return fail(res, 400, 'VALIDATION', 'permissions 必须是数组');
      const perms = body.permissions.filter(k => ADMIN_PERMS.indexOf(k) >= 0);
      /* 安全阀：摘掉 system 前确认还有别的 system 管理员 */
      if (perms.indexOf('system') < 0) {
        let others = 0;
        for (const row of await all("SELECT * FROM users WHERE role = 'admin' AND id <> ?", c)) {
          if (hasPerm(row, 'system')) others++;
        }
        if (!others) return fail(res, 400, 'LOCKOUT_RISK', '这是最后一个有「system」权限的管理员：摘掉后没人能再进入权限管理');
      }
      await run('UPDATE users SET permissions = ?, perm_note = ? WHERE id = ?', JSON.stringify(perms), String(body.note || '').slice(0, 200), c);
      await audit(u.id, 'admin.user.permissions', 'user', c, target.email + ' → ' + perms.join(','));
      return send(res, 200, { ok: true, id: c, permissions: perms });
    }
    /* 取消管理员身份（降级为普通买家）；最后一个 system 管理员不能取消 */
    if (b === 'users' && c && m === 'DELETE') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const target = await get('SELECT * FROM users WHERE id = ?', c);
      if (!target) return fail(res, 404, 'NOT_FOUND', '账号不存在');
      if (target.role !== 'admin') return fail(res, 400, 'INVALID_TARGET', '该账号不是管理员');
      if (target.id === u.id) return fail(res, 400, 'INVALID_TARGET', '不能取消自己的管理员身份');
      if (hasPerm(target, 'system')) {
        let others = 0;
        for (const row of await all("SELECT * FROM users WHERE role = 'admin' AND id <> ?", c)) {
          if (hasPerm(row, 'system')) others++;
        }
        if (!others) return fail(res, 400, 'LOCKOUT_RISK', '这是最后一个有「system」权限的管理员，不能取消');
      }
      await run("UPDATE users SET role = 'buyer', permissions = NULL, perm_note = NULL, token_version = COALESCE(token_version,0) + 1 WHERE id = ?", c);
      await audit(u.id, 'admin.user.demote', 'user', c, target.email || '');
      return send(res, 200, { ok: true, id: c, role: 'buyer' });
    }
    /* 账号审核：列出待审核/全部账号，通过或拒绝 */
    if (b === 'users' && m === 'GET') {
      const admin = await requirePerm(res, req, 'customers');
      if (!admin) return;
      const status = q.get('status') ? String(q.get('status')) : '';
      const cols = 'id, email, name, role, status, review_state, email_verified, created_at, last_login_at, signup_ip, signup_ua, email_flag';
      const rows = status
        ? await all('SELECT ' + cols + ' FROM users WHERE review_state = ? ORDER BY created_at DESC LIMIT 200', status)
        : await all('SELECT ' + cols + ' FROM users ORDER BY created_at DESC LIMIT 200');
      const counts = {
        pending: (await get("SELECT COUNT(*) AS c FROM users WHERE review_state = 'pending'")).c,
        active: (await get("SELECT COUNT(*) AS c FROM users WHERE status = 'active'")).c,
        frozen: (await get("SELECT COUNT(*) AS c FROM users WHERE status = 'frozen'")).c,
        rejected: (await get("SELECT COUNT(*) AS c FROM users WHERE review_state = 'rejected'")).c
      };
      return send(res, 200, { items: rows, counts });
    }
    if (b === 'users' && c && (d === 'approve' || d === 'reject') && m === 'POST') {
      const admin = await requirePerm(res, req, 'customers');
      if (!admin) return;
      const body = await readBody(req);
      const nextReview = d === 'approve' ? 'approved' : 'rejected';
      const target = await get('SELECT id, email, role FROM users WHERE id = ?', c);
      if (!target) return fail(res, 404, 'NOT_FOUND', '账号不存在');
      /* users 表没有 review_note 列，审核理由写进审计日志即可 */
      await run('UPDATE users SET review_state = ? WHERE id = ?', nextReview, c);
      if (body.reason) await audit(admin.id, 'admin.user.reason', 'user', c, String(body.reason).slice(0, 300));
      await audit(admin.id, 'admin.user.' + d, 'user', c, target.email || '');
      return send(res, 200, { ok: true, id: c, reviewState: nextReview });
    }
    /* 冻结 / 解冻：管理员在用户列表里直接操作，且立即生效（旧令牌也会被 requireAuth 拦下）。
     * 管理员账号本身不允许被冻结，避免把自己关在门外。 */
    if (b === 'users' && c && (d === 'freeze' || d === 'unfreeze') && m === 'POST') {
      const admin = await requirePerm(res, req, 'customers');
      if (!admin) return;
      const target = await get('SELECT id, email, role FROM users WHERE id = ?', c);
      if (!target) return fail(res, 404, 'NOT_FOUND', '账号不存在');
      if (target.role === 'admin') return fail(res, 400, 'INVALID_TARGET', '管理员账号不能被冻结');
      if (target.id === admin.id) return fail(res, 400, 'INVALID_TARGET', '不能冻结当前登录的管理员');
      const next = d === 'freeze' ? 'frozen' : 'active';
      await run('UPDATE users SET status = ? WHERE id = ?', next, c);
      await audit(admin.id, 'admin.user.' + d, 'user', c, target.email || '');
      return send(res, 200, { ok: true, id: c, status: next });
    }

    if (b === 'overview' && m === 'GET') {
      const u = await requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, {
        products: (await get('SELECT COUNT(*) AS c FROM products')).c,
        pendingReviews: (await get('SELECT COUNT(*) AS c FROM products WHERE status = ?', 'pending')).c,
        inquiries: (await get('SELECT COUNT(*) AS c FROM inquiries')).c,
        users: (await get('SELECT COUNT(*) AS c FROM users')).c,
        companies: (await get('SELECT COUNT(*) AS c FROM companies')).c,
        pendingCompanies: (await get('SELECT COUNT(*) AS c FROM companies WHERE status = ?', 'pending')).c,
        orders: (await get('SELECT COUNT(*) AS c FROM orders')).c,
        tips: (await get('SELECT COUNT(*) AS c FROM tips WHERE status = ?', 'active')).c,
        evidence: (await get('SELECT COUNT(*) AS c FROM evidence_records')).c,
        shipments: (await get('SELECT COUNT(*) AS c FROM shipments')).c,
        pendingPromotions: (await get('SELECT COUNT(*) AS c FROM promotion_requests WHERE status = ?', 'pending')).c,
        categoryRequests: (await get('SELECT COUNT(*) AS c FROM category_requests')).c,
        insurances: (await get('SELECT COUNT(*) AS c FROM insurances')).c,
        contracts: (await get('SELECT COUNT(*) AS c FROM contract_custodies')).c
      });
    }
    if (b === 'logs' && m === 'GET') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      return send(res, 200, paginate(await all('SELECT * FROM audit_logs ORDER BY created_at DESC'), q));
    }
    /* 邮件通道自检：确认"配好了没 / 最近发出去的成没成"，省得靠猜 */
    /* 注册/登录策略自检：一眼看到当前是"邮箱验证"还是"人工审核"在把关 */
    /* 系统自检：把"邮件通道 / 注册策略 / 对象存储 / 待处理事项"汇总给管理端 */
    if (b === 'system-check' && m === 'GET') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const st = storageInfo();
      return send(res, 200, {
        mail: { transport: mailerInfo().transport, ready: mailReady() },
        policy: { requireEmailVerify: REQUIRE_EMAIL_VERIFY, requireAccountReview: REQUIRE_ACCOUNT_REVIEW },
        storage: { kind: st.kind, ready: st.ready, maxFileSize: MAX_FILE_SIZE },
        counts: {
          users: (await get('SELECT COUNT(*) AS c FROM users')).c,
          unverified: (await get("SELECT COUNT(*) AS c FROM users WHERE COALESCE(email_verified,0) = 0")).c,
          pendingReview: (await get("SELECT COUNT(*) AS c FROM users WHERE review_state = 'pending'")).c,
          products: (await get('SELECT COUNT(*) AS c FROM products')).c,
          productsPending: (await get("SELECT COUNT(*) AS c FROM products WHERE status = 'pending'")).c,
          productsOn: (await get("SELECT COUNT(*) AS c FROM products WHERE status = 'on'")).c,
          productsNoImage: (await get('SELECT COUNT(*) AS c FROM products WHERE id NOT IN (SELECT product_id FROM product_images)')).c,
          inquiries: (await get('SELECT COUNT(*) AS c FROM inquiries')).c,
          inquiriesNew: (await get("SELECT COUNT(*) AS c FROM inquiries WHERE status = 'new'")).c,
          suggestionsNew: (await get("SELECT COUNT(*) AS c FROM suggestions WHERE status = 'new'")).c,
          companiesPending: (await get("SELECT COUNT(*) AS c FROM companies WHERE status = 'pending'")).c
        }
      });
    }
    if (b === 'auth-policy' && m === 'GET') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      return send(res, 200, {
        requireEmailVerify: REQUIRE_EMAIL_VERIFY,
        requireAccountReview: REQUIRE_ACCOUNT_REVIEW,
        mailReady: mailReady(),
        mailTransport: mailerInfo().transport
      });
    }
    if (b === 'mail-status' && m === 'GET') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const info = mailerInfo();
      const recent = await all('SELECT id, recipient, subject, status, error, sent_at FROM mail_outbox ORDER BY sent_at DESC LIMIT 20');
      const failed = (await get("SELECT COUNT(*) AS c FROM mail_outbox WHERE status = 'failed'")).c;
      return send(res, 200, { ...info, failed, recent });
    }
    /* 邮件凭据自检：只回长度和哈希前缀，不回明文——用来确认"存进去的 Secret 没被加料"。
     * 踩过的坑：用管道写 Cloudflare Secret 时可能带上换行，症状是阿里云回 SignatureDoesNotMatch。 */
    if (b === 'mail-config-check' && m === 'GET') {
      const u = await requirePerm(res, req, 'system');
      if (!u) return;
      const ak = String(ENV.ALIYUN_DM_ACCESS_KEY_ID || '');
      const sk = String(ENV.ALIYUN_DM_ACCESS_KEY_SECRET || '');
      const acc = String(ENV.ALIYUN_DM_ACCOUNT || '');
      const hint = async s => ({
        length: s.length,
        hasWhitespace: /\s/.test(s),
        head: s.slice(0, 2),
        tail: s.slice(-2),
        sha256_8: s ? (await sha256(s)).slice(0, 8) : ''
      });
      return send(res, 200, {
        transport: mailerInfo().transport,
        ready: mailReady(),
        region: ENV.ALIYUN_DM_REGION || '',
        accessKeyId: await hint(ak),
        accessKeySecret: await hint(sk),
        account: acc
      });
    }
  }

  /* v0.2 模块：个人资料与名片 */
  if (a === 'profile') {
    const u = await requireAuth(res, req);
    if (!u) return;
    const p = await get('SELECT * FROM profiles WHERE user_id = ?', u.id) || null;
    if (m === 'GET') {
      const fields = {
        name: u.name || '',
        accountType: p ? p.account_type : 'company',
        jobTitle: p ? p.job_title : '',
        company: p ? p.company : '',
        country: p ? p.country : '',
        contact: p ? p.contact : (u.email || ''),
        bio: p ? p.bio : '',
        bizName: p ? p.biz_name : ''
      };
      const keys = ['name', 'accountType', 'jobTitle', 'company', 'country', 'contact', 'bio'];
      const completeness = Math.round(keys.filter(k => String(fields[k] || '').trim()).length / keys.length * 100);
      return send(res, 200, { userId: u.id, fields, card: p ? p.business_card : '', cardName: p ? p.business_card_name : '', completeness });
    }
    if (m === 'PUT') {
      const body = await readBody(req);
      const accountType = body.accountType === 'individual' ? 'individual' : (p ? p.account_type : 'company');
      const vals = {
        account_type: accountType,
        job_title: String(body.jobTitle != null ? body.jobTitle : (p ? p.job_title : '')).slice(0, 120),
        company: String(body.company != null ? body.company : (p ? p.company : '')).slice(0, 200),
        country: String(body.country != null ? body.country : (p ? p.country : '')).slice(0, 40),
        contact: String(body.contact != null ? body.contact : (p ? p.contact : '')).slice(0, 200),
        bio: String(body.bio != null ? body.bio : (p ? p.bio : '')).slice(0, 1000),
        biz_name: String(body.bizName != null ? body.bizName : (p ? p.biz_name : '')).slice(0, 200),
        business_card: body.businessCard === null ? '' : String(body.businessCard != null ? body.businessCard : (p ? p.business_card : '')).slice(0, 2000000),
        business_card_name: body.businessCard === null ? '' : String(body.businessCardName != null ? body.businessCardName : (p ? p.business_card_name : '')).slice(0, 200)
      };
      if (p) {
        await run('UPDATE profiles SET account_type=?, job_title=?, company=?, country=?, contact=?, bio=?, biz_name=?, business_card=?, business_card_name=?, updated_at=? WHERE user_id=?',
          vals.account_type, vals.job_title, vals.company, vals.country, vals.contact, vals.bio, vals.biz_name, vals.business_card, vals.business_card_name, Date.now(), u.id);
      } else {
        await run('INSERT INTO profiles (user_id, account_type, job_title, company, country, contact, bio, biz_name, business_card, business_card_name, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
          u.id, vals.account_type, vals.job_title, vals.company, vals.country, vals.contact, vals.bio, vals.biz_name, vals.business_card, vals.business_card_name, Date.now());
      }
      /* 姓名是账号级字段（页头、询盘、名片都用它）：只写 profiles 不动 users，
       * 用户改完名字刷新还是旧的——之前就是这个毛病。 */
      const nextName = String(body.name != null ? body.name : (u.name || '')).trim().slice(0, 80);
      if (nextName && nextName !== u.name) {
        await run('UPDATE users SET name = ? WHERE id = ?', nextName, u.id);
        await audit(u.id, 'profile.rename', 'user', u.id, nextName);
      }
      return send(res, 200, { ok: true });
    }
  }

  /* v0.2 模块：优化建议 */
  if (a === 'suggestions') {
    const u = await requireAuth(res, req);
    if (!u) return;
    if (b === undefined && m === 'GET') {
      const rows = u.role === 'admin'
        ? await all('SELECT * FROM suggestions ORDER BY updated_at DESC')
        : await all('SELECT * FROM suggestions WHERE user_id = ? ORDER BY updated_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b === undefined && m === 'POST') {
      const body = await readBody(req);
      const content = String(body.content || '').trim();
      if (!content) return fail(res, 400, 'VALIDATION', '建议内容不能为空');
      const id = randomUUID();
      await run('INSERT INTO suggestions (id, user_id, type, content, contact, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        id, u.id, String(body.type || 'other').slice(0, 20), content.slice(0, 2000), String(body.contact || '').slice(0, 200), 'new', Date.now(), Date.now());
      return send(res, 201, await get('SELECT * FROM suggestions WHERE id = ?', id));
    }
    if (b && c === 'status' && m === 'POST') {
      const admin = await requirePerm(res, req, 'marketing');
      if (!admin) return;
      const rec = await get('SELECT * FROM suggestions WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '建议不存在');
      const body = await readBody(req);
      if (!['new', 'seen', 'done'].includes(body.status)) return fail(res, 400, 'VALIDATION', '状态非法');
      await run('UPDATE suggestions SET status = ?, updated_at = ? WHERE id = ?', body.status, Date.now(), b);
      return send(res, 200, await get('SELECT * FROM suggestions WHERE id = ?', b));
    }
    /* 删除建议（已读/不采纳的堆着影响观感，管理员可直接删掉） */
    if (b && m === 'DELETE') {
      const admin = await requirePerm(res, req, 'marketing');
      if (!admin) return;
      const rec = await get('SELECT * FROM suggestions WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '建议不存在');
      await run('DELETE FROM suggestions WHERE id = ?', b);
      await audit(admin.id, 'suggestion.delete', 'suggestion', b, String(rec.content || '').slice(0, 60));
      return send(res, 200, { ok: true, id: b });
    }
  }

  /* 表单记录：把每笔交易的询盘表单、报价、订单、生成的单据汇总成可检索的记录。
   * 数据都是现成的（inquiries / quotes / orders / order_documents），
   * 这里只做"按交易聚合 + 可搜索"，不额外往库里塞冗余数据。 */
  if (a === 'records' && !b && m === 'GET') {
    const u = await requireAuth(res, req);
    if (!u) return;
    if (u.role === 'admin' && !hasPerm(u, 'orders')) return fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「orders」权限（订单/表单记录）');
    const isAdmin = u.role === 'admin';
    const kw = String(q.get('kw') || '').trim().toLowerCase();
    const kind = String(q.get('kind') || '').trim();
    const items = [];

    const inqRows = await all('SELECT * FROM inquiries ORDER BY created_at DESC LIMIT 500');
    const orderRows = await all('SELECT * FROM orders ORDER BY created_at DESC LIMIT 500');
    const quoteRows = await all('SELECT * FROM quotes ORDER BY created_at DESC LIMIT 500');
    const docRows = await all('SELECT * FROM order_documents ORDER BY created_at DESC LIMIT 500');
    const prodIds = new Set([].concat(inqRows.map(r => r.product_id), orderRows.map(r => r.inquiry_id)).filter(Boolean));
    const prods = {};
    for (const pid of prodIds) {
      const p = await get('SELECT id, code, seller_id FROM products WHERE id = ?', pid);
      if (p) prods[pid] = p;
    }
    const orderByInquiry = {};
    for (const o of orderRows) if (o.inquiry_id) orderByInquiry[o.inquiry_id] = o;
    const quoteByInquiry = {};
    for (const qq of quoteRows) if (!quoteByInquiry[qq.inquiry_id]) quoteByInquiry[qq.inquiry_id] = qq;

    for (const i of inqRows) {
      if (!isAdmin && i.buyer_id !== u.id) continue;
      const p = prods[i.product_id] || null;
      const title = (await get('SELECT title FROM product_translations WHERE product_id = ? AND lang = ?', i.product_id, i.buyer_id ? 'zh' : 'en')) || {};
      items.push({
        kind: 'inquiry', id: i.id, refId: i.id, productId: i.product_id,
        title: title.title || i.product_id, code: p ? p.code : '',
        party: i.contact_name || i.buyer_id || '—', company: i.contact_company || '', country: i.contact_country || '',
        email: i.contact_email || '', amount: null, currency: null, status: i.status,
        createdAt: i.created_at,
        fields: [
          { k: 'qty', v: (i.qty || '') + ' ' + (i.unit || '') },
          { k: 'payment', v: i.payment_term || '' },
          { k: 'message', v: String(i.message || '').slice(0, 300) },
          { k: 'attachments', v: String((safeJson(i.attachments, []) || []).length) }
        ]
      });
      const qq = quoteByInquiry[i.id];
      if (qq) {
        items.push({
          kind: 'quote', id: qq.id, refId: i.id, productId: i.product_id,
          title: title.title || i.product_id, code: p ? p.code : '',
          party: i.contact_name || '—', company: i.contact_company || '', country: i.contact_country || '',
          email: i.contact_email || '', amount: qq.price, currency: 'USD', status: 'quoted',
          createdAt: qq.created_at,
          fields: [
            { k: 'incoterm', v: qq.incoterm }, { k: 'payment', v: qq.payment_term },
            { k: 'validity', v: (qq.validity_days || '') + 'd' }, { k: 'lead', v: (qq.lead_time || '') + 'd' },
            { k: 'note', v: String(qq.note || '').slice(0, 200) }
          ]
        });
      }
      const oo = orderByInquiry[i.id];
      if (oo) {
        items.push({
          kind: 'order', id: oo.id, refId: oo.id, productId: i.product_id,
          title: title.title || i.product_id, code: p ? p.code : '',
          party: i.contact_name || '—', company: i.contact_company || '', country: i.contact_country || '',
          email: i.contact_email || '', amount: oo.total, currency: oo.currency, status: oo.status,
          createdAt: oo.created_at, fields: []
        });
      }
    }
    for (const d of docRows) {
      const oo = orderRows.find(x => x.id === d.order_id);
      if (!oo) continue;
      const i2 = inqRows.find(x => x.id === oo.inquiry_id);
      if (!isAdmin && (!oo.buyer_id || oo.buyer_id !== u.id)) continue;
      items.push({
        kind: 'document', id: d.id, refId: oo.id, productId: i2 ? i2.product_id : '',
        title: ({ CI: '商业发票 CI', PL: '装箱单 PL', CO: '原产地证 CO', BL: '提单 B/L' })[d.doc_type] || d.doc_type,
        code: '', party: i2 ? (i2.contact_name || '') : '', company: i2 ? (i2.contact_company || '') : '',
        country: i2 ? (i2.contact_country || '') : '', email: i2 ? (i2.contact_email || '') : '',
        amount: oo.total, currency: oo.currency, status: oo.status, createdAt: d.created_at, fields: []
      });
    }
    let list = items;
    if (kind) list = list.filter(x => x.kind === kind);
    if (kw) {
      list = list.filter(x => [x.title, x.code, x.party, x.company, x.country, x.email, x.refId]
        .filter(Boolean).join(' ').toLowerCase().indexOf(kw) >= 0);
    }
    list.sort((x, y) => (y.createdAt || 0) - (x.createdAt || 0));
    return send(res, 200, { items: list.slice(0, 300), total: list.length });
  }

  /* 地址管理：记录交易过的客户地址（管理员看全部，买家只看自己的） */
  if (a === 'addresses') {
    const u = await requireAuth(res, req);
    if (!u) return;
    if (u.role === 'admin' && !hasPerm(u, 'customers')) return fail(res, 403, 'FORBIDDEN_PERM', '当前管理员账号没有「customers」权限（客户与地址）');
    const ownerKeyOf = b => [String(b.company || '').trim().toLowerCase(), String(b.email || '').trim().toLowerCase(), String(b.country || '').trim().toUpperCase()].filter(Boolean).join('|');
    if (b === undefined && m === 'GET') {
      const rows = u.role === 'admin'
        ? await all('SELECT * FROM addresses ORDER BY COALESCE(last_used_at, updated_at) DESC')
        : await all('SELECT * FROM addresses WHERE user_id = ? ORDER BY COALESCE(last_used_at, updated_at) DESC', u.id);
      /* 地址簿第一次被打开时，把历史询盘里的客户一次性补录进来
       * （自动收录只对"新"询盘生效，老数据不该凭空消失）。 */
      if (u.role === 'admin' && rows.length === 0) {
        const old = await all('SELECT contact_name, contact_email, contact_company, contact_country FROM inquiries ORDER BY created_at DESC LIMIT 200');
        for (const i2 of old) {
          await rememberAddress(u.id, 'inquiry', {
            name: i2.contact_name, email: i2.contact_email, company: i2.contact_company, country: i2.contact_country
          });
        }
        const again = await all('SELECT * FROM addresses ORDER BY COALESCE(last_used_at, updated_at) DESC');
        return send(res, 200, { items: again, total: again.length, backfilled: true });
      }
      return send(res, 200, { items: rows, total: rows.length });
    }
    if (b === undefined && m === 'POST') {
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      const company = String(body.company || '').trim();
      const email = String(body.email || '').trim();
      if (!name && !company) return fail(res, 400, 'VALIDATION', '联系人或公司名至少要填一个');
      const now = Date.now();
      const id = randomUUID();
      const key = ownerKeyOf({ company: company, email: email, country: body.country }) || ('manual|' + id);
      const exist = await get('SELECT * FROM addresses WHERE owner_key = ?', key);
      if (exist) {
        await run(
          `UPDATE addresses SET name = ?, city = ?, address1 = ?, address2 = ?, zip = ?, contact = ?, phone = ?, note = ?, updated_at = ? WHERE id = ?`,
          name || exist.name, String(body.city || exist.city || '').slice(0, 80), String(body.address1 || exist.address1 || '').slice(0, 200),
          String(body.address2 || exist.address2 || '').slice(0, 200), String(body.zip || exist.zip || '').slice(0, 20),
          String(body.contact || exist.contact || '').slice(0, 80), String(body.phone || exist.phone || '').slice(0, 40),
          String(body.note || exist.note || '').slice(0, 500), now, exist.id
        );
        return send(res, 200, await get('SELECT * FROM addresses WHERE id = ?', exist.id));
      }
      await run(
        `INSERT INTO addresses (id, user_id, owner_key, name, company, country, city, address1, address2, zip, contact, phone, email, note, source, use_count, last_used_at, created_at, updated_at)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        id, u.id, key, name.slice(0, 80), company.slice(0, 120), String(body.country || '').slice(0, 4).toUpperCase(),
        String(body.city || '').slice(0, 80), String(body.address1 || '').slice(0, 200), String(body.address2 || '').slice(0, 200),
        String(body.zip || '').slice(0, 20), String(body.contact || '').slice(0, 80), String(body.phone || '').slice(0, 40),
        email.slice(0, 160), String(body.note || '').slice(0, 500), 'manual', 0, null, now, now
      );
      return send(res, 201, await get('SELECT * FROM addresses WHERE id = ?', id));
    }
    if (b && m === 'PUT') {
      const rec = await get('SELECT * FROM addresses WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '地址不存在');
      if (u.role !== 'admin' && rec.user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能改自己的地址');
      const body = await readBody(req);
      await run(
        `UPDATE addresses SET name = ?, company = ?, country = ?, city = ?, address1 = ?, address2 = ?, zip = ?, contact = ?, phone = ?, email = ?, note = ?, updated_at = ? WHERE id = ?`,
        String(body.name != null ? body.name : rec.name).slice(0, 80),
        String(body.company != null ? body.company : rec.company).slice(0, 120),
        String(body.country != null ? body.country : rec.country).slice(0, 4).toUpperCase(),
        String(body.city != null ? body.city : rec.city).slice(0, 80),
        String(body.address1 != null ? body.address1 : rec.address1).slice(0, 200),
        String(body.address2 != null ? body.address2 : rec.address2).slice(0, 200),
        String(body.zip != null ? body.zip : rec.zip).slice(0, 20),
        String(body.contact != null ? body.contact : rec.contact).slice(0, 80),
        String(body.phone != null ? body.phone : rec.phone).slice(0, 40),
        String(body.email != null ? body.email : rec.email).slice(0, 160),
        String(body.note != null ? body.note : rec.note).slice(0, 500),
        Date.now(), b
      );
      return send(res, 200, await get('SELECT * FROM addresses WHERE id = ?', b));
    }
    if (b && m === 'DELETE') {
      const rec = await get('SELECT * FROM addresses WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '地址不存在');
      if (u.role !== 'admin' && rec.user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能删自己的地址');
      await run('DELETE FROM addresses WHERE id = ?', b);
      return send(res, 200, { ok: true, id: b });
    }
  }

  /* 客服快捷短语 / 聊天话术（每个账号管理自己的一套） */
  if (a === 'quick-replies') {
    const u = await requireAuth(res, req);
    if (!u) return;
    if (b === undefined && m === 'GET') {
      const rows = await all(
        'SELECT * FROM quick_replies WHERE user_id = ? ORDER BY scene ASC, sort ASC, created_at ASC',
        u.id
      );
      return send(res, 200, { items: rows, total: rows.length });
    }
    if (b === undefined && m === 'POST') {
      const body = await readBody(req);
      const title = String(body.title || '').trim();
      const text = String(body.body || '').trim();
      if (!title || !text) return fail(res, 400, 'VALIDATION', '短语名称与正文都要填');
      if (text.length > 2000) return fail(res, 400, 'VALIDATION', '单条短语最多 2000 字符');
      const id = randomUUID();
      const now = Date.now();
      await run(
        'INSERT INTO quick_replies (id, user_id, scene, title, body, lang, sort, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?)',
        id, u.id, String(body.scene || 'custom').slice(0, 20), title.slice(0, 80), text,
        body.lang === 'en' ? 'en' : 'zh', Math.round(toNum(body.sort, 0)), now, now
      );
      return send(res, 201, await get('SELECT * FROM quick_replies WHERE id = ?', id));
    }
    if (b && m === 'PUT') {
      const rec = await get('SELECT * FROM quick_replies WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '短语不存在');
      if (rec.user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能改自己的短语');
      const body = await readBody(req);
      const title = String(body.title != null ? body.title : rec.title).trim();
      const text = String(body.body != null ? body.body : rec.body).trim();
      if (!title || !text) return fail(res, 400, 'VALIDATION', '短语名称与正文都要填');
      await run(
        'UPDATE quick_replies SET scene = ?, title = ?, body = ?, lang = ?, sort = ?, updated_at = ? WHERE id = ?',
        String(body.scene || rec.scene).slice(0, 20), title.slice(0, 80), text.slice(0, 2000),
        (body.lang || rec.lang) === 'en' ? 'en' : 'zh', Math.round(toNum(body.sort, rec.sort || 0)), Date.now(), b
      );
      return send(res, 200, await get('SELECT * FROM quick_replies WHERE id = ?', b));
    }
    if (b && m === 'DELETE') {
      const rec = await get('SELECT * FROM quick_replies WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '短语不存在');
      if (rec.user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能删自己的短语');
      await run('DELETE FROM quick_replies WHERE id = ?', b);
      return send(res, 200, { ok: true, id: b });
    }
  }

  /* v0.2 模块：售后与纠纷 */
  if (a === 'after-sales') {
    const u = await requireAuth(res, req);
    if (!u) return;
    if (b === undefined && m === 'GET') {
      const rows = u.role === 'admin'
        ? await all('SELECT * FROM after_sales ORDER BY updated_at DESC')
        : u.role === 'seller'
          ? await all('SELECT * FROM after_sales WHERE seller_id = ? ORDER BY updated_at DESC', u.id)
          : await all('SELECT * FROM after_sales WHERE buyer_id = ? ORDER BY updated_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b === undefined && m === 'POST') {
      const body = await readBody(req);
      const o = await get('SELECT * FROM orders WHERE id = ?', body.orderId);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (o.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能对本人订单申请售后');
      if (!['created', 'complete'].includes(o.status)) return fail(res, 400, 'INVALID_STATUS', '当前订单状态不可申请售后');
      const desc = String(body.description || '').trim();
      if (!desc) return fail(res, 400, 'VALIDATION', '请描述问题');
      const dispute = !!body.dispute;
      const id = randomUUID();
      await run('INSERT INTO after_sales (id, order_id, buyer_id, seller_id, type, description, resolution, status, dispute, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
        id, o.id, u.id, o.seller_id, String(body.type || 'other').slice(0, 40), desc.slice(0, 1000),
        String(body.resolution || '').slice(0, 500), dispute ? 'arbitrating' : 'new', dispute ? 1 : 0, Date.now(), Date.now());
      await addEvidence(o.id, u.id, dispute ? 'dispute_open' : 'after_sales_create', id, { type: body.type || 'other', description: desc.slice(0, 200) });
      return send(res, 201, await get('SELECT * FROM after_sales WHERE id = ?', id));
    }
    if (b && c === 'respond' && m === 'POST') {
      const rec = await get('SELECT * FROM after_sales WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '售后记录不存在');
      if (rec.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '仅卖家可回复');
      if (!['new', 'responded'].includes(rec.status)) return fail(res, 400, 'INVALID_STATUS', '当前状态不可回复');
      const body = await readBody(req);
      const action = body.action === 'accept' ? 'accept' : 'reject';
      const reply = String(body.reply || '').slice(0, 600);
      await run('UPDATE after_sales SET seller_reply = ?, seller_action = ?, status = ?, updated_at = ? WHERE id = ?',
        reply, action, action === 'accept' ? 'resolved' : 'responded', Date.now(), b);
      await addEvidence(rec.order_id, u.id, 'after_sales_reply', b, { action, reply: reply.slice(0, 200) });
      return send(res, 200, await get('SELECT * FROM after_sales WHERE id = ?', b));
    }
    if (b && c === 'escalate' && m === 'POST') {
      const rec = await get('SELECT * FROM after_sales WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '售后记录不存在');
      if (rec.buyer_id !== u.id && rec.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权操作');
      if (!['new', 'responded'].includes(rec.status)) return fail(res, 400, 'INVALID_STATUS', '当前状态不可升级');
      await run('UPDATE after_sales SET status = ?, dispute = 1, updated_at = ? WHERE id = ?', 'arbitrating', Date.now(), b);
      await addEvidence(rec.order_id, u.id, 'dispute_open', b, { escalate: true });
      return send(res, 200, await get('SELECT * FROM after_sales WHERE id = ?', b));
    }
    if (b && c === 'arbitrate' && m === 'POST') {
      const admin = await requirePerm(res, req, 'orders');
      if (!admin) return;
      const rec = await get('SELECT * FROM after_sales WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '售后记录不存在');
      if (rec.status !== 'arbitrating') return fail(res, 400, 'INVALID_STATUS', '仅仲裁中的案件可裁决');
      const body = await readBody(req);
      if (!['buyer', 'seller', 'compromise'].includes(body.ruling)) return fail(res, 400, 'VALIDATION', '裁决结果非法');
      await run('UPDATE after_sales SET ruling = ?, ruling_note = ?, status = ?, updated_at = ? WHERE id = ?',
        body.ruling, String(body.note || '').slice(0, 600), 'resolved', Date.now(), b);
      await addEvidence(rec.order_id, admin.id, 'after_sales_ruling', b, { ruling: body.ruling });
      return send(res, 200, await get('SELECT * FROM after_sales WHERE id = ?', b));
    }
  }

  /* v0.2 模块：订单单据生成记录 */
  if (a === 'orders' && b && c === 'documents') {
    const u = await requireAuth(res, req);
    if (!u) return;
    const o = await get('SELECT * FROM orders WHERE id = ?', b);
    if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
    if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
    if (m === 'GET') {
      return send(res, 200, { orderId: b, items: await all('SELECT * FROM order_documents WHERE order_id = ? ORDER BY created_at ASC', b) });
    }
    if (m === 'POST') {
      const body = await readBody(req);
      if (!['CI', 'PL', 'CO', 'BL'].includes(body.type)) return fail(res, 400, 'VALIDATION', '单据类型非法');
      await run('INSERT OR IGNORE INTO order_documents (id, order_id, doc_type, created_by, created_at) VALUES (?,?,?,?,?)',
        randomUUID(), b, body.type, u.id, Date.now());
      await addEvidence(b, u.id, 'document_generated', body.type, { docType: body.type });
      return send(res, 201, { orderId: b, items: await all('SELECT * FROM order_documents WHERE order_id = ? ORDER BY created_at ASC', b) });
    }
  }

  /* v0.2 模块：出口资质清单 */
  if (a === 'exports' && b === 'readiness') {
    const u = await requireAuth(res, req);
    if (!u) return;
    const sid = c || u.id;
    if (m === 'GET') {
      const doneMap = Object.fromEntries((await all('SELECT item_id, done FROM export_readiness WHERE seller_id = ?', sid)).map(r => [r.item_id, !!r.done]));
      const items = EXPORT_ITEMS.map(id => ({ id, done: !!doneMap[id] }));
      const done = items.filter(i => i.done).length;
      return send(res, 200, { sellerId: sid, score: items.length ? Math.round(done / items.length * 100) : 0, coreDone: done, coreTotal: items.length, items });
    }
    if (m === 'PUT') {
      const body = await readBody(req);
      if (!EXPORT_ITEMS.includes(body.itemId)) return fail(res, 400, 'VALIDATION', '清单项非法');
      await run('INSERT INTO export_readiness (seller_id, item_id, done, updated_at) VALUES (?,?,?,?) ON CONFLICT(seller_id, item_id) DO UPDATE SET done = excluded.done, updated_at = excluded.updated_at',
        sid, body.itemId, body.done ? 1 : 0, Date.now());
      const doneMap = Object.fromEntries((await all('SELECT item_id, done FROM export_readiness WHERE seller_id = ?', sid)).map(r => [r.item_id, !!r.done]));
      const items = EXPORT_ITEMS.map(id => ({ id, done: !!doneMap[id] }));
      const done = items.filter(i => i.done).length;
      return send(res, 200, { sellerId: sid, score: items.length ? Math.round(done / items.length * 100) : 0, coreDone: done, coreTotal: items.length, items });
    }
  }

  /* v0.2 模块：名片模板 / 合规筛查 / 物流估算 */
  if (a === 'card-templates' && m === 'GET') {
    return send(res, 200, CARD_TEMPLATES);
  }
  if (a === 'compliance' && b === 'screen' && m === 'POST') {
    const body = await readBody(req);
    const text = String(body.text || '');
    const lower = text.toLowerCase();
    const hits = SANCTION_KEYWORDS.filter(k => lower.includes(String(k).toLowerCase()));
    return send(res, 200, { text, hits, clean: hits.length === 0, note: 'keyword screening' });
  }
  if (a === 'logistics' && b === 'estimate' && m === 'POST') {
    const body = await readBody(req);
    const w = Math.max(0, Number(body.weight) || 0);
    const v = Math.max(0, Number(body.volume) || 0);
    const mode = ['sea', 'air', 'land', 'courier'].includes(body.mode) ? body.mode : 'sea';
    const chargeable = Math.max(w / 1000, v || 0);
    let lo = 0, hi = 0;
    if (mode === 'sea') {
      if (body.container === '20GP') { lo = 900; hi = 2200; }
      else if (body.container === '40GP' || body.container === '40HQ') { lo = 1500; hi = 4200; }
      else { lo = Math.round(chargeable * 55); hi = Math.round(chargeable * 120 + 60); }
    } else if (mode === 'air') { lo = Math.round(chargeable * 340); hi = Math.round(chargeable * 620); }
    else if (mode === 'land') { lo = Math.round(chargeable * 130); hi = Math.round(chargeable * 280); }
    else { lo = Math.max(18, Math.round(chargeable * 700)); hi = Math.max(35, Math.round(chargeable * 1300)); }
    return send(res, 200, {
      mode, currency: 'USD', lo: Math.max(0, lo), hi: Math.max(lo, hi), weight: w, volume: v, chargeable,
      container: body.container || 'LCL', origin: String(body.origin || '').trim(), destination: String(body.destination || '').trim(), note: 'demo estimate only'
    });
  }
  if (a === 'verify-turnstile' && m === 'POST') {
    const body = await readBody(req);
    return send(res, 200, await verifyTurnstile(body.token));
  }

  return fail(res, 404, 'NOT_FOUND', '接口不存在');
}

/* 平台入口调用：把 (方法, 路径, 查询串, 请求, 响应) 交给路由。
 * req 需要提供 headers / socket.remoteAddress / __rawText / __rawBuf；
 * res 需要提供 writeHead(status, headers) 与 end(body)。 */
  let seedPromise = null;
  async function handle({ method, pathname, query, req, res }) {
    const m = String(method || 'GET').toUpperCase();
    if (m === 'OPTIONS') {
      res.writeHead(204, CORS);
      res.end('');
      return;
    }
    try {
      /* 演示数据：默认写入（展示站需要），生产试用前如需干净库可设 SEED_DEMO=0 */
      if (!seedPromise) {
        seedPromise = ENV.SEED_DEMO === '0'
          ? Promise.resolve(false)
          : Promise.resolve().then(() => seedIfEmpty());
      }
      await seedPromise;
      const segs = String(pathname || '/').split('/').filter(Boolean);
      await route(m, segs, query, req, res);
    } catch (e) {
      if (e && e.message === 'INVALID_JSON') return fail(res, 400, 'INVALID_JSON', '请求体不是合法 JSON');
      console.error('[api] ' + (e && e.stack ? e.stack : e));
      if (res.headersSent) { try { res.end(''); } catch (err) { /* 已响应 */ } return; }
      return fail(res, 500, 'INTERNAL', '服务器内部错误');
    }
  }
  return { handle, route, ENV, refreshNewsFeeds };
}
