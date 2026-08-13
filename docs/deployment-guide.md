# BeanBeanMouse（豆豆鼠）部署指南

> 主域名：`beanbeanmouse.com`（已在 Cloudflare 注册，2026-08-13）
> 部署目标：Cloudflare Pages（全球 CDN + 自动 HTTPS，免费额度足够原型期使用）
> 状态：**已上线（2026-08-13）**——https://beanbeanmouse.com 可访问，
> 域名与 www 均已 active；核心流程线上实测通过。

## 1. 当前架构

- **前端（本次上线）**：纯静态站点（HTML/CSS/JS），部署到 Cloudflare Pages；
- **后端（阶段 1，待部署）**：Node 内置 HTTP + SQLite（`backend/`），需要常驻服务或改造成
  Pages Functions/D1；上线前先跑通前端，后端见本文第 4 节。
- 数据：当前原型数据存浏览器 localStorage；后端接入后落库。

## 2. Cloudflare Pages 部署（本次执行）

### 2.1 直接上传（wrangler CLI）

```bash
npm i -g wrangler          # 或 npx wrangler
wrangler login             # 首次授权（打开浏览器登录 Cloudflare）
npm run build              # 生成 dist/（只含公开网站文件）
wrangler pages project create beanbean-mouse
wrangler pages deploy dist --project-name=beanbean-mouse --branch=main
```

> 注意：`dist/` 只包含网页所需文件（index.html / styles.css / app.js / data.js /
> api.js / assets/ / _headers / robots.txt / sitemap.xml / 404.html），
> 不会把后端、文档、测试或 .git 传上去。

### 2.2 绑定自定义域名

Cloudflare 控制台：Workers & Pages → beanbean-mouse → Custom domains →
添加 `beanbeanmouse.com` 与 `www.beanbeanmouse.com`，Cloudflare 会自动创建 DNS 记录
（apex 用 A/AAAA 或 CNAME 扁平化，www 用 CNAME 到 pages.dev），HTTPS 证书自动签发。

### 2.3 Git 集成（推荐长期方案）

Cloudflare 控制台 → Workers & Pages → Create → Connect to Git →
选择 GitHub 仓库 `berber-233/BeanBeanMouse` →
构建命令 `npm run build`、输出目录 `dist` → 部署。
之后每次 push 到 main 自动发布，并自动产生预览链接。

## 3. 上线检查清单（本次已完成/待办）

- [x] SEO：`robots.txt`、`sitemap.xml`、meta description、OG/Twitter 卡片、canonical
- [x] 安全响应头：`_headers`（nosniff / frame / referrer / permissions-policy）
- [x] 404 兜底页
- [x] 品牌与防伪：站内官方域名显示为 `beanbeanmouse.com`
- [ ] 验证 https://beanbeanmouse.com 打开与核心流程
- [ ] Google Search Console / Bing Webmaster / 百度站长提交收录
- [ ] 后端 API 与数据库（阶段 1）

## 4. 后端部署（阶段 1，待执行）

### 方案 A：海外 VPS / Docker（最直接）

```bash
cd backend
cp .env.example .env          # 修改 JWT_SECRET、SMTP、DEEPL_API_KEY
docker compose up -d --build
```

服务监听 `http://0.0.0.0:8787`；前端 `api.js` 的 `baseUrl` 指向
`https://api.beanbeanmouse.com`；CORS 生产环境收紧为前端域名。

### 方案 B：Cloudflare Pages Functions + D1（免服务器）

把 `backend/src/*.mjs` 迁移为 `functions/` 下的 Worker 路由，SQLite 换 D1，
WebSocket 需要改造为 Durable Objects。适合后续正式版，工作量中等。

### 后端环境变量（.env）

| 变量 | 说明 |
| --- | --- |
| `JWT_SECRET` | 签名密钥，必须改为强随机值 |
| `SMTP_HOST/USER/PASS` | 发信通道（建议 Cloudflare Email Routing 或专业邮件服务） |
| `DEEPL_API_KEY` | 正式翻译密钥（前端当前用免费通道 + 离线兜底） |

## 5. 运维清单（原型期从简）

- 前端：Cloudflare Pages 自动部署，回滚用 deployments 列表；
- 后端：容器 restart + 每日备份 `backend/db/data.db` 与 `uploads/`；
- 密钥只放环境变量/密钥管理，勿提交仓库；
- 上线后监控：Pages 访问量与 4xx/5xx、翻译失败率、询盘成功路径漏斗。
