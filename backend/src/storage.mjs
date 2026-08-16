/* 文件存储抽象：当前为本地磁盘实现；生产环境可替换为 S3/OSS 适配器 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
export const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(root, 'uploads');
mkdirSync(UPLOAD_DIR, { recursive: true });

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
export const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);

/* 安全最佳实践：不仅校验声明的 MIME，还要校验文件魔数，
 * 防止上传者把可执行/HTML 内容伪装成图片后由同源提供服务。 */
function magicMatches(mime, buf) {
  if (mime === 'image/webp') {
    return buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP';
  }
  const sig = MAGIC[mime];
  if (!sig) return false;
  return sig.every((b, i) => buf[i] === b);
}

export function validateFile(mime, buf) {
  const size = buf ? buf.length : 0;
  const ext = ALLOWED[mime];
  if (!ext) return { error: { status: 400, code: 'UNSUPPORTED_TYPE', message: '仅支持图片与 PDF' } };
  if (size > MAX_FILE_SIZE) return { error: { status: 400, code: 'FILE_TOO_LARGE', message: '文件超过大小限制' } };
  if (!magicMatches(mime, buf)) return { error: { status: 400, code: 'INVALID_FILE', message: '文件内容与声明类型不符' } };
  return { ext };
}

export function putFile(key, buf) {
  writeFileSync(path.join(UPLOAD_DIR, key), buf);
}

export function getFile(key) {
  const p = path.join(UPLOAD_DIR, key);
  if (!existsSync(p)) return null;
  return readFileSync(p);
}
