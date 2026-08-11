/* SMTP 真实通道测试：本地假 SMTP 服务器验证客户端协议与 mail_outbox 落库 */
process.env.DB_PATH = ':memory:';
process.env.MAIL_TRANSPORT = 'smtp';
process.env.SMTP_HOST = '127.0.0.1';
process.env.SMTP_USER = 'smtp-user';
process.env.SMTP_PASS = 'smtp-pass';
process.env.MAIL_FROM = 'no-reply@beanbeandragon.local';

import { createServer } from 'node:net';
const { sendMail } = await import('../src/mailer.mjs');
const { all } = await import('../src/db.mjs');

const results = [];
const check = (name, ok) => results.push([name, !!ok]);

/* 本地假 SMTP 服务器：记录指令流，多行 EHLO 响应 */
const lines = [];
const smtpServer = createServer(sock => {
  const respond = s => sock.write(s + '\r\n');
  respond('220 localhost ESMTP');
  let buffer = '';
  let inData = false;
  sock.on('data', chunk => {
    buffer += chunk.toString('utf8');
    while (buffer.includes('\r\n')) {
      const idx = buffer.indexOf('\r\n');
      const line = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      lines.push(line);
      if (inData) {
        if (line === '.') { inData = false; respond('250 queued'); }
        continue;
      }
      const cmd = line.split(' ')[0].toUpperCase();
      if (cmd === 'EHLO') respond('250-localhost\r\n250 AUTH PLAIN');
      else if (cmd === 'AUTH') respond('235 ok');
      else if (cmd === 'MAIL' || cmd === 'RCPT') respond('250 ok');
      else if (cmd === 'DATA') { inData = true; respond('354 go'); }
      else if (cmd === 'QUIT') { respond('221 bye'); sock.end(); }
      else respond('250 ok');
    }
  });
});
await new Promise(r => smtpServer.listen(0, '127.0.0.1', r));
process.env.SMTP_PORT = String(smtpServer.address().port);

const res = await sendMail({ to: 'buyer@demo.com', subject: 'Test Mail', body: 'Hello body' });
const outbox = all('SELECT * FROM mail_outbox');

check('sendMail via smtp ok', res.ok === true && res.status === 'sent' && res.transport === 'smtp');
check('outbox row sent', outbox.length === 1 && outbox[0].status === 'sent' && outbox[0].recipient === 'buyer@demo.com');
check('smtp MAIL FROM sent', lines.some(l => l.toUpperCase() === 'MAIL FROM:<NO-REPLY@BEANBEANDRAGON.LOCAL>'));
check('smtp RCPT TO sent', lines.some(l => l.toUpperCase() === 'RCPT TO:<BUYER@DEMO.COM>'));
check('smtp AUTH PLAIN sent', lines.some(l => l.startsWith('AUTH PLAIN ')));
check('smtp DATA has subject + body', lines.includes('Subject: Test Mail') && lines.includes('Hello body'));

/* SMTP_HOST 缺失 → 落库 failed 并抛错 */
delete process.env.SMTP_HOST;
let threw = false;
try { await sendMail({ to: 'x@demo.com', subject: 'S', body: 'B' }); } catch (e) { threw = e.message.startsWith('MAIL_FAILED'); }
const failedRow = all('SELECT * FROM mail_outbox WHERE recipient = ?', 'x@demo.com');
check('smtp missing host -> failed outbox + throw', threw && failedRow.length === 1 && failedRow[0].status === 'failed');

smtpServer.close();
console.log(results.map(([n, ok]) => (ok ? 'PASS' : 'FAIL') + ' | ' + n).join('\n'));
const failed = results.filter(([, ok]) => !ok).length;
console.log(failed === 0 ? 'ALL SMTP TESTS PASSED' : failed + ' CHECKS FAILED');
process.exit(failed === 0 ? 0 : 1);
