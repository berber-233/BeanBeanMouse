# 邮箱通道开通手册（阿里云邮件推送 DirectMail + Cloudflare DNS）

> 目标：让 beanbeanmouse.com 能发送系统邮件（注册验证、找回密码、询盘通知）。
> 你只需要做第 1–7 步，把第 7 步的 4 个值发我，第 8 步我做。
> 全程约 20–30 分钟（DNS 生效需要等待，建议边等边做第 6 步）。
>
> 本文事实来自阿里云官方文档（2026 年核对）：
> - 计费方式：按**邮件发送量**计费，两种付费方式 = **资源包**（预付费，**有效期 6 个月**，剩余不退不换）和 **按量付费**。
> - 免费发信量：**每个阿里云主账户 2000 封免费额度，每天最多免费 200 封**；初始日额度 2000 封。
> - 触发邮件（注册通知、验证、找密等）**只能通过 API 或 SMTP 发送**——我们的站点正是走 API。
> - 发信域名上限 5 个，发信地址上限 100 个。

---

## 第 0 步：先确认两件事

1. 阿里云账号已**实名认证**（个人或企业都可以）。
2. `beanbeanmouse.com` 的 DNS 在 **Cloudflare** 管理（我们现在的状态就是这样）。

> **不要买"邮件推送资源包"**：那是 6 个月有效期的预付费包，剩余不退。试用期用量很小，
> 直接开**按量付费**即可，而且会**先扣免费额度**（2000 封 / 每天最多 200 封）。

---

## 第 1 步（阿里云）：开通邮件推送

1. 登录阿里云控制台 `https://home.console.aliyun.com/`
2. 顶部搜索框输入 **邮件推送**（英文 DirectMail），进入产品页
3. 点 **开通/立即购买**
4. 付费方式选 **按量付费**（**不要**勾选资源包）
5. 开通后进入 **邮件推送控制台**

---

## 第 2 步（阿里云）：添加发信域名，拿到 4 条 DNS 记录

1. 邮件推送控制台 → 左侧 **发信域名** → **添加域名**
2. 域名填**子域名**（官方建议用子域名，别用主域名）：

   ```
   mail.beanbeanmouse.com
   ```

   > `mail` 这部分你可以自定义，例如 `dm.beanbeanmouse.com` 也行。
3. 提交后，页面会显示 **域名配置**：**4 条记录**，每条都有「主机记录 / 记录类型 / 记录值」三列。
   **把这 4 条原样复制下来**（下一步要用）。
   - 常见组合是：1 条验证 TXT + 1 条 SPF TXT + 1 条 MX + 1 条 DKIM（TXT 或 CNAME）。
   - **以你屏幕上实际显示的为准**，不同类型/区域的记录值不一样。
   - 若页面有 **"自动配置"** 按钮（域名在阿里云注册/托管时才有）——我们的域名在 Cloudflare，
     属于"非阿里购买"，**必须手动配置**。

---

## 第 3 步（Cloudflare）：把 4 条记录加到 DNS

1. 登录 `https://dash.cloudflare.com/` → 选择域名 **beanbeanmouse.com**
2. 左侧 **DNS** → **Records** → 点 **Add record**
3. 按第 2 步复制的 4 条，一条一条加。每条只填三个框：

   | 框 | 怎么填 |
   | --- | --- |
   | **Type** | 选阿里云给的「记录类型」：`TXT` / `MX` / `CNAME` |
   | **Name** | 填阿里云给的「主机记录」。**如果它已经是 `t1`、`aliyun._domainkey.t1` 这种相对形式就照抄**；如果它给的是完整域名（如 `t1.beanbeanmouse.com`），这里就只填 `t1`（Cloudflare 会自动补上 `beanbeanmouse.com`） |
   | **Content / Target** | 粘贴阿里云给的「记录值」（DKIM 那串很长，注意别漏字符） |

4. **两个关键开关**：
   - **CNAME 记录：必须把橙色小云点成灰色（DNS only）**。开着代理（橙云）会让验证失败。
   - **MX 记录**：Cloudflare 会提示"MX 记录不能代理"，确认即可；优先级（Priority）按阿里云给的填（没有就不填）。
   - TXT 记录没有代理选项，默认即可。TTL 保留 Auto。
5. 4 条都加完后，等 **10–20 分钟**（DNS 生效）。

---

## 第 4 步（阿里云）：验证域名

1. 回到 邮件推送控制台 → **发信域名** → 找到刚添加的域名
2. 点 **验证**（有的界面叫"验证 DNS 配置"）
3. 看到状态变成 **已验证 / 正常** 就通过了
4. 如果失败：等 20 分钟再点一次；仍失败就核对第 3 步的 Name 有没有多写/少写域名后缀，以及 CNAME 是否已取消代理

---

## 第 5 步（阿里云）：创建发信地址

1. 邮件推送控制台 → **发信地址** → **新建发信地址**
2. 选择类型：**触发邮件**（注册通知、交易通知、**验证找密**都属于这一类）

   > 官方明确：触发类邮件只能通过 API 或 SMTP 发送；批量营销邮件才走控制台/模板。
   > 我们发的都是触发邮件，选"触发邮件"通道，否则可能发不出去。
3. 发信地址填：

   ```
   no-reply@mail.beanbeanmouse.com
   ```

   （`@` 后面必须是第 4 步验证通过的那个域名）
4. 回信地址填你自己的常用邮箱：`hello@beanbeanmouse.com`（客户回信会到这里）
5. 发件人昵称填：`豆豆鼠 BeanBeanMouse`

---

## 第 6 步（阿里云 RAM）：创建只发邮件的子账号

**不要用主账号的 AccessKey**（主账号 AK 等于账户总钥匙）。

1. 阿里云控制台右上角头像 → **访问控制 RAM**（或搜索 "RAM"）
2. **用户** → **创建用户**：名称如 `beanbeanmouse-mailer`
   - 勾选 **使用永久 AccessKey 访问**（OpenAPI 调用方式）
   - **不要**勾选"控制台访问"
3. 创建完成后**立刻复制** `AccessKey ID` 和 `AccessKey Secret`（Secret **只显示这一次**，页面刷新后就看不到了）
4. 给这个用户授权（二选一）：
   - **省事的**：权限策略里搜索并勾选系统策略 `AliyunDirectMailFullAccess`
   - **更小权限（推荐）**：新建自定义策略，只给"发单封邮件"这一条：

     ```json
     {
       "Version": "1",
       "Statement": [
         { "Effect": "Allow", "Action": ["dm:SingleSendMail"], "Resource": ["*"] }
       ]
     }
     ```

     然后把该策略授权给 `beanbeanmouse-mailer`。

---

## 第 7 步：把这 4 个值发我（**这是唯一需要你给我的东西**）

```
1) AccessKey ID      ：
2) AccessKey Secret  ：
3) 发信地址          ：no-reply@mail.beanbeanmouse.com
4) 发件人昵称        ：豆豆鼠 BeanBeanMouse
（区域默认 cn-hangzhou，若控制台选了别的区域请一并说明）
```

> 安全说明：Secret 我只写进 Cloudflare 的加密变量（Secret），**不会**出现在代码或 GitHub 仓库里
> （仓库有 `npm run scan:secrets` 自检，历史里也没有任何密钥）。

---

## 第 8 步（我做）：接入并测试

我会执行：

1. `wrangler pages secret put ALIYUN_DM_ACCESS_KEY_ID / ALIYUN_DM_ACCESS_KEY_SECRET`（加密写入）
2. 在 `wrangler.jsonc` 里设置：
   - `MAIL_TRANSPORT` = `aliyun`
   - `MAIL_READY` = `1`（**这一项打开后，登录页才会出现"忘记密码"入口**）
   - `ALIYUN_DM_ACCOUNT` = 你的发信地址、`ALIYUN_DM_FROM_ALIAS` = 发件人昵称
   - `ALIYUN_DM_REPLY_TO` = `hello@beanbeanmouse.com`
3. 重新部署，然后用站点自己的接口发一封测试信给你，并检查后台 `/admin/mail-status` 是否 `sent`
4. 通知你验收：注册一个新邮箱 → 收到验证邮件；点"忘记密码" → 收到重置邮件

---

## 如果卡住了怎么办

| 卡在哪 | 说明 | 备选方案 |
| --- | --- | --- |
| 添加发信域名时提示**需要备案** | 官方"配置步骤"文档里没写备案要求，但不同账号/区域可能追加要求。遇到就把提示截图给我 | 换腾讯云邮件推送（同样支付宝付款，我再写一个通道），或开外币卡用 Cloudflare Email Sending（$5/月） |
| 域名验证一直失败 | 90% 是 Cloudflare 里 CNAME 还开着橙云代理，或 Name 多写了 `.beanbeanmouse.com` | 按第 3 步第 4 点逐条核对 |
| 发信成功但进垃圾箱 | 新域名需要"预热"，SPF/DKIM 生效后逐步好转 | 先给常见邮箱（QQ/Gmail/Outlook）各发一封，让信誉积累；正式群发前避免短时间大量发送 |

---

## 附：轮换 AccessKey（建议定期做，或密钥外泄后立刻做）

> 背景：AccessKey Secret 只要在聊天、邮件、截图里出现过，就应该视为"已外泄"。
> 轮换的原则是**先建新、再换用、最后删旧**，中间不停服。

### 命名建议

| 用途 | 建议名称 | 说明 |
| --- | --- | --- |
| 站点邮件发送（当前） | `beanbeanmouse-mailer` | 只做发信，权限只给邮件推送 |
| 以后若接对象存储/附件 | `beanbeanmouse-storage` | 一个服务一个子账号，互不影响 |
| 以后若接部署自动化 | `beanbeanmouse-deploy` | 只给 Pages/D1 相关权限 |

命名规则：1–64 个字符，可用英文字母、数字、`.`、`_`、`-`；不要用中文。
**绝不使用主账号 AccessKey**，也不给子账号"控制台登录"权限（只需要 OpenAPI 访问）。

### 操作步骤（阿里云控制台）

1. 进 **访问控制 RAM** → **用户** → **创建用户**
   - 登录名：`beanbeanmouse-mailer`
   - 访问方式：只勾 **OpenAPI 调用访问（使用永久 AccessKey）**
2. 授权：给该用户挂 **`AliyunDirectMailFullAccess`**
   （或自定义策略：`{ "Version": "1", "Statement": [{ "Effect": "Allow", "Action": "dm:*", "Resource": "*" }] }`）
3. 进该用户 → **认证管理 / AccessKey** → **创建 AccessKey**
4. 复制 `AccessKey ID` 和 `AccessKey Secret`（Secret 只显示一次）
5. 把这两个值发给开发者（我），我会：
   - 写入 Cloudflare Pages 加密变量（`ALIYUN_DM_ACCESS_KEY_ID` / `ALIYUN_DM_ACCESS_KEY_SECRET`）
   - 用 `/admin/mail-config-check` 核对长度与哈希前缀（不回显明文）
   - 发一封真实测试邮件，确认返回 `status = sent`
6. **确认新钥匙能发信后**，再回 RAM 把**旧 AccessKey 禁用/删除**（先禁用观察一天更稳妥）

> 一台 RAM 用户最多可有 2 个 AccessKey，所以"先建新、后删旧"完全可行，不会中断发信。

## 附：官方硬性要求（影响我们邮件模板，已遵守）

- 邮件正文要有**称呼**与**合规内容**，不要出现二维码、微信、QQ、Facebook、网盘等社交/资源分享类信息。
- 只允许给**自己站内注册/订阅的用户**发信，禁止买名单发"开发信"。
- 触发邮件只能通过 **API / SMTP** 发送。
- 免费额度：**2000 封，每天最多 200 封**；初始日额度 2000 封。
