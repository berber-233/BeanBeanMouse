/* Node 侧文件存储实现：本地磁盘（uploadDir），可选 S3 兼容适配器。 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { s3Enabled, putFile as s3Put, getFile as s3Get, deleteFile as s3Del } from './storage-s3.mjs';

export function makeNodeStorage(uploadDir) {
  mkdirSync(uploadDir, { recursive: true });
  return {
    async put(key, buf) {
      if (s3Enabled) return s3Put(key, buf);
      writeFileSync(path.join(uploadDir, key), buf instanceof Uint8Array ? Buffer.from(buf) : buf);
      return true;
    },
    async get(key) {
      if (s3Enabled) return s3Get(key);
      const p = path.join(uploadDir, key);
      if (!existsSync(p)) return null;
      return readFileSync(p);
    },
    async del(key) {
      if (s3Enabled) return s3Del(key);
      const p = path.join(uploadDir, key);
      if (existsSync(p)) writeFileSync(p, Buffer.alloc(0)); // 本地驱动：置空占位，避免误删
      return true;
    }
  };
}
