-- BeanBeanMouse（豆豆鼠）数据库（SQLite · 本地开发/测试用）
-- 生产环境请使用 db/schema.postgres.sql（PostgreSQL）

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer','seller','admin')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen')),
  email_verified INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS companies (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  license_no TEXT,
  license_file_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  verified_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  company_id TEXT REFERENCES companies(id),
  category TEXT NOT NULL,
  hs_code TEXT,
  country TEXT NOT NULL,
  price_min REAL NOT NULL,
  price_max REAL NOT NULL,
  moq INTEGER NOT NULL,
  unit TEXT NOT NULL,
  lead_time INTEGER NOT NULL,
  terms TEXT NOT NULL DEFAULT '[]',
  certs TEXT NOT NULL DEFAULT '[]',
  src_lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','on','off','rejected')),
  reject_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS product_translations (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  features TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL,
  UNIQUE (product_id, lang)
);

CREATE TABLE IF NOT EXISTS inquiries (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  buyer_id TEXT,
  qty INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  payment_term TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled','quoted')),
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS quotes (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT NOT NULL REFERENCES inquiries(id),
  price REAL NOT NULL,
  incoterm TEXT NOT NULL,
  payment_term TEXT NOT NULL,
  validity_days INTEGER NOT NULL,
  lead_time INTEGER NOT NULL,
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT REFERENCES inquiries(id),
  buyer_id TEXT,
  seller_id TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  sender_id TEXT,
  content TEXT NOT NULL,
  translated_cache TEXT,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS anti_fake_codes (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  code TEXT NOT NULL UNIQUE,
  batch_no TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  issued_at INTEGER NOT NULL,
  last_verified_at INTEGER,
  verify_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  region TEXT,
  category TEXT,
  enabled INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS news_items (
  id TEXT PRIMARY KEY,
  source_id TEXT REFERENCES news_sources(id),
  region TEXT,
  category TEXT,
  title_zh TEXT,
  title_en TEXT,
  summary_zh TEXT,
  summary_en TEXT,
  url TEXT,
  published_at TEXT,
  status TEXT NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  type TEXT,
  title TEXT,
  body TEXT,
  read_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  owner_id TEXT,
  bucket_key TEXT,
  mime TEXT,
  size INTEGER,
  status TEXT,
  created_at INTEGER NOT NULL
);

-- 第二阶段预留：订单与支付
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT,
  buyer_id TEXT,
  seller_id TEXT,
  status TEXT,
  total REAL,
  currency TEXT DEFAULT 'USD',
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY,
  order_id TEXT,
  method TEXT,
  status TEXT,
  amount REAL,
  external_ref TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS translation_usage (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  day TEXT NOT NULL,
  chars INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id TEXT PRIMARY KEY,
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_translations_product ON product_translations(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_antifake_code ON anti_fake_codes(code);
CREATE INDEX IF NOT EXISTS idx_translation_usage ON translation_usage(user_id, day);
