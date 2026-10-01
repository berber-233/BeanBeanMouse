-- 商品支付链接：管理员可为每个商品填一个 PayPal 收款/账单链接，
-- 买家在商品页可直接点开付款（不需要接 PayPal API，先用链接方式）。
ALTER TABLE products ADD COLUMN paypal_url TEXT;
