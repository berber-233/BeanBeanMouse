# BeanBeanMouse 安全体检报告（security-best-practices）

> 依据 `security-best-practices` skill（JavaScript/Node + 前端）规范执行，2026-08-16。
> 结论：未发现可远程利用的关键漏洞；发现 1 个高危配置风险（已修复）与若干中低危加固项（已修复/建议）。

## 执行摘要

后端采用参数化 SQL、scrypt 密码哈希、Bearer Token 鉴权（无 Cookie，因此无经典 CSRF 面）、输入长度与类型校验、注册/登录限流、安全响应头与 CORS 可配置白名单，整体基础较好。
最高风险项是 **JWT 兜底密钥硬编码**（若未配置环境变量部署，令牌可被伪造）——已修复为“生产环境强制配置、开发环境随机密钥”。
其余发现集中在 CSP 缺失、上传内容未校验魔数、WebSocket 缓冲无上限、数值字段类型校验不足等加固项，均已在本轮修复或给出部署建议。

## 发现清单（按严重度）

### 高危

| ID | 严重度 | 位置 | 问题 | 影响 | 状态 |
|----|--------|------|------|------|------|
| SEC-001 | High | `backend/src/auth.mjs:15` | JWT 密钥使用硬编码兜底值 `'beanbeanmouse-dev-secret-change-me'` | 若生产部署未配置 `JWT_SECRET`，任何人可伪造管理员令牌，绕过全部鉴权 | ✅ 已修复：生产未配置则拒绝启动；开发用每次启动随机密钥并告警 |

### 中危

| ID | 严重度 | 位置 | 问题 | 影响 | 状态 |
|----|--------|------|------|------|------|
| SEC-002 | Medium | `_headers`（Cloudflare Pages） | 静态站点无 Content-Security-Policy | 一旦出现 DOM XSS，无纵深防御 | ✅ 已修复：添加 CSP（script-src 'self'，style-src 含 'unsafe-inline' 以兼容内联样式，img/connect 允许 https） |
| SEC-003 | Medium | `backend/src/storage.mjs:20-26`、`server.mjs:1014` | 上传仅校验声明 MIME，未校验文件魔数 | 可将 HTML/脚本伪装成图片上传并由同源服务（配合 nosniff 风险较低，但属于纵深缺失） | ✅ 已修复：按 PNG/JPEG/GIF/WebP/PDF 魔数校验 |
| SEC-004 | Medium | `backend/src/server.mjs:66-68` | 未配置 `ALLOWED_ORIGINS` 时 CORS 为 `*` | 公共 API 无凭据时风险有限；若未来加 Cookie/凭据则可能被滥用 | ⚠️ 已加启动告警；生产必须配置白名单 |
| SEC-005 | Medium | `backend/src/server.mjs:17-38` | 注册/登录限流为进程内 Map | 多实例部署时可被绕开；单实例下有效 | 📋 部署建议：在边缘（Cloudflare WAF/Rate Limiting）叠加 |

### 低危 / 加固

| ID | 严重度 | 位置 | 问题 | 状态 |
|----|--------|------|------|------|
| SEC-006 | Low | `backend/src/ws.mjs:78-80` | WebSocket 未解析缓冲无上限，恶意客户端可耗尽内存 | ✅ 已修复：缓冲超 1MB 直接断开 |
| SEC-007 | Low | `backend/src/server.mjs`（产品/报价/询盘） | 数值字段（价格/MOQ/交期/数量）直接透传，类型可被污染 | ✅ 已修复：统一 `toNum` 有限数字校验 + 价格区间/正整数约束 |
| SEC-008 | Low | `backend/src/auth.mjs:3-9` | scrypt 使用默认成本 N=16384 | 离线爆破成本偏低 | ✅ 已修复：N=32768 + maxmem 64MB |
| SEC-009 | Info | `server.mjs` 邮件验证 | 验证链接含一次性 token（URL 传递） | 可能经日志/Referrer 泄露 | ✅ 已有 `Referrer-Policy: strict-origin-when-cross-origin`；生产建议邮件内引导登录页输入 |
| SEC-010 | Info | 全局 | 鉴权用 `Authorization: Bearer`，无 Cookie | 无经典 CSRF 面 | ✅ 符合规范，无需处理 |
| SEC-011 | Info | `backend/src/db.mjs` | SQL 全部参数化 | 无 SQL 注入面 | ✅ 已核验 |
| SEC-012 | Info | `server.mjs` news/translate | 出站请求仅访问硬编码/固定主机，无用户可控 URL | 无 SSRF 面 | ✅ 已核验 |
| SEC-013 | Low | `app.js` | 大量 `innerHTML` 动态渲染，均经 `esc()`（`&<>"'`）转义 | 转义覆盖完整；建议后续引入 Sanitizer/Trusted Types 进一步加固 | ✅ 当前已用 CSP 兜底 |
| SEC-014 | Info | `api.js` / `app.js` | 未在 localStorage 持久化认证令牌（http 模式登录态不落盘） | 无令牌泄露面（功能上待完善持久化方案，建议届时用 HttpOnly Cookie） | ✅ 已核验 |

## 修复说明

所有修复均保持向后兼容，后端 85 项测试全绿。关键改动：

- `auth.mjs`：JWT 密钥生产强制、开发随机（附告警）；scrypt N=32768。
- `storage.mjs`：魔数校验（PNG/JPEG/GIF/WebP/PDF）。
- `ws.mjs`：1MB 帧缓冲上限。
- `server.mjs`：数值字段 `toNum` 校验；CORS 未配置时告警。
- `_headers`：新增 CSP。

## 部署前必做

1. 生产环境设置强随机 `JWT_SECRET`（至少 32 字节）。
2. 配置 `ALLOWED_ORIGINS=https://beanbeanmouse.com`。
3. 设置 `NODE_ENV=production`。
4. 在 Cloudflare 边缘开启 Rate Limiting / WAF 作为进程内限流的补充。
5. 邮件验证链接建议改为“登录后输入验证码”流程（可选）。
