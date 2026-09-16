# 美术资源状态

> 状态更新：**2026-09-11（AI 重制，按"原始出图"标准）**。
> 吉祥物、打赏图、三位角色多角度设定图、三幕运输动画全部改为 AI 出图；
> 旧的矢量稿、程序绘制像素图、旧像素运输 GIF 已归档到 `legacy/2026-09-11/`（不在 `assets/` 内，**不会被打进 dist 部署包**）。

## 出图标准（2026-09-11 起执行）

| 项 | 约定 |
| --- | --- |
| 图片模型 | `doubao-seedream-5-0-pro-260628`（火山方舟 `images/generations`，同步接口） |
| 视频模型 | `doubao-seedance-2-0-fast-260128`（异步任务，图生视频，首帧驱动）——**2026-09-16 起为默认**；下方 2026-09-11 的资产是用 `doubao-seedance-2-5-260628` 生成的 |
| 出图口径 | **直接采用模型原始出图**，不做后期像素化 / 人工描摹；改动只限等比缩放、居中裁切、格式转换 |
| 母版 | 原始出图留在 `outputs/art/**`、`outputs/video/**`（不部署，仅留存与重制） |
| 网站用图 | `assets/**`，统一由 `work/build-art.ps1` 从母版生成（缩放 / 裁切 / 落位），可重复执行 |
| 质检 | `work/png-stats.mjs`（色数、硬边比例、主色板）、`work/video-info.mjs`（时长/分辨率/体积）、`node test/verify.cjs` |

技能与脚本：`~/.codex/skills/seedream-image`、`~/.codex/skills/seedance-video`（密钥在各自 `.env`，不入库）。

## 模型配置变更（2026-09-16）

| 项 | 变更后 | 说明 |
| --- | --- | --- |
| 图片（默认） | `doubao-seedream-5-0-pro-260628` | 唯一登记模型；别名 `5-0-pro` |
| 图片（其他） | 不再登记 `doubao-seedream-5-0-260128` | 该 ID 服务端参数解析异常（任意合法参数都报 `InvalidParameter: unable to decode '' as int64`），按用户决定移除 |
| 视频（默认） | `doubao-seedance-2-0-fast-260128` | 别名 `2-0-fast`；旧的 `2-5` / `2-0-mini` 别名已删除 |

**图生视频实测（2026-09-16，空运场景首帧）**：`2-0-fast` 支持 `--image` 首帧驱动，出片 5.09s / 3.6MB（2-5 同场景为 5.06s / 5.6MB）；
原始出片接缝 31.77（不循环），经 `work/make-loop2.mjs` 优化后**接缝 3.78 / 动感 6.39 / 背景动感 9.24 / 无硬切**，体积 404KB。
结论：新默认模型可完整跑通「生成 → 循环优化 → 落位」流程，动作幅度与背景运动都比 2-5 更明显。

## 当前资产

| 资产 | 用途 | 规格 | 来源 |
| --- | --- | --- | --- |
| `assets/mascot-main.jpg` | OG 分享图、登录页品牌图、名片水印条 | 1024×1024，138KB | Seedream 主视觉 |
| `assets/mascot-icon.png` | 导航 Logo、右下角帮助浮标、帮助面板头像、favicon / apple-touch-icon | 256×256，69KB | Seedream 极简头像 |
| `assets/help-banner.jpg` | 帮助面板顶部横幅 | 1000×400，40KB | Seedream 横幅 |
| `assets/tip-hamster-empty.png` | 打赏弹窗（未打赏：空碗） | 512×512，277KB | Seedream |
| `assets/tip-hamster-full.png` | 打赏弹窗（已打赏：金币碗）+ 金币弹出动画底座 | 512×512，273KB | Seedream |
| `assets/pixel/characters/{land,sea,air}-icon.jpg` | 镖局头部角色头像（按运输方式自动切换） | 256×256，18–21KB | Seedream 角色头像特写 |
| `assets/video/transport-{land,sea,air}.webm` | 运输场景动画（出发→运输中→到达，**无缝循环 + 背景视差滚动**） | 1280×720，16:9，循环窗口 2.92–4.50s，**304–490KB**（VP9） | Seedance 2-5 图生视频 → 循环窗口搜索（含背景动感约束）+ 尾部交叉淡化（`work/make-loop2.mjs`） |
| `assets/video/transport-{land,sea,air}-poster.jpg` | 视频封面 / reduced-motion 与未播放时的静帧 | 1280×720，111–178KB | 场景首帧裁切 |
| `assets/products/p23…p32/1.jpg` | 演示商品主图（宠物垂直 10 款） | 800×800，39–95KB | Seedream 电商商品图 |
| `assets/pixel/ui/{10 个分类}.png` | 首页品类速览胶囊 + 品类卡图标 | 128×128 透明 PNG，8–15KB | `doubao-seedream-5-0-pro-260628` 像素图标 + 洋红底抠图 |
| `assets/pixel/ui/{package,search,shield,mailbox,tools,user,news}.png` | 空状态 / 通用 UI 图标（替换页面里的 emoji） | 同上 | 同上 |
| `docs/art/characters/{land,sea,air}-{front,side,back,three-quarter}.jpg` | 角色多角度设定图（**仅供设计与验收，不部署**） | 1024×1024 ×12 张 | Seedream 角色设定图链式生成 |

场景首帧母版：`outputs/art/scenes/transport-{land,sea,air}-scene.jpg`（2048×2048，用于生成视频与封面）。
视频母版：`outputs/video/transport-{land,sea,air}.mp4`（H.264，4.2–6.8MB，仅留存，不部署；`outputs/` 已加入 `.gitignore`）。

## 角色设定

- **主吉祥物**：Q 版金丝熊仓鼠「豆豆鼠」送货员——圆润大头小身、大圆耳（粉内耳）、鼓鼓颊囊、
  大眼高光、粉腮红、奶油白口鼻与腹部、金黄暖色毛发，背米色帆布运货袋（蓝背带），红围巾。
- **三位运输角色**（每位 4 视角设定图 + 头像 + 场景动画）：
  - 陆运：棕色皮帽 + 绿色短上衣 + 皮带腰包，马车场景；
  - 海运：水手帽 + 蓝白条纹衫 + 黄铜罗盘，三桅帆船场景；
  - 空运：飞行帽（护目镜推到额头）+ 红围巾 + 棕色飞行夹克，飞艇吊货场景。
- **保险员角色已剔除**（2026-09-11），旧的 `pixel/hamster-insurance.gif` 与四位角色图集一并归档。
- 色板（角色统一）：奶油白 `#FFF6E8`、浅黄棕 `#F7D9A8`、强调金 `#F59E0B`、
  主蓝 `#1D4ED8`、深蓝黑 `#26304A`、粉 `#FFB9C4`；背景暖米色 `#F8E5C8`。

## 目录约定

| 目录 | 是否部署 | 说明 |
| --- | --- | --- |
| `assets/**` | 是 | 网站用图与视频（仅放部署需要的文件，构建产物 `dist/` 约 4.1MB） |
| `legacy/2026-09-11/**` | 否 | 被取代的旧占位资产存档 43 个文件（移动非删除，可回滚） |
| `docs/art/**` | 否 | 角色多角度设定图等设计资料 |
| `outputs/art/**`、`outputs/video/**` | 否 | AI 出图母版（含 2048 原图） |
| `work/**` | 否 | 资产构建与质检脚本（`build-art.ps1`、`png-stats.mjs`、`video-info.mjs`、`pixelize.mjs`） |

## 循环视频标准（2026-09-11 第二轮优化）

生成模型直接出的 5 秒视频**并不是无缝循环**（首尾帧差异实测 13–29，视觉上有明显跳变）。
现在的固定流程是「生成 → 找循环窗口 → 补接缝」：

1. **循环窗口搜索**：按 12fps 抽样比对全片，在 `[2.5s, 全长-0.6s]` 内寻找"首尾最相似且动感不低于全长均值 70%"的区间，
   优先取满足条件的最长窗口（实测选中 0.75–4.08s / 0.92–4.17s / 0.92–4.33s）；
2. **尾部交叉淡化**：窗口最后 0.6s 与窗口首帧做淡入收束，使循环点严格回到起始姿态；
3. **实时录制**：用 `requestVideoFrameCallback` 逐帧录制（不用逐帧 seek，避免时长被拉长成慢动作），直接编码 VP9/WebM；
4. **量化验收**（`work/loop-check.mjs`）：

| 视频 | 接缝（越小越好） | 动感 | 最大跳变 | 结论 |
| --- | --- | --- | --- | --- |
| 陆运 | 29.02 → 13.22 → **3.50** | 4.82 | 4.66 | 无缝良好 / 动感充足 / 无硬切 |
| 海运 | 20.58 → 19.57 → **3.07** | 7.13 | 13.23 | 同上 |
| 空运 | 23.81 → 30.20 → **2.93** | 2.46 | 12.07 | 同上 |

### 第三轮修正（用户验收反馈，2026-09-11）

| 反馈 | 处理 | 结果（新指标「背景动感」= 画面上下背景带的变化量） |
| --- | --- | --- |
| 空运：空艇气球方向反了 | 重出首帧，明确「艇首朝右、螺旋桨在左侧」，视频提示词加「方向不能反转、不得掉头」 | 接缝 3.08，背景动感 8.33（旧版 4.05） |
| 陆运：背景没动，像原地踏步 | 视频提示词改为「镜头跟随马车右移，路边草丛/石头/丘陵/云朵持续向左掠过（明显视差滚动，不能原地踏步）」，并给窗口搜索加"背景必须动"硬约束 | 背景动感 **2.29 → 6.54**，接缝 2.87 |
| 海运：海鸥影响循环 | 首帧与提示词都去掉海鸥/飞鸟（「天空没有任何鸟类」） | 接缝 3.46，背景动感 5.83 |

新增质检指标：`work/loop-check.mjs` 现在同时输出「背景动感」与「背景几乎静止（原地踏步）」判定；
`work/make-loop2.mjs` 在选择循环窗口时会剔除背景不动的候选区间。

（三段式箭头 = 原始出片 → 重新生成 v2 → 循环优化后；接缝指标定义见 `work/loop-check.mjs`。）

> 说明：循环优化后时长等于"窗口长度"（3.2–3.4s）而非整段 5s——这是为了取到真正接得上的周期；
> 若要 5s 循环，需要模型本身生成长度足够的周期性动作，可在提示词里给出明确的循环周期。

## 关于 `doubao-seedream-5-0-260128`

用户指定过该模型，但**当前账号下无法通过 `/images/generations` 调用**（2026-09-11 实测）：

- 模型 ID 本身被识别（`size` 校验与「不支持的 `guidance_scale`」报错都来自该模型）；
- 但无论 `size` 用 `2k` / `2048x2048` / `4096x4096`、是否带 `n` / `seed` / `response_format` / `watermark` / `stream`，
  都返回 `InvalidParameter: unable to decode '' as int64`；**同一份请求换成 `doubao-seedream-5-0-pro-260628` 就正常出图**；
- 也就是说问题在服务端对该模型的参数解析（该版本可能要求 endpoint ID 或不同的参数集），不是本地调用方式。
- 排查脚本：`work/probe-model.mjs`、`work/probe-model2.mjs`（可随时复测）。

当前所有像素 UI 素材改用 `doubao-seedream-5-0-pro-260628` 出图；该模型恢复可用后可直接替换重出。

## 像素风 UI（2026-09-11）

- **图标**：分类（10 个）+ 空状态/通用（7 个）共 17 个像素图标，全部 AI 出图、洋红底抠透明、统一 128px；
  接入位置：首页品类速览胶囊、首页品类卡、订单/商品/询盘/售后/资讯/用户等空状态。
- **控件**：胶囊、品类卡、chip、badge、按钮统一改为"方形硬边 + 阶梯投影"，按钮按下有 2px 位移，
  做出像素游戏的厚块质感；`prefers-reduced-motion` 下动画照常降级。
- **抠图与质检**：`work/key-icons.mjs`（洋红键控 + 预乘 alpha 缩放）、`work/check-icons.mjs`
  （检查四角透明度、残留洋红像素、主体占比）；17 个图标全部 0% 残留洋红、四角透明。

## 替换与重建

1. 重新出图：`node ~/.codex/skills/seedream-image/scripts/generate.mjs "提示词" --size 2K --out outputs/art/<组>`；
2. 重新出片：`node ~/.codex/skills/seedance-video/scripts/generate.mjs "运动提示词" --image <首帧> --duration 5 --resolution 720p --ratio adaptive --model 2-5 --out outputs/video`
   （注意：**图生视频时 `ratio` 必须是 `adaptive`**，否则报 `InvalidParameter.TaskTypeConstraint`）；
3. 压缩：`node work/compress-video.mjs outputs/video/transport-<mode>.mp4 --bitrate 1200000 --out outputs/video/webm`
   （本机 Chrome MediaRecorder 转 VP9/WebM，1280×720 / 5.06s，约 500KB；无 ffmpeg 环境下的替代方案）；
4. 落位：`powershell -File work/build-art.ps1`（等比缩放 + 16:9 裁切 + 覆盖 `assets/`；
   视频请从 `outputs/video/webm/` 复制到 `assets/video/`）；
5. 回归：`node scripts/check-consistency.mjs`、`node test/verify.cjs`、`node test/api-smoke.cjs`、`node backend/test/api.test.mjs`。

## 已知待办

- WebM(VP9) 需要 Safari 16.4+ / 现代 Chromium、Firefox；更老的浏览器只会显示封面静帧（不报错）。
- `legacy/2026-09-11/` 与 `pixel-art/` 旧构建脚本仍在仓库内（体积偏大，需单独一轮决定是否移出）。
- 角色设定图目前是 4 视角（正/侧/背/四分之三），`design-guide.md` 里的顶视/底视尚未做。
