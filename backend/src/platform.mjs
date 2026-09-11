/* 同构基础层：Node 22 与 Cloudflare Workers 都能跑的 WebCrypto 封装。
 * 后端原本用 node:crypto（scrypt / createHmac / createHash），
 * 这些在 Workers 里不可用，统一改为标准 WebCrypto，两端共用同一份实现。 */

const webcrypto = globalThis.crypto;
const subtle = webcrypto.subtle;
const enc = new TextEncoder();
const dec = new TextDecoder();

export function randomUUID() {
  return webcrypto.randomUUID();
}

export function randomBytes(n) {
  const b = new Uint8Array(n);
  webcrypto.getRandomValues(b);
  return b;
}

export function toHex(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out = '';
  for (const x of b) out += x.toString(16).padStart(2, '0');
  return out;
}

export function toBase64Url(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let bin = '';
  for (const x of b) bin += String.fromCharCode(x);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(str) {
  const s = String(str).replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? '='.repeat(4 - (s.length % 4)) : '';
  const bin = atob(s + pad);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function utf8(str) { return enc.encode(String(str)); }
export function fromUtf8(bytes) { return dec.decode(bytes); }

export async function sha256Hex(input) {
  const data = typeof input === 'string' ? utf8(input) : input;
  return toHex(await subtle.digest('SHA-256', data));
}

export async function hmacSha256Base64Url(secret, message) {
  const key = await subtle.importKey('raw', utf8(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await subtle.sign('HMAC', key, utf8(message));
  return toBase64Url(sig);
}

/* 定长比较，避免时序侧信道（替代 node:crypto 的 timingSafeEqual） */
export function timingSafeEqualStr(a, b) {
  const x = String(a || ''), y = String(b || '');
  if (x.length !== y.length) return false;
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x.charCodeAt(i) ^ y.charCodeAt(i);
  return diff === 0;
}

/* PBKDF2-SHA256：Workers 没有 scrypt，改用 WebCrypto 标准实现。
 * 迭代次数可通过 PBKDF2_ITERATIONS 配置：Workers 免费版 CPU 上限较低，
 * 若注册/登录出现 CPU 超时，调低即可（付费版可调高）。 */
export async function pbkdf2Hex(password, saltHex, iterations, lengthBytes = 32) {
  const key = await subtle.importKey('raw', utf8(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: utf8(saltHex), iterations },
    key,
    lengthBytes * 8
  );
  return toHex(bits);
}

/* BASE64 编解码（文件上传/预览用）：Node 与 Workers 都有的 atob/btoa 语义 */
export function base64ToBytes(b64) {
  const bin = atob(String(b64));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
