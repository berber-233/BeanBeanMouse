// 构建 Cloudflare Pages 部署目录 dist/：只复制公开网站文件，不包含后端/文档/测试/git。
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const entries = [
  'index.html', 'styles.css', 'app.js', 'app-core.js', 'app-pages.js', 'data.js', 'api.js', 'product-image-map.js',
  '_headers', '_redirects', 'robots.txt', 'sitemap.xml', '404.html', '.nojekyll',
  'assets'
];

for (const e of entries) {
  cpSync(path.join(root, e), path.join(dist, e), { recursive: true });
}

/* 自动版本戳：每次构建给 CSS/JS 换上唯一版本号。
 * 教训：手工记得升版本号迟早会漏——漏一次，用户的浏览器就会继续用缓存里的旧 JS，
 * 表现为"代码明明改了、线上却还是旧行为"（已经踩过两次）。 */
import { readFileSync, writeFileSync } from 'node:fs';
const stamp = Date.now().toString(36);
const indexPath = path.join(dist, 'index.html');
const html = readFileSync(indexPath, 'utf8').replace(/\?v=[\w.]+/g, '?v=' + stamp);
writeFileSync(indexPath, html, 'utf8');

console.log('dist built:', dist, '| asset version:', stamp);
