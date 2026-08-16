import { createServer } from 'node:http';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import './env.mjs';
import { all, get, run } from './db.mjs';
import { seedIfEmpty, antiFakeCode } from './seed.mjs';
import { hashPassword, verifyPassword, signToken, verifyToken } from './auth.mjs';
import { translateText, translateError } from './translate.mjs';
import { validateFile, putFile, getFile, UPLOAD_DIR, MAX_FILE_SIZE } from './storage.mjs';
import { sendMail, notifyUser } from './mailer.mjs';
import { handleWsUpgrade } from './ws.mjs';

const PORT = Number(process.env.PORT || 8787);
seedIfEmpty();

/* 简单登录限流：同 IP 每分钟最多 10 次（防暴力破解） */
const loginAttempts = new Map();
const LOGIN_LIMIT = Number(process.env.LOGIN_LIMIT || 10);
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
const REGISTER_LIMIT = Number(process.env.REGISTER_LIMIT || 5);
function registerRateLimit(ip) {
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
function sha256(s) { return createHash('sha256').update(String(s)).digest('hex'); }
function newEmailToken(userId) {
  const token = randomBytes(24).toString('hex');
  run(
    'INSERT INTO email_tokens (id, user_id, token_hash, purpose, expires_at, created_at) VALUES (?,?,?,?,?,?)',
    randomUUID(), userId, sha256(token), 'verify_email', Date.now() + 24 * 3600 * 1000, Date.now()
  );
  return token;
}
async function sendVerifyEmail(userId, email) {
  const token = newEmailToken(userId);
  const appUrl = process.env.APP_URL || 'https://beanbeanmouse.com';
  const link = appUrl + '/#/verify-email?token=' + token;
  await sendMail({
    to: email,
    subject: '[BeanBeanMouse] 请验证您的邮箱',
    body: '欢迎注册 BeanBeanMouse！请点击以下链接完成邮箱验证（24 小时内有效）：\n\n' + link + '\n\n如非本人操作，请忽略本邮件。'
  });
  return link;
}

/* ---------- HTTP 基础 ---------- */
const CORS_ORIGIN = process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(',')[0].trim() : '*';
if (!process.env.ALLOWED_ORIGINS) {
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
function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 1e6) req.destroy(); });
    req.on('end', () => {
      if (!data) return resolve({});
      try { resolve(JSON.parse(data)); } catch (e) { reject(new Error('INVALID_JSON')); }
    });
    req.on('error', reject);
  });
}
function readRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', c => {
      chunks.push(c);
      size += c.length;
      if (size > MAX_FILE_SIZE * 2) req.destroy();
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
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

function currentUser(req) {
  const h = req.headers.authorization || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  const payload = verifyToken(token);
  if (!payload || !payload.uid) return null;
  return get('SELECT * FROM users WHERE id = ?', payload.uid) || null;
}
function requireAuth(res, req, roles) {
  const u = currentUser(req);
  if (!u) { fail(res, 401, 'UNAUTHORIZED', '请先登录'); return null; }
  if (roles && !roles.includes(u.role)) { fail(res, 403, 'FORBIDDEN', '权限不足'); return null; }
  return u;
}
function publicUser(u) {
  return u ? { id: u.id, email: u.email, role: u.role, name: u.name, status: u.status } : null;
}
function audit(actor, action, targetType, targetId, detail) {
  run(
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

function productView(row) {
  const trs = all('SELECT * FROM product_translations WHERE product_id = ?', row.id);
  const translations = {};
  for (const t of trs) {
    translations[t.lang] = {
      title: t.title,
      description: t.description,
      features: safeJson(t.features, [])
    };
  }
  const code = get('SELECT code FROM anti_fake_codes WHERE product_id = ?', row.id);
  const promo = get('SELECT id FROM promotion_requests WHERE product_id = ? AND status = ?', row.id, 'approved');
  return {
    ...row,
    terms: safeJson(row.terms, []),
    certs: safeJson(row.certs, []),
    translations,
    antiFakeCode: code ? code.code : null,
    promoted: !!promo
  };
}

function orderView(o) {
  const tips = all('SELECT * FROM tips WHERE order_id = ? ORDER BY created_at DESC', o.id);
  const shipments = all('SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at ASC', o.id).map(shipmentView);
  const evidence = all('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC', o.id);
  const buyer = o.buyer_id ? get('SELECT id, name, email FROM users WHERE id = ?', o.buyer_id) : null;
  const seller = o.seller_id ? get('SELECT id, name, email FROM users WHERE id = ?', o.seller_id) : null;
  return { ...o, buyer, seller, tips, shipments, evidence, evidenceVerified: verifyEvidenceChain(o.id).valid };
}

function shipmentView(s) {
  const events = all('SELECT * FROM shipment_events WHERE shipment_id = ? ORDER BY event_time ASC, created_at ASC', s.id);
  return { ...s, events };
}

/* ---------- 第三方存证：按订单哈希链记录关键流程 ---------- */
function evidencePayload(kind, refId, snapshot, actorId, at) {
  return { kind: String(kind || '').slice(0, 32), refId: refId || null, snapshot: snapshot || {}, actorId: actorId || null, at };
}
function lastEvidence(orderId) {
  return get('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index DESC LIMIT 1', orderId);
}
function addEvidence(orderId, actorId, kind, refId, snapshot) {
  const prev = lastEvidence(orderId);
  const prevHash = prev ? prev.content_hash : 'GENESIS';
  const chainIndex = prev ? prev.chain_index + 1 : 0;
  const at = Date.now();
  const payload = evidencePayload(kind, refId, snapshot, actorId, at);
  const contentHash = sha256(prevHash + '|' + chainIndex + '|' + JSON.stringify(payload));
  run(
    'INSERT INTO evidence_records (id, order_id, actor_id, kind, ref_id, snapshot, content_hash, prev_hash, chain_index, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
    randomUUID(), orderId, actorId || null, payload.kind, payload.refId, JSON.stringify(payload.snapshot), contentHash, prevHash, chainIndex, at
  );
  return get('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index DESC LIMIT 1', orderId);
}
function verifyEvidenceChain(orderId) {
  const rows = all('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC', orderId);
  let prevHash = 'GENESIS';
  const broken = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const payload = evidencePayload(r.kind, r.ref_id, safeJson(r.snapshot, {}), r.actor_id, r.created_at);
    const expect = sha256(prevHash + '|' + i + '|' + JSON.stringify(payload));
    if (expect !== r.content_hash) broken.push(r.id);
    prevHash = r.content_hash;
  }
  return { total: rows.length, valid: broken.length === 0, broken };
}

/* ---------- Routes ---------- */
async function route(m, segs, q, req, res) {
  const [a, b, c, d, e] = segs;

  /* 认证 */
  if (a === 'auth') {
    if (m === 'POST' && b === 'register') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (registerRateLimit(ip) > REGISTER_LIMIT) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '注册过于频繁，请稍后再试');
      const body = await readBody(req);
      /* 蜜罐字段：正常用户看不到，机器人填写即拦截 */
      if (String(body.homepage || '').trim() !== '') {
        return fail(res, 400, 'BOT_DETECTED', '检测到异常注册行为');
      }
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
      if (get('SELECT id FROM users WHERE email = ?', email)) {
        return fail(res, 409, 'EMAIL_EXISTS', '邮箱已存在');
      }
      const id = randomUUID();
      run(
        'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
        id, email, hashPassword(password), role, name, 'active', 0, Date.now()
      );
      if (companyData) {
        run(
          'INSERT INTO companies (id, user_id, name, country, city, license_no, registration_no, website, contact, business_scope, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
          randomUUID(), id, companyData.name, companyData.country, companyData.city, companyData.licenseNo,
          companyData.registrationNo, companyData.website, companyData.contact, companyData.businessScope, 'pending', Date.now()
        );
      }
      const u = get('SELECT * FROM users WHERE id = ?', id);
      audit(id, 'auth.register', 'user', id, email);
      await sendVerifyEmail(id, email);
      return send(res, 201, { user: publicUser(u), emailVerified: false, message: '注册成功，请查收邮箱完成验证（24 小时内有效）' });
    }
    if (m === 'POST' && b === 'login') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (loginRateLimit(ip) > LOGIN_LIMIT) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '尝试过于频繁，请稍后再试');
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const u = get('SELECT * FROM users WHERE email = ?', email);
      if (!u || !verifyPassword(body.password, u.password_hash)) {
        return fail(res, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      }
      if (u.status === 'frozen') return fail(res, 401, 'ACCOUNT_FROZEN', '账号已被冻结');
      if (!u.email_verified) return fail(res, 403, 'VERIFY_EMAIL_REQUIRED', '请先验证邮箱再登录');
      run('UPDATE users SET last_login_at = ? WHERE id = ?', Date.now(), u.id);
      return send(res, 200, { token: signToken({ uid: u.id, role: u.role }), user: publicUser(u) });
    }
    if (m === 'POST' && b === 'verify-email') {
      const body = await readBody(req);
      const token = String(body.token || '').trim();
      if (!token) return fail(res, 400, 'VALIDATION', '缺少验证令牌');
      const row = get('SELECT * FROM email_tokens WHERE token_hash = ? AND purpose = ?', sha256(token), 'verify_email');
      if (!row || row.used_at) return fail(res, 400, 'INVALID_TOKEN', '验证链接无效或已使用');
      if (row.expires_at < Date.now()) return fail(res, 400, 'TOKEN_EXPIRED', '验证链接已过期，请重新发送');
      run('UPDATE email_tokens SET used_at = ? WHERE id = ?', Date.now(), row.id);
      run('UPDATE users SET email_verified = 1 WHERE id = ?', row.user_id);
      audit(row.user_id, 'auth.verify-email', 'user', row.user_id, '');
      const u = get('SELECT * FROM users WHERE id = ?', row.user_id);
      return send(res, 200, { ok: true, user: publicUser(u) });
    }
    if (m === 'POST' && b === 'resend-verification') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (registerRateLimit(ip) > 3) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '发送过于频繁，请稍后再试');
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const u = get('SELECT * FROM users WHERE email = ?', email);
      if (u && !u.email_verified) await sendVerifyEmail(u.id, u.email);
      /* 无论邮箱是否存在都返回成功，防止邮箱枚举 */
      return send(res, 200, { ok: true, message: '如该邮箱已注册且未验证，验证邮件已重新发送' });
    }
    if (m === 'POST' && b === 'refresh') {
      const u = requireAuth(res, req);
      if (!u) return;
      return send(res, 200, { token: signToken({ uid: u.id, role: u.role }) });
    }
    if (m === 'GET' && b === 'me') {
      const u = requireAuth(res, req);
      if (!u) return;
      return send(res, 200, publicUser(u));
    }
    if (m === 'POST' && b === 'logout') return send(res, 200, { ok: true });
  }

  /* 企业/工厂认证：卖家提交真实资料，管理员审核（可查证）后通过 */
  if (a === 'companies') {
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req, ['seller']);
      if (!u) return;
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      const country = String(body.country || '').trim();
      if (!name || !country) return fail(res, 400, 'VALIDATION', '公司/工厂名称与所在国家为必填');
      const exist = get('SELECT * FROM companies WHERE user_id = ?', u.id);
      if (exist) {
        run(
          'UPDATE companies SET name=?, country=?, city=?, license_no=?, registration_no=?, website=?, contact=?, business_scope=?, status=?, reject_reason=NULL WHERE id=?',
          name, country, String(body.city || '').trim(), String(body.licenseNo || '').trim(),
          String(body.registrationNo || '').trim(), String(body.website || '').trim(), String(body.contact || '').trim(),
          String(body.businessScope || '').trim(), 'pending', exist.id
        );
        audit(u.id, 'company.apply', 'company', exist.id, name);
        return send(res, 200, get('SELECT * FROM companies WHERE id = ?', exist.id));
      }
      const id = randomUUID();
      run(
        'INSERT INTO companies (id, user_id, name, country, city, license_no, registration_no, website, contact, business_scope, status, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        id, u.id, name, country, String(body.city || '').trim(), String(body.licenseNo || '').trim(),
        String(body.registrationNo || '').trim(), String(body.website || '').trim(), String(body.contact || '').trim(),
        String(body.businessScope || '').trim(), 'pending', Date.now()
      );
      audit(u.id, 'company.apply', 'company', id, name);
      return send(res, 201, get('SELECT * FROM companies WHERE id = ?', id));
    }
    if (b === 'mine' && m === 'GET') {
      const u = requireAuth(res, req, ['seller']);
      if (!u) return;
      return send(res, 200, get('SELECT * FROM companies WHERE user_id = ?', u.id) || null);
    }
    if (!b && m === 'GET') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const status = q.get('status') || '';
      let rows = all('SELECT * FROM companies ORDER BY created_at DESC');
      if (status) rows = rows.filter(co => co.status === status);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'verify' && m === 'PUT') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const body = await readBody(req);
      const co = get('SELECT * FROM companies WHERE user_id = ?', b);
      if (!co) return fail(res, 404, 'NOT_FOUND', '企业不存在');
      if (body.action === 'approve') {
        run('UPDATE companies SET status = ?, verified_at = ?, reject_reason = NULL WHERE id = ?', 'approved', Date.now(), co.id);
        audit(u.id, 'company.approve', 'company', co.id, co.name);
        const owner = get('SELECT * FROM users WHERE id = ?', co.user_id);
        if (owner) await notifyUser(owner.id, 'company', '企业认证已通过', '您的公司/工厂资料已审核通过，现在可以发布产品。');
        return send(res, 200, get('SELECT * FROM companies WHERE id = ?', co.id));
      }
      if (body.action === 'reject') {
        const reason = String(body.reason || '资料未通过审核').slice(0, 300);
        run('UPDATE companies SET status = ?, reject_reason = ?, verified_at = NULL WHERE id = ?', 'rejected', reason, co.id);
        audit(u.id, 'company.reject', 'company', co.id, reason);
        const owner = get('SELECT * FROM users WHERE id = ?', co.user_id);
        if (owner) await notifyUser(owner.id, 'company', '企业认证未通过', '原因：' + reason + '。请修正资料后重新提交。');
        return send(res, 200, get('SELECT * FROM companies WHERE id = ?', co.id));
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
      let list = all('SELECT * FROM products WHERE status = ?', 'on');
      if (cat) list = list.filter(p => p.category === cat);
      if (origin) list = list.filter(p => p.country === origin);
      if (min != null || max != null) {
        list = list.filter(p => (min == null || p.price_max >= min) && (max == null || p.price_min <= max));
      }
      if (kw) {
        const ids = new Set(all('SELECT product_id FROM product_translations WHERE title LIKE ? OR description LIKE ?', '%' + kw + '%', '%' + kw + '%').map(r => r.product_id));
        list = list.filter(p => ids.has(p.id));
      }
      return send(res, 200, paginate(list.map(productView), q));
    }
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req, ['seller', 'admin']);
      if (!u) return;
      if (u.role === 'seller') {
        const co = get('SELECT * FROM companies WHERE user_id = ?', u.id);
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
      const company = get('SELECT id FROM companies WHERE user_id = ?', u.id);
      const priceMin = toNum(body.priceMin, 0);
      const priceMax = toNum(body.priceMax, 0);
      const moq = Math.max(1, Math.round(toNum(body.moq, 1)));
      const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
      if (!(priceMin >= 0) || !(priceMax >= priceMin)) {
        return fail(res, 400, 'VALIDATION', '价格区间不合法');
      }
      run(
        'INSERT INTO products (id, seller_id, company_id, category, sub, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, u.id, company ? company.id : null, body.category, String(body.sub || '').slice(0, 40), body.hsCode || '', body.country,
        priceMin, priceMax, moq, body.unit || 'pcs', leadTime,
        JSON.stringify(body.terms || []), JSON.stringify(body.certs || []), body.srcLang || 'en',
        'pending', now, now
      );
      for (const lang of Object.keys(trs)) {
        run(
          'INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
          randomUUID(), id, lang, trs[lang].title || '', trs[lang].description || '', JSON.stringify(trs[lang].features || []), now
        );
      }
      const enTitle = (trs.en && trs.en.title) || '';
      run(
        'INSERT INTO anti_fake_codes (id, product_id, code, batch_no, status, issued_at, verify_count) VALUES (?,?,?,?,?,?,?)',
        randomUUID(), id, antiFakeCode(id, u.id, enTitle), 'B' + new Date().getFullYear(), 'active', now, 0
      );
      audit(u.id, 'product.create', 'product', id, enTitle);
      return send(res, 201, productView(get('SELECT * FROM products WHERE id = ?', id)));
    }
    if (b && m === 'GET') {
      const p = get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      return send(res, 200, productView(p));
    }
    if (b && c === 'review' && m === 'POST') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const body = await readBody(req);
      const p = get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (body.action === 'approve') {
        run('UPDATE products SET status = ?, reject_reason = NULL, updated_at = ? WHERE id = ?', 'on', Date.now(), b);
        audit(u.id, 'product.approve', 'product', b, p.id);
      } else if (body.action === 'reject') {
        run('UPDATE products SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ?', 'rejected', String(body.reason || '驳回'), Date.now(), b);
        audit(u.id, 'product.reject', 'product', b, String(body.reason || ''));
      } else {
        return fail(res, 400, 'INVALID_ACTION', 'action 必须是 approve 或 reject');
      }
      return send(res, 200, productView(get('SELECT * FROM products WHERE id = ?', b)));
    }
    if (b && c === 'status' && m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const p = get('SELECT * FROM products WHERE id = ?', b);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (p.seller_id !== u.id && u.role !== 'admin') return fail(res, 403, 'FORBIDDEN', '只能操作自己的产品');
      const body = await readBody(req);
      if (!['on', 'off'].includes(body.status)) return fail(res, 400, 'INVALID_STATUS', 'status 必须是 on 或 off');
      run('UPDATE products SET status = ?, updated_at = ? WHERE id = ?', body.status, Date.now(), b);
      audit(u.id, 'product.status', 'product', b, body.status);
      return send(res, 200, productView(get('SELECT * FROM products WHERE id = ?', b)));
    }
    if (b && m === 'PUT') {
      const u = requireAuth(res, req);
      if (!u) return;
      const p = get('SELECT * FROM products WHERE id = ?', b);
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
      run(
        'UPDATE products SET category = ?, sub = ?, hs_code = ?, country = ?, price_min = ?, price_max = ?, moq = ?, unit = ?, lead_time = ?, terms = ?, certs = ?, src_lang = ?, status = ?, updated_at = ? WHERE id = ?',
        body.category || p.category, body.sub != null ? String(body.sub).slice(0, 40) : p.sub, body.hsCode != null ? body.hsCode : p.hs_code, body.country || p.country,
        priceMin, priceMax, moq, body.unit || p.unit, leadTime,
        JSON.stringify(body.terms || safeJson(p.terms, [])), JSON.stringify(body.certs || safeJson(p.certs, [])),
        body.srcLang || p.src_lang, 'pending', Date.now(), b
      );
      if (body.translations) {
        for (const lang of Object.keys(body.translations)) {
          const tr = body.translations[lang];
          const exists = get('SELECT id FROM product_translations WHERE product_id = ? AND lang = ?', b, lang);
          if (exists) {
            run('UPDATE product_translations SET title = ?, description = ?, features = ?, updated_at = ? WHERE id = ?',
              tr.title || '', tr.description || '', JSON.stringify(tr.features || []), Date.now(), exists.id);
          } else {
            run('INSERT INTO product_translations (id, product_id, lang, title, description, features, updated_at) VALUES (?,?,?,?,?,?,?)',
              randomUUID(), b, lang, tr.title || '', tr.description || '', JSON.stringify(tr.features || []), Date.now());
          }
        }
      }
      audit(u.id, 'product.update', 'product', b, '');
      return send(res, 200, productView(get('SELECT * FROM products WHERE id = ?', b)));
    }
  }

  /* 询盘与报价 */
  if (a === 'inquiries') {
    if (m === 'GET' && !b) {
      const u = requireAuth(res, req);
      if (!u) return;
      let rows;
      if (u.role === 'seller') {
        rows = all('SELECT i.* FROM inquiries i JOIN products p ON p.id = i.product_id WHERE p.seller_id = ? ORDER BY i.created_at DESC', u.id);
      } else if (u.role === 'admin') {
        rows = all('SELECT * FROM inquiries ORDER BY created_at DESC');
      } else {
        rows = all('SELECT * FROM inquiries WHERE buyer_id = ? ORDER BY created_at DESC', u.id);
      }
      return send(res, 200, rows);
    }
    if (m === 'POST' && !b) {
      const body = await readBody(req);
      const u = currentUser(req);
      const p = body.productId ? get('SELECT * FROM products WHERE id = ?', body.productId) : null;
      const qty = toNum(body.qty, 0);
      if (!p || !(qty >= 1) || !body.message) return fail(res, 400, 'VALIDATION', 'productId/qty/message 为必填且 qty 须为正整数');
      const id = randomUUID();
      run(
        'INSERT INTO inquiries (id, product_id, buyer_id, qty, unit, payment_term, message, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        id, p.id, u ? u.id : null, qty, body.unit || 'pcs', body.payment || null, body.message, 'new', Date.now()
      );
      audit(u ? u.id : null, 'inquiry.create', 'inquiry', id, body.message.slice(0, 80));
      const seller = get('SELECT * FROM users WHERE id = ?', p.seller_id);
      if (seller) {
        await notifyUser(seller.id, 'inquiry', '收到新询盘', '产品 ' + (body.productId) + ' 收到新询盘：' + String(body.message).slice(0, 120));
        try { await sendMail({ to: seller.email, subject: '[BeanBeanMouse] 收到新询盘', body: String(body.message) }); }
        catch (e) { console.error('邮件发送失败（不影响询盘）:', e.message); }
      }
      return send(res, 201, get('SELECT * FROM inquiries WHERE id = ?', id));
    }
    if (b && c === 'quote' && m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const i = get('SELECT * FROM inquiries WHERE id = ?', b);
      if (!i) return fail(res, 404, 'NOT_FOUND', '询盘不存在');
      const p = get('SELECT * FROM products WHERE id = ?', i.product_id);
      if (p.seller_id !== u.id && u.role !== 'admin') return fail(res, 403, 'FORBIDDEN', '只能回复自己产品的询盘');
      const body = await readBody(req);
      if (body.price == null || !body.incoterm) return fail(res, 400, 'VALIDATION', 'price/incoterm 为必填');
      const price = toNum(body.price, NaN);
      const validity = Math.max(1, Math.round(toNum(body.validity, 15)));
      const leadTime = Math.max(1, Math.round(toNum(body.leadTime, 15)));
      if (!(price >= 0)) return fail(res, 400, 'VALIDATION', '报价金额不合法');
      run(
        'INSERT INTO quotes (id, inquiry_id, price, incoterm, payment_term, validity_days, lead_time, note, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        randomUUID(), b, price, body.incoterm, body.payment || 'T/T', validity, leadTime, body.note || null, Date.now()
      );
      run('UPDATE inquiries SET status = ? WHERE id = ?', 'quoted', b);
      audit(u.id, 'inquiry.quote', 'inquiry', b, String(body.price));
      const buyer = i.buyer_id ? get('SELECT * FROM users WHERE id = ?', i.buyer_id) : null;
      if (buyer) {
        await notifyUser(buyer.id, 'quote', '收到供应商报价', '您的询盘已收到报价：' + body.incoterm + ' ' + body.price);
        try { await sendMail({ to: buyer.email, subject: '[BeanBeanMouse] 您收到新的报价', body: '询盘 ' + b + ' 的新报价：' + body.incoterm + ' ' + body.price }); }
        catch (e) { console.error('邮件发送失败（不影响报价）:', e.message); }
      }
      return send(res, 200, get('SELECT * FROM inquiries WHERE id = ?', b));
    }
  }

  /* 交易订单与小费打赏：买家确认签收视为交易达成，之后双方可互打赏（可见、可取消） */
  if (a === 'orders') {
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req, ['buyer', 'admin']);
      if (!u) return;
      const body = await readBody(req);
      const inq = get('SELECT * FROM inquiries WHERE id = ?', body.inquiryId);
      if (!inq) return fail(res, 404, 'NOT_FOUND', '询盘不存在');
      const product = get('SELECT * FROM products WHERE id = ?', inq.product_id);
      if (!product) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && inq.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能基于自己的询盘创建订单');
      const quote = get('SELECT * FROM quotes WHERE inquiry_id = ? ORDER BY created_at DESC', inq.id);
      const total = body.total != null ? Number(body.total) : (quote ? Number(quote.price) : NaN);
      if (!(total > 0)) return fail(res, 400, 'VALIDATION', '需要有效的成交金额（请先报价或传入 total）');
      const id = randomUUID();
      run(
        'INSERT INTO orders (id, inquiry_id, quote_id, buyer_id, seller_id, status, total, currency, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
        id, inq.id, quote ? quote.id : null, inq.buyer_id, product.seller_id, 'created', total, body.currency || 'USD', Date.now(), Date.now()
      );
      audit(u.id, 'order.create', 'order', id, String(total));
      const seller = get('SELECT * FROM users WHERE id = ?', product.seller_id);
      if (seller) await notifyUser(seller.id, 'order', '收到新订单', '订单金额 ' + (body.currency || 'USD') + ' ' + total);
      addEvidence(id, u.id, 'order_create', id, { total, currency: body.currency || 'USD', inquiryId: inq.id });
      return send(res, 201, orderView(get('SELECT * FROM orders WHERE id = ?', id)));
    }
    if (!b && m === 'GET') {
      const u = requireAuth(res, req);
      if (!u) return;
      let rows;
      if (u.role === 'admin') rows = all('SELECT * FROM orders ORDER BY created_at DESC');
      else rows = all('SELECT * FROM orders WHERE buyer_id = ? OR seller_id = ? ORDER BY created_at DESC', u.id, u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && !c && m === 'GET') {
      const u = requireAuth(res, req);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      return send(res, 200, orderView(o));
    }
    if (b && c === 'confirm-receipt' && m === 'POST') {
      const u = requireAuth(res, req, ['buyer', 'admin']);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有买家可以确认签收');
      if (o.status !== 'created') return fail(res, 400, 'INVALID_STATUS', '订单当前状态不可确认签收');
      run('UPDATE orders SET status = ?, receipt_confirmed_at = ?, updated_at = ? WHERE id = ?', 'complete', Date.now(), Date.now(), b);
      audit(u.id, 'order.receipt', 'order', b, '交易达成');
      addEvidence(b, u.id, 'receipt_confirmed', b, { status: 'complete' });
      const seller = get('SELECT * FROM users WHERE id = ?', o.seller_id);
      if (seller) await notifyUser(seller.id, 'order', '买家已确认签收', '订单 ' + b + ' 交易达成。');
      return send(res, 200, orderView(get('SELECT * FROM orders WHERE id = ?', b)));
    }
    if (b && c === 'cancel' && m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有买家可以取消订单');
      if (o.status !== 'created') return fail(res, 400, 'INVALID_STATUS', '订单当前状态不可取消');
      run('UPDATE orders SET status = ?, updated_at = ? WHERE id = ?', 'cancelled', Date.now(), b);
      audit(u.id, 'order.cancel', 'order', b, '');
      return send(res, 200, orderView(get('SELECT * FROM orders WHERE id = ?', b)));
    }
    if (b && c === 'tips' && !d && m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权操作该订单');
      if (o.status !== 'complete') return fail(res, 400, 'ORDER_NOT_COMPLETE', '交易达成后才能打赏');
      const body = await readBody(req);
      const amount = Number(body.amount);
      if (!(amount > 0) || amount > 10000) return fail(res, 400, 'VALIDATION', '打赏金额需在 0 到 10000 之间');
      const to = u.id === o.buyer_id ? o.seller_id : o.buyer_id;
      const id = randomUUID();
      run(
        'INSERT INTO tips (id, order_id, from_user_id, to_user_id, amount, currency, note, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        id, b, u.id, to, amount, o.currency || 'USD', String(body.note || '').slice(0, 200), 'active', Date.now()
      );
      audit(u.id, 'tip.create', 'tip', id, String(amount));
      addEvidence(b, u.id, 'tip_create', id, { amount, currency: o.currency || 'USD', note: String(body.note || '').slice(0, 200) });
      const recipient = get('SELECT * FROM users WHERE id = ?', to);
      if (recipient) await notifyUser(recipient.id, 'tip', '收到小费打赏', '订单 ' + b + ' 收到打赏 ' + (o.currency || 'USD') + ' ' + amount);
      return send(res, 201, get('SELECT * FROM tips WHERE id = ?', id));
    }
    if (b && c === 'tips' && !d && m === 'GET') {
      const u = requireAuth(res, req);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      return send(res, 200, all('SELECT * FROM tips WHERE order_id = ? ORDER BY created_at DESC', b));
    }
    if (b && c === 'tips' && d && e === 'cancel' && m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const tip = get('SELECT * FROM tips WHERE id = ?', d);
      if (!tip) return fail(res, 404, 'NOT_FOUND', '打赏记录不存在');
      if (u.role !== 'admin' && tip.from_user_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有打赏方可取消');
      if (tip.status !== 'active') return fail(res, 400, 'INVALID_STATUS', '该打赏已不可取消');
      run('UPDATE tips SET status = ?, cancelled_at = ? WHERE id = ?', 'cancelled', Date.now(), d);
      audit(u.id, 'tip.cancel', 'tip', d, '');
      addEvidence(b, u.id, 'tip_cancel', d, {});
      return send(res, 200, get('SELECT * FROM tips WHERE id = ?', d));
    }
    /* 货物物流：卖家创建物流单，买卖双方实时可见 */
    if (b && c === 'shipments' && !d && m === 'POST') {
      const u = requireAuth(res, req, ['seller', 'admin']);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有卖家可以创建物流单');
      if (o.status !== 'created' && o.status !== 'complete') return fail(res, 400, 'INVALID_STATUS', '订单当前状态不可创建物流单');
      const body = await readBody(req);
      const sid = randomUUID();
      const now = Date.now();
      const origin = String(body.origin || '').slice(0, 120);
      const destination = String(body.destination || '').slice(0, 120);
      run(
        'INSERT INTO shipments (id, order_id, carrier, tracking_no, status, origin, destination, current_location, etd, eta, remark, created_by, updated_at, created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        sid, b, String(body.carrier || '').slice(0, 80), String(body.trackingNo || '').slice(0, 80),
        'processing', origin, destination, origin, body.etd || null, body.eta || null,
        String(body.remark || '').slice(0, 500), u.id, now, now
      );
      run(
        'INSERT INTO shipment_events (id, shipment_id, status, location, note, event_time, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
        randomUUID(), sid, 'processing', origin, '物流单已创建，等待卖家发货', now, u.id, now
      );
      audit(u.id, 'shipment.create', 'shipment', sid, 'order=' + b);
      addEvidence(b, u.id, 'shipment_create', sid, { carrier: String(body.carrier || ''), trackingNo: String(body.trackingNo || '') });
      const buyer = o.buyer_id ? get('SELECT * FROM users WHERE id = ?', o.buyer_id) : null;
      if (buyer) await notifyUser(buyer.id, 'shipment', '物流信息已创建', '订单 ' + b + ' 已创建物流单，可查看实时跟进');
      return send(res, 201, shipmentView(get('SELECT * FROM shipments WHERE id = ?', sid)));
    }
    if (b && c === 'shipments' && !d && m === 'GET') {
      const u = requireAuth(res, req);
      if (!u) return;
      const o = get('SELECT * FROM orders WHERE id = ?', b);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      return send(res, 200, all('SELECT * FROM shipments WHERE order_id = ? ORDER BY created_at ASC', b).map(shipmentView));
    }
    /* 物流事件：卖家/管理员更新，自动触发存证 */
    if (b && c === 'shipments' && d && e === 'events' && m === 'POST') {
      const u = requireAuth(res, req, ['seller', 'admin']);
      if (!u) return;
      const s = get('SELECT * FROM shipments WHERE id = ?', d);
      if (!s) return fail(res, 404, 'NOT_FOUND', '物流单不存在');
      const o = get('SELECT * FROM orders WHERE id = ?', s.order_id);
      if (u.role !== 'admin' && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只有卖家可以更新物流');
      const body = await readBody(req);
      const allowed = ['processing', 'packed', 'shipped', 'in_transit', 'customs', 'out_for_delivery', 'delivered', 'exception'];
      const status = String(body.status || '').toLowerCase();
      if (!allowed.includes(status)) return fail(res, 400, 'INVALID_STATUS', 'status 不合法');
      const now = Date.now();
      const location = String(body.location || s.current_location || '').slice(0, 120);
      run(
        'INSERT INTO shipment_events (id, shipment_id, status, location, note, event_time, created_by, created_at) VALUES (?,?,?,?,?,?,?,?)',
        randomUUID(), d, status, location, String(body.note || '').slice(0, 500), body.eventTime || now, u.id, now
      );
      run('UPDATE shipments SET status = ?, current_location = ?, updated_at = ? WHERE id = ?', status, location, now, d);
      audit(u.id, 'shipment.event', 'shipment', d, status + ' @ ' + location);
      addEvidence(s.order_id, u.id, 'shipment_event', d, { status, location, note: String(body.note || '').slice(0, 500) });
      return send(res, 200, shipmentView(get('SELECT * FROM shipments WHERE id = ?', d)));
    }
  }

  /* 会话消息 */
  if (a === 'conversations' && c === 'messages') {
    if (m === 'GET') {
      const u = requireAuth(res, req);
      if (!u) return;
      const conv = get('SELECT * FROM conversations WHERE id = ?', b);
      if (conv && conv.buyer_id !== u.id && conv.seller_id !== u.id && u.role !== 'admin') {
        return fail(res, 403, 'FORBIDDEN', '无权查看该会话');
      }
      return send(res, 200, conv ? all('SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC', b) : []);
    }
    if (m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      if (!body.text) return fail(res, 400, 'VALIDATION', 'text 为必填');
      let conv = get('SELECT * FROM conversations WHERE id = ?', b);
      if (!conv) {
        run('INSERT INTO conversations (id, buyer_id, seller_id, created_at) VALUES (?,?,?,?)', b, u.id, u.id, Date.now());
      }
      const id = randomUUID();
      run(
        'INSERT INTO messages (id, conversation_id, sender_id, content, created_at) VALUES (?,?,?,?,?)',
        id, b, u.id, body.text, Date.now()
      );
      return send(res, 201, get('SELECT * FROM messages WHERE id = ?', id));
    }
  }

  /* 翻译（服务端代理：真实服务链 + 额度 + 缓存 + 离线兜底） */
  if (a === 'translate' && m === 'POST') {
    const body = await readBody(req);
    const u = currentUser(req);
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
    const row = get('SELECT * FROM anti_fake_codes WHERE code = ?', code);
    if (!row || row.status !== 'active') return fail(res, 404, 'CODE_NOT_FOUND', '防伪码不存在或已作废');
    run('UPDATE anti_fake_codes SET last_verified_at = ?, verify_count = verify_count + 1 WHERE id = ?', Date.now(), row.id);
    return send(res, 200, { genuine: true, code: row.code, productId: row.product_id, verifiedAt: new Date().toISOString() });
  }

  /* 资讯：实时更新 + 权威来源（全球多区域） */
  if (a === 'news') {
    if (m === 'GET' && !b) {
      const cat = q.get('cat') || '';
      const region = q.get('region') || '';
      let rows = all(
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
      return send(res, 200, all('SELECT * FROM news_sources WHERE enabled = 1'));
    }
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const body = await readBody(req);
      const title = String(body.title || '').trim();
      const url = String(body.url || '').trim();
      if (!title || !/^https?:\/\//.test(url)) return fail(res, 400, 'VALIDATION', 'title 与合法 url 为必填');
      let parsedUrl;
      try { parsedUrl = new URL(url); } catch (e) { return fail(res, 400, 'VALIDATION', 'url 格式不正确'); }
      const sourceName = String(body.sourceName || '').trim() || parsedUrl.hostname;
      let source = get('SELECT * FROM news_sources WHERE name = ?', sourceName);
      if (!source) {
        const sid = randomUUID();
        run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)',
          sid, sourceName, parsedUrl.origin, body.region || 'global', body.category || 'general', 1);
        source = get('SELECT * FROM news_sources WHERE id = ?', sid);
      }
      const id = randomUUID();
      run(
        'INSERT INTO news_items (id, source_id, region, category, title_zh, title_en, summary_zh, summary_en, url, published_at, updated_at, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)',
        id, source.id, body.region || 'global', body.category || 'general',
        body.titleZh || title, body.titleEn || title, body.summaryZh || '', body.summaryEn || '',
        url, body.publishedAt || new Date().toISOString(), Date.now(), 'published'
      );
      audit(u.id, 'news.create', 'news', id, title);
      return send(res, 201, get('SELECT * FROM news_items WHERE id = ?', id));
    }
    if (b === 'refresh' && m === 'POST') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const FEEDS = [
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
      let added = 0, failed = 0;
      for (const feed of FEEDS) {
        try {
          const resp = await fetch(feed.url, { signal: AbortSignal.timeout(12000), headers: { 'User-Agent': 'BeanBeanMouse/1.0' } });
          if (!resp.ok) { failed++; continue; }
          const xml = await resp.text();
          const items = parseRss(xml);
          let src = get('SELECT * FROM news_sources WHERE name = ?', feed.name);
          if (!src) {
            const sid = randomUUID();
            run('INSERT INTO news_sources (id, name, url, region, category, enabled) VALUES (?,?,?,?,?,?)',
              sid, feed.name, feed.url, feed.region, feed.category, 1);
            src = get('SELECT * FROM news_sources WHERE id = ?', sid);
          }
          for (const it of items.slice(0, 10)) {
            if (!it.url || get('SELECT id FROM news_items WHERE url = ?', it.url)) continue;
            run(
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
      audit(u.id, 'news.refresh', 'news', '', 'added=' + added + ' failed=' + failed);
      return send(res, 200, { added, failed, note: 'RSS 抓取为尽力而为，失败不影响现有资讯' });
    }
  }

  /* 通知 */
  if (a === 'notifications' && m === 'GET') {
    const u = requireAuth(res, req);
    if (!u) return;
    return send(res, 200, all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', u.id));
  }

  /* 品类需求记录：用户没找到想要的品类时提交，平台据此邀请供应商入驻 */
  if (a === 'category-requests') {
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      const name = String(body.name || '').trim();
      if (!name || name.length > 120) return fail(res, 400, 'VALIDATION', '品类名称为必填且不超过 120 字符');
      const markets = Array.isArray(body.targetMarkets) ? body.targetMarkets.map(String).slice(0, 20) : [];
      const id = randomUUID();
      run(
        'INSERT INTO category_requests (id, user_id, name, description, target_markets, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?)',
        id, u.id, name, String(body.description || '').slice(0, 1000), JSON.stringify(markets), 'new', Date.now(), Date.now()
      );
      audit(u.id, 'category.request', 'category_request', id, name);
      return send(res, 201, get('SELECT * FROM category_requests WHERE id = ?', id));
    }
    if (!b && m === 'GET') {
      const u = requireAuth(res, req);
      if (!u) return;
      let rows;
      if (u.role === 'admin') rows = all('SELECT * FROM category_requests ORDER BY created_at DESC');
      else rows = all('SELECT * FROM category_requests WHERE user_id = ? ORDER BY created_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'status' && m === 'POST') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const body = await readBody(req);
      const r = get('SELECT * FROM category_requests WHERE id = ?', b);
      if (!r) return fail(res, 404, 'NOT_FOUND', '品类需求不存在');
      if (!['invited', 'done'].includes(body.status)) return fail(res, 400, 'INVALID_STATUS', 'status 必须是 invited 或 done');
      run('UPDATE category_requests SET status = ?, note = ?, updated_at = ? WHERE id = ?', body.status, String(body.note || '').slice(0, 300), Date.now(), b);
      audit(u.id, 'category.' + body.status, 'category_request', b, String(body.note || ''));
      const owner = r.user_id ? get('SELECT * FROM users WHERE id = ?', r.user_id) : null;
      if (owner) {
        await notifyUser(owner.id, 'category', '品类需求有进展',
          body.status === 'invited' ? '平台正在为您邀请该品类的供应商入驻。' : '您的品类需求已完成处理。');
      }
      return send(res, 200, get('SELECT * FROM category_requests WHERE id = ?', b));
    }
  }

  /* 文件上传与下载（存储抽象：本地磁盘，可换 S3/OSS） */
  if (a === 'files') {
    if (m === 'POST') {
      const u = requireAuth(res, req);
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
        data = Buffer.from(String(body.data), 'base64');
      }
      const { ext, error } = validateFile(mime, data);
      if (error) return fail(res, error.status, error.code, error.message);
      const id = randomUUID();
      const key = id + '.' + ext;
      putFile(key, data);
      run(
        'INSERT INTO files (id, owner_id, bucket_key, mime, size, status, created_at) VALUES (?,?,?,?,?,?,?)',
        id, u.id, key, mime, data.length, 'active', Date.now()
      );
      audit(u.id, 'file.upload', 'file', id, filename);
      return send(res, 201, { id, filename, mime, size: data.length, url: '/files/' + id });
    }
    if (b && m === 'GET') {
      const row = get('SELECT * FROM files WHERE id = ?', b);
      if (!row) return fail(res, 404, 'NOT_FOUND', '文件不存在');
      const buf = getFile(row.bucket_key);
      if (!buf) return fail(res, 404, 'NOT_FOUND', '文件不存在');
      return sendBytes(res, 200, buf, row.mime, { 'Content-Disposition': 'inline' });
    }
  }

  /* 第三方存证：保存流程证据快照 + 哈希链验证 */
  if (a === 'evidence') {
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req);
      if (!u) return;
      const body = await readBody(req);
      const o = get('SELECT * FROM orders WHERE id = ?', body.orderId);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权操作该订单');
      const kind = String(body.kind || 'manual').slice(0, 32);
      const snapshot = (typeof body.snapshot === 'object' && body.snapshot !== null) ? body.snapshot : {};
      const rec = addEvidence(o.id, u.id, kind, body.refId ? String(body.refId).slice(0, 64) : null, snapshot);
      audit(u.id, 'evidence.create', 'evidence', rec.id, kind);
      return send(res, 201, rec);
    }
    if (m === 'GET' && !b) {
      const u = requireAuth(res, req);
      if (!u) return;
      const orderId = String(q.get('orderId') || '');
      const o = get('SELECT * FROM orders WHERE id = ?', orderId);
      if (!o) return fail(res, 404, 'NOT_FOUND', '订单不存在');
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      const items = all('SELECT * FROM evidence_records WHERE order_id = ? ORDER BY chain_index ASC', orderId);
      const v = verifyEvidenceChain(orderId);
      return send(res, 200, { orderId, total: items.length, verified: v.valid, broken: v.broken, items });
    }
    if (b && c === 'verify' && m === 'POST') {
      const u = requireAuth(res, req);
      if (!u) return;
      const rec = get('SELECT * FROM evidence_records WHERE id = ?', b);
      if (!rec) return fail(res, 404, 'NOT_FOUND', '存证记录不存在');
      const o = get('SELECT * FROM orders WHERE id = ?', rec.order_id);
      if (u.role !== 'admin' && o.buyer_id !== u.id && o.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '无权查看该订单');
      const v = verifyEvidenceChain(rec.order_id);
      return send(res, 200, { id: rec.id, orderId: rec.order_id, chainValid: v.valid, total: v.total, broken: v.broken });
    }
  }

  /* 卖家推广：提交 → 管理员审核 → 产品标记 promoted */
  if (a === 'promotions') {
    if (m === 'POST' && !b) {
      const u = requireAuth(res, req, ['seller', 'admin']);
      if (!u) return;
      const body = await readBody(req);
      const p = get('SELECT * FROM products WHERE id = ?', body.productId);
      if (!p) return fail(res, 404, 'NOT_FOUND', '产品不存在');
      if (u.role !== 'admin' && p.seller_id !== u.id) return fail(res, 403, 'FORBIDDEN', '只能推广自己的产品');
      const days = Math.max(1, Math.min(90, Math.round(toNum(body.days, 7))));
      const id = randomUUID();
      run(
        'INSERT INTO promotion_requests (id, product_id, seller_id, days, budget, note, status, created_at) VALUES (?,?,?,?,?,?,?,?)',
        id, p.id, u.id, days, String(body.budget || 'basic').slice(0, 40), String(body.note || '').slice(0, 300), 'pending', Date.now()
      );
      audit(u.id, 'promotion.request', 'promotion', id, 'product=' + p.id);
      return send(res, 201, get('SELECT * FROM promotion_requests WHERE id = ?', id));
    }
    if (m === 'GET' && !b) {
      const u = requireAuth(res, req, ['seller', 'admin']);
      if (!u) return;
      const rows = u.role === 'admin'
        ? all('SELECT * FROM promotion_requests ORDER BY created_at DESC')
        : all('SELECT * FROM promotion_requests WHERE seller_id = ? ORDER BY created_at DESC', u.id);
      return send(res, 200, paginate(rows, q));
    }
    if (b && c === 'review' && m === 'POST') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      const body = await readBody(req);
      const pr = get('SELECT * FROM promotion_requests WHERE id = ?', b);
      if (!pr) return fail(res, 404, 'NOT_FOUND', '推广申请不存在');
      if (body.action === 'approve') {
        run('UPDATE promotion_requests SET status = ?, reject_reason = NULL, reviewed_at = ? WHERE id = ?', 'approved', Date.now(), b);
        audit(u.id, 'promotion.approve', 'promotion', b, '');
      } else if (body.action === 'reject') {
        run('UPDATE promotion_requests SET status = ?, reject_reason = ?, reviewed_at = ? WHERE id = ?', 'rejected', String(body.reason || '不符合推广要求').slice(0, 300), Date.now(), b);
        audit(u.id, 'promotion.reject', 'promotion', b, String(body.reason || ''));
      } else {
        return fail(res, 400, 'INVALID_ACTION', 'action 必须是 approve 或 reject');
      }
      return send(res, 200, get('SELECT * FROM promotion_requests WHERE id = ?', b));
    }
  }

  /* 管理后台 */
  if (a === 'admin') {
    if (b === 'overview' && m === 'GET') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, {
        products: get('SELECT COUNT(*) AS c FROM products').c,
        pendingReviews: get('SELECT COUNT(*) AS c FROM products WHERE status = ?', 'pending').c,
        inquiries: get('SELECT COUNT(*) AS c FROM inquiries').c,
        users: get('SELECT COUNT(*) AS c FROM users').c,
        companies: get('SELECT COUNT(*) AS c FROM companies').c,
        pendingCompanies: get('SELECT COUNT(*) AS c FROM companies WHERE status = ?', 'pending').c,
        orders: get('SELECT COUNT(*) AS c FROM orders').c,
        tips: get('SELECT COUNT(*) AS c FROM tips WHERE status = ?', 'active').c,
        evidence: get('SELECT COUNT(*) AS c FROM evidence_records').c,
        shipments: get('SELECT COUNT(*) AS c FROM shipments').c,
        pendingPromotions: get('SELECT COUNT(*) AS c FROM promotion_requests WHERE status = ?', 'pending').c,
        categoryRequests: get('SELECT COUNT(*) AS c FROM category_requests').c
      });
    }
    if (b === 'logs' && m === 'GET') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, paginate(all('SELECT * FROM audit_logs ORDER BY created_at DESC'), q));
    }
  }

  return fail(res, 404, 'NOT_FOUND', '接口不存在');
}

/* ---------- 服务入口 ---------- */
export function startServer(port = PORT) {
  const server = createServer(async (req, res) => {
    try {
      if (req.method === 'OPTIONS') {
        res.writeHead(204, CORS);
        return res.end();
      }
      const u = new URL(req.url, 'http://localhost');
      const segs = u.pathname.split('/').filter(Boolean);
      await route(req.method, segs, u.searchParams, req, res);
    } catch (e) {
      if (e.message === 'INVALID_JSON') return fail(res, 400, 'INVALID_JSON', '请求体不是合法 JSON');
      console.error(e);
      return fail(res, 500, 'INTERNAL', '服务器内部错误');
    }
  });
  server.on('upgrade', (req, socket, head) => {
    const u = new URL(req.url, 'http://x');
    if (u.pathname === '/ws') handleWsUpgrade(req, socket, head);
    else socket.destroy();
  });
  return new Promise(resolve => {
    server.listen(port, () => resolve(server));
  });
}

/* 直接运行时启动 */
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const server = await startServer();
  console.log('BeanBeanMouse API 已启动: http://127.0.0.1:' + server.address().port);
}
