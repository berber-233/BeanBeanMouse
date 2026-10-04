import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dbPath = process.env.DB_PATH === ':memory:' ? ':memory:' : (process.env.DB_PATH || path.join(root, 'db', 'data.db'));

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');
db.exec(readFileSync(path.join(root, 'db', 'schema.sqlite.sql'), 'utf8'));

export function all(sql, ...params) {
  return db.prepare(sql).all(...params);
}
export function get(sql, ...params) {
  return db.prepare(sql).get(...params);
}
export function run(sql, ...params) {
  return db.prepare(sql).run(...params);
}

/* 轻量迁移：为已存在的表补充缺失列（SQLite 不支持 ADD COLUMN IF NOT EXISTS） */
export function ensureColumns(table, cols) {
  const existing = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r => r.name));
  for (const [name, ddl] of Object.entries(cols)) {
    if (!existing.has(name)) {
      db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`);
    }
  }
}

/* 启动时执行列级迁移（新表由 schema.sqlite.sql 负责） */
ensureColumns('users', {
  last_login_at: 'INTEGER',
  review_state: 'TEXT',
  signup_ip: 'TEXT',
  signup_ua: 'TEXT',
  email_flag: 'TEXT',
  token_version: 'INTEGER DEFAULT 0'
});
ensureColumns('inquiries', {
  contact_name: 'TEXT',
  contact_email: 'TEXT',
  contact_company: 'TEXT',
  contact_country: 'TEXT',
  card: 'TEXT',
  card_name: 'TEXT',
  attachments: 'TEXT',
  reply_attachments: 'TEXT'
});
ensureColumns('companies', {
  registration_no: 'TEXT',
  website: 'TEXT',
  contact: 'TEXT',
  business_scope: 'TEXT',
  reject_reason: 'TEXT'
});
ensureColumns('products', { sub: 'TEXT', paypal_url: 'TEXT', code: 'TEXT' });

/* 商品货号（SKU）回填 + 唯一索引。
 * 注意：不能写进 schema.sqlite.sql —— 老库执行建表脚本时还没有 code 列
 * （ADD COLUMN 发生在建表脚本之后），在那里建索引会直接报错。 */
try {
  db.exec(`
    UPDATE products
    SET code = 'BBM-' || (
          CASE
            WHEN sub LIKE '%hamster%'  THEN 'HAM'
            WHEN sub LIKE '%dog-small%' THEN 'DOGS'
            WHEN sub LIKE '%dog-large%' THEN 'DOGL'
            WHEN sub LIKE '%cat%'      THEN 'CAT'
            WHEN sub LIKE '%food%'     THEN 'FOOD'
            WHEN sub LIKE '%grooming%' THEN 'GRM'
            WHEN sub LIKE '%toys%'     THEN 'TOY'
            WHEN sub LIKE '%travel%'   THEN 'TRV'
            ELSE 'GEN'
          END
        ) || '-' || substr('0000' || rowid, -4)
    WHERE code IS NULL OR code = '';
  `);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(code)');
} catch (e) {
  /* 回填失败不影响主流程：新商品仍会由应用层分配货号 */
}
ensureColumns('products', { paypal_url: 'TEXT' });
ensureColumns('shipments', { mode: 'TEXT' });
ensureColumns('orders', {
  quote_id: 'TEXT REFERENCES quotes(id)',
  confirmed_at: 'INTEGER',
  receipt_confirmed_at: 'INTEGER',
  updated_at: 'INTEGER'
});
ensureColumns('news_items', { updated_at: 'INTEGER' });
