# BeanBeanMouse（豆豆鼠）生产部署指南

## 1. 后端（Docker Compose 起步）

```bash
cd backend
cp .env.example .env          # 修改 JWT_SECRET 等
docker compose up -d --build
```

- 服务监听 `http://0.0.0.0:8787`
- 数据（SQLite）与上传文件分别挂载到命名卷，删除容器不丢数据
- 健康检查：`curl http://127.0.0.1:8787/products`

## 2. HTTPS 与域名

生产建议前置 nginx/Caddy 反向代理（docker-compose 中已注释示例）：

- Caddy：自动申请 HTTPS 证书，配置最简；
- nginx + certbot：经典方案；`deploy/nginx.conf` 示例：

```nginx
server {
  listen 443 ssl;
  server_name api.beanbeanmouse.example.com;
  ssl_certificate     /etc/letsencrypt/live/api.beanbeanmouse.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.beanbeanmouse.example.com/privkey.pem;
  location / {
    proxy_pass http://backend:8787;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location /ws {
    proxy_pass http://backend:8787;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
```

前端（静态文件）可继续用 GitHub Pages，`api.js` 里把 `baseUrl` 指向 API 域名；
前端跨域由后端 CORS 放行（生产环境应收紧为你的前端域名）。

## 3. 切换 PostgreSQL（正式数据）

当前后端用 SQLite（零依赖便于起步）。切换步骤：

1. `npm i pg`（或改用 NestJS + Prisma 框架）；
2. 执行 `backend/db/schema.postgres.sql` 建库；
3. 把 `src/db.mjs` 的查询层替换为 pg 连接池（接口逻辑不变）；
4. 用一次性脚本把 SQLite 数据迁移到 PostgreSQL（表结构一一对应）。

## 4. 运维清单

- 备份：`backend/db/data.db` 与 `uploads/` 每日异地备份；
  PostgreSQL 阶段用 `pg_dump` + 对象存储冷备；
- 监控：进程守护（systemd/容器 restart）、日志采集、`/admin/overview` 健康指标；
- 密钥：`JWT_SECRET` 放环境变量/密钥管理，勿提交仓库；
- 升级：先备份 → 灰度（同一 SQLite 卷新版本容器）→ 回滚预案。

## 5. 上线前待接入的外部服务

| 能力 | 现状 | 上线前接入 |
| --- | --- | --- |
| 翻译 | DeepL 通道已就绪（协议级测试通过） | 在 backend/.env 填 DEEPL_API_KEY 并联网验证 |
| 邮件 | SMTP 客户端已就绪（STARTTLS/AUTH PLAIN，协议级测试通过） | 在 backend/.env 填 SMTP_HOST/USER/PASS |
| 文件 | 本地磁盘 | S3/OSS + 图片处理与 CDN |
| 消息 | WebSocket 基础版 | 成熟库 + 在线状态/已读/多端同步 |
| 支付/电子签/物流 | 未实现（阶段 2） | 持牌通道与合规流程 |
