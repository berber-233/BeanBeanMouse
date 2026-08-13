// 构建 Cloudflare Pages 部署目录 dist/：只复制公开网站文件，不包含后端/文档/测试/git。
import { cpSync, mkdirSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const entries = [
  'index.html', 'styles.css', 'app.js', 'data.js', 'api.js',
  '_headers', 'robots.txt', 'sitemap.xml', '404.html', '.nojekyll',
  'assets'
];

for (const e of entries) {
  cpSync(path.join(root, e), path.join(dist, e), { recursive: true });
}

console.log('dist built:', dist);
