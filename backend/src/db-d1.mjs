/* Cloudflare D1 数据实现：把 D1 的异步 API 包成 store 门面要求的形状。
 * 注意：D1 只接受 string / number / null / ArrayBuffer，undefined 与 boolean
 * 都会报错，这里统一做一次清洗（undefined→null，boolean→0/1）。 */

export function makeD1Store(DB) {
  const clean = (params) => params.map(v => {
    if (v === undefined) return null;
    if (typeof v === 'boolean') return v ? 1 : 0;
    if (typeof v === 'bigint') return Number(v);
    return v;
  });

  return {
    async all(sql, ...params) {
      const r = await DB.prepare(sql).bind(...clean(params)).all();
      return (r && r.results) || [];
    },
    async get(sql, ...params) {
      const r = await DB.prepare(sql).bind(...clean(params)).first();
      return r === undefined ? null : r;
    },
    async run(sql, ...params) {
      return await DB.prepare(sql).bind(...clean(params)).run();
    }
  };
}
