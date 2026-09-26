-- 一个邮箱一个号：users.email 原来的 UNIQUE 区分大小写（A@x.com 与 a@x.com 算两个号），
-- 会造成"同一个邮箱两个账号 → 登录时随机进另一个号"。这里按小写邮箱建唯一索引兜底。
CREATE UNIQUE INDEX IF NOT EXISTS uniq_users_email_lower ON users (lower(email));
