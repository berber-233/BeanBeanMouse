#!/usr/bin/env node
/**
 * 品牌资产生成（2026-10-06）
 *
 *   node scripts\build-brand-assets.mjs
 *
 * 产出：
 *   assets/brand/*.svg        可直接使用的矢量标（图形标/极简标/印章/横竖组合/单色/品牌图案）
 *   assets/brand/png/*.png    常用位图尺寸（favicon、社媒头像、横版、预览拼版）
 *
 * 设计要点（与 docs/design-guide.md 一致）：
 *   · 主色 ≤2 + 点缀 ≤2；只用站内色板
 *   · 线条统一 7px（256 画布）圆头圆角，无折角硬边
 *   · 记忆点 = 颊囊里塞着一只小货箱：仓鼠把货"装进嘴里运走"，正好是外贸的场景
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'assets', 'brand');
const pngDir = path.join(outDir, 'png');
/* 验收拼版放 docs（不部署），只把真正要用的图放进 assets */
const docDir = path.join(root, 'docs', 'brand');
mkdirSync(pngDir, { recursive: true });
mkdirSync(docDir, { recursive: true });

/* ---------- 色板（唯一来源：docs/design-guide.md） ---------- */
const C = {
  ink: '#26304A',     // 深蓝黑：线条/文字
  blue: '#1D4ED8',    // 主蓝：点缀（围巾/包装带）
  gold: '#F59E0B',    // 强调金：小货箱
  cream: '#FFF6E8',   // 奶油白：口鼻/浅底
  tan: '#F7D9A8',     // 浅黄棕：毛色
  pink: '#FFB9C4',    // 粉：内耳/腮红
  bg: '#FFFDF8'       // 页面底
};
const S = 7;          // 统一描边

/* ---------- 图形标（主）：颊囊 + 小货箱 ---------- */
function markBody({ simple = false } = {}) {
  return `
    <g>
      <circle cx="76" cy="70" r="32" fill="${C.tan}" stroke="${C.ink}" stroke-width="${S}"/>
      <circle cx="180" cy="70" r="32" fill="${C.tan}" stroke="${C.ink}" stroke-width="${S}"/>
      <circle cx="76" cy="70" r="15" fill="${C.pink}"/>
      <circle cx="180" cy="70" r="15" fill="${C.pink}"/>
      <ellipse cx="128" cy="140" rx="88" ry="82" fill="${C.tan}" stroke="${C.ink}" stroke-width="${S}"/>
      <path d="M62 206 q66 34 132 0" fill="none" stroke="${C.blue}" stroke-width="14" stroke-linecap="round"/>
      <ellipse cx="128" cy="166" rx="40" ry="30" fill="${C.cream}"/>
      <ellipse cx="128" cy="150" rx="9" ry="7" fill="#FF9E9E"/>
      <path d="M128 158 v9" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M128 167 q-13 12 -24 0" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <path d="M128 167 q13 12 24 0" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round"/>
      <circle cx="98" cy="128" r="11" fill="${C.ink}"/>
      <circle cx="94" cy="124" r="4" fill="#FFFFFF"/>
      <circle cx="158" cy="128" r="11" fill="${C.ink}"/>
      <circle cx="154" cy="124" r="4" fill="#FFFFFF"/>
      ${simple ? '' : `
      <ellipse cx="74" cy="152" rx="13" ry="8" fill="${C.pink}" opacity=".85"/>
      <ellipse cx="182" cy="152" rx="13" ry="8" fill="${C.pink}" opacity=".85"/>`}
      <g transform="rotate(-12 196 176)">
        <rect x="180" y="160" width="32" height="32" rx="6" fill="${C.gold}" stroke="${C.ink}" stroke-width="5"/>
        <path d="M180 176 h32" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
        <path d="M196 160 v32" stroke="${C.ink}" stroke-width="4" stroke-linecap="round"/>
      </g>
    </g>`;
}

/* 图形标（圆形徽章底）：favicon / 头像 / 页头 都能用 */
function markSvg({ simple = false, badge = true } = {}) {
  const inner = markBody({ simple: simple });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="BeanBeanMouse 豆豆鼠">
  ${badge ? `<circle cx="128" cy="128" r="124" fill="${C.cream}" stroke="${C.ink}" stroke-width="6"/>` : ''}
  <g transform="translate(128 128) scale(0.86) translate(-128 -128)">${inner}</g>
</svg>\n`;
}

/* 极简单色版：只保留可辨认特征（耳朵 + 头 + 眼 + 货箱） */
function markMonoSvg(color) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="BeanBeanMouse">
  <circle cx="128" cy="128" r="124" fill="none" stroke="${color}" stroke-width="8"/>
  <circle cx="76" cy="70" r="32" fill="none" stroke="${color}" stroke-width="${S}"/>
  <circle cx="180" cy="70" r="32" fill="none" stroke="${color}" stroke-width="${S}"/>
  <ellipse cx="128" cy="140" rx="88" ry="82" fill="none" stroke="${color}" stroke-width="${S}"/>
  <circle cx="98" cy="128" r="11" fill="${color}"/>
  <circle cx="158" cy="128" r="11" fill="${color}"/>
  <g transform="rotate(-12 196 176)">
    <rect x="180" y="160" width="32" height="32" rx="6" fill="none" stroke="${color}" stroke-width="6"/>
    <path d="M180 176 h32M196 160 v32" stroke="${color}" stroke-width="5" stroke-linecap="round"/>
  </g>
</svg>\n`;
}

/* 印章版：外圈文字 + 内嵌图形标，用于单据/包装的"盖章感" */
function badgeSvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256" role="img" aria-label="BeanBeanMouse seal">
  <defs>
    <path id="ring" d="M128,128 m-100,0 a100,100 0 1,1 200,0 a100,100 0 1,1 -200,0"/>
  </defs>
  <circle cx="128" cy="128" r="124" fill="${C.ink}"/>
  <circle cx="128" cy="128" r="112" fill="none" stroke="${C.gold}" stroke-width="3"/>
  <circle cx="128" cy="128" r="86" fill="${C.cream}"/>
  <g transform="translate(128 132) scale(0.6) translate(-128 -132)">${markBody({ simple: true })}</g>
  <text fill="${C.gold}" font-family="Segoe UI, system-ui, sans-serif" font-size="19" font-weight="700" letter-spacing="3.2">
    <textPath href="#ring" startOffset="7%">BEANBEANMOUSE</textPath>
  </text>
  <text fill="${C.cream}" font-family="Segoe UI, system-ui, sans-serif" font-size="12.5" letter-spacing="2.4" opacity=".92">
    <textPath href="#ring" startOffset="55%">PET SUPPLIES · DIRECT EXPORT</textPath>
  </text>
</svg>\n`;
}

/* 组合标：图形 + 字标（横版 / 竖版） */
function lockupSvg(vertical = false) {
  const mark = `<g>${markBody({ simple: false })}</g>`;
  const word = (x, y, size) => `
    <text x="${x}" y="${y}" fill="${C.ink}" font-family="Segoe UI, system-ui, -apple-system, sans-serif" font-size="${size}" font-weight="800" letter-spacing="-0.5">BeanBean<tspan fill="${C.gold}">Mouse</tspan></text>`;
  if (vertical) {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 560" width="420" height="560" role="img" aria-label="BeanBeanMouse 豆豆鼠">
  <rect width="420" height="560" fill="${C.bg}"/>
  <g transform="translate(14 34) scale(1.5)">${mark}</g>
  ${word(210, 470, 52).replace('x="210"', 'x="210" text-anchor="middle"').replace('y="470"', 'y="452"')}
  <text x="210" y="492" text-anchor="middle" fill="${C.ink}" font-family="Segoe UI, system-ui, sans-serif" font-size="20" letter-spacing="4">豆豆鼠 · 宠物用品自营出口</text>
  <path d="M126 514 h168" stroke="${C.gold}" stroke-width="3" stroke-linecap="round"/>
</svg>\n`;
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 760 220" width="760" height="220" role="img" aria-label="BeanBeanMouse 豆豆鼠">
  <rect width="760" height="220" fill="${C.bg}"/>
  <g transform="translate(6 22) scale(0.72)">${mark}</g>
  <text x="212" y="106" fill="${C.ink}" font-family="Segoe UI, system-ui, -apple-system, sans-serif" font-size="58" font-weight="800" letter-spacing="-1">BeanBean<tspan fill="${C.gold}">Mouse</tspan></text>
  <text x="215" y="142" fill="${C.ink}" font-family="Segoe UI, system-ui, sans-serif" font-size="19" letter-spacing="5" opacity=".85">豆豆鼠 · 宠物用品自营出口</text>
  <path d="M215 164 h300" stroke="${C.gold}" stroke-width="3" stroke-linecap="round"/>
  <text x="215" y="190" fill="${C.ink}" font-family="Segoe UI, system-ui, sans-serif" font-size="14" letter-spacing="3" opacity=".6">PET SUPPLIES · DIRECT EXPORT</text>
</svg>\n`;
}

/* 品牌图案：可无缝平铺（豆 / 爪印 / 货箱 / 颊囊弧） */
function patternSvg() {
  const bean = (x, y, r) => `<g transform="rotate(-24 ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="${r * 1.5}" ry="${r}" fill="${C.gold}" opacity=".9"/><path d="M${x - r} ${y - r * .35} q${r} ${-r * .5} ${r * 2} 0" stroke="#FFFFFF" stroke-width="${r * .34}" fill="none" opacity=".55" stroke-linecap="round"/></g>`;
  const paw = (x, y) => `<g fill="${C.ink}" opacity=".55"><circle cx="${x - 8}" cy="${y - 7}" r="5"/><circle cx="${x}" cy="${y - 10}" r="5"/><circle cx="${x + 8}" cy="${y - 7}" r="5"/><ellipse cx="${x}" cy="${y + 6}" rx="10" ry="8"/></g>`;
  const crate = (x, y) => `<g transform="rotate(10 ${x} ${y})" opacity=".85"><rect x="${x - 11}" y="${y - 11}" width="22" height="22" rx="4" fill="none" stroke="${C.blue}" stroke-width="3.4"/><path d="M${x - 11} ${y} h22M${x} ${y - 11} v22" stroke="${C.blue}" stroke-width="2.6"/></g>`;
  const arc = (x, y) => `<path d="M${x - 16} ${y} q16 12 32 0" fill="none" stroke="${C.pink}" stroke-width="4.5" stroke-linecap="round" opacity=".95"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 176 176" width="176" height="176" role="img" aria-label="BeanBeanMouse pattern">
  <rect width="176" height="176" fill="${C.cream}"/>
  ${bean(44, 40, 11)}
  ${paw(132, 52)}
  ${crate(96, 118)}
  ${arc(34, 128)}
  ${bean(140, 148, 9)}
  ${paw(52, 92)}
</svg>\n`;
}

/* ---------- 写文件 ---------- */
const files = {
  'mark.svg': markSvg({ simple: false, badge: true }),
  'mark-simple.svg': markSvg({ simple: true, badge: true }),
  'mark-nobadge.svg': markSvg({ simple: false, badge: false }),
  'mark-mono-ink.svg': markMonoSvg(C.ink),
  'mark-mono-cream.svg': markMonoSvg(C.cream),
  'badge-seal.svg': badgeSvg(),
  'lockup-horizontal.svg': lockupSvg(false),
  'lockup-vertical.svg': lockupSvg(true),
  'pattern.svg': patternSvg()
};
for (const [name, svg] of Object.entries(files)) writeFileSync(path.join(outDir, name), svg, 'utf8');
console.log('写出 SVG：' + Object.keys(files).join('、'));

/* ---------- 渲染 PNG（Chrome 截图，透明底保留 alpha） ---------- */
const CHROME = [process.env.PLAYWRIGHT_EXECUTABLE, 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe']
  .filter(Boolean).find(p => { try { return existsSync(p); } catch (e) { return false; } });

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
/* deviceScaleFactor 用 1：导出文件名标的就是实际像素尺寸（favicon 32 就是 32×32） */
const page = await browser.newPage({ viewport: { width: 900, height: 900 }, deviceScaleFactor: 1 });

async function render(svgFile, pngName, w, h, transparent = true) {
  const svg = readFileSyncSafe(path.join(outDir, svgFile));
  await page.setViewportSize({ width: w, height: h });
  /* SVG 自带固定 width/height，直接截图会按原始尺寸输出；
   * 这里用一个精确尺寸的容器把 SVG 拉到目标大小，保证导出像素数正确。 */
  await page.setContent(`<!doctype html><body style="margin:0;background:${transparent ? 'transparent' : '#FFFDF8'}">
    <div id="box" style="width:${w}px;height:${h}px;overflow:hidden">${svg.replace('<svg', '<svg style="width:100%;height:100%;display:block"')}</div></body>`);
  const el = await page.$('svg');
  await el.screenshot({ path: path.join(pngDir, pngName), omitBackground: transparent });
  console.log('  渲染 ' + pngName + '（' + w + '×' + h + '）');
}

await render('mark.svg', 'avatar-512.png', 512, 512);
await render('mark.svg', 'avatar-256.png', 256, 256);
await render('mark-simple.svg', 'favicon-180.png', 180, 180);
await render('mark-simple.svg', 'favicon-64.png', 64, 64);
await render('mark-simple.svg', 'favicon-32.png', 32, 32);
await render('badge-seal.svg', 'seal-512.png', 512, 512, false);
await render('lockup-horizontal.svg', 'lockup-horizontal-1200.png', 1200, 347, false);
await render('lockup-vertical.svg', 'lockup-vertical-840.png', 840, 1120, false);
await render('pattern.svg', 'pattern-tile-352.png', 352, 352, false);

/* 预览拼版：一张图看全（给用户验收用） */
await page.setViewportSize({ width: 1240, height: 1020 });
await page.setContent(`<!doctype html><body style="margin:0;background:#FFFDF8;font:14px 'Segoe UI',system-ui,sans-serif;color:#26304A">
  <div style="padding:22px 26px">
    <div style="font-size:18px;font-weight:800;margin-bottom:14px">BeanBeanMouse 品牌资产总览</div>
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:16px">
      ${['mark.svg', 'mark-simple.svg', 'mark-mono-ink.svg', 'badge-seal.svg'].map(f => `
      <div style="border:1px solid #EFE3CB;border-radius:14px;padding:14px;text-align:center;background:#fff">
        <div style="height:150px;display:flex;align-items:center;justify-content:center">${readFileSyncSafe(path.join(outDir, f))}</div>
        <div style="margin-top:8px;font-size:12px;color:#7A6A55">${f}</div>
      </div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:2.2fr 1fr;gap:16px;margin-top:16px">
      <div style="border:1px solid #EFE3CB;border-radius:14px;padding:10px;background:#fff">${readFileSyncSafe(path.join(outDir, 'lockup-horizontal.svg'))}</div>
      <div style="border:1px solid #EFE3CB;border-radius:14px;padding:10px;background:#fff;display:flex;align-items:center;justify-content:center">${readFileSyncSafe(path.join(outDir, 'lockup-vertical.svg'))}</div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
      <div style="border:1px solid #EFE3CB;border-radius:14px;padding:10px;background:#fff">${readFileSyncSafe(path.join(outDir, 'pattern.svg'))}</div>
      <div style="border:1px solid #EFE3CB;border-radius:14px;padding:10px;background:#26304A;display:flex;align-items:center;justify-content:center;gap:22px">
        <div style="width:90px">${readFileSyncSafe(path.join(outDir, 'mark-mono-cream.svg'))}</div>
        <div style="width:90px">${readFileSyncSafe(path.join(outDir, 'mark.svg'))}</div>
        <div style="color:#FFF6E8;font-size:12px;line-height:1.7">深底用法<br>单色反白 + 彩色标</div>
      </div>
    </div>
  </div></body>`);
await page.screenshot({ path: path.join(docDir, 'brand-overview.png'), fullPage: true });
console.log('  渲染 docs/brand/brand-overview.png（总览拼版，不部署）');

await browser.close();
console.log('完成：SVG → ' + outDir + '，PNG → ' + pngDir);

function readFileSyncSafe(p) { return readFileSync(p, 'utf8'); }
