/* 数据访问门面：让同一份路由逻辑既能跑在 Node（node:sqlite），
 * 也能跑在 Cloudflare Workers（D1）。
 *
 * 各平台入口在启动时注入自己的实现：
 *   Node    → backend/src/db.mjs（node:sqlite，同步实现）
 *   Workers → backend/src/db-d1.mjs（D1，异步实现）
 *
 * 这里只做转发，并且导出的是 **异步** 函数，所以所有调用点都要 await
 * （Node 侧返回同步值，await 一个普通值同样成立）。
 * 刻意不做动态 import：这样 Workers 的模块图里不会出现 node:sqlite / node:fs。
 */

let impl = null;

export function setStore(custom) {
  impl = custom;
}

function current() {
  if (!impl) throw new Error('数据层未初始化：请先调用 setStore()');
  return impl;
}

export async function get(sql, ...params) {
  return current().get(sql, ...params);
}

export async function run(sql, ...params) {
  return current().run(sql, ...params);
}

export async function all(sql, ...params) {
  return current().all(sql, ...params);
}
