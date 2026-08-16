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
  last_login_at INTEGER,
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
  registration_no TEXT,
  website TEXT,
  contact TEXT,
  business_scope TEXT,
  reject_reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  verified_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS products (
  id TEXT PRIMARY KEY,
  seller_id TEXT NOT NULL REFERENCES users(id),
  company_id TEXT REFERENCES companies(id),
  category TEXT NOT NULL,
  sub TEXT,
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
  updated_at INTEGER,
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

-- 交易订单：询盘报价后由买家创建，买家确认签收视为交易达成
CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  inquiry_id TEXT REFERENCES inquiries(id),
  quote_id TEXT REFERENCES quotes(id),
  buyer_id TEXT,
  seller_id TEXT,
  status TEXT NOT NULL DEFAULT 'created' CHECK (status IN ('created','cancelled','complete')),
  total REAL,
  currency TEXT DEFAULT 'USD',
  confirmed_at INTEGER,
  receipt_confirmed_at INTEGER,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 小费打赏：交易达成后任一方可打赏对方，双方可见，可取消（未结算前）
CREATE TABLE IF NOT EXISTS tips (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  from_user_id TEXT NOT NULL,
  to_user_id TEXT NOT NULL,
  amount REAL NOT NULL,
  currency TEXT DEFAULT 'USD',
  note TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  created_at INTEGER NOT NULL,
  cancelled_at INTEGER
);

-- 品类需求记录：用户没找到想要的品类时提交，平台据此邀请供应商入驻
CREATE TABLE IF NOT EXISTS category_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name TEXT NOT NULL,
  description TEXT,
  target_markets TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','invited','done')),
  note TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- 邮箱验证令牌（单次有效、带过期、只存哈希）
CREATE TABLE IF NOT EXISTS email_tokens (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  token_hash TEXT NOT NULL,
  purpose TEXT NOT NULL DEFAULT 'verify_email',
  expires_at INTEGER NOT NULL,
  used_at INTEGER,
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

-- 第三方存证：按订单哈希链保存关键流程证据，防篡改、可验证
CREATE TABLE IF NOT EXISTS evidence_records (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  actor_id TEXT,
  kind TEXT NOT NULL,
  ref_id TEXT,
  snapshot TEXT NOT NULL DEFAULT '{}',
  content_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  chain_index INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

-- 货物物流单：卖家创建，买卖双方可见实时跟进
CREATE TABLE IF NOT EXISTS shipments (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES orders(id),
  carrier TEXT,
  tracking_no TEXT,
  status TEXT NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','packed','shipped','in_transit','customs','out_for_delivery','delivered','exception')),
  origin TEXT,
  destination TEXT,
  current_location TEXT,
  etd INTEGER,
  eta INTEGER,
  remark TEXT,
  created_by TEXT,
  updated_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id TEXT PRIMARY KEY,
  shipment_id TEXT NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  location TEXT,
  note TEXT,
  event_time INTEGER NOT NULL,
  created_by TEXT,
  created_at INTEGER NOT NULL
);

-- 卖家推广申请：审核通过后产品标记为推广（首页精选/搜索推荐）
CREATE TABLE IF NOT EXISTS promotion_requests (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  seller_id TEXT NOT NULL,
  days INTEGER NOT NULL,
  budget TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  reject_reason TEXT,
  reviewed_at INTEGER,
  created_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_translations_product ON product_translations(product_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_buyer ON inquiries(buyer_id);
CREATE INDEX IF NOT EXISTS idx_antifake_code ON anti_fake_codes(code);
CREATE INDEX IF NOT EXISTS idx_translation_usage ON translation_usage(user_id, day);
CREATE INDEX IF NOT EXISTS idx_evidence_order ON evidence_records(order_id, chain_index);
CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment ON shipment_events(shipment_id);
CREATE INDEX IF NOT EXISTS idx_promo_product ON promotion_requests(product_id, status);
