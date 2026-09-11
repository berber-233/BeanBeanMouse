# beanbeanmouse-mailer（邮件发送 Worker）

Cloudflare **Pages 的配置文件不支持 `send_email` 绑定**（wrangler 会报
`Configuration file for Pages projects does not support "send_email"`），
所以邮件发送单独放一个 Worker，由它持有绑定，Pages Functions 通过
service binding（`env.MAILER`）调用。

## 部署

```bash
cd workers/mailer
npx wrangler deploy
```

部署后，根目录 `wrangler.jsonc` 里的 service binding 才能解析到它：

```jsonc
"services": [{ "binding": "MAILER", "service": "beanbeanmouse-mailer" }]
```

## 前置条件（必须先在控制台完成）

1. **开通域名邮件发送**：Cloudflare 控制台 → Compute & AI → Email Service →
   Email Sending → Onboard Domain → 选 `beanbeanmouse.com` → Add records and onboard。
   会写入 SPF / DKIM 记录，DNS 一般 5–15 分钟生效。
2. 未开通前调用会返回 `E_SENDER_NOT_VERIFIED` / `E_SENDER_DOMAIN_NOT_AVAILABLE`。

> CLI 等价命令是 `npx wrangler email sending enable beanbeanmouse.com`，
> 但该命令需要 OAuth token 带 `email_sending:write` 权限；
> 若 CLI 报 `Unauthorized [code: 2036]`，重新跑一次 `npx wrangler login` 再试，
> 或者直接用上面的控制台路径。

## 接口

`POST /` （也接受 `/send`）

```json
{ "to": "user@example.com", "subject": "标题", "text": "纯文本", "html": "<p>HTML</p>" }
```

成功返回 `{ "ok": true, "messageId": "..." }`；
失败返回 `{ "ok": false, "code": "E_...", "message": "..." }`（HTTP 502）。
