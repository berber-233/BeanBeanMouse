-- 注册来源与邮箱初筛：无法开通邮件服务时，管理员靠这些信息判断"这条注册像不像机器人"。
-- signup_ip / signup_ua 记录注册当时的来源；email_flag 标记邮箱类型（free / corporate / disposable）。
ALTER TABLE users ADD COLUMN signup_ip TEXT;
ALTER TABLE users ADD COLUMN signup_ua TEXT;
ALTER TABLE users ADD COLUMN email_flag TEXT;
