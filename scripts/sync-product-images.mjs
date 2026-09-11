// 扫描 assets/products/<商品id>/ 下图片并生成 product-image-map.js
// 用法：node scripts/sync-product-images.mjs
import { readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'assets', 'products');
const out = path.join(root, 'product-image-map.js');
const EXT = /\.(png|jpe?g|webp)$/i;
const map = {};

if (existsSync(dir)) {
  for (const id of readdirSync(dir)) {
    const sub = path.join(dir, id);
    if (!existsSync(sub) || !readdirSync(sub).some(f => EXT.test(f))) continue;
    const files = readdirSync(sub)
      .filter(f => EXT.test(f))
      .sort()
      .map(f => 'assets/products/' + id + '/' + f);
    if (files.length) map[id] = files;
  }
}

const body = '/* 演示/种子商品图映射：由 scripts/sync-product-images.mjs 自动生成 */\n'
  + 'window.__PRODUCT_IMAGE_MAP__ = ' + JSON.stringify(map, null, 2) + ';\n';
writeFileSync(out, body, 'utf8');
console.log('product-image-map.js updated:', Object.keys(map).length, 'products');
