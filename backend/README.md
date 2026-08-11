# trade boat 后端（阶段 1 MVP）

> 零依赖：Node.js 内置 `node:http` + `node:sqlite`，无需安装任何包即可运行。
> 结构对应 `docs/er-diagram.md` 与 `docs/openapi.yaml`。

## 快速开始

```bash
# 启动（默认 http://127.0.0.1:8787）
node src/server.mjs

# 运行接口测试（内存数据库，33 项断言）
node test/api.test.mjs
```

环境变量：

- `PORT` — 服务端口，默认 `8787`
- `DB_PATH` — SQLite 文件路径，默认 `backend/db/data.db`；设为 `:memory:` 用内存库（测试用）
- `JWT_SECRET` — 令牌签名密钥，生产环境务必设置

## 数据库

- 启动时自动执行 `db/schema.sqlite.sql` 建表，空库自动写入演示数据（3 个账号、3 个产品、资讯等）
- 演示账号：`admin@demo.com / admin123`、`seller@demo.com / seller123`、
  `buyer@demo.com / buyer123`、`tanaka@tokyo-trading.jp / frozen123`（已冻结）
- 生产环境使用 `db/schema.postgres.sql`（PostgreSQL，uuid/jsonb/timestamptz）

## 已实现接口（对应 openapi.yaml）

| 模块 | 接口 |
| --- | --- |
| 认证 | `POST /auth/register` `POST /auth/login` `POST /auth/refresh` `GET /auth/me` `POST /auth/logout` |
| 企业 | `PUT /companies/{sellerId}/verify`（管理员） |
| 产品 | `GET /products`（公开，仅上架）`GET/PUT /products/{id}` `POST /products`（待审核）`POST /products/{id}/review`（管理员）`POST /products/{id}/status` |
| 询盘 | `GET/POST /inquiries` `POST /inquiries/{id}/quote` |
| 消息 | `GET/POST /conversations/{id}/messages`；实时推送：`WS /ws?token=...` |
| 翻译 | `POST /translate`（服务端代理：MyMemory→LibreTranslate→离线兜底，按用户每日额度+缓存） |
| 防伪 | `POST /anti-fake/verify` |
| 资讯 | `GET /news`（分页）`GET /news/sources` |
| 通知 | `GET /notifications` |
| 管理 | `GET /admin/overview` `GET /admin/logs` |
| 文件 | `POST /files`（multipart 或 base64 JSON，本地磁盘存储）`GET /files/{id}` 下载 |
| 邮件 | 询盘/报价自动触发站内通知 + 邮件落库（mail_outbox，transport 可切 SMTP） |

列表接口（产品/资讯/日志）支持 `page` / `size` 分页，返回 `{items,total,page,size}`。

## 实时消息（WebSocket）

```js
const ws = new WebSocket('ws://127.0.0.1:8787/ws?token=<登录令牌>');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'join', conversationId: 'conv-1' }));
  ws.send(JSON.stringify({ type: 'message', conversationId: 'conv-1', text: '你好' }));
};
ws.onmessage = e => console.log(e.data); // 广播回执（含发送者）
```

安全：密码 scrypt 加盐哈希；令牌为 HMAC-SHA256 签名（HS256），过期校验；
管理接口按角色鉴权（admin）；CORS 已放开（开发用，生产按域名收紧）。

## 前端对接

把 `api.js` 顶部改为：

```js
const API_CONFIG = { mode: 'http', baseUrl: 'http://127.0.0.1:8787', latencyMs: 0 };
```

页面即可走真实后端（认证、产品、询盘、报价、防伪、资讯、管理已连通）。

## 生产部署

```bash
cp .env.example .env   # 修改 JWT_SECRET 等
docker compose up -d --build
```

HTTPS、PostgreSQL 迁移、运维与上线前待接入的外部服务详见 `docs/deployment-guide.md`。

## 已知占位（仍需外部凭据）

- 翻译：真实服务链已就绪，接入 MyMemory/DeepL 需网络与额度（无网自动离线兜底）
- 邮件：默认 mock 落库，接 SMTP/SES 需凭据（`MAIL_TRANSPORT=smtp` 时接入实现）
- 文件：本地磁盘可跑通，生产建议切 S3/OSS + CDN（storage.mjs 提供适配点）
- 消息：基础广播已可用，生产建议换成熟库并补充在线状态/已读/多端同步
