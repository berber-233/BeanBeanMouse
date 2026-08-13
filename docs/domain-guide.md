# 域名注册指南（BeanBeanMouse 豆豆鼠）

> 状态：**已上线（2026-08-13）**——`beanbeanmouse.com` 已在 Cloudflare 注册并部署
> Cloudflare Pages，主域名与 www 均已 active，https://beanbeanmouse.com 可访问。

## 1. 要注册的域名

| 域名 | 状态 | 用途 | 参考价格/年 |
| --- | --- | --- | --- |
| `beanbeanmouse.com` | ✅ 已注册（Cloudflare） | 主域名（网站正式地址） | 已购 |
| `beanbeanmouse.cn` | ✅ 可注册 | 国内保护/备案选项（可选） | 约 ¥38 |
| `doudoushu.com` | ❌ 已被他人注册 | 拼音保护（不可用） | — |
| `doudoushu.cn` | ✅ 可注册 | 拼音保护备选 | 约 ¥38 |

> 说明：域名不分大小写，`BeanBeanMouse.com` 与 `beanbeanmouse.com` 是同一个域名，
> 实测均未被注册。建议优先注册 `beanbeanmouse.com`，可选加 `beanbeanmouse.cn`。

## 2. 注册商：Cloudflare Registrar（已完成）

- 域名已在 Cloudflare 注册，DNS 由 Cloudflare 托管，无需再迁移；
- 后续部署 Cloudflare Pages 时可直接绑定域名，DNS 记录自动创建。

## 3. 注册完成后需要你提供的信息

Cloudflare Pages 绑定域名后，DNS 由 Cloudflare 自动管理。
`www` 与主域名建议都绑定，统一跳转到主域名。

## 4. 注册后我负责的配置

### DNS 记录规划（示例，正式值以部署为准）

| 类型 | 主机 | 值 | 用途 |
| --- | --- | --- | --- |
| A/AAAA | @ | Cloudflare Pages 自动生成 | 主站（Pages 绑定域名后自动创建） |
| CNAME | www | <pages.dev 地址> | www 跳主站（自动创建） |
| A | api | <服务器 IP> | 后端 API 子域（阶段 1 再配置） |
| TXT | @ | v=spf1 -all | 防邮件伪造（SPF） |
| TXT | _dmarc | v=DMARC1; p=none; rua=… | DMARC 报告（后续收紧） |
| TXT | _github-challenge | <GitHub 生成值> | 启用 GitHub Pages 自定义域名时必填 |

> 注意：正式地址统一为 `https://beanbeanmouse.com`（Cloudflare Pages）；
> 原型预览地址为 GitHub Pages `https://berber-233.github.io/BeanBeanMouse/`。

### 其他配置

- HTTPS：Cloudflare Pages 自动签发与续期（免费）；
- 邮件：配置 `no-reply@beanbeanmouse.com` 发信通道（SPF/DKIM/DMARC），
  并把后端 `MAIL_FROM` 从 `no-reply@beanbeanmouse.local` 换成正式地址；
- 防伪：站内"官方域名"提示更新为 `beanbeanmouse.com`；
- 部署：主站（GitHub Pages）+ 后端 API（海外 VPS，按目标市场选地域）。

## 5. 常见问题

- **为什么我不能直接部署？** 部署需要登录你的 Cloudflare 账号；你只需完成一次授权
  （`wrangler login` 或在控制台绑定），后续全部由我配置。
- **多久能上线？** Cloudflare Pages 部署 + 域名绑定一般 10 分钟内生效。
