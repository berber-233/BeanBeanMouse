-- 客服快捷短语 / 聊天话术（pet0.3，2026-10-03）
-- 平台自营后，询盘全部由管理员（客服）接；这里存"自己加的话术"，
-- 内置话术库放在前端 data.js（双语、随版本升级），改动过的和自建的存这里。
CREATE TABLE IF NOT EXISTS quick_replies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  scene TEXT NOT NULL DEFAULT 'general',   -- greeting/quote/sample/lead/payment/shipping/cert/oem/followup/after/custom
  title TEXT NOT NULL,                     -- 短语名（只给客服自己看）
  body TEXT NOT NULL,                      -- 真正发出去的正文
  lang TEXT NOT NULL DEFAULT 'zh',         -- 正文语言：zh / en
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_quick_replies_user ON quick_replies(user_id, scene);
