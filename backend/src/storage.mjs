/* 文件存储门面 + 通用校验（平台无关）。
 *
 * 文件读写由平台入口注入实现：
 *   Node    → storage-node.mjs（本地磁盘，可选 S3 适配器）
 *   Workers → storage-r2.mjs（R2 对象存储）或直接返回未配置错误
 * 校验逻辑（MIME 白名单 + 魔数）在这里，两端完全一致。
 */

export let MAX_FILE_SIZE = 10 * 1024 * 1024;
export let UPLOAD_DIR = '';

const ALLOWED = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf'
};
const MAGIC = {
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/jpeg': [0xff, 0xd8, 0xff],
  'image/gif': [0x47, 0x49, 0x46, 0x38],
  'application/pdf': [0x25, 0x50, 0x44, 0x46]
};

let impl = null;

export function configureStorage({ maxFileSize, uploadDir, custom } = {}) {
  const n = Number(maxFileSize);
  if (Number.isFinite(n) && n > 0) MAX_FILE_SIZE = n;
  if (uploadDir) UPLOAD_DIR = String(uploadDir);
  if (custom) impl = custom;
}

export function setStorageImpl(custom) {
  impl = custom;
}

function current() {
  if (!impl) throw new Error('文件存储未初始化（请在平台入口注入实现）');
  return impl;
}

export async function putFile(key, buf) { return current().put(key, buf); }
export async function getFile(key) { return current().get(key); }
export async function deleteFile(key) { return current().del(key); }

/* 字节级比较：同时兼容 Node Buffer 与 Workers Uint8Array */
function asBytes(buf) {
  if (buf instanceof Uint8Array) return buf;
  if (typeof Buffer !== 'undefined' && Buffer.isBuffer && Buffer.isBuffer(buf)) return new Uint8Array(buf);
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  return new Uint8Array(0);
}

/* 安全最佳实践：不仅校验声明的 MIME，还要校验文件魔数，
 * 防止上传者把可执行/HTML 内容伪装成图片后由同源提供服务。 */
function magicMatches(mime, bytes) {
  if (mime === 'image/webp') {
    if (bytes.length <= 12) return false;
    const tag = (o) => String.fromCharCode(bytes[o], bytes[o + 1], bytes[o + 2], bytes[o + 3]);
    return tag(0) === 'RIFF' && tag(8) === 'WEBP';
  }
  const sig = MAGIC[mime];
  if (!sig) return false;
  return sig.every((b, i) => bytes[i] === b);
}

export function validateFile(mime, buf) {
  const bytes = asBytes(buf);
  const size = bytes.length;
  const ext = ALLOWED[mime];
  if (!ext) return { error: { status: 400, code: 'UNSUPPORTED_TYPE', message: '仅支持图片与 PDF' } };
  if (size > MAX_FILE_SIZE) return { error: { status: 400, code: 'FILE_TOO_LARGE', message: '文件超过大小限制' } };
  if (!magicMatches(mime, bytes)) return { error: { status: 400, code: 'INVALID_FILE', message: '文件内容与声明类型不符' } };
  return { ext };
}
