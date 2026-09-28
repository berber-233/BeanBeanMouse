-- 令牌版本号：重置/修改密码时 +1，旧令牌里的版本对不上就失效。
-- （原来想用"改密时间 vs 令牌签发时间"比较，但两者都精确到秒，同一秒内换发的
--   新令牌会被自己判成过期；版本号没有这个竞态。）
ALTER TABLE users ADD COLUMN token_version INTEGER DEFAULT 0;
