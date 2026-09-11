/* Cloudflare R2 文件存储实现（Workers / Pages Functions）。 */

export function makeR2Storage(bucket) {
  return {
    async put(key, buf) {
      const body = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
      await bucket.put(key, body);
      return true;
    },
    async get(key) {
      const obj = await bucket.get(key);
      if (!obj) return null;
      return new Uint8Array(await obj.arrayBuffer());
    },
    async del(key) {
      await bucket.delete(key);
      return true;
    }
  };
}

/* 未配置 R2 时的占位实现：给出明确错误，避免静默丢文件 */
export function makeDisabledStorage() {
  const fail = () => { throw new Error('文件存储未配置（请在 wrangler.jsonc 绑定 R2 桶）'); };
  return { put: fail, get: async () => null, del: async () => false };
}
