import { randomBytes, scryptSync, createHmac, timingSafeEqual } from 'node:crypto';

export function hashPassword(pw) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(pw), salt, 64).toString('hex');
  return salt + ':' + hash;
}

export function verifyPassword(pw, stored) {
  const [salt, hash] = String(stored || '').split(':');
  if (!salt || !hash) return false;
  const calc = scryptSync(String(pw), salt, 64);
  return timingSafeEqual(Buffer.from(hash, 'hex'), calc);
}

const SECRET = process.env.JWT_SECRET || 'beanbeandragon-dev-secret-change-me';
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
