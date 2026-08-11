/* 邮件抽象：默认 mock 落库（mail_outbox）；生产接 SMTP/邮件服务时实现对应 transport */
import { randomUUID } from 'node:crypto';
import { run } from './db.mjs';
import { sendSmtp } from './smtp.mjs';

export async function sendMail({ to, subject, body }) {
  const transport = process.env.MAIL_TRANSPORT || 'mock';
  let status = 'sent';
  let detail = null;
  if (transport === 'smtp') {
    const host = process.env.SMTP_HOST;
    if (!host) {
      status = 'failed';
      detail = 'SMTP_HOST 未配置';
    } else {
      try {
        await sendSmtp({
          host,
          port: Number(process.env.SMTP_PORT || 587),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          secure: process.env.SMTP_SECURE === '1',
          from: process.env.MAIL_FROM || 'no-reply@beanbeandragon.local',
          to,
          subject,
          body
        });
      } catch (e) {
        status = 'failed';
        detail = e.message;
      }
    }
  }
  const id = randomUUID();
  run(
    'INSERT INTO mail_outbox (id, recipient, subject, body, status, sent_at, created_at) VALUES (?,?,?,?,?,?,?)',
    id, to, subject || '', body || '', status, Date.now(), Date.now()
  );
  console.log('[mail:' + transport + '] to=' + to + ' subject=' + subject + ' status=' + status + (detail ? ' (' + detail + ')' : ''));
  if (status === 'failed') throw new Error('MAIL_FAILED: ' + detail);
  return { ok: true, id, transport, status };
}

export async function notifyUser(userId, type, title, body) {
  run(
    'INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?,?,?,?,?,?)',
    randomUUID(), userId, type, title, body, Date.now()
  );
}
