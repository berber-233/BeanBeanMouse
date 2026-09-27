/* 扫描仓库里被 Git 跟踪的文件，看有没有密钥/口令类内容被推上去。 */
import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const PATTERNS = [
  ['Cloudflare API Token', /\bcfut_[A-Za-z0-9_-]{20,}/],
  ['Cloudflare Global Key', /\b[0-9a-f]{37}\b/],
  ['通用赋值式密钥', /(api[_-]?key|apikey|secret|token|passwd|password)\s*[:=]\s*["'][^"'\s]{16,}["']/i],
  ['阿里云 AccessKey', /\bLTAI[0-9A-Za-z]{10,}\b/],
  ['AWS AccessKey', /\bAKIA[0-9A-Z]{12,}\b/],
  ['OpenAI 风格密钥', /\bsk-[A-Za-z0-9]{20,}\b/],
  ['GitHub Token', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['Google API Key', /\bAIza[0-9A-Za-z_-]{30,}\b/],
  ['私钥文件内容', /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ['SMTP 用户名', /smtp[_ -]?user\s*[:=]\s*["']?[^\s"']{4,}/i]
];

const files = execSync('git ls-files', { cwd: process.cwd(), encoding: 'utf8' }).split('\n').filter(Boolean);
const hits = [];
for (const f of files) {
  let text = '';
  try { text = readFileSync(f, 'utf8'); } catch (e) { continue; }
  if (text.indexOf('\u0000') >= 0) continue;   // 二进制
  const lines = text.split('\n');
  for (const [name, re] of PATTERNS) {
    lines.forEach((line, i) => {
      if (re.test(line)) hits.push({ file: f, line: i + 1, type: name, text: line.trim().slice(0, 120) });
    });
  }
}

/* 历史里出现过的敏感文件名（即使后来删了，历史仍可能留着） */
const historyFiles = execSync('git log --all --name-only --pretty=format:', { cwd: process.cwd(), encoding: 'utf8' })
  .split('\n').filter(Boolean);
const susHistory = [...new Set(historyFiles)].filter(f => /(^|\/)\.env(\.|$)|secret|credential|\.pem$|\.pfx$|id_rsa|\.cf-turn/.test(f));

console.log('tracked files:', files.length);
console.log('history files:', new Set(historyFiles).size);
console.log('--- 内容命中 ---');
if (!hits.length) console.log('（无）');
for (const h of hits) console.log(`${h.type} | ${h.file}:${h.line} | ${h.text}`);
console.log('--- 历史敏感文件名 ---');
if (!susHistory.length) console.log('（无）');
for (const f of susHistory) console.log(f);
