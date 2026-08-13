# 项目待办清单（随时更新）

> 用途：记录所有待办，用户提及时按此清单告知进度与下一步。

## 一、已定稿（2026-08-12）

- [x] **品牌名**：中文"豆豆鼠"，英文"BeanBeanMouse"（GitHub 仓库已改名 BeanBeanMouse）
- [x] **吉祥物**：AI 生成的 Q 版仓鼠送货员（`assets/mascot.jpg`），用户确认不再更改
- [x] **防伪码前缀**：`BBM-`（随品牌统一更新）
- [x] **本地文件**：全项目名称/文案/代码统一为 BeanBeanMouse（豆豆鼠）

## 二、部署中（2026-08-13）

- [x] **域名注册**：`beanbeanmouse.com` 已在 Cloudflare 注册（DNS 为空，待绑定）
- [ ] **Cloudflare Pages 部署**：需用户授权（`wrangler login` 或控制台 Connect to Git）
- [ ] 绑定自定义域名 `beanbeanmouse.com` + `www`
- [ ] 验证 https://beanbeanmouse.com 核心流程（本地诊断脚本已就绪）
- [ ] 提交 Google/Bing/百度收录

## 三、待我执行（依赖前端上线）

- [ ] 后端 API 部署（VPS/Docker 或 Pages Functions + D1）
- [ ] 邮件发信：SPF/DKIM/DMARC + SMTP 真实通道
- [ ] 真实翻译密钥（DeepL）接入
- [ ] 支付/托管接入（用户选方案后，主体到位优先）
- [ ] 佣金与打赏功能、风控规则、结算对账（商业闭环）
- [ ] 商标检索（美国 / 欧盟 / 中国）
- [ ] 海外公司主体注册（收款通道前提）
- [ ] 冷启动运营：先选 1–2 个垂直品类 + 1 个目标市场跑通
- [ ] 无障碍 WCAG 2.1 基础、物流轨迹与货损保险选项

## 四、上线后常规监控

- [ ] 支付失败率、拒付率、翻译质量回访、邮件送达率、页面性能
