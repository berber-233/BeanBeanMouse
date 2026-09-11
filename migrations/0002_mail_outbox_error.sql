-- 记录邮件发送失败原因（原先只记 status，排障时看不到具体错误码）
ALTER TABLE mail_outbox ADD COLUMN error TEXT;
