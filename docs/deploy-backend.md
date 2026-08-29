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
