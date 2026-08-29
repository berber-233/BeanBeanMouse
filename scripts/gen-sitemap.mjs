// 生成 sitemap.xml：静态页面 + 上架产品详情（演示 SPA 可抓取性有限，产物供参考）
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = 'https://beanbeanmouse.com';
const today = new Date().toISOString().slice(0, 10);

// 读取 data.js 中的产品 id（简易解析，避免执行浏览器环境代码）
const dataSrc = readFileSync(path.join(root, 'data.js'), 'utf8');
const productIds = Array.from(dataSrc.matchAll(/id:\s*'p(\d+)'/g)).map(m => 'p' + m[1]);

const staticRoutes = [
  { loc: '', priority: 1.0, freq: 'weekly' },
  { loc: '#/products', priority: 0.9, freq: 'weekly' },
  { loc: '#/news', priority: 0.7, freq: 'daily' },
  { loc: '#/guide', priority: 0.6, freq: 'monthly' },
  { loc: '#/export', priority: 0.6, freq: 'monthly' },
  { loc: '#/logistics', priority: 0.6, freq: 'monthly' },
  { loc: '#/compliance', priority: 0.6, freq: 'monthly' },
  { loc: '#/disputes', priority: 0.5, freq: 'monthly' },
  { loc: '#/feedback', priority: 0.4, freq: 'monthly' }
];

const urls = staticRoutes.map(r => ({
  loc: base + '/' + r.loc.replace(/^#\//, '').replace(/#/g, ''),
  lastmod: today,
  changefreq: r.freq,
  priority: r.priority.toFixed(1)
}));

// 产品详情（hash 路由，仅作参考；正式版需服务端渲染后可抓取）
productIds.slice(0, 50).forEach(id => {
  urls.push({ loc: base + '/#/product/' + id, lastmod: today, changefreq: 'weekly', priority: '0.8' });
});

const xml = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + urls.map(u => '  <url>\n'
    + '    <loc>' + u.loc + '</loc>\n'
    + '    <lastmod>' + u.lastmod + '</lastmod>\n'
    + '    <changefreq>' + u.changefreq + '</changefreq>\n'
    + '    <priority>' + u.priority + '</priority>\n'
    + '  </url>').join('\n')
  + '\n</urlset>\n';

writeFileSync(path.join(root, 'sitemap.xml'), xml, 'utf8');
console.log('sitemap.xml written with ' + urls.length + ' urls');
