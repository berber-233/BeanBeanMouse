import { randomBytes, scryptSync, createHmac, timingSafeEqual } from 'node:crypto';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  // 安全最佳实践：scrypt 使用明确成本参数并提高内存上限，防离线爆破
  const hash = scryptSync(String(pw), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 }).toString('hex');
  return salt + ':' + hash;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const calc = scryptSync(String(pw), salt, 64, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return timingSafeEqual(Buffer.from(hash, 'hex'), calc);
}

/* 安全最佳实践：禁止硬编码兜底密钥。
 * 生产环境未配置 JWT_SECRET 时拒绝启动（否则令牌可被伪造）；
 * 开发环境使用每次启动随机生成的密钥，并给出警告。 */
const SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' ? '' : randomBytes(32).toString('hex'));
if (!SECRET) {
  console.error('[security] JWT_SECRET 未配置：生产环境拒绝启动，防止令牌伪造');
  process.exit(1);
} else if (!process.env.JWT_SECRET) {
  console.warn('[security] 警告：未设置 JWT_SECRET，开发模式使用随机密钥（重启后登录态失效）');
}
function b64url(buf) { return Buffer.from(buf).toString('base64url'); }

export function signToken(payload, expiresSec = 3600) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresSec }));
  const sig = createHmac('sha256', SECRET).update(header + '.' + body).digest('base64url');
  return header + '.' + body + '.' + sig;
}

export function verifyToken(token) {
  try {
    const [h, b, s] = String(token || '').split('.');
    if (!h || !b || !s) return null;
    const expect = createHmac('sha256', SECRET).update(h + '.' + b).digest('base64url');
    if (!timingSafeEqual(Buffer.from(s), Buffer.from(expect))) return null;
    const payload = JSON.parse(Buffer.from(b, 'base64url').toString('utf8'));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
