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
