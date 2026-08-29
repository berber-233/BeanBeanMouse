/* S3 兼容对象存储适配器（零依赖：Node 18+ fetch + 手写 SigV4）
 * 适用于 Cloudflare R2、AWS S3、MinIO 等。配置见 backend/.env.example。
 * 未配置密钥时 put/get 返回 null / 抛错，由上层回退本地存储。 */
import { createHmac, createHash } from 'node:crypto';

const cfg = {
  endpoint: process.env.S3_ENDPOINT || '',
  bucket: process.env.S3_BUCKET || '',
  region: process.env.S3_REGION || 'auto',
  accessKey: process.env.S3_ACCESS_KEY || '',
  secretKey: process.env.S3_SECRET_KEY || ''
};
export const s3Enabled = !!(cfg.endpoint && cfg.bucket && cfg.accessKey && cfg.secretKey);

function hmac(key, data) {
  return createHmac('sha256', key).update(data).digest();
}
function sha256Hex(data) {
  return createHash('sha256').update(data).digest('hex');
}
function iso8601(d = new Date()) {
  return d.toISOString().replace(/[:-]|\.\d{3}/g, '');
}

function signHeaders(method, key, query, payload, amzDate, dateStamp) {
  const host = new URL(cfg.endpoint).host;
  const canonicalUri = '/' + encodeURIComponent(cfg.bucket) + '/' + key.split('/').map(encodeURIComponent).join('/');
  const canonicalQuery = Object.keys(query || {}).sort().map(k => k + '=' + encodeURIComponent(query[k])).join('&');
  const payloadHash = sha256Hex(payload);
  const canonicalHeaders = 'host:' + host + '\n' + 'x-amz-content-sha256:' + payloadHash + '\n' + 'x-amz-date:' + amzDate + '\n';
  const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
  const canonicalRequest = [method, canonicalUri, canonicalQuery, canonicalHeaders, signedHeaders, payloadHash].join('\n');
  const scope = dateStamp + '/' + cfg.region + '/s3/aws4_request';
  const stringToSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256Hex(canonicalRequest)].join('\n');
  const kDate = hmac('AWS4' + cfg.secretKey, dateStamp);
  const kRegion = hmac(kDate, cfg.region);
  const kService = hmac(kRegion, 's3');
  const kSigning = hmac(kService, 'aws4_request');
  const signature = createHmac('sha256', kSigning).update(stringToSign).digest('hex');
  return {
    Authorization: 'AWS4-HMAC-SHA256 Credential=' + cfg.accessKey + '/' + scope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature,
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    Host: host
  };
}

async function request(method, key, body, query, extraHeaders) {
  const amzDate = iso8601();
  const dateStamp = amzDate.slice(0, 8);
  const headers = Object.assign(signHeaders(method, key, query || {}, body || Buffer.alloc(0), amzDate, dateStamp), extraHeaders || {});
  const url = cfg.endpoint.replace(/\/+$/, '') + '/' + cfg.bucket + '/' + key.split('/').map(encodeURIComponent).join('/');
  const res = await fetch(url, { method, headers, body: method === 'GET' || method === 'DELETE' ? undefined : body });
  if (!res.ok) throw new Error('S3_' + res.status);
  return res;
}

export async function putFile(key, buf, contentType) {
  if (!s3Enabled) return false;
  await request('PUT', key, Buffer.from(buf), undefined, contentType ? { 'Content-Type': contentType } : undefined);
  return true;
}
export async function getFile(key) {
  if (!s3Enabled) return null;
  try {
    const res = await request('GET', key, undefined);
    return Buffer.from(await res.arrayBuffer());
  } catch (e) {
    if (e && e.message === 'S3_404') return null;
    throw e;
  }
}
export async function deleteFile(key) {
  if (!s3Enabled) return false;
  await request('DELETE', key);
  return true;
}
