/* 修复 Codex「Duplicate namespace name」死会话
 *
 * 背景：Codex Desktop 26.903.71938 / core 0.153.4 在单轮内两次调用 tool_search 时，
 * 会把同一批 MCP 命名空间重复写入 request input，API 直接拒绝，且错误写进会话历史后
 * 该会话后续每一轮都会失败（详见 codex-bug-report-duplicate-namespace.md）。
 *
 * 本脚本修复「已损坏的 rollout 会话」：把与内置命名空间或更早 tool_search_output 重复的
 * 声明去掉；若某个 tool_search_output 已无任何新命名空间，则连同它的 tool_search_call
 * 一起移除（避免出现没有输出的工具调用）。默认干跑（只报告），加 --apply 才写回并备份。
 *
 * 用法：
 *   node scripts/fix-duplicate-namespaces.mjs                      # 扫描默认目录，干跑
 *   node scripts/fix-duplicate-namespaces.mjs <rollout.jsonl...>   # 指定文件，干跑
 *   node scripts/fix-duplicate-namespaces.mjs --apply              # 扫描并写回（自动备份）
 *   node scripts/fix-duplicate-namespaces.mjs --apply <file>       # 指定文件写回
 *   --builtin=a,b   额外视为「App 已自带」的命名空间（默认 codex_app）
 */
import { readFileSync, writeFileSync, copyFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import path from 'node:path';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const syncProjection = args.includes('--sync-projection');
const builtinArg = args.find(a => a.startsWith('--builtin='));
const builtins = ['codex_app'].concat(builtinArg ? builtinArg.split('=')[1].split(',').map(s => s.trim()).filter(Boolean) : []);
const explicit = args.filter(a => !a.startsWith('--'));

function walk(dir, out = []) {
  if (!existsSync(dir)) return out;
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    let st;
    try { st = statSync(p); } catch (e) { continue; }
    if (st.isDirectory()) walk(p, out);
    else if (/^rollout-.*\.jsonl$/i.test(name)) out.push(p);
  }
  return out;
}

function analyze(file) {
  const raw = readFileSync(file, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  const lines = raw.split(/\r?\n/);
  const declared = new Set(builtins);
  const callLineByCallId = new Map();
  const edits = []; // { line, kind:'rewrite', tools } | { line, kind:'remove', reason }
  let duplicateOutputs = 0;
  let strippedNamespaces = 0;

  for (let i = 0; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    let obj;
    try { obj = JSON.parse(lines[i]); } catch (e) { continue; }
    const p = obj && obj.payload;
    if (!p) continue;
    if (p.type === 'tool_search_call' && p.call_id) callLineByCallId.set(String(p.call_id), i);
    if (p.type !== 'tool_search_output' || !Array.isArray(p.tools)) continue;

    const kept = [];
    const removed = [];
    for (const tool of p.tools) {
      const name = tool && tool.name;
      if (name && declared.has(name)) { removed.push(name); continue; }
      if (name) declared.add(name);
      kept.push(tool);
    }
    if (!removed.length) continue;

    duplicateOutputs += 1;
    strippedNamespaces += removed.length;
    if (kept.length === 0) {
      edits.push({ line: i, kind: 'remove', reason: 'duplicate-only output' });
      const callIdx = callLineByCallId.get(String(p.call_id));
      if (callIdx !== undefined) edits.push({ line: callIdx, kind: 'remove', reason: 'orphaned tool_search_call' });
    } else {
      edits.push({ line: i, kind: 'rewrite', tools: kept });
    }
  }

  return { file, lines, eol, edits, duplicateOutputs, strippedNamespaces };
}

function report(r) {
  if (!r.edits.length) {
    console.log('OK   ' + r.file);
    return false;
  }
  console.log('FIX  ' + r.file);
  console.log('     duplicate tool_search_output: ' + r.duplicateOutputs + ', stripped namespaces: ' + r.strippedNamespaces);
  const removed = r.edits.filter(e => e.kind === 'remove').length;
  const rewritten = r.edits.filter(e => e.kind === 'rewrite').length;
  console.log('     plan: drop ' + removed + ' item(s), rewrite ' + rewritten + ' item(s)');
  return true;
}

function applyFix(r) {
  const drop = new Set(r.edits.filter(e => e.kind === 'remove').map(e => e.line));
  const rewrite = new Map(r.edits.filter(e => e.kind === 'rewrite').map(e => [e.line, e.tools]));
  const out = [];
  for (let i = 0; i < r.lines.length; i++) {
    if (drop.has(i)) continue;
    if (rewrite.has(i)) {
      const obj = JSON.parse(r.lines[i]);
      obj.payload.tools = rewrite.get(i);
      out.push(JSON.stringify(obj));
    } else {
      out.push(r.lines[i]);
    }
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backup = r.file + '.bak-' + stamp;
  copyFileSync(r.file, backup);
  writeFileSync(r.file, out.join(r.eol), 'utf8');
  console.log('     applied, backup: ' + backup);
}

const codexHome = process.env.CODEX_HOME || path.join(os.homedir(), '.codex');
const files = explicit.length
  ? explicit
  : walk(path.join(codexHome, 'sessions')).concat(walk(path.join(codexHome, 'archived_sessions')));

let affected = 0;
for (const file of files) {
  let r;
  try { r = analyze(file); } catch (e) { console.log('SKIP ' + file + ' (' + e.message + ')'); continue; }
  const needsFix = report(r);
  if (needsFix) {
    affected += 1;
    if (apply) applyFix(r);
  }
}
console.log('---');
console.log('scanned ' + files.length + ' rollout file(s), ' + affected + ' need repair' + (apply ? ' (applied)' : ' (dry run; add --apply to write)'));

if (syncProjection) {
  const dbPath = path.join(codexHome, 'thread_history_1.sqlite');
  if (!existsSync(dbPath)) {
    console.log('projection sync skipped: ' + dbPath + ' not found');
  } else {
    const { DatabaseSync } = await import('node:sqlite');
    const db = new DatabaseSync(dbPath);
    for (const file of files) {
      const m = /([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.jsonl$/i.exec(file);
      if (!m) continue;
      const threadId = m[1];
      const row = db.prepare('SELECT * FROM thread_history_projection_state WHERE thread_id = ?').get(threadId);
      if (!row) continue;
      const size = statSync(file).size;
      /* ordinal 是稳定序号（已消费项不回退），只对齐字节偏移 */
      if (row.next_rollout_byte_offset === size) {
        console.log('projection OK  ' + threadId);
        continue;
      }
      if (!apply) {
        console.log('projection FIX (dry) ' + threadId + ': offset ' + row.next_rollout_byte_offset + ' -> ' + size + ' (ordinal ' + row.next_rollout_ordinal + ' kept)');
        continue;
      }
      db.prepare('UPDATE thread_history_projection_state SET next_rollout_byte_offset = ? WHERE thread_id = ?')
        .run(size, threadId);
      console.log('projection synced ' + threadId + ': offset ' + row.next_rollout_byte_offset + ' -> ' + size + ' (ordinal ' + row.next_rollout_ordinal + ' kept)');
    }
  }
}
