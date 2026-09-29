-- 询盘附带名片：买家可以在询盘里附上自己的名片，卖家在询盘列表点开即可查看
ALTER TABLE inquiries ADD COLUMN card TEXT;
ALTER TABLE inquiries ADD COLUMN card_name TEXT;
