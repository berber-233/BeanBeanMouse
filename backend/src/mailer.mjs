/* 邮件抽象：默认 mock 落库（mail_outbox 表）。
 * 需要真实发信时由平台入口注入 transport：
 *   Node    → smtp.mjs（TCP/TLS 直连 SMTP，见 server.mjs）
 *   Workers → 换成 HTTP 邮件服务（Resend / MailChannels 等），当前留待凭据到位
 * 这样 Workers 的模块图里不会出现 node:net / node:tls。
 */
import { randomUUID } from './platform.mjs';
import { run } from './store.mjs';

let transport = null;
let transportName = 'mock';

export function configureMailer({ custom, name } = {}) {
  if (custom) transport = custom;
  if (name) transportName = name;
}

export function mailerInfo() {
  return { transport: transportName, ready: !!(transport || transportName === 'mock') };
}

export async function sendMail({ to, subject, body, html }) {
  let status = 'sent';
  let detail = null;

  if (transport) {
    try {
      await transport({ to, subject, body, html });
    } catch (e) {
      status = 'failed';
      detail = e.message;
    }
  }

  const id = randomUUID();
  await run(
    'INSERT INTO mail_outbox (id, recipient, subject, body, status, error, sent_at, created_at) VALUES (?,?,?,?,?,?,?,?)',
    id, to, subject || '', body || '', status, detail, Date.now(), Date.now()
  );
  console.log('[mail:' + transportName + '] to=' + to + ' subject=' + subject + ' status=' + status + (detail ? ' (' + detail + ')' : ''));
  if (status === 'failed') throw new Error('MAIL_FAILED: ' + detail);
  return { ok: true, id, transport: transportName, status };
}

export async function notifyUser(userId, type, title, body) {
  await run(
    'INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?,?,?,?,?,?)',
    randomUUID(), userId, type, title, body, Date.now()
  );
}
