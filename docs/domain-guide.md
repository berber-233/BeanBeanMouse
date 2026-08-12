# 域名注册指南（BeanBeanMouse 豆豆鼠）

> 状态：**已查证（2026-08-12）**——候选域名注册情况已通过 RDAP 实测确认，
> 付款与注册需你本人完成（我无法代付）；注册完成后继续配置 DNS、SSL、邮件发信与部署。

## 1. 要注册的域名

| 域名 | 状态 | 用途 | 参考价格/年 |
| --- | --- | --- | --- |
| `beanbeanmouse.com` | ✅ 可注册 | 主域名（网站正式地址） | 阿里云约 ¥85（首年） |
| `beanbeanmouse.cn` | ✅ 可注册 | 国内保护/备案选项（可选） | 阿里云约 ¥38 |
| `doudoushu.com` | ❌ 已被他人注册 | 拼音保护（不可用） | — |
| `doudoushu.cn` | ✅ 可注册 | 拼音保护备选 | 约 ¥38 |

> 说明：域名不分大小写，`BeanBeanMouse.com` 与 `beanbeanmouse.com` 是同一个域名，
> 实测均未被注册。建议优先注册 `beanbeanmouse.com`，可选加 `beanbeanmouse.cn`。

## 2. 推荐注册商：阿里云（支持支付宝）

- 国内访问稳定、支持支付宝/微信支付、有中文客服；.com 首年约 ¥85、.cn 约 ¥38；
- 注册时需要完成**实名认证**（身份证/企业信息），这是国内注册商的正常流程；
- 免费提供云解析 DNS，后续可绑定 GitHub Pages 或正式服务器。

### 操作步骤

1. 打开 [阿里云域名注册](https://wanwang.aliyun.com/domain) 搜索 `beanbeanmouse.com`；
2. 确认状态为"可注册"，加入购物车，年限选 1 年即可；
3. 结算时选择支付宝支付；按提示完成实名认证（个人身份证即可）；
4. 注册完成后在"域名控制台"确认状态为正常。

> 备选注册商（同样支持支付宝）：
> - **Namecheap**：海外注册商，.com 首年约 $10–13，免费 WHOIS 隐私保护；
> - **Namesilo**：海外注册商，.com 约 $10–11/年，支持支付宝，隐私保护免费；
> - **腾讯云**：与阿里云类似，.com 首年约 ¥83，支持支付宝/微信。
> Cloudflare Registrar 价格最低但**不支持支付宝**，需要外币卡。

## 3. 注册完成后需要你提供的信息

只需要告诉我"域名已注册好"即可（无需把账号密码给我）。
我会在阿里云（或你选择的注册商）把域名 DNS 托管到 Cloudflare 免费版，
然后按下面的规划配置。

## 4. 注册后我负责的配置

### DNS 记录规划（示例，正式值以部署为准）

| 类型 | 主机 | 值 | 用途 |
| --- | --- | --- | --- |
| A | @ | 185.199.108.153 / 109 / 110 / 111 | GitHub Pages 托管主站 |
| AAAA | @ | 2606:50c0:8000::153 等 4 条 | 主站 IPv6 |
| CNAME | www | berber-233.github.io | www 跳主站 |
| A | api | <服务器 IP> | 后端 API 子域 |
| TXT | @ | v=spf1 -all | 防邮件伪造（SPF） |
| TXT | _dmarc | v=DMARC1; p=none; rua=… | DMARC 报告（后续收紧） |
| TXT | _github-challenge | <GitHub 生成值> | 启用 GitHub Pages 自定义域名时必填 |

> 注意：GitHub 仓库名为 `BeanBeanMouse`，Pages 地址为
> `https://berber-233.github.io/BeanBeanMouse/`；自定义域名在 GitHub Pages 设置里绑定后，
> 无论仓库叫什么，站点都会走 `beanbeanmouse.com`，不受仓库名影响。

### 其他配置

- HTTPS：Cloudflare 全站 SSL（免费证书，自动续期）；
- 邮件：配置 `no-reply@beanbeanmouse.com` 发信通道（SPF/DKIM/DMARC），
  并把后端 `MAIL_FROM` 从 `no-reply@beanbeanmouse.local` 换成正式地址；
- 防伪：站内"官方域名"提示更新为 `beanbeanmouse.com`；
- 部署：主站（GitHub Pages）+ 后端 API（海外 VPS，按目标市场选地域）。

## 5. 常见问题

- **为什么不能由你直接注册？** 注册需要付款和实名/账号，只能由账号所有者（你）完成；
  我负责注册之后的全部技术配置。
- **只注册一个可以吗？** 可以，先用 `beanbeanmouse.com` 上线；
  `beanbeanmouse.cn` 建议尽快补上做国内保护。
- **多久能上线？** 域名生效通常几分钟到 24 小时；DNS 配置 + SSL + 部署
  一般当天可完成。
