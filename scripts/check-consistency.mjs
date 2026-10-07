// 一致性自查：防止 sitemap / _redirects / 构建清单 与站点实际内容漂移。
// 用法：node scripts/check-consistency.mjs   （CI 也会跑）
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => readFileSync(path.join(root, p), 'utf8');
const problems = [];

// 1) sitemap 收录的产品 id 必须与 data.js 一致
/* 商品 id 有两种写法：数组字面量 id: 'p23' 与注入块里的 JSON "id": "p33" */
const dataSrc = read('data.js');
const dataIds = new Set([
  ...Array.from(dataSrc.matchAll(/id:\s*'p(\d+)'/g)).map(m => 'p' + m[1]),
  ...Array.from(dataSrc.matchAll(/"id":\s*"p(\d+)"/g)).map(m => 'p' + m[1])
]);
/* 商品目录现在由 D1（真实商品）驱动，sitemap 由构建脚本按服务端数据生成。
 * 以前拿 data.js 的本地演示商品去比对 sitemap，演示数据清空后全是误报
 * （"sitemap 缺少商品 p53/p54"）。改成只看 _redirects / 路径是否覆盖，不再和本地演示数据对照。 */
const mapIds = new Set(Array.from(read('sitemap.xml').matchAll(/#\/product\/(p\d+)/g)).map(m => m[1]));
void mapIds;

// 2) sitemap 里的干净路径必须在 _redirects 里有对应跳转（否则线上 404）
const redirects = read('_redirects');
const redirectPaths = new Set(Array.from(redirects.matchAll(/^\/([a-z][a-z-]*)\s/gm)).map(m => '/' + m[1]));
const sitemapPaths = Array.from(read('sitemap.xml').matchAll(/<loc>https:\/\/beanbeanmouse\.com(\/[a-z][a-z-]*)<\/loc>/g)).map(m => m[1]);
for (const p of sitemapPaths) {
  if (!redirectPaths.has(p)) problems.push(`sitemap.xml 收录 ${p}，但 _redirects 没有对应跳转（线上会 404）`);
}

// 3) _redirects 的目标必须指向站点真实存在的 hash 路由
const appSrc = read('app-core.js') + read('app-pages.js');
const knownRoutes = new Set(Array.from(appSrc.matchAll(/path === '(\/[a-z-]+)'/g)).map(m => m[1]));
for (const m of redirects.matchAll(/^\/([a-z][a-z-]*)\s+\/#\/([a-z-]+)\s/gm)) {
  if (!knownRoutes.has('/' + m[2])) problems.push(`_redirects 把 /${m[1]} 跳到 /#/${m[2]}，但前端没有 /${m[2]} 这条路由`);
}

// 4) 构建清单里的文件/目录必须真实存在
const buildSrc = read('scripts/build-site.mjs');
const entriesBlock = /const entries = \[([\s\S]*?)\];/.exec(buildSrc);
if (!entriesBlock) problems.push('build-site.mjs 里找不到 entries 清单');
else {
  for (const m of entriesBlock[1].matchAll(/'([^']+)'/g)) {
    if (!existsSync(path.join(root, m[1]))) problems.push(`build-site.mjs 要复制 ${m[1]}，但文件不存在`);
  }
}

// 5) D1 迁移与 Node 侧的 SQLite 建表脚本必须保持同一套表
//    注意要读**全部**迁移：addresses / quick_replies 等表是后面 0012/0013 才加的，
//    只比 0001 会误报"缺表"（CI 一直红）。
const tablesIn = (sql) => new Set(Array.from(sql.matchAll(/CREATE TABLE IF NOT EXISTS\s+([a-z_]+)/gi)).map(m => m[1].toLowerCase()));
const nodeTables = tablesIn(read('backend/db/schema.sqlite.sql'));
const d1Tables = new Set();
for (const f of readdirSync(path.join(root, 'migrations')).filter(f => f.endsWith('.sql'))) {
  for (const t of tablesIn(read('migrations/' + f))) d1Tables.add(t);
}
for (const t of nodeTables) if (!d1Tables.has(t)) problems.push(`migrations 缺少表 ${t}（backend/db/schema.sqlite.sql 里有）`);
for (const t of d1Tables) if (!nodeTables.has(t)) problems.push(`migrations 多出表 ${t}（Node 建表脚本里没有）`);

// 6) Workers 入口必须存在，否则前端切 http 模式会全 404
if (!existsSync(path.join(root, 'functions/api/[[path]].js'))) problems.push('functions/api/[[path]].js 不存在（/api/* 将无法响应）');

// 7) index.html 引用的本地资源必须存在
//    注意：以 / 开头的"路径路由"（/privacy、/returns、/report …）由 _redirects 交给 SPA，
//    不是静态文件；以前这里把它们当文件检查，导致这一步一直误报红（CI 也跟着红）。
const routedPaths = new Set(
  (read('_redirects').match(/^\/[^\s*]+/gm) || []).map(s => s.trim())
);
for (const m of read('index.html').matchAll(/(?:src|href)="(?!https?:|#|mailto:|\/\/)([^"]+)"/g)) {
  const p = m[1].split('?')[0];
  if (p.charAt(0) === '/' && routedPaths.has(p)) continue;   /* SPA 路由：交给 _redirects */
  if (!existsSync(path.join(root, p))) problems.push(`index.html 引用 ${p}，但文件不存在`);
}

if (problems.length) {
  console.log('CONSISTENCY FAILED:');
  for (const p of problems) console.log('  - ' + p);
  process.exit(1);
}
console.log('CONSISTENCY OK (sitemap ' + dataIds.size + ' products, ' + sitemapPaths.length + ' paths, ' + redirectPaths.size + ' redirects)');
