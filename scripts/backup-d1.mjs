#!/usr/bin/env node
/**
 * D1 数据库备份（2026-10-06）
 *
 *   node scripts\backup-d1.mjs                 # 导出到 backups/d1-<日期>.sql
 *   node scripts\backup-d1.mjs --keep 30       # 顺带清理 30 天前的备份（默认保留 14 天）
 *
 * 备份文件含客户邮箱等个人信息，**只留本地**：backups/ 已在 .gitignore 里，不会进仓库。
 * 建议每周跑一次（Windows 任务计划 / 手动都行）。恢复方式见 docs/ops-runbook.md。
 */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDir = path.join(root, 'backups');
const DB = process.env.BBM_D1_NAME || 'beanbeanmouse-db';
const WRANGLER = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const keepArg = process.argv.indexOf('--keep');
const keepDays = keepArg > -1 ? Number(process.argv[keepArg + 1]) || 14 : 14;

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
/* 用本地日期命名（toISOString 是 UTC，晚上跑会差一天） */
const stamp = new Date().toLocaleDateString('sv-SE');
const out = path.join(outDir, 'd1-' + stamp + '.sql');

console.log('导出 D1「' + DB + '」→ ' + out);
execFileSync(process.execPath, [WRANGLER, 'd1', 'export', DB, '--remote', '--output', out], { stdio: 'inherit' });
const size = statSync(out).size;
console.log('完成：' + (size / 1024 / 1024).toFixed(2) + ' MB');

/* 清理旧备份：严格限制在 backups/ 目录内，只删 d1-YYYY-MM-DD.sql 命名的文件 */
const cutoff = Date.now() - keepDays * 86400000;
let removed = 0;
for (const f of readdirSync(outDir)) {
  if (!/^d1-\d{4}-\d{2}-\d{2}\.sql$/.test(f)) continue;
  const full = path.join(outDir, f);
  if (path.dirname(full) !== outDir) continue;       /* 双保险：路径必须在 backups/ 里 */
  if (statSync(full).mtimeMs < cutoff) { unlinkSync(full); removed++; console.log('清理旧备份 ' + f); }
}
console.log('保留最近 ' + keepDays + ' 天，本次清理 ' + removed + ' 个旧文件');
