# 域名注册指南（BeanBeanDragon 豆豆龙）

> 状态：**已挂起（2026-08-12）**——域名注册在用户侧遇到问题，按用户要求先跳过此部分，
> 等域名问题解决后再继续配置 DNS、SSL、邮件发信与部署。以下内容保留备用。
> 域名已实测可注册，付款与注册需你本人完成（我无法代付）。

## 1. 要注册的域名

| 域名 | 用途 | 参考价格/年 |
| --- | --- | --- |
| `beanbeandragon.com` | 主域名（网站正式地址） | 约 $13–15 |
| `doudoudragon.com` | 拼音保护域名（301 跳转到主域名） | 约 $13–15 |

建议两个都注册：主域名对外使用，拼音域名防止他人抢注后仿冒或截流。

## 2. 推荐注册商：Namecheap

支持支付宝 / PayPal / 信用卡，首年价格约 $10–13，免费 WHOIS 隐私保护
（不公开你的注册信息），DNS 面板简单，国内可正常访问。

### 操作步骤

1. 打开搜索页：
   - `https://www.namecheap.com/domains/registration/results/?domain=beanbeandragon.com`
   - `https://www.namecheap.com/domains/registration/results/?domain=doudoudragon.com`
2. 确认状态为 "Add to cart"（可注册），加入购物车；
3. 结账时选择：注册年限 1 年即可；**开启 WHOIS 隐私保护（免费）**；
4. 支付方式选支付宝 / PayPal / 信用卡完成付款；
5. 注册完成后，在 Namecheap 的 Domain List 里确认两个域名状态为 Active。

> 备选注册商：Porkbun（价格相近，界面友好）、Cloudflare Registrar（按成本价约 $10.60/年，
> 但需要信用卡/美元账户，不支持支付宝）。

## 3. 注册完成后需要你提供的信息

只需要告诉我"两个域名已注册好"即可（无需把账号密码给我）。
我会在 Namecheap（或你选择的注册商）把域名 DNS 托管到 Cloudflare 免费版，
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

> 注意：GitHub 仓库改名后，Pages 地址会变化；自定义域名在 GitHub Pages 设置里绑定后，
> 无论仓库叫什么，站点都会走 `beanbeandragon.com`，不受仓库名影响。

### 其他配置

- HTTPS：Cloudflare 全站 SSL（免费证书，自动续期）；
- 邮件：配置 `no-reply@beanbeandragon.com` 发信通道（SPF/DKIM/DMARC），
  并把后端 `MAIL_FROM` 从 `no-reply@beandbeandragon.local` 换成正式地址；
- 防伪：站内"官方域名"提示更新为 `beanbeandragon.com`；
- 部署：主站（GitHub Pages）+ 后端 API（海外 VPS，按目标市场选地域）。

## 5. 常见问题

- **为什么不能由你直接注册？** 注册需要付款和实名/账号，只能由账号所有者（你）完成；
  我负责注册之后的全部技术配置。
- **只注册一个可以吗？** 可以，先用 `beanbeandragon.com` 上线；
  `doudoudragon.com` 建议尽快补上做保护。
- **多久能上线？** 域名生效通常几分钟到 24 小时；DNS 配置 + SSL + 部署
  一般当天可完成。
