import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
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
function loginRateLimit(ip) {
  const now = Date.now();
  const win = 60 * 1000;
  const rec = loginAttempts.get(ip) || { count: 0, resetAt: now + win };
  if (now > rec.resetAt) { rec.count = 0; rec.resetAt = now + win; }
  rec.count++;
  loginAttempts.set(ip, rec);
  return rec.count;
}

/* ---------- HTTP 基础 ---------- */
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization'
};

function send(res, status, data) {
  const body = data === undefined ? '' : JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', ...CORS });
  res.end(body);
}
function sendBytes(res, status, buf, contentType, extraHeaders = {}) {
  res.writeHead(status, {
    'Content-Type': contentType,
    'Content-Length': buf.length,
    'Cache-Control': 'private, max-age=3600',
    ...CORS,
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
  return {
    ...row,
    terms: safeJson(row.terms, []),
    certs: safeJson(row.certs, []),
    translations,
    antiFakeCode: code ? code.code : null
  };
}

/* ---------- 路由 ---------- */
async function route(m, segs, q, req, res) {
  const [a, b, c, d] = segs;

  /* 认证 */
  if (a === 'auth') {
    if (m === 'POST' && b === 'register') {
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');
      const role = body.role;
      const name = String(body.name || '').trim();
      if (!email || password.length < 6 || !['buyer', 'seller'].includes(role) || !name) {
        return fail(res, 400, 'VALIDATION', '邮箱、密码（至少6位）、角色、姓名为必填');
      }
      if (get('SELECT id FROM users WHERE email = ?', email)) {
        return fail(res, 409, 'EMAIL_EXISTS', '邮箱已存在');
      }
      const id = randomUUID();
      run(
        'INSERT INTO users (id, email, password_hash, role, name, status, email_verified, created_at) VALUES (?,?,?,?,?,?,?,?)',
        id, email, hashPassword(password), role, name, 'active', 0, Date.now()
      );
      const u = get('SELECT * FROM users WHERE id = ?', id);
      audit(id, 'auth.register', 'user', id, email);
      return send(res, 201, { token: signToken({ uid: id, role }), user: publicUser(u) });
    }
    if (m === 'POST' && b === 'login') {
      const ip = req.socket.remoteAddress || 'unknown';
      if (loginRateLimit(ip) > 10) return fail(res, 429, 'TOO_MANY_ATTEMPTS', '尝试过于频繁，请稍后再试');
      const body = await readBody(req);
      const email = String(body.email || '').trim().toLowerCase();
      const u = get('SELECT * FROM users WHERE email = ?', email);
      if (!u || !verifyPassword(body.password, u.password_hash)) {
        return fail(res, 401, 'INVALID_CREDENTIALS', '账号或密码错误');
      }
      if (u.status === 'frozen') return fail(res, 401, 'ACCOUNT_FROZEN', '账号已被冻结');
      return send(res, 200, { token: signToken({ uid: u.id, role: u.role }), user: publicUser(u) });
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

  /* 企业认证 */
  if (a === 'companies' && c === 'verify' && m === 'PUT') {
    const u = requireAuth(res, req, ['admin']);
    if (!u) return;
    const co = get('SELECT * FROM companies WHERE user_id = ?', b);
    if (!co) return fail(res, 404, 'NOT_FOUND', '企业不存在');
    run('UPDATE companies SET status = ?, verified_at = ? WHERE id = ?', 'approved', Date.now(), co.id);
    audit(u.id, 'company.verify', 'company', co.id, co.name);
    return send(res, 200, get('SELECT * FROM companies WHERE id = ?', co.id));
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
      const body = await readBody(req);
      const trs = body.translations || {};
      if (!body.category || !body.country || !trs.en || !trs.zh) {
        return fail(res, 400, 'VALIDATION', 'category/country/translations(en,zh) 为必填');
      }
      const id = randomUUID();
      const now = Date.now();
      const company = get('SELECT id FROM companies WHERE user_id = ?', u.id);
      run(
        'INSERT INTO products (id, seller_id, company_id, category, hs_code, country, price_min, price_max, moq, unit, lead_time, terms, certs, src_lang, status, created_at, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)',
        id, u.id, company ? company.id : null, body.category, body.hsCode || '', body.country,
        body.priceMin || 0, body.priceMax || 0, body.moq || 1, body.unit || 'pcs', body.leadTime || 15,
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
      run(
        'UPDATE products SET category = ?, hs_code = ?, country = ?, price_min = ?, price_max = ?, moq = ?, unit = ?, lead_time = ?, terms = ?, certs = ?, src_lang = ?, status = ?, updated_at = ? WHERE id = ?',
        body.category || p.category, body.hsCode != null ? body.hsCode : p.hs_code, body.country || p.country,
        body.priceMin != null ? body.priceMin : p.price_min, body.priceMax != null ? body.priceMax : p.price_max,
        body.moq != null ? body.moq : p.moq, body.unit || p.unit, body.leadTime != null ? body.leadTime : p.lead_time,
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
      if (!p || !body.qty || !body.message) return fail(res, 400, 'VALIDATION', 'productId/qty/message 为必填');
      const id = randomUUID();
      run(
        'INSERT INTO inquiries (id, product_id, buyer_id, qty, unit, payment_term, message, status, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        id, p.id, u ? u.id : null, body.qty, body.unit || 'pcs', body.payment || null, body.message, 'new', Date.now()
      );
      audit(u ? u.id : null, 'inquiry.create', 'inquiry', id, body.message.slice(0, 80));
      const seller = get('SELECT * FROM users WHERE id = ?', p.seller_id);
      if (seller) {
        await notifyUser(seller.id, 'inquiry', '收到新询盘', '产品 ' + (body.productId) + ' 收到新询盘：' + String(body.message).slice(0, 120));
        try { await sendMail({ to: seller.email, subject: '[BeanBeanDragon] 收到新询盘', body: String(body.message) }); }
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
      run(
        'INSERT INTO quotes (id, inquiry_id, price, incoterm, payment_term, validity_days, lead_time, note, created_at) VALUES (?,?,?,?,?,?,?,?,?)',
        randomUUID(), b, body.price, body.incoterm, body.payment || 'T/T', body.validity || 15, body.leadTime || 15, body.note || null, Date.now()
      );
      run('UPDATE inquiries SET status = ? WHERE id = ?', 'quoted', b);
      audit(u.id, 'inquiry.quote', 'inquiry', b, String(body.price));
      const buyer = i.buyer_id ? get('SELECT * FROM users WHERE id = ?', i.buyer_id) : null;
      if (buyer) {
        await notifyUser(buyer.id, 'quote', '收到供应商报价', '您的询盘已收到报价：' + body.incoterm + ' ' + body.price);
        try { await sendMail({ to: buyer.email, subject: '[BeanBeanDragon] 您收到新的报价', body: '询盘 ' + b + ' 的新报价：' + body.incoterm + ' ' + body.price }); }
        catch (e) { console.error('邮件发送失败（不影响报价）:', e.message); }
      }
      return send(res, 200, get('SELECT * FROM inquiries WHERE id = ?', b));
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

  /* 资讯 */
  if (a === 'news') {
    if (m === 'GET' && !b) {
      const cat = q.get('cat') || '';
      const region = q.get('region') || '';
      let rows = all('SELECT * FROM news_items WHERE status = ?', 'published');
      if (cat) rows = rows.filter(n => n.category === cat);
      if (region) rows = rows.filter(n => n.region === region);
      return send(res, 200, paginate(rows, q));
    }
    if (b === 'sources' && m === 'GET') {
      return send(res, 200, all('SELECT * FROM news_sources WHERE enabled = 1'));
    }
  }

  /* 通知 */
  if (a === 'notifications' && m === 'GET') {
    const u = requireAuth(res, req);
    if (!u) return;
    return send(res, 200, all('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC', u.id));
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
      const { ext, error } = validateFile(mime, data.length);
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

  /* 管理后台 */
  if (a === 'admin') {
    if (b === 'overview' && m === 'GET') {
      const u = requireAuth(res, req, ['admin']);
      if (!u) return;
      return send(res, 200, {
        products: get('SELECT COUNT(*) AS c FROM products').c,
        pendingReviews: get('SELECT COUNT(*) AS c FROM products WHERE status = ?', 'pending').c,
        inquiries: get('SELECT COUNT(*) AS c FROM inquiries').c,
        users: get('SELECT COUNT(*) AS c FROM users').c
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
  console.log('BeanBeanDragon API 已启动: http://127.0.0.1:' + server.address().port);
}
