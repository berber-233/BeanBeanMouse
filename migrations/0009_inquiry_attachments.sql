-- 询盘/报价附件：文件本体在对象存储（R2），这里存"附件清单"（JSON：[{fileId,name,size,type}]）
-- 之前附件只存在浏览器本地（pendingFiles），提交即丢，对方根本收不到。
ALTER TABLE inquiries ADD COLUMN attachments TEXT;
ALTER TABLE inquiries ADD COLUMN reply_attachments TEXT;
