# BeanBeanMouse 品牌标识规范（2026-10-06）

## 1. 设计概念：颊囊就是运货的容器

仓鼠天生用**颊囊**把食物塞满再运回窝里——这正是"把货装好、送到客户手上"的画面。
所以主图形把**颊囊里塞着一只小货箱**做成记忆点：一眼看出是仓鼠，又一眼看出是**做外贸出口的**。

不是随便一只可爱动物：图形里三个元素都在讲业务——

| 元素 | 含义 |
| --- | --- |
| 鼓起的颊囊 + 右侧**金色小货箱** | 装货、发运（我们的主业） |
| 蓝色围巾 | 出口/物流的辨识色，取自站内主蓝 |
| 大圆耳 + 粉内耳 + 腮红 | 保留豆豆鼠的 Q 版萌感，海外买家也吃这一套 |

## 2. 色板（同 `docs/design-guide.md`，不新增颜色）

| 名称 | 色值 | 用在哪 |
| --- | --- | --- |
| 深蓝黑 | `#26304A` | 描边、眼睛、文字 |
| 强调金 | `#F59E0B` | 小货箱、Mouse 字、分隔线 |
| 主蓝 | `#1D4ED8` | 围巾（唯一大面积点缀色） |
| 浅黄棕 | `#F7D9A8` | 毛色（头/耳） |
| 奶油白 | `#FFF6E8` | 徽章底、口鼻 |
| 粉 | `#FFB9C4` | 内耳、腮红 |

## 3. 文件清单

### 矢量（推荐使用，任意放大不糊）

| 文件 | 用途 |
| --- | --- |
| `assets/brand/mark.svg` | 主图形标（圆形徽章版）：页头、名片、包装 |
| `assets/brand/mark-simple.svg` | 极简版（去掉腮红等细节）：小尺寸、favicon |
| `assets/brand/mark-nobadge.svg` | 无底版：叠在浅色底/照片上 |
| `assets/brand/mark-mono-ink.svg` | 单色深版：单色印刷、传真件、钢印 |
| `assets/brand/mark-mono-cream.svg` | 单色反白版：深底/深色包装 |
| `assets/brand/badge-seal.svg` | 印章版（外圈 BEANBEANMOUSE · PET SUPPLIES DIRECT EXPORT）：单据、包装封口 |
| `assets/brand/lockup-horizontal.svg` | 横版组合标（图形 + 英文 + 中文 + 定位语）：页头、邮件签名 |
| `assets/brand/lockup-vertical.svg` | 竖版组合标：海报、包装正面、易拉宝 |
| `assets/brand/pattern.svg` | 品牌图案（豆/爪印/货箱/颊囊弧，可无缝平铺）：包装内衬、名片底纹、页脚 |

### 位图（现成尺寸，直接拿去用）

| 文件 | 尺寸 | 用途 |
| --- | --- | --- |
| `assets/brand/png/favicon-32.png` | 32×32 | favicon（浏览器标签） |
| `assets/brand/png/favicon-64.png` | 64×64 | 书签/桌面快捷方式 |
| `assets/brand/png/favicon-180.png` | 180×180 | iOS 添加到主屏 |
| `assets/brand/png/avatar-256.png` / `avatar-512.png` | 256 / 512 | 微信、WhatsApp、LinkedIn、平台店铺头像 |
| `assets/brand/png/seal-512.png` | 512 | 报价单/形式发票盖章、包装封口贴 |
| `assets/brand/png/lockup-horizontal-1200.png` | 1200×347 | 邮件签名、PPT 页眉 |
| `assets/brand/png/lockup-vertical-840.png` | 840×1120 | 海报/门店物料 |
| `assets/brand/png/pattern-tile-352.png` | 352×352 | 平铺底纹（可重复拼） |

验收拼版（不部署）：`docs/brand/brand-overview.png`

重新生成全部资产：`node scripts\build-brand-assets.mjs`

## 4. 使用规范

- **留白**：图形标四周至少留出自身宽度 1/4 的空白，不要贴边、不要压在花纹上。
- **最小尺寸**：图形标 ≥ 24px（再小请用 `mark-simple.svg`）；横版组合标宽度 ≥ 240px，否则改用图形标 + 纯文字。
- **深底**：用 `mark-mono-cream.svg`（单色反白）或彩色标 + 白色圆形底；不要在深底上直接用 `mark-nobadge.svg`。
- **单色场景**（发票、钢印、丝印）：只用 `mark-mono-*`，不要用彩色版。
- **文字标**：中文写「豆豆鼠」，英文写「BeanBeanMouse」（B、M 大写，中间不加空格）。

## 5. 禁止项

- 不要拉伸变形、旋转、加投影/描边/渐变；
- 不要改配色（尤其不要把金色小货箱换成别的颜色——它是记忆点）；
- 不要把图形标里的耳朵、颊囊、货箱拆开单独使用；
- 不要把品牌图案用在文字正下方（影响可读性）；
- 不要在图形标上再叠加文字（用组合标）。

## 6. 待办 / 提醒

- 现在的文字标使用系统字体（Segoe UI / system-ui）。**如果要正式注册商标**，建议找设计师把字标转成曲线并确认字体授权（商用字体需购买授权），再提交注册；图形标本身是原创矢量，可直接用于注册申请与各类物料。
- 印章版外圈的英文是可改文案，如需加公司名/注册号，等主体信息确定后我改一处即可全站生效（见 `data.js` 的 `SITE_ENTITY`）。
