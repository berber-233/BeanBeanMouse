-- trade boat 数据库（PostgreSQL · 生产环境）
-- 与 db/schema.sqlite.sql 结构对应；本地开发/测试使用 SQLite。

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('buyer','seller','admin')),
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','frozen')),
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  country TEXT NOT NULL,
  city TEXT,
  license_no TEXT,
  license_file_id UUID REFERENCES files(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id UUID NOT NULL REFERENCES users(id),
  company_id UUID REFERENCES companies(id),
  category TEXT NOT NULL,
  hs_code TEXT,
  country TEXT NOT NULL,
  price_min NUMERIC(12,2) NOT NULL,
  price_max NUMERIC(12,2) NOT NULL,
  moq INTEGER NOT NULL,
  unit TEXT NOT NULL,
  lead_time INTEGER NOT NULL,
  terms JSONB NOT NULL DEFAULT '[]',
  certs JSONB NOT NULL DEFAULT '[]',
  src_lang TEXT NOT NULL DEFAULT 'en',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('draft','pending','on','off','rejected')),
  reject_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS product_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  lang TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  features JSONB NOT NULL DEFAULT '[]',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, lang)
);

CREATE TABLE IF NOT EXISTS inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  buyer_id UUID REFERENCES users(id),
  qty INTEGER NOT NULL,
  unit TEXT NOT NULL DEFAULT 'pcs',
  payment_term TEXT,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','handled','quoted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID NOT NULL REFERENCES inquiries(id),
  price NUMERIC(12,2) NOT NULL,
  incoterm TEXT NOT NULL,
  payment_term TEXT NOT NULL,
  validity_days INTEGER NOT NULL,
  lead_time INTEGER NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID REFERENCES inquiries(id),
  buyer_id UUID,
  seller_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id),
  sender_id UUID,
  content TEXT NOT NULL,
  translated_cache JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS anti_fake_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id),
  code TEXT NOT NULL UNIQUE,
  batch_no TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','void')),
  issued_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_verified_at TIMESTAMPTZ,
  verify_count INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  url TEXT NOT NULL,
  region TEXT,
  category TEXT,
  enabled BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id UUID REFERENCES news_sources(id),
  region TEXT,
  category TEXT,
  title_zh TEXT,
  title_en TEXT,
  summary_zh TEXT,
  summary_en TEXT,
  url TEXT,
  published_at DATE,
  status TEXT NOT NULL DEFAULT 'published'
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id),
  type TEXT,
  title TEXT,
  body TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID,
  bucket_key TEXT,
  mime TEXT,
  size INTEGER,
  status TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 第二阶段预留：订单与支付
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  inquiry_id UUID,
  buyer_id UUID,
  seller_id UUID,
  status TEXT,
  total NUMERIC(12,2),
  currency TEXT DEFAULT 'USD',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID,
  method TEXT,
  status TEXT,
  amount NUMERIC(12,2),
  external_ref TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS translation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  day TEXT NOT NULL,
  chars INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS mail_outbox (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient TEXT NOT NULL,
  subject TEXT,
  body TEXT,
  status TEXT NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_translations_product ON product_translations(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_antifake_code ON anti_fake_codes(code);
CREATE INDEX IF NOT EXISTS idx_translation_usage ON translation_usage(user_id, day);
