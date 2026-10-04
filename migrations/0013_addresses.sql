-- 地址管理（2026-10-04）：记录交易过的客户地址，便于复购发货、对账与线下沟通。
-- 来源三种：order（下单时自动收录）/ inquiry（询盘时自动收录）/ manual（手动录入）。
CREATE TABLE IF NOT EXISTS addresses (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),      -- 归属：买家自己建的记在自己名下；平台收录的记在管理员名下
  owner_key TEXT NOT NULL DEFAULT '',     -- 去重键：company|email|country
  name TEXT NOT NULL DEFAULT '',
  company TEXT NOT NULL DEFAULT '',
  country TEXT NOT NULL DEFAULT '',
  city TEXT NOT NULL DEFAULT '',
  address1 TEXT NOT NULL DEFAULT '',
  address2 TEXT NOT NULL DEFAULT '',
  zip TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  note TEXT NOT NULL DEFAULT '',
  source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','order','inquiry')),
  use_count INTEGER NOT NULL DEFAULT 0,
  last_used_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_addresses_user ON addresses(user_id, updated_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_addresses_owner_key ON addresses(owner_key);
