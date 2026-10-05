#!/usr/bin/env node
/**
 * 批量上传真实商品图（2026-10-06）
 *
 * 目录约定：把照片放进 incoming/<商品ID 或 货号>/ 里，文件名按 1、2、3 排序当顺序：
 *
 *   incoming/BBM-HAM-0006/1.jpg       ← 主图
 *   incoming/BBM-HAM-0006/2.jpg
 *   incoming/p25/1.jpg                ← 也支持直接用商品 id
 *
 * 用法：
 *   $env:BBM_EMAIL='admin@beanbeanmouse.com'; $env:BBM_PW='***'
 *   node scripts\upload-product-images.mjs --dry         # 只看会传什么
 *   node scripts\upload-product-images.mjs               # 真上传并挂到商品
 *   node scripts\upload-product-images.mjs --replace     # 先清空该商品已有图再挂
 *
 * 说明：文件先走 POST /api/files 存对象存储，再用 POST /api/products/<id>/images 挂到商品。
 * 支持 jpg/png/webp/gif；HEIC 请先转成 jpg（iPhone 相册导出选"兼容格式"）。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const INBOX = process.env.BBM_INBOX || path.join(root, 'incoming');
const BASE = (process.env.BBM_ORIGIN || 'https://beanbeanmouse.com').replace(/\/+$/, '');
const EMAIL = process.env.BBM_EMAIL;
const PW = process.env.BBM_PW;
const DRY = process.argv.includes('--dry');
const REPLACE = process.argv.includes('--replace');
const ALLOWED = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif' };

async function api(pathname, { method = 'GET', token, body, raw } = {}) {
  const headers = {};
  if (token) headers.Authorization = 'Bearer ' + token;
  if (body && !raw) headers['Content-Type'] = 'application/json';
  const res = await fetch(BASE + pathname, {
    method,
    headers,
    body: raw ? raw : (body ? JSON.stringify(body) : undefined)
  });
  const text = await res.text();
  let json = null;
  try { json = text ? JSON.parse(text) : null; } catch (e) { /* 忽略 */ }
  if (!res.ok) throw new Error((json && json.message) || ('HTTP ' + res.status));
  return json;
}

(async () => {
  if (!EMAIL || !PW) { console.error('缺少 BBM_EMAIL / BBM_PW 环境变量（不给密码也可用 BBM_TOKEN）'); process.exit(1); }
  if (!exists(INBOX)) {
    console.log('没有待上传目录：' + INBOX);
    console.log('建好目录、按 <货号>/<序号>.jpg 放照片后再跑一次。');
    process.exit(0);
  }

  const login = await api('/api/auth/login', { method: 'POST', body: { email: EMAIL, password: PW } });
  const token = login && login.token;
  if (!token) throw new Error('登录失败：没有拿到 token');

  const list = await api('/api/products?status=all&size=200', { token });
  const items = (list && list.items) || [];
  const byKey = new Map();
  for (const p of items) {
    byKey.set(String(p.id), p);
    if (p.code) byKey.set(String(p.code).toUpperCase(), p);
  }

  const folders = readdirSync(INBOX).filter(f => { try { return statSync(path.join(INBOX, f)).isDirectory(); } catch (e) { return false; } });
  if (!folders.length) { console.log('待上传目录里没有子文件夹（应按 <货号>/ 分目录）'); process.exit(0); }

  let uploaded = 0, attached = 0, skipped = 0;
  for (const folder of folders) {
    const p = byKey.get(folder) || byKey.get(folder.toUpperCase());
    if (!p) { console.log('跳过 ' + folder + '：没找到对应商品（可用商品 id 或货号命名文件夹）'); skipped++; continue; }
    const dir = path.join(INBOX, folder);
    const files = readdirSync(dir)
      .filter(f => ALLOWED.includes(path.extname(f).toLowerCase()))
      .sort((a, b) => a.localeCompare(b, 'zh', { numeric: true }));
    if (!files.length) { console.log('跳过 ' + folder + '：目录里没有图片'); skipped++; continue; }
    console.log('== ' + folder + ' → ' + p.id + '（' + (p.code || '无货号') + '）共 ' + files.length + ' 张');

    if (DRY) { files.forEach(f => console.log('   [dry] 会传 ' + f)); continue; }

    if (REPLACE && Array.isArray(p.images) && p.images.length) {
      for (const img of p.images) {
        await api('/api/products/' + encodeURIComponent(p.id) + '/images/' + encodeURIComponent(img.id), { method: 'DELETE', token });
        console.log('   已移除旧图 ' + img.id);
      }
    }

    const fileIds = [];
    for (const f of files) {
      const full = path.join(dir, f);
      const buf = readFileSync(full);
      const fd = new FormData();
      fd.append('file', new Blob([buf], { type: MIME[path.extname(f).toLowerCase()] }), f);
      const res = await fetch(BASE + '/api/files', { method: 'POST', headers: { Authorization: 'Bearer ' + token }, body: fd });
      const j = await res.json().catch(() => null);
      if (!res.ok || !j || !j.id) throw new Error('上传 ' + f + ' 失败：' + ((j && j.message) || res.status));
      fileIds.push(j.id);
      uploaded++;
      console.log('   已上传 ' + f + ' → ' + j.id);
    }
    await api('/api/products/' + encodeURIComponent(p.id) + '/images', { method: 'POST', token, body: { fileIds } });
    attached += fileIds.length;
    console.log('   已挂到商品：' + fileIds.length + ' 张');
  }

  console.log('\n完成：上传 ' + uploaded + ' 张，挂接 ' + attached + ' 张，跳过 ' + skipped + ' 个目录' + (DRY ? '（dry 模式，没有真的上传）' : ''));
})();

function exists(p) { try { return statSync(p).isDirectory(); } catch (e) { return false; } }
