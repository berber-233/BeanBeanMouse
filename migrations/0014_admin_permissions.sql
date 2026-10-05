-- 管理端权限细分（2026-10-06）
-- role 仍是 'admin'（保证既有代码/既有管理员不受影响），permissions 用来细分这个管理员能做什么：
--   NULL / 空字符串 = 全权（老管理员兼容；现有 admin@beanbeanmouse.com 属于这种）
--   JSON 数组       = 只拥有列出的权限，例如 ["products.review","service"]
-- 权限键（与前端标签一一对应）：
--   products.publish  发布/编辑/上下架/删除商品、上传商品图
--   products.review   审核商品（通过/驳回）
--   service           客服工作台：询盘、会话、消息
--   orders            订单、物流、售后仲裁、表单记录
--   customers         用户与公司认证、地址管理
--   marketing         推广位、品类需求、意见箱、资讯
--   system            系统自检、审计日志、邮件通道、权限管理
ALTER TABLE users ADD COLUMN permissions TEXT;
ALTER TABLE users ADD COLUMN perm_note TEXT;
