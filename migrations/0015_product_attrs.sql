-- 2026-10-07：商品补充属性（适用体型 / 材质）。
-- 以前这两项是按细分品类"自动编"的默认值，真实商品上等于假数据（用户质疑过）。
-- 改成卖家选填、有值才展示。
ALTER TABLE products ADD COLUMN pet_size TEXT;
ALTER TABLE products ADD COLUMN material TEXT;
