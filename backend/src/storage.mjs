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
export const MAX_FILE_SIZE = Number(process.env.MAX_FILE_SIZE || 10 * 1024 * 1024);

export function validateFile(mime, size) {
  const ext = ALLOWED[mime];
  if (!ext) return { error: { status: 400, code: 'UNSUPPORTED_TYPE', message: '仅支持图片与 PDF' } };
  if (size > MAX_FILE_SIZE) return { error: { status: 400, code: 'FILE_TOO_LARGE', message: '文件超过大小限制' } };
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
