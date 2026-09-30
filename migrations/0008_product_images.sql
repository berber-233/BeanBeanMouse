-- 商品图片：文件本身存对象存储（R2），这里只保存"哪个商品用了哪个文件"的关系。
-- 之前商品图片只存在浏览器本地（p.images），刷新即丢，也无法给访客展示。
CREATE TABLE IF NOT EXISTS product_images (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL REFERENCES products(id),
  file_id TEXT NOT NULL REFERENCES files(id),
  sort INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_product_images_product ON product_images(product_id, sort);
