-- 询盘补充联系方式：原先只存 buyer_id 与需求正文，运营端看到询盘却无法回信。
-- 表单里的姓名/邮箱/公司/国家现在随询盘一起落库。
ALTER TABLE inquiries ADD COLUMN contact_name TEXT;
ALTER TABLE inquiries ADD COLUMN contact_email TEXT;
ALTER TABLE inquiries ADD COLUMN contact_company TEXT;
ALTER TABLE inquiries ADD COLUMN contact_country TEXT;
