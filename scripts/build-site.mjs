// 构建 Cloudflare Pages 部署目录 dist/：只复制公开网站文件，不包含后端/文档/测试/git。
import { cpSync, mkdirSync, rmSync, writeFileSync as writeFile, readFileSync as readFile } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

rmSync(dist, { recursive: true, force: true });
mkdirSync(dist, { recursive: true });

const entries = [
  'index.html', 'styles.css', 'app.js', 'app-core.js', 'app-pages.js', 'data.js', 'api.js', 'product-image-map.js',
  '_headers', '_redirects', 'robots.txt', 'sitemap.xml', '404.html', '.nojekyll',
  'assets', 'vendor'
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
const html = readFileSync(indexPath, 'utf8')
  .replace(/\?v=[\w.]+/g, '?v=' + stamp)
  /* 路径路由下 /product/p25 这种深链接里，相对引用会被解析成 /product/data.js（脚本全 404、页面空白），
   * 所以构建时统一改成绝对路径。源码 index.html 保持相对路径 —— 本地回归走 file://，
   * 绝对路径在 file:// 下会指向磁盘根目录，反而跑不起来。 */
  .replace(/(src|href)="(?!https?:|\/|#|mailto:|data:)([^"]+)"/g, '$1="/$2"');
writeFileSync(indexPath, html, 'utf8');
/* SPA 外壳副本：_redirects 的 200 代理**不能指向 /index.html** ——
 * Pages 会把 /index.html 规范化成根路径 "/"，于是整条规则退化成"308 跳回首页"
 * （实测 /products、/about、/login 全部 308 → /）。
 * 复制成 /spa.html 这个独立文件后，代理才是真正的内部重写，地址栏保持干净路径。 */
writeFileSync(path.join(dist, 'spa.html'), html, 'utf8');

/* ================= SEO：为每个商品生成静态落地页 /p/<id>（2026-10-05） =================
 * 站点是 hash 路由（/#/product/p25），搜索引擎只会看到一个首页 URL，
 * 而外贸站的自然流量几乎全在商品页上。这里在构建时把商品渲染成**真正可索引的静态页**：
 * 带 title/description/OG/JSON-LD/价格与关键参数，页面上的 CTA 再把人带进站内详情页询价。
 * 拉不到接口（离线构建）就跳过，不影响部署。 */
const SITE = process.env.SITE_ORIGIN || 'https://beanbeanmouse.com';
const API = process.env.SITE_API || (SITE + '/api/products?status=all&size=200');

const esc = s => String(s == null ? '' : s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const money = n => (Math.round(Number(n || 0) * 100) / 100).toString();

/* 无实拍图时给一张和站内一致的渐变占位图（内联 SVG，不额外占请求） */
function placeholderSvg(title, w = 800, h = 800) {
  const initials = String(title || 'BBM').split(/\s+/).slice(0, 3).map(x => x[0]).join('').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'BBM';
  return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '">'
    + '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="hsl(32 46% 44%)"/><stop offset="1" stop-color="hsl(77 50% 24%)"/></linearGradient></defs>'
    + '<rect width="' + w + '" height="' + h + '" fill="url(#g)"/>'
    + '<text x="' + (w / 2) + '" y="' + (h / 2) + '" text-anchor="middle" font-family="Arial, sans-serif" font-size="' + Math.round(h * 0.22) + '" font-weight="700" fill="rgba(255,255,255,.9)">' + initials + '</text>'
    + '</svg>');
}

function productPageHtml(p) {
  const tr = p.translations || {};
  const en = tr.en || {}, zh = tr.zh || {};
  const title = en.title || zh.title || p.id;
  const desc = String(en.description || zh.description || '').replace(/\s+/g, ' ').trim();
  const code = p.code || '';
  const hasPhoto = Array.isArray(p.images) && p.images.length > 0;
  const photoUrl = hasPhoto ? (SITE + p.images[0].url) : '';
  /* 页面里没实拍图就用内联 SVG 占位；但 og:image / JSON-LD 必须是**真 URL 且是 JPG/PNG**
   * （社交平台不接受 data: URI，也不认 SVG），所以分享图退回品牌主视觉。 */
  const imgOnPage = hasPhoto ? photoUrl : placeholderSvg(title);
  const ogImg = hasPhoto ? photoUrl : (SITE + '/assets/mascot-main.jpg');
  const url = SITE + '/p/' + p.id;
  const price = money(p.priceMin) + (p.priceMax > p.priceMin ? ' – ' + money(p.priceMax) : '');
  const features = (en.features && en.features.length ? en.features : (zh.features || [])).slice(0, 8);
  const ld = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: title, sku: code || p.id, description: desc.slice(0, 300),
    /* 只有真实商品照才写进结构化数据（data URI / 品牌图不算商品图） */
    ...(hasPhoto ? { image: [photoUrl] } : {}),
    brand: { '@type': 'Brand', name: 'BeanBeanMouse' },
    countryOfOrigin: p.country || 'CN',
    offers: {
      '@type': 'Offer', url: url, priceCurrency: 'USD', price: money(p.priceMin),
      availability: 'https://schema.org/InStock',
      seller: { '@type': 'Organization', name: 'BeanBeanMouse' }
    }
  };
  const crumbs = {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'BeanBeanMouse', item: SITE + '/' },
      { '@type': 'ListItem', position: 2, name: 'Products', item: SITE + '/products' },
      { '@type': 'ListItem', position: 3, name: title, item: url }
    ]
  };
  const row = (k, v) => v ? '<li><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></li>' : '';
  return '<!doctype html>\n<html lang="en">\n<head>\n'
    + '<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
    + '<title>' + esc(title) + ' · BeanBeanMouse</title>\n'
    + '<meta name="description" content="' + esc(desc.slice(0, 155)) + '">\n'
    + '<link rel="canonical" href="' + esc(url) + '">\n'
    + '<meta property="og:type" content="product">\n'
    + '<meta property="og:title" content="' + esc(title) + '">\n'
    + '<meta property="og:description" content="' + esc(desc.slice(0, 200)) + '">\n'
    + '<meta property="og:image" content="' + esc(ogImg) + '">\n'
    + '<meta property="og:url" content="' + esc(url) + '">\n'
    + '<meta name="twitter:card" content="summary_large_image">\n'
    + '<link rel="icon" href="/assets/mascot-icon.png">\n'
    + '<script type="application/ld+json">' + JSON.stringify(ld) + '</script>\n'
    + '<script type="application/ld+json">' + JSON.stringify(crumbs) + '</script>\n'
    + '<style>' + [
      ':root{--ink:#2A2118;--muted:#7A6A55;--line:#EDE3CF;--accent:#C8860B;--bg:#FFFDF8}',
      '*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--ink);font:15px/1.7 system-ui,"Segoe UI",Arial,sans-serif}',
      'header{border-bottom:1px solid var(--line);padding:14px 20px;display:flex;align-items:center;gap:10px}',
      'header img{width:30px;height:30px;border-radius:50%}header b{font-size:16px}',
      'main{max-width:960px;margin:0 auto;padding:26px 20px 60px}',
      '.grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:28px;align-items:start}',
      'img.hero{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:16px;border:1px solid var(--line);background:#fff}',
      'h1{font-size:24px;line-height:1.35;margin:0 0 10px}',
      '.zh{color:var(--muted);margin:0 0 14px}',
      '.chip{display:inline-block;font:700 12px/1 ui-monospace,Consolas,monospace;background:#FFF6E4;border:1px solid #F0D8AE;color:#8A5A0B;border-radius:999px;padding:5px 10px;margin:0 6px 8px 0}',
      'ul.spec{list-style:none;padding:0;margin:12px 0}ul.spec li{display:flex;gap:12px;padding:6px 0;border-bottom:1px dashed var(--line)}',
      'ul.spec .k{color:var(--muted);min-width:88px}.price{font-size:26px;font-weight:800;margin:6px 0 12px}',
      '.cta{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}',
      '.btn{display:inline-flex;align-items:center;gap:8px;border-radius:10px;padding:12px 20px;font-weight:700;text-decoration:none;border:1px solid var(--line);background:#fff;color:var(--ink)}',
      '.btn.primary{background:var(--accent);border-color:var(--accent);color:#3A2A00}',
      'footer{border-top:1px solid var(--line);color:var(--muted);font-size:13px;padding:18px 20px;text-align:center}',
      '@media(max-width:720px){.grid{grid-template-columns:1fr}}'
    ].join('') + '</style>\n</head>\n<body>\n'
    + '<header><img src="/assets/mascot-icon.png" alt="BeanBeanMouse"><b>BeanBeanMouse</b><span style="color:var(--muted)">豆豆鼠宠物用品 · 自营出口</span></header>\n'
    + '<main><div class="grid">'
    + '<div><img class="hero" src="' + esc(imgOnPage) + '" alt="' + esc(title) + '"></div>'
    + '<div>'
    + '<h1>' + esc(title) + '</h1>'
    + (zh.title && zh.title !== title ? '<p class="zh">' + esc(zh.title) + '</p>' : '')
    + (code ? '<span class="chip">' + esc(code) + '</span>' : '')
    + (p.hsCode ? '<span class="chip">HS ' + esc(p.hsCode) + '</span>' : '')
    + '<div class="price">US$' + esc(price) + ' <span style="font-size:14px;font-weight:600;color:var(--muted)">/ ' + esc(p.unit || 'pcs') + '</span></div>'
    + '<ul class="spec">'
    + row('MOQ', (p.moq || '') + ' ' + (p.unit || ''))
    + row('Lead time', (p.leadTime || '') + ' days')
    + row('Trade terms', (p.terms || []).join(' / '))
    + row('Certifications', (p.certs || []).join(', '))
    + row('Origin', p.country || '')
    + '</ul>'
    + (desc ? '<p>' + esc(desc) + '</p>' : '')
    + (features.length ? '<ul class="spec">' + features.map(f => '<li><span class="v">· ' + esc(f) + '</span></li>').join('') + '</ul>' : '')
    + '<div class="cta">'
    + '<a class="btn primary" href="/#/product/' + encodeURIComponent(p.id) + '">View full page &amp; request a quote</a>'
    + '<a class="btn" href="/#/products">All pet supplies</a>'
    + '</div>'
    + '<p style="color:var(--muted);font-size:13px">Direct from our own pet-supply export line. Prices are indicative (FOB); send your target quantity and market for a firm quotation.</p>'
    + '</div></div></main>\n'
    + '<footer>BeanBeanMouse 豆豆鼠 · beanbeanmouse.com · beanbeanmouse.trade@outlook.com</footer>\n'
    + '</body>\n</html>\n';
}

async function buildProductLandingPages() {
  let items = [];
  try {
    const r = await fetch(API, { headers: { 'User-Agent': 'BeanBeanMouse-build' } });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const j = await r.json();
    items = Array.isArray(j.items) ? j.items : [];
  } catch (e) {
    console.log('  ↷ 跳过商品静态页：接口不可用（' + e.message + '）');
    return { count: 0, urls: [] };
  }
  const live = items.filter(p => p && p.status === 'on' && p.id);
  mkdirSync(path.join(dist, 'p'), { recursive: true });
  const urls = [];
  for (const p of live) {
    writeFile(path.join(dist, 'p', p.id + '.html'), productPageHtml(p), 'utf8');
    urls.push({ loc: SITE + '/p/' + p.id, lastmod: new Date(p.updated_at || p.updatedAt || Date.now()).toISOString().slice(0, 10), priority: '0.8' });
  }
  /* 追加商品页到 sitemap：**保留原有的页面条目**，只清掉上一次构建留下的 /p/ 条目（保证可重复构建），
   * 再追加本次的 /p/<id>。商品页原来一个都没有，等于放弃自然流量。 */
  const smPath = path.join(dist, 'sitemap.xml');
  const old = readFile(smPath, 'utf8');
  const today = new Date().toISOString().slice(0, 10);
  const body = old
    .replace(/<url>\s*<loc>[^<]*\/p\/[^<]*<\/loc>[\s\S]*?<\/url>\s*/g, '')
    .replace(/<\/urlset>\s*$/, '');
  const extra = urls.map(u => '  <url>\n    <loc>' + u.loc + '</loc>\n    <lastmod>' + u.lastmod + '</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>' + u.priority + '</priority>\n  </url>\n').join('');
  writeFile(smPath, body + extra + '</urlset>\n', 'utf8');
  console.log('  商品静态落地页：' + urls.length + ' 个（/p/<id>），sitemap 已更新（' + today + '）');
  return { count: urls.length, urls };
}

const landing = await buildProductLandingPages();

console.log('dist built:', dist, '| asset version:', stamp, '| product pages:', landing.count);
