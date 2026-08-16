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
ensureColumns('users', { last_login_at: 'INTEGER' });
ensureColumns('companies', {
  registration_no: 'TEXT',
  website: 'TEXT',
  contact: 'TEXT',
  business_scope: 'TEXT',
  reject_reason: 'TEXT'
});
ensureColumns('products', { sub: 'TEXT' });
ensureColumns('orders', {
  quote_id: 'TEXT REFERENCES quotes(id)',
  confirmed_at: 'INTEGER',
  receipt_confirmed_at: 'INTEGER',
  updated_at: 'INTEGER'
});
ensureColumns('news_items', { updated_at: 'INTEGER' });
