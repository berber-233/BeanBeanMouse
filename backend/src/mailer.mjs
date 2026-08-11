/* 邮件抽象：默认 mock 落库（mail_outbox）；生产接 SMTP/邮件服务时实现对应 transport */
import { randomUUID } from 'node:crypto';
import { run } from './db.mjs';

export async function sendMail({ to, subject, body }) {
  const transport = process.env.MAIL_TRANSPORT || 'mock';
  if (transport === 'smtp') {
    // 生产：接入 nodemailer 或 SES/邮件推送服务（需要凭据），此处仅落库
  }
  const id = randomUUID();
  run(
    'INSERT INTO mail_outbox (id, recipient, subject, body, status, sent_at, created_at) VALUES (?,?,?,?,?,?,?)',
    id, to, subject || '', body || '', 'sent', Date.now(), Date.now()
  );
  console.log('[mail:' + transport + '] to=' + to + ' subject=' + subject);
  return { ok: true, id, transport };
}

export async function notifyUser(userId, type, title, body) {
  run(
    'INSERT INTO notifications (id, user_id, type, title, body, created_at) VALUES (?,?,?,?,?,?)',
    randomUUID(), userId, type, title, body, Date.now()
  );
}
