# 项目待办清单（随时更新）

> 用途：记录所有待办，用户提及时按此清单告知进度与下一步。

## 一、已定稿（2026-08-12）

- [x] **品牌名**：中文"豆豆鼠"，英文"BeanBeanMouse"（GitHub 仓库已改名 BeanBeanMouse）
- [x] **吉祥物**：AI 生成的 Q 版仓鼠送货员（`assets/mascot.jpg`），用户确认不再更改
- [x] **防伪码前缀**：`BBM-`（随品牌统一更新）
- [x] **本地文件**：全项目名称/文案/代码统一为 BeanBeanMouse（豆豆鼠）

## 二、部署状态（2026-08-13）

- [x] **域名注册**：`beanbeanmouse.com` 已在 Cloudflare 注册（DNS 为空，待绑定）
- [x] **Cloudflare Pages 部署**：项目 `beanbean-mouse`，直接上传部署（wrangler）
- [x] 绑定自定义域名 `beanbeanmouse.com` + `www`（均已 active）
- [x] 验证 https://beanbeanmouse.com 核心流程（15 项选择操作全通过、零报错）
- [x] 上线查漏补缺：SEO（robots/sitemap/meta/OG）、安全头、404、www→主域 301
- [x] 复核 www→主域 301：已生效（Worker 方案；`_redirects` 不支持域名级跳转）
- [ ] 提交 Google/Bing/百度收录

## 二之二、后端 API 与核心功能（2026-08-14 完成）

- [x] 后端 API：注册（邮箱验证 + 蜜罐防机器人 + 限流）、登录需已验证邮箱
- [x] 卖家注册需提交真实公司/工厂资料，管理员审核通过后才能发布产品（驳回附原因）
- [x] 交易订单：买家确认签收 = 交易达成；小费打赏（双方可见、可选、可取消）+ 鼠鼠捧碗图
- [x] 品类需求记录：用户提交 → 管理员标记已邀请/完成（据此邀请供应商入驻）
- [x] 贸易资讯：实时更新时间 + 权威来源（多区域），管理员可发布与 RSS 刷新
- [x] 安全：scrypt 密码哈希、限流、蜜罐、令牌只存哈希、安全响应头、CORS 可配置
- [x] 测试：后端 107 项 + 前端 164 项全绿
- [x] 后端正式部署（**已选 Pages Functions + D1**，2026-09-11 上线见第十三节）——
      线上 API 已可用：https://beanbeanmouse.com/api/*；前端仍为 mock 模式，切换条件见第十三节
- [ ] 真实 SMTP 发信与 DeepL 密钥（通道已就绪，待填凭据）
- [ ] Cloudflare Turnstile 人机验证（当前为蜜罐 + 邮箱验证 + 限流）
- [x] 资讯 RSS 定时自动刷新（默认每 6 小时，可配置；手动刷新保留）

## 三、待我执行（依赖前端上线）

- [ ] 后端 API 部署（VPS/Docker 或 Pages Functions + D1）
- [ ] 邮件发信：SPF/DKIM/DMARC + SMTP 真实通道
- [ ] 真实翻译密钥（DeepL）接入
- [ ] 支付/托管接入（用户选方案后，主体到位优先）
- [ ] 佣金与打赏功能、风控规则、结算对账（商业闭环）
- [ ] 商标检索（美国 / 欧盟 / 中国）
- [ ] 海外公司主体注册（收款通道前提）
- [ ] 冷启动运营：先选 1–2 个垂直品类 + 1 个目标市场跑通
- [x] 物流轨迹与货损保险选项（物流时间线 + 三档保险已落地）
- [ ] 无障碍 WCAG 2.1 基础（已补跳到主内容、聊天 aria-live、RTL 修复；对比度与完整审计待做）

## 四、上线后常规监控

- [ ] 支付失败率、拒付率、翻译质量回访、邮件送达率、页面性能

## 五、2026-08-18 升级（像素动画 / 保险 / 合同保管 / 试验提示 / 支付合规框架）

### 已完成
- [x] **像素风 Flash 动画**：运输动画改为 96x32 像素 GIF（陆=马车、海=三桅帆船、空=空艇），
  12 帧循环"出发→运输中→到达"；按订单运输方式自动切换（`assets/pixel/transport-*.gif`）。
- [x] **形象化仓鼠插画框架**：陆运/海运/空运/保险员四位角色，32x32 像素、前后左右四方向 ×2 呼吸帧，
  中世纪风格服饰（绿衣皮帽/水手帽白衣/护目镜围巾/红十字符袍），图集 + 元数据见 `assets/pixel/hamsters*.png|json`；
  动画场景后续按角色逐步替换（先保留通用骑手）。
- [x] **第三方运输保险**：订单内投保（基础/标准/尊享三档）、保单双方可见、可取消；
  后端 `insurance_providers`/`insurances` 表 + 接口；试点计划已启用，合作保险商占位（待接入）。
- [x] **合同草案与 30 天平台保管**：`/contracts` 页按订单生成国际货物买卖合同草案（双语字段）、
  5 项漏洞/风险提示、打印下载 PDF；可申请平台免费保管 30 天（哈希留痕、双方可查）。
- [x] **试验阶段提示**：全站顶部 Beta 横幅 + 商务合作邮箱（`694113406@qq.com`，即运营者 GitHub 邮箱）。
- [x] **支付金融合规框架**：`docs/payments-compliance-roadmap.md` + `backend/src/payments.mjs` 占位模块
  （无主体前禁止真实收款）。
- [x] 测试：后端 107 项、前端 164 项全绿；构建与推送完成。

### 待办（下一步）
- [x] 商务合作邮箱已替换为 GitHub 邮箱 `694113406@qq.com`（2026-08-18）。
- [ ] 真实合作保险商接入（牌照/备案、费率、理赔 API）；保险理赔流程与条款由法务审核。
- [ ] 合同模板由律师/法务审定后固化（当前为参考草案）；PDF 增加电子签章能力。
- [ ] 支付主体到位后按合规路线图接入 PSP 托管支付、佣金与打赏结算。
- [x] 像素动画按"空运仓鼠/海运仓鼠/陆运仓鼠"替换场景骑手（2026-09-11：改为 AI 角色设定图 + Seedance 场景视频；
      保险员角色按用户要求剔除）。
- [ ] 前端回归数量与 CI 工作流保持同步；美术已重制，**待用户确认后可推送/部署**。

## 六、2026-08-21 v0.1（外贸流程查漏补缺，缺口 1/2/4/5/6）

### 已完成
- [x] **缺口 1 出口侧资质与前置手续**：`#/export` 公开指南 + 卖家工作台「出口资质」清单（7 项）、
  就绪度评分、发布页缺口提示；覆盖进出口权/海关备案、收汇、退税、出口许可证、法检、原产地证、危险品资质。
- [x] **缺口 2 单证流转细节**：订单「单据中心」生成商业发票 / 装箱单 / 原产地证（参考）/ 提单（参考），
  打印与 PDF，单证一致性核对（品名 / HS / 数量 / 唛头），生成动作写入存证链。
- [x] **缺口 4 物流落地**：`#/logistics` 指南（运输方式、拼箱/整柜、6 目的港费用、电放提单、运费估算器）；
  发货单新增柜型 / 船名航次 / 提单号 / 运费条款 / 电放选项，物流卡展示。
- [x] **缺口 5 合规纵深**：`#/compliance` 合规中心（出口管制 / 制裁名单 / 贸易救济 / 产品环保法规）；
  产品文本演示筛查，产品详情与管理员审核展示筛查结果（正式版接权威名单 API）。
- [x] **缺口 6 售后与纠纷**：`#/disputes` 售后纠纷中心 + 管理后台「纠纷仲裁」：
  买家申请售后 / 发起纠纷 → 卖家回复 → 管理员裁决（买家 / 卖家 / 双方协商），关键节点自动存证。
- [x] 测试：前端 verify 201 项、API 冒烟 25 项全绿；后端 107 项无回归；零页面报错。
- [x] 版本：全站页脚 v0.1（演示），`package.json` 0.1.0，README 更新。

### 保留待办（支付，待网站完成度 ~98% 后单独打磨）
- [ ] **缺口 3 支付与收汇**：收汇 / 结汇 / 汇率风险（远期锁汇）、L/C 审证要点（软条款）、
  出口信用保险、PSP 托管支付、佣金与打赏结算、对账风控（沿用 `docs/payments-compliance-roadmap.md` 框架）。
- [ ] 后端 API 为上述新模块补齐端点（exports/documents/after-sales/compliance/logistics），
  当前为前端 mock + 存证本地实现，`openapi.yaml` 与 `er-diagram.md` 同步更新。

## 七、2026-08-23 v0.2（体验 / 品类 / 附件 / 身份 / 建议收集）

### 已完成
- [x] **品类扩充**：新增运动户外、礼品工艺品、五金工具、宠物用品 4 类 + 8 个示例商品（共 10 类）；
  首页「品类速览」横向轻扫条，不挤占纵向空间。
- [x] **搜索与推荐**：产品市场搜索栏（联想词 datalist）；无精确结果时按相关性推送「相关推荐」。
- [x] **视觉打磨**：卡片悬浮、焦点态、渐变 hero、滚动条、reduced-motion 适配。
- [x] **对话导出与附件**：询盘导出 TXT / HTML（含图片）；询盘/报价附件（图片 + ZIP/RAR/7Z ≤4MB）上传、预览与下载。
- [x] **身份与名片**：注册区分个体户 / 公司代表；个人中心资料完整度 + 名片上传；
  询盘身份标注与「随询盘发名片」；对方查看/下载名片自动加轻量水印。
- [x] **名片模板**：5 套预设模板（经典暖金 / 低调奢华 / 简约留白 / 现代科技 / 东方雅韵），
  个人中心一键用资料生成名片；「自定义」= 上传自己的名片图片。
- [x] **建议收集窗口**：`#/feedback` 提交页 + 管理后台「优化建议」标签（已读 / 已采纳）。
- [x] **站内消息与通知**：买家 / 卖家「消息」页（询盘会话 + 聊天 + 未读角标），
  顶栏通知铃铛（全部已读）；新询盘 / 报价 / 售后 / 建议结果自动通知。
- [x] **后端 v0.2 接口对齐**：profile / suggestions / after-sales / 订单单据 / exports / 
  card-templates / compliance / logistics 接口 + 双 schema 数据表，后端测试 124 项全绿。
- [x] **存储与水印架构**：`api.files` 上传服务（mock + http），附件带 `fileId/storage` 字段；
  后端 `/files` 支持 SVG 服务端水印；栅格图水印仍前端 Canvas（正式版接对象存储边缘）。
- [x] 测试：前端 verify 228 项、API 冒烟 31 项全绿；后端 124 项无回归；版本 0.2.0。

### 待办
- [ ] 支付 / 收汇（缺口 3）：完成度 ~98% 后单独打磨（沿用支付合规路线图）。
- [ ] 名片水印正式版可由服务端合成（当前为前端 Canvas 水印），避免大图在前端渲染的性能开销。
- [ ] 名片模板正式版支持：自定义 Logo / 配色 / 字体上传，模板中心页面与商家可自行发布模板。
- [ ] 附件存储正式版接入对象存储（当前为 localStorage dataURL 演示，注意容量上限）。
- [ ] 附件 / 名片正式版切换对象存储（R2/S3）：前端 `fileId` 字段与 `api.files` 已就绪，
  需接存储桶 + 签名 URL，并把名片水印改为服务端合成（含栅格图）。
- [ ] 消息实时性：当前前端为本地 mock，后端 REST + WebSocket 已就绪，切 `http` 模式即用；
  已读回执与 WS `read` 广播已落地（`conversation_reads` + `/conversations/{id}/read`）；
  前端 http 模式的 WS 推送客户端待联调。

## 八、2026-08-29 优化批次（消息实时化 / 测试与 CI / 无障碍 RTL / CSV 导出）

### 已完成
- [x] 已读回执：`conversation_reads` 表（SQLite + PG）、`GET/POST /conversations/{id}/read`、
  WS `read` 广播；聊天气泡显示「已读」，打开会话自动上报。
- [x] mock 自动回复：发送消息后模拟对方回复，让演示聊天更真实（http 模式走真实后端）。
- [x] CSV 导出：订单 / 询盘列表「导出 CSV」（UTF-8 BOM）。
- [x] 无障碍：跳到主内容快捷键（不产生横向溢出的实现）、聊天区 aria-live；
  修复 RTL（阿拉伯语）下跳转链接导致全站横向溢出（11279px → 0）。
- [x] CI：`playwright-core` 加入 devDependencies；测试脚本浏览器路径支持
  `PLAYWRIGHT_EXECUTABLE` 环境变量 + Windows Edge / Linux Chrome 回退；
  GitHub Actions 新增 `frontend-tests` job。
- [x] 种子数据补 `sellerId`：卖家用户与产品 sellerId 关联，通知 / 已读回执可正确路由。
- [x] 测试：前端 verify 237 项、API 冒烟 32 项、后端 126 项全绿。

### 待办
- [x] 前端 http 模式 WS 推送客户端联调（`api.messages.live`，2026-08-30 完成）。
- [x] WCAG 对比度令牌修正与焦点可见性（2026-08-30 完成；完整 AAA 级审计可后续做）。

## 九、2026-08-30（前 4 项解决 + 6/7/10 就绪）

### 已完成
- [x] **消息实时性（第 1 项）**：后端 REST 消息/已读广播 + WS `read` 广播；
  前端 `api.messages.live` WS 客户端，切 `http` 模式即用。
- [x] **无障碍（第 2 项）**：WCAG 对比度令牌修正（`--primary #8F5E0A`、`--danger #B03535`、
  `--muted #6F5C3E`、成功绿文字 #126A33、页脚灰字、帮助角标），聚焦可见性保留。
- [x] **对象存储（第 3 项）**：`storage-s3.mjs` 零依赖 SigV4 适配器 + 驱动切换
  （`STORAGE_DRIVER` 由 `S3_*` 环境变量自动启用）；上传/读取改 async。
- [x] **名片模板自定义（第 4 项）**：主色 / 楷体·衬线·无衬线字体 / Logo 上传，
  `renderCardTemplate(tplId, fields, opts)` 支持自定义，个人中心一键生成。
- [x] **Turnstile（第 6 项就绪）**：`/verify-turnstile` + 注册强制校验 +
  前端占位（无密钥时自动跳过）；`TURNSTILE_SECRET` 填上即生效。
- [x] **部署手册（第 7 项就绪）**：`docs/deploy-backend.md`（VPS/Docker + Pages Functions 路线 +
  环境清单 + systemd 示例）。
- [x] **SEO 收录（第 10 项就绪）**：`scripts/gen-sitemap.mjs`（33 条 URL）+ 
  `docs/seo-submission.md`（Google/Bing/百度提交流程与注意点）。
- [x] 测试：前端 verify 237、API 冒烟 32、后端 128 全绿。

### 剩余待办
- 支付 / 收汇与佣金结算（完成度 98% 后 + 收款主体）。
- 真实 SMTP / DeepL / Turnstile / R2 上线：凭据填好后按手册走一遍联调。
- 后端正式部署（按 `docs/deploy-backend.md` 执行）。
- 真实保险商、合同模板法务审定、电子签章。
- 商标检索、海外主体、冷启动选品。
- 搜索引擎收录提交（按 `docs/seo-submission.md` 执行）。
- 名片水印正式版服务端合成（对象存储边缘）。

## 十、2026-09-07 宠物垂直 + 素材 / 信任 / 支付通道

### 已完成
- [x] **宠物用品首发垂直**：仓鼠与小宠 / 猫 / 小型犬 / 大型犬（金毛·边牧等）/
  美容清洁 / 玩具训练 6 细分；新增 8 款商品，宠物在售共 10 款；
  首页眉标“首发垂直·宠物用品”、热搜与精选宠物优先。
- [x] **市场细分筛选**：选大类后可再按细分/适用宠物过滤（如“大型犬用品”）。
- [x] **详情相关推荐**：同细分/同大类商品。
- [x] **真实商品素材方案**：卖家可上传实拍图（≤8 张、≤4MB/张），
  卡片/画廊/推荐/卖家主页优先显示真实图，无图回退占位；规范见 `docs/product-assets.md`。
- [x] **卖家信任主页**：`#/seller/:id`（企业信息、认证、出口就绪度、服务指标、
  认证与目标市场、在售商品 + 直达询盘）；详情页卖家卡加入口。
- [x] **支付先接 PayPal**：`api.payments`（providers/checkout/markPaid）+ 订单“PayPal 支付（演示）”
  弹窗，明确标注不产生真实扣款；后续再扩其他渠道。
- [x] 测试：verify 237、api-smoke 32、后端 128 全绿（本轮后端未改动）。

### 待办
- [x] 给演示商品生成 AI 实拍风占位图（2026-09-11：Seedream 出图 10 款宠物 SKU，落在 `assets/products/p23…p32/1.jpg`）。
- [ ] PayPal 真实接入：商户入驻 + Sandbox 凭据 + 服务端订单/回调验签；其他渠道后续扩展。

## 十一、2026-09-11 Codex「Duplicate namespace name」死会话修复

### 已完成
- [x] **定位根因**：Codex Desktop 26.903.71938 / CLI 0.153.4 在同一回合调用两次
  `tool_search` 时，会把同一批 MCP 命名空间重复写入请求 `input`，服务端返回
  `Duplicate namespace name ... Namespace names must be unique.`；该错误随历史
  回放，导致此会话之后**每一轮都失败**（线程死锁）。属内核缺陷，无用户侧开关
  （`codex features list` 中 `tool_search` / `js_repl` 均为 removed）。
- [x] **修复工具**：`scripts/fix-duplicate-namespaces.mjs`（零依赖，默认干跑，
  `--apply` 写回并自动备份，`--sync-projection` 对齐历史库字节偏移）。
- [x] **修复受损会话**：2 个 rollout 已修（各带 `.bak-2026-09-11T07-17-06-*` 备份）；
  复扫 47 个文件 = 0 待修，JSON 全部可解析。
- [x] **规避规则**：写入全局 `~/.codex/AGENTS.md`——单回合最多一次 `tool_search`，
  需要二次检索时等下一个用户回合。
- [x] **说明文档**：`docs/codex-duplicate-namespace-fix.md`（现象/根因/用法/回滚/上游复现要点）。

### 待办
- [ ] 实机验证：取消归档那两个会话，续聊确认不再报错。
- [ ] 升级 Codex 后复跑 `node scripts/fix-duplicate-namespaces.mjs` 自查。
- [ ] （可选）清理 `thread_history_1.sqlite` 中 7 条历史 `error_json` 留痕——需先确认对 UI 展示的影响。

## 十二、2026-09-11 全量自查 + 不利因素速查

### 检测结果
- [x] 前端回归 `node test/verify.cjs`：ALL CHECKS PASSED
- [x] 前端 API 冒烟 `node test/api-smoke.cjs`：ALL API SMOKE CHECKS PASSED
- [x] 后端 `node backend/test/api.test.mjs`：128 项全绿；SMTP、WS 测试均通过
- [x] 语法检查 app/app-core/app-pages/api/data/backend server 全通过

### 查出并修复的不利因素
- [x] **sitemap 漏收录 8 款新品**：此前只到 p24，宠物垂直新增的 p25–p32 未进 sitemap
  → 已重跑 `scripts/gen-sitemap.mjs`（45 条 URL），并补齐 customs/insurance/contracts/recruit 四个分区。
- [x] **sitemap 收录的干净路径线上 404**（实测 `/products`、`/feedback` 均 404）：
  站点是 hash 路由，而 sitemap 写的是干净路径 → 新增 `_redirects`，
  12 条 301 到 `/#/xxx`；前端 `app-core.js` 再加一层兜底改写；`build-site.mjs` 已把
  `_redirects` 打进 dist。
- [x] **GitHub Pages 工作流把仓库根目录当网站发布**：会把 `backend/` 源码、`docs/`
  （威胁模型、安全报告、openapi）、`test/`、截图全部公开，并与 Cloudflare Pages
  正式站形成重复内容 → 改为只构建并发布 `dist/`。
- [x] **防复发**：新增 `scripts/check-consistency.mjs`（校验 sitemap ↔ data.js ↔
  `_redirects` ↔ 前端路由 ↔ 构建清单 ↔ index.html 引用），已接入 CI。
- [x] **第三方翻译链收敛**：一页几十个 `[data-l10n]` 原先并发打第三方公共接口，
  实测大面积 429；现已加并发闸门（最多 3）+ 相同原文合并；并移除
  `libretranslate.com`（已需 API key 且不返回 CORS 头，浏览器必预检失败，纯浪费往返）。
  真实 DeepL 服务端通道仍是待办（见第三节）。

### 速查未发现问题的项
- [x] 无硬编码密钥：全仓库 `git grep` 扫描 sk-/AKIA/ghp_/PRIVATE KEY/client_secret 均无命中，
  `.env` 已被 gitignore，只提交 `.env.example`。
- [x] `backend/uploads/`、`dist/`、`work/`、`node_modules/` 均未被 git 跟踪（本地测试残留，已忽略）。
- [x] 安全响应头齐全（CSP / HSTS 由 Cloudflare 层负责、nosniff、SAMEORIGIN、Referrer-Policy）。
- [x] `robots.txt`、`404.html`、`.nojekyll`、canonical、OG 均正常。

### 遗留（不阻塞）
- [ ] `screenshots/` 有 56 张 QA 截图，单张最大 3.3MB，占仓库体积偏大；如需瘦身需另开一轮
      （会改写历史，建议单独决定）。
- [ ] `pixel-art/` 为早期像素画实验产物，与当前站点无引用关系，可择机归档或移出。
- [ ] `commit.ps1` 里的提交信息是早期的写死文案，且 `git add -A` 可能误提交未忽略的文件；
      建议改用 `npm run commit -- "message"` 或删掉该脚本。

## 十三、2026-09-11 后端正式部署（Cloudflare Pages Functions + D1）

### 已完成
- [x] **架构决定**：后端采用 Cloudflare Pages Functions + D1（用户选定），不再走 VPS/Docker。
- [x] **代码合并为单一实现**：`backend/src/server.mjs` 的 1650 行路由逻辑抽成平台无关的
      `backend/src/app.mjs`（`createApp({env, deps})`），Node 与 Workers 共用同一份业务代码：
      - `backend/src/server.mjs` = Node 适配器（`node:http` + `node:sqlite` + 本地磁盘 + SMTP）
      - `functions/api/[[path]].js` = Workers 适配器（Fetch API + D1 + R2 占位）
      - `store.mjs` / `storage.mjs` / `mailer.mjs` = 可注入门面；`platform.mjs` = WebCrypto 同构层
- [x] **加密层迁移**：`node:crypto` 的 scrypt/HMAC 改为标准 WebCrypto（PBKDF2-SHA256 + HMAC-SHA256），
      两端通用（PBKDF2 迭代次数由 `PBKDF2_ITERATIONS` 控制，默认 100000）。
- [x] **D1 落地**：创建 `beanbeanmouse-db`（region WNAM，id `0d3575be-…ef54`），
      `migrations/0001_init.sql` 建 34 张表，本地与远程均已应用。
- [x] **上线验证**：https://beanbeanmouse.com/api/products、/auth/login、/auth/me、
      /card-templates、/logistics/estimate、/news 线上实测通过。
- [x] **修掉一个上线才会暴露的问题**：未配 `JWT_SECRET` 时每个 isolate 各自生成随机密钥，
      导致登录成功但 `/auth/me` 401。已用 `wrangler pages secret put` 写入随机密钥并复验通过。
- [x] **回归**：后端 128 项、SMTP、WS、前端冒烟 31、页面回归 237 全绿（验证共享核心与重构前等价）。

### 待办（切换到真实后端前必须解决）
- [ ] **邮件通道**（🔴 阻塞）：`MAIL_TRANSPORT=mock` 只把邮件写进 D1 的 mail_outbox，
      用户拿不到验证链接 → 注册后无法登录。需接 SMTP 或 HTTP 邮件服务后再切换前端。
- [ ] **前端切 http 模式**（🔴）：`api.js` 的 `API_CONFIG.mode` 仍是 `mock`。
      切换后线上即用真实后端（数据不再只存浏览器）。
- [ ] **R2 未开通**（🟡）：账号需要在 Cloudflare 控制台启用 R2；未启用前附件/名片上传返回
      503「文件存储暂不可用」（前端会提示，不会静默丢文件）。开通后取消 `wrangler.jsonc`
      里 R2 绑定注释并创建 `beanbeanmouse-files` 桶即可。
- [ ] **演示账号口令**（🔴 试用前必改）：seed 写入的 `admin@demo.com / admin123` 等演示账号
      带有 admin 角色，公开 API 下必须改口令或设 `SEED_DEMO=0` 用干净库。
- [ ] **实时消息**（🟡）：Pages Functions 不支持 WebSocket，聊天实时推送需改用 Durable Objects；
      当前 REST 收发正常，WebSocket 仅 Node 侧保留。
- [ ] **资讯定时刷新**（🟡）：Workers 侧 `NEWS_AUTO_REFRESH=0`，需要时改用 Cron Triggers。

## 十三、2026-09-11 全站美术重制（AI 原始出图标准）

### 已完成
- [x] **出图标准落地**：图片 `doubao-seedream-5-0-pro-260628`、视频 `doubao-seedance-2-5-260628`；
      **原始出图直接使用**，只做等比缩放 / 居中裁切 / 格式转换，规范见 `docs/art-assets-status.md`。
- [x] **主吉祥物重制**：`assets/mascot-main.jpg`（1024）、`assets/mascot-icon.png`（256 圆形）、
      `assets/help-banner.jpg`（帮助面板横幅）；接入 OG/分享图、favicon、导航 Logo、帮助浮标与面板、
      登录页品牌图、名片水印条。
- [x] **打赏图重制**：`assets/tip-hamster-empty.png` / `tip-hamster-full.png`（512），
      替换旧的矢量空碗/金币碗（4 处引用 + 回归断言同步更新）。
- [x] **角色多角度设定图**：陆运 / 海运 / 空运 三位角色，每位 4 视角（正/侧/背/四分之三），
      共 12 张，存 `docs/art/characters/`（不部署）；**保险员角色已剔除**。
- [x] **角色接入网站**：镖局头部头像按运输方式自动切换（`assets/pixel/characters/*-icon.jpg`）。
- [x] **运输动画全部重做**：三幕改为 Seedance 图生视频（1280×720 / 5.06 秒 / 16:9），
      再用本机 Chrome MediaRecorder 压成 VP9/WebM（6.1/6.8/4.2MB → 518/539/497KB）；
      页面从 `<img gif>` 升级为 `<video muted loop playsinline poster>`，进入视口才播放、
      离开即暂停，`prefers-reduced-motion` 下只显示封面。
- [x] **细节补齐**：进度条上的 📦 emoji 换成内联像素包裹 SVG（配色取自站点色板）；
      帮助浮标加入呼吸待机动效（reduced-motion 下自动关闭）。
- [x] **演示商品图**：宠物垂直 10 款 SKU 的写实商品主图（800×800），
      `product-image-map.js` 已重生成，卡片/画廊/推荐/卖家主页自动启用。
- [x] **旧资产归档**：43 个被取代的占位文件移入 `legacy/2026-09-11/`（移动非删除，可回滚，不进部署包）。
- [x] **自查**：`check-consistency` OK；前端 verify 全绿（含新增视频/头像/包裹 4 项断言）、
      API 冒烟全绿、后端 128 项全绿、零页面报错。

### 待办
- [ ] **等用户确认后推送到仓库**（本轮改动未提交、未推送，也未部署生产）。
- [x] 视频码率压缩（`work/compress-video.mjs`，VP9/WebM ≈500KB/支；mp4 母版留在 `outputs/video/`）。
- [ ] 角色设定图补顶视/底视（`design-guide.md` 第 4 节要求 6 视角，当前 4 视角）。
- [ ] `legacy/2026-09-11/`、`pixel-art/` 旧脚本是否移出仓库，需单独决定。

## 十四、2026-09-11 第二轮：循环视频优化 + 像素风 UI

### 第三轮修正（用户验收反馈）
- [x] **空运方向**：重出首帧（艇首朝右、螺旋桨在左）+ 提示词加"不得掉头"。
- [x] **陆运原地踏步**：提示词改为"镜头跟随 + 背景持续向左掠过"的视差滚动，
      并给循环窗口搜索加"背景必须动"硬约束；背景动感 2.29 → **6.54**。
- [x] **海运海鸥**：首帧与提示词都去掉海鸥/飞鸟。
- [x] **指标升级**：`work/loop-check.mjs` 增加「背景动感」列与"原地踏步"判定；
      `work/make-loop2.mjs` 剔除背景静止的候选窗口。
- [x] 三支复验：接缝 2.87 / 3.46 / 3.08，均"无缝良好 / 动感充足 / 背景在动 / 无硬切"。

### 已完成
- [x] **循环视频重做**（Seedance `doubao-seedance-2-5-260628` 重新出片 + 循环优化）：
      提示词改为"完整周期 + 首尾帧一致 + 镜头固定"，再走 `work/make-loop2.mjs`：
      全片搜索"首尾最相似且动感达标"的循环窗口 → 尾部 0.6s 交叉淡化收敛回首帧 → 实时逐帧录制 VP9。
      接缝指标：陆运 18.8→**3.50**、海运 20.6→**3.07**、空运 29.0→**2.93**（均"无缝良好 / 动感充足 / 无硬切"）。
- [x] **体积**：6.1/6.8/4.2MB → **289/337/333KB**（VP9/WebM，页面进入视口才播放）。
- [x] **像素风 UI**：新增 17 个像素图标（10 个分类 + 包裹/放大镜/盾牌/信箱/工具/用户/资讯），
      洋红底抠透明（0% 残留）落位 `assets/pixel/ui/`；接入首页品类胶囊、品类卡与 10 处空状态。
- [x] **控件像素化**：胶囊、品类卡、chip、badge、按钮改为方形硬边 + 阶梯投影 + 按下位移；
      图标补齐 `width/height` 与 `loading="lazy"`，reduced-motion 照常降级。
- [x] **自查**：一致性 OK；前端 verify 全绿（新增 5 项像素 UI 断言）；循环/播放/抠图三项专项质检全过。

### 待办
- [ ] **`doubao-seedream-5-0-260128` 不可用**：该 ID 在本账号下无论怎么传参都返回
      `InvalidParameter: unable to decode '' as int64`（换 `-pro-260628` 即正常），
      已写入 `docs/art-assets-status.md`；需在方舟控制台核对开通状态 / 是否要用 endpoint ID。
- [ ] 循环时长目前为窗口长度 3.25–3.42s（非整段 5s）：若要求 5s 循环，
      需在提示词里明确给出循环周期，或改用可指定循环点的生成方式。
- [ ] **等用户确认后提交与推送**（本轮仍未 commit / 未 push / 未部署）。
