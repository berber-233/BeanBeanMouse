-- 商品货号（SKU）：用于品类分类、询盘/客服指名商品、线下仓库查找。
-- 规则：BBM-<品类码>-<4 位序号>，例如 BBM-HAM-0007 / BBM-DOGL-0012。
-- 品类码由商品细分类（sub）推导：
--   hamster→HAM  cat→CAT  dog-small→DOGS  dog-large→DOGL
--   food→FOOD  grooming→GRM  toys→TOY  travel→TRV  其他→GEN
ALTER TABLE products ADD COLUMN code TEXT;

-- 历史商品补号：按 rowid 顺序给一个稳定、唯一的货号（只补空的，不覆盖已有）
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

CREATE UNIQUE INDEX IF NOT EXISTS idx_products_code ON products(code);
