/* 口令与令牌：纯 WebCrypto 实现（Node 22 与 Cloudflare Workers 共用）。
 *
 * 变更说明（相对 Node 版）：原先用 node:crypto 的 scryptSync + createHmac，
 * Workers 不支持 scrypt，这里统一改成 PBKDF2-SHA256 + HMAC-SHA256（均为标准 WebCrypto），
 * 因此 hashPassword/verifyPassword/signToken/verifyToken 现在都是 **异步** 的。
 *
 * 安全取舍：PBKDF2 迭代次数由 PBKDF2_ITERATIONS 控制（默认 100000）。
 * Workers 免费版单次请求 CPU 上限很低，若注册/登录报 CPU 超时，
 * 调低该值（例如 25000）；付费版可调高。
 */
import {
  randomBytes, toHex, pbkdf2Hex, timingSafeEqualStr,
  hmacSha256Base64Url, toBase64Url, fromBase64Url, utf8, fromUtf8
} from './platform.mjs';

const DEFAULT_ITERATIONS = 100000;
let ITERATIONS = DEFAULT_ITERATIONS;
let SECRET = '';

export function configureAuth({ secret, iterations } = {}) {
  if (secret) SECRET = String(secret);
  if (!SECRET) {
    SECRET = toHex(randomBytes(32));
    console.warn('[security] 未设置 JWT_SECRET，本次运行使用随机密钥（重启后登录态失效）');
  }
  const n = Number(iterations);
  if (Number.isFinite(n) && n >= 10000) ITERATIONS = Math.floor(n);
}

export async function hashPassword(pw) {
  const salt = toHex(randomBytes(16));
  const hash = await pbkdf2Hex(String(pw), salt, ITERATIONS, 32);
  return 'pbkdf2$' + ITERATIONS + '$' + salt + '$' + hash;
}

export async function verifyPassword(pw, stored) {
  const parts = String(stored || '').split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const iterations = Number(parts[1]);
  const salt = parts[2];
  const expect = parts[3];
  if (!iterations || !salt || !expect) return false;
  const calc = await pbkdf2Hex(String(pw), salt, iterations, 32);
  return timingSafeEqualStr(calc, expect);
}

export async function signToken(payload, expiresSec = 3600) {
  const header = toBase64Url(utf8(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const body = toBase64Url(utf8(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + expiresSec })));
  const sig = await hmacSha256Base64Url(SECRET, header + '.' + body);
  return header + '.' + body + '.' + sig;
}

export async function verifyToken(token) {
  try {
    const [h, b, s] = String(token || '').split('.');
    if (!h || !b || !s) return null;
    const expect = await hmacSha256Base64Url(SECRET, h + '.' + b);
    if (!timingSafeEqualStr(s, expect)) return null;
    const payload = JSON.parse(fromUtf8(fromBase64Url(b)));
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) {
    return null;
  }
}
