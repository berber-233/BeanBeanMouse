# 后端部署手册（第 7 项）

> 当前线上仍是纯前端演示（数据在浏览器）。接真实后端需要三件事：
> 部署目标、数据库、环境变量。本文给出两条路线与清单。

## 路线 A：VPS / Docker（推荐先跑通）

1. 准备一台 Linux 服务器（1C1G 即可起步），安装 Node.js ≥ 22 与 Docker（可选）。
2. 拷贝仓库（或仅 `backend/`）到服务器：
   ```bash
   cd backend
   cp .env.example .env        # 按需填写
   node src/server.mjs         # 直接运行
   # 或 Docker：
   docker compose up -d --build
   ```
3. `.env` 必填项：
   - `JWT_SECRET`：随机长字符串
   - `APP_URL=https://beanbeanmouse.com`
   - `ALLOWED_ORIGINS=https://beanbeanmouse.com`
   - `DB_PATH`：SQLite 默认 `backend/db/data.db`；生产建议 PostgreSQL（用 `db/schema.postgres.sql`）
   - `MAIL_TRANSPORT=smtp` + `SMTP_*` + `MAIL_FROM`（真实发信）
   - `DEEPL_API_KEY`（真实翻译）；`TURNSTILE_SECRET`（人机验证）
   - `S3_ENDPOINT/S3_BUCKET/S3_REGION/S3_ACCESS_KEY/S3_SECRET_KEY`（对象存储，可后配）
4. 反代与 HTTPS：Nginx/Caddy 将 `api.beanbeanmouse.com` 代理到 `127.0.0.1:8787`，启用 TLS。
5. 进程守护：systemd 或 PM2：
   ```ini
   # /etc/systemd/system/beanbeanmouse-api.service
   [Service]
   WorkingDirectory=/opt/beanbeanmouse/backend
   ExecStart=/usr/bin/node src/server.mjs
   Restart=always
   EnvironmentFile=/opt/beanbeanmouse/backend/.env
   ```
6. 前端接入：`api.js` 中 `API_CONFIG.mode='http'`、`baseUrl='https://api.beanbeanmouse.com'`。

## 路线 B：Cloudflare Pages Functions + D1

- 前端已可部署到 Pages（`wrangler pages deploy dist`），后端可改写为 Functions：
  - 把 `backend/src/server.mjs` 的 route 逻辑迁移为 `functions/api/[[path]].js` 导出 `onRequest`；
  - SQLite → D1（`wrangler d1 create` + binding），Schema 用 `db/schema.postgres.sql` 的等价 D1 版本；
  - 文件上传改为 R2 binding（`S3_*` 或直接 R2 API）；
  - WebSocket 需要 Worker（Pages 不支持长连接），建议后端主体仍用 VPS，Pages 只托管静态站点。
- 建议：现阶段先走路线 A，把 VPS 后端跑通后再考虑 D1/R2 的 Serverless 化。

## 上线前检查清单

- [ ] `JWT_SECRET` 已改为随机值，未提交仓库
- [ ] HTTPS 已生效，`ALLOWED_ORIGINS` 仅含真实前端域名
- [ ] 邮件通道验证（`MAIL_TRANSPORT=smtp` + SPF/DKIM/DMARC 配置）
- [ ] 翻译密钥 / Turnstile 密钥已填
- [ ] 对象存储已接（或确认本地磁盘可用且做好备份）
- [ ] 数据库每日备份与监控（磁盘、内存、日志）
- [ ] 前端 `API_CONFIG` 已切 http 并回归一遍核心链路
# 后端部署（正式方案：Cloudflare Pages Functions + D1）

> 2026-09-11 起，后端正式部署走 Cloudflare Pages Functions + D1（用户选定），
> 原先的 VPS/Docker 方案保留为备选。下表是当前生效的路径。

## 一、架构

同一份业务代码（`backend/src/app.mjs`）跑在两个平台，差异只在注入的适配器：

| | Node（本地开发/测试） | Cloudflare Workers（线上） |
| --- | --- | --- |
| 入口 | `backend/src/server.mjs` | `functions/api/[[path]].js` |
| 运行时 | `node:http` | Fetch API（Pages Functions） |
| 数据库 | `node:sqlite`（`backend/src/db.mjs`） | D1（`backend/src/db-d1.mjs`） |
| 文件 | 本地磁盘（`storage-node.mjs`） | R2（`storage-r2.mjs`，需开通） |
| 邮件 | SMTP（`smtp.mjs`） | Cloudflare Email Service（经 `workers/mailer` + service binding） |
| 实时 | WebSocket（`ws.mjs`） | 待接 Durable Objects |

## 二、已创建资源

| 资源 | 值 |
| --- | --- |
| D1 数据库 | `beanbeanmouse-db`，id `0d3575be-e041-4cb5-a91b-df62b823ef54`，region WNAM |
| 线上 API 根 | `https://beanbeanmouse.com/api/*` |
| Pages 项目 | `beanbean-mouse`（`wrangler.jsonc`） |
| R2 桶 | ❌ 未开通（控制台启用后才能创建 `beanbeanmouse-files`） |
| 邮件 Worker | `beanbeanmouse-mailer`（持有 `send_email` 绑定，`workers_dev: false`） |

## 二之二、邮件发送链路（重要）

**Pages 的配置文件不支持 `send_email` 绑定**——在根 `wrangler.jsonc` 里写 `send_email`
会直接报错：`Configuration file for Pages projects does not support "send_email"`。

所以邮件走"Worker + service binding"：

```
Pages Functions ──env.MAILER.fetch()──► beanbeanmouse-mailer ──env.EMAIL.send()──► Cloudflare Email Service
```

- `workers/mailer/` 持有绑定，部署：`cd workers/mailer && npx wrangler deploy`
- 根 `wrangler.jsonc`：`"services": [{ "binding": "MAILER", "service": "beanbeanmouse-mailer" }]`
- Pages 侧变量：`MAIL_TRANSPORT=service`、`MAIL_FROM=no-reply@beanbeanmouse.com`

### 域名开通（必须）

在控制台 **Compute & AI → Email Service → Email Sending → Onboard Domain** 选择
`beanbeanmouse.com`，会自动写入 SPF / DKIM 记录（DNS 一般 5–15 分钟生效）。
未开通时的报错正是：`E_SENDER_DOMAIN_NOT_CONFIGURED`。

CLI 等价命令 `npx wrangler email sending enable beanbeanmouse.com` 需要 OAuth token 带
`email_sending:write`；若报 `Unauthorized [code: 2036]`，重新 `npx wrangler login` 再试。

## 三、常用命令

```bash
# 本地开发（Pages Functions + 本地 D1）
npx wrangler d1 migrations apply beanbeanmouse-db --local
npx wrangler pages dev dist --port 8788

# 线上迁移
npx wrangler d1 migrations apply beanbeanmouse-db --remote

# 部署（functions/ 会自动打包为 Functions bundle）
npx wrangler pages deploy dist --project-name beanbean-mouse

# 密钥（必须）
node -e "process.stdout.write(require('crypto').randomBytes(32).toString('hex'))" \
  | npx wrangler pages secret put JWT_SECRET --project-name beanbean-mouse
# 改密钥后需重新 deploy 才生效
```

## 四、必须配置的密钥

| 名称 | 作用 | 缺失后果 |
| --- | --- | --- |
| `JWT_SECRET` | 登录令牌签名 | 🔴 每个 isolate 随机生成 → 登录后立刻 401（已踩过） |
| `TURNSTILE_SECRET` | 人机验证（可选） | 关闭校验 |
| `MAIL_API_URL` / `MAIL_API_KEY` | 真实发信（配 `MAIL_TRANSPORT=http`） | 邮件进 outbox，用户收不到验证链接 |

非敏感配置写在 `wrangler.jsonc` 的 `vars`：`MAIL_TRANSPORT`、`SEED_DEMO`、
`NEWS_AUTO_REFRESH`、`PBKDF2_ITERATIONS`、`MAX_FILE_SIZE`。

## 五、排障

- **登录成功但接口 401**：`JWT_SECRET` 未配置（或多 isolate 密钥不一致）。
- **上传返回 503 STORAGE_UNAVAILABLE**：R2 未开通/未绑定。
- **`no such table`**：迁移没跑到目标环境（`--remote` / `--local` 别搞混）。
- **CPU 超时（注册/登录）**：调低 `PBKDF2_ITERATIONS`。
