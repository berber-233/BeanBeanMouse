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
import { seedIfEmpty, antiFakeCode } from './seed.mjs';
import { hashPassword, verifyPassword, signToken, verifyToken, configureAuth } from './auth.mjs';
import { translateText, translateError } from './translate.mjs';
import { validateFile, putFile, getFile, UPLOAD_DIR, MAX_FILE_SIZE } from './storage.mjs';
import { sendMail, notifyUser } from './mailer.mjs';
import { verifyEmailContent } from './email-template.mjs';

export function createApp({ env = {}, deps = {} } = {}) {
  const ENV = env;
  /* 试用期可关闭邮箱验证：REQUIRE_EMAIL_VERIFY=0 */
  const REQUIRE_EMAIL_VERIFY = String(ENV.REQUIRE_EMAIL_VERIFY === undefined ? '1' : ENV.REQUIRE_EMAIL_VERIFY) !== '0';
  const wsBroadcast = typeof deps.wsBroadcast === 'function' ? deps.wsBroadcast : () => {};
  configureAuth({ secret: ENV.JWT_SECRET, iterations: ENV.PBKDF2_ITERATIONS });




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
async function sha256(s) { return await sha256Hex(s); }
async function newEmailToken(userId) {
  const token = toHex(randomBytes(24));
  await run(
    'INSERT INTO email_tokens (id, user_id, token_hash, purpose, expires_at, created_at) VALUES (?,?,?,?,?,?)',
    randomUUID(), userId, await sha256(token), 'verify_email', Date.now() + 24 * 3600 * 1000, Date.now()
  );
  return token;
}
async function sendVerifyEmail(userId, email) {
  const token = await newEmailToken(userId);
  const appUrl = ENV.APP_URL || 'https://beanbeanmouse.com';
  const link = appUrl + '/#/verify-email?token=' + token;
  const tpl = verifyEmailContent({ link });
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
function parseMultipart(body, boundary) {
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
  return await get('SELECT * FROM users WHERE id = ?', payload.uid) || null;
}
async function requireAuth(res, req, roles) {
  const u = await currentUser(req);
  if (!u) { fail(res, 401, 'UNAUTHORIZED', '请先登录'); return null; }
  if (roles && !roles.includes(u.role)) { fail(res, 403, 'FORBIDDEN', '权限不足'); return null; }
  return u;
}
function publicUser(u) {
  return u ? { id: u.id, email: u.email, role: u.role, name: u.name, status: u.status } : null;
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
  return {
    ...row,
    terms: safeJson(row.terms, []),
    certs: safeJson(row.certs, []),
    translations,
    antiFakeCode: code ? code.code : null,
    promoted: !!promo
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
      if (await get('SELECT id FROM users WHERE email = ?', email)) {
        return fail(res, 409, 'EMAIL_EXISTS', '邮箱已存在');
      }
      const id = randomUUID();
      await run(
        'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
    id, email, await hashPassword(password), role, name, 'active', REQUIRE_EMAIL_VERIFY ? 0 : 1, Date.now()
      );
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
        mailSent,
      message: !REQUIRE_EMAIL_VERIFY
        ? '注册成功，现在就可以登录了'
        : (mailSent
          ? '注册成功，请查收邮箱完成验证（24 小时内有效）'
          : '注册成功，但验证邮件发送失败，请稍后在登录页点击「重发验证邮件」')
      });
    }
    if (m === 'POST' && b === 'login') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (loginRateLimit(ip) > LOGIN_LIMIT) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '尝试过于频繁，请稍后再试');
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const u = await get('SELECT * FROM users WHERE email = ?', email);
      if (!u || !await verifyPassword(body.password, u.password_hash)) {
        return fail(res, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      }
      if (u.status === 'frozen') return fail(res, 401, 'ACCOUNT_FROZEN', '账号已被冻结');
      if (REQUIRE_EMAIL_VERIFY && !u.email_verified) return fail(res, 403, 'VERIFY_EMAIL_REQUIRED', '请先验证邮箱再登录');
      await run('UPDATE users SET last_login_at = ? WHERE id = ?', Date.now(), u.id);
      return send(res, 200, { token: await signToken({ uid: u.id, role: u.role }), user: publicUser(u) });
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
      return send(res, 200, { token: await signToken({ uid: u.id, role: u.role }) });
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
      const u = await requireAuth(res, req, ['admin']);
      if (!u) return;
      const status = q.get('status') || '';
      let rows = await all('SELECT * FROM companies ORDER BY created_at DESC');
      if (status) rows = rows.filter(co => co.status === status);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'verify' && m === 'PUT') {
      const u = await requireAuth(res, req, ['admin']);
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
      if (cat) list = list.filter(p => p.category === cat);
      if (origin) list = list.filter(p => p.country === origin);
      if (min != null || max != null) {
        list = list.filter(p => (min == null || p.price_max >= min) && (max == null || p.price_min <= max));
      }
      if (kw) {
        const ids = new Set((await all('SELECT product_id FROM product_translations WHERE title LIKE ? OR description LIKE ?', '%' + kw + '%', '%' + kw + '%')).map(r => r.product_id));
        list = list.filter(p => ids.has(p.id));
      }
      return send(res, 200, paginate(await Promise.all(list.map(productView)), q));
    }
    if (m === 'POST' && !b) {
      const u = await requireAuth(res, req, ['seller', 'admin']);
      if (!u) return;
      if (u.role === 'seller') {
        const co = await get('SELECT * FROM companies WHERE user_id = ?', u.id);
        if (!co || co.status !== 'approved') {
          return fail(res, 403, 'COMPANY_NOT_VERIFIED', '请先提交公司/工厂资料并通过平台审核后再发布产品');
        }
      }
      const body = await readBody(req);
      const trs = body.translations || {};
      if (!body.category || !body.country || !trs.en || !trs.zh) {
        return fail(res, 400, 'VALIDATION', 'category/country/translations(en,zh) 为必填');
      }
      const id = randomUUID();
      const now = Date.now();
      const company = await get('SELECT id FROM companies WHERE user_id = ?', u.id);
      const priceMin = toNum(body.priceMin, 0);
      const priceMax = toNum(body.priceMax, 0);
      const moq = Math.max(1, Math.round(toNum(body.moq, 1)));
      const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
      if (!(priceMin >= 0) || !(priceMax >= priceMin)) {
        return fail(res, 400, 'VALIDATION', '价格区间不合法');
      }
      await run(
        'INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, u.id, company ? company.id : null, body.category, String(body.sub || '').slice(0, 40), body.hsCode || '', body.country,
        priceMin, priceMax, moq, body.unit || 'pcs', leadTime,
        JSON.stringify(body.terms || []), JSON.stringify(body.certs || []), body.srcLang || 'en',
        'pending', now, now
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
        randomUUID(), id, antiFakeCode(id, u.id, enTitle), 'B' + new Date().getFullYear(), 'active', now, 0
      );
      await audit(u.id, 'product.create', 'product', id, enTitle);
      return send(res, 201, await productView(await get('SELECT * FROM products WHERE id = ?', id)));
    }
    if (b && m === 'GET') {
      const p = await get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      return send(res, 200, await productView(p));
    }
    if (b && c === 'review' && m === 'POST') {
      const u = await requireAuth(res, req, ['admin']);
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
        rows = await all('SELECT i.* FROM inquiries i JOIN products p ON p.id = i.product_id WHERE p.seller_id = ? ORDER BY i.created_at DESC', u.id);
      } else if (u.role === 'admin') {
        rows = await all('SELECT * FROM inquiries ORDER BY created_at DESC');
      } else {
        rows = await all('SELECT * FROM inquiries WHERE buyer_id = ? ORDER BY created_at DESC', u.id);
      }
      return send(res, 200, rows);
    }
    if (m === 'POST' && !b) {
      const body = await readBody(req);
      const u = await currentUser(req);
      const p = body.productId ? await get('SELECT * FROM products WHERE id = ?', body.productId) : null;
      const qty = toNum(body.qty, 0);
      if (!p || !(qty >= 1) || !body.message) return fail(res, 400, 'VALIDATION', 'productId/qty/message 为必填且 qty 须为正整数');
      const id = randomUUID();
      await run(
        'INSERT INTO inquiries (id, product_id, buyer_id, qty, unit, payment_term, message, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        id, p.id, u ? u.id : null, qty, body.unit || 'pcs', body.payment || null, body.message, 'new', Date.now()
      );
      await audit(u ? u.id : null, 'inquiry.create', 'inquiry', id, body.message.slice(0, 80));
      const seller = await get('SELECT * FROM users WHERE id = ?', p.seller_id);
      if (seller) {
        await notifyUser(seller.id, 'inquiry', '收到新询盘', '产品 ' + (body.productId) + ' 收到新询盘：' + String(body.message).slice(0, 120));
        try { await sendMail({ to: seller.email, subject: '[BeanBeanMouse] 收到新询盘', body: String(body.message) }); }
        catch (e) { console.error('邮件发送失败（不影响询盘）:', e.message); }
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
      const conv = await get('SELECT * FROM conversations WHERE id = ?', b);
      if (conv && conv.buyer_id !== u.id && conv.seller_id !== u.id && u.role !== 'admin') {
        return fail(res, 403, 'FORBIDDEN', '无权查看该会话');
      }
      return send(res, 200, conv ? await all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', b) : []);
    }
    if (m === 'POST') {
      const u = await requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      if (!body.text) return fail(res, 400, 'VALIDATION', 'text 为必填');
      let conv = await get('SELECT * FROM conversations WHERE id = ?', b);
      if (!conv) {
        await run('INSERT INTO conversations (id, buyer_id, seller_id, created_at) VALUES (?,?,?,?)', b, u.id, u.id, Date.now());
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
  if (a === 'translate' && m === 'POST') {
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

  /* 防伪验真 */
  if (a === 'anti-fake' && b === 'verify' && m === 'POST') {
    const body = await readBody(req);
    const code = String(body.code || '').trim().toUpperCase();
    const row = await get('SELECT * FROM anti_fake_codes WHERE code = ?', code);
    if (!row || row.status !== 'active') return fail(res, 404, 'CODE_NOT_FOUND', '防伪码不存在或已作废');
    await run('UPDATE anti_fake_codes SET last_verified_at = ?, verify_count = verify_count + 1 WHERE id = ?', Date.now(), row.id);
    return send(res, 200, { genuine: true, code: row.code, productId: row.product_id, verifiedAt: new Date().toISOString() });
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
      const u = await requireAuth(res, req, ['admin']);
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
      const u = await requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, newsAutoState);
    }
    if (b === 'refresh' && m === 'POST') {
      const u = await requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, await refreshNewsFeeds(u.id));
    }
  }

  /* 第三方运输保险：试点自营 + 合作保险商框架（后续接入真实保险公司） */
  if (a === 'insurances') {
    await ensureInsuranceProviders();
    if (m === 'GET' && b === 'providers') {
      return send(res, 200, await all('SELECT * FROM insurance_providers ORDER BY sort'));
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
  if (a === 'notifications' && m === 'GET') {
    const u = await requireAuth(res, req);
    if (!u) return;
    return send(res, 200, await all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', u.id));
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
      const u = await requireAuth(res, req, ['admin']);
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
      return send(res, 201, { id, filename, mime, size: data.length, url: '/files/' + id });
    }
    if (b && m === 'GET') {
      const row = await get('SELECT * FROM files WHERE id = ?', b);
      if (!row) return fail(res, 404, 'NOT_FOUND', '文件不存在');
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
      return sendBytes(res, 200, buf, row.mime, { 'Content-Disposition': 'inline' });
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
      if (!u) return;
      const rows = u.role === 'admin'
        ? await all('SELECT * FROM promotion_requests ORDER BY created_at DESC')
        : await all('SELECT * FROM promotion_requests WHERE seller_id = ? ORDER BY created_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'review' && m === 'POST') {
      const u = await requireAuth(res, req, ['admin']);
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
      const u = await requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, paginate(await all('SELECT * FROM audit_logs ORDER BY created_at DESC'), q));
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
      const admin = await requireAuth(res, req, ['admin']);
      if (!admin) return;
      const rec = await get('SELECT * FROM suggestions WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '建议不存在');
      const body = await readBody(req);
      if (!['new', 'seen', 'done'].includes(body.status)) return fail(res, 400, 'VALIDATION', '状态非法');
      await run('UPDATE suggestions SET status = ?, updated_at = ? WHERE id = ?', body.status, Date.now(), b);
      return send(res, 200, await get('SELECT * FROM suggestions WHERE id = ?', b));
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
      const admin = await requireAuth(res, req, ['admin']);
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
