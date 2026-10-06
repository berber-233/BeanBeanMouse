# 运营手册（2026-10-06）

上线小试用阶段要反复用的几件事，命令都在这里，复制即可。

---

## 1. 上传真实商品图

**方式 A：后台自己传（推荐，随时可改）**

`工作台 → 商品管理 → 编辑` → 上传图片。多张图按上传顺序排列，第一张是主图。

**方式 B：把照片给我 / 用脚本批量传**

1. 按**货号**建目录，照片按 `1.jpg`、`2.jpg` 命名（数字决定顺序，`1` 是主图）：

```
incoming/
  BBM-HAM-0006/
    1.jpg        ← 主图
    2.jpg
  BBM-DOGL-0012/
    1.jpg
```

2. 跑脚本：

```powershell
$env:BBM_EMAIL='admin@beanbeanmouse.com'; $env:BBM_PW='<管理员密码>'
node scripts\upload-product-images.mjs --dry     # 先看会传哪些，不实际写
node scripts\upload-product-images.mjs           # 真上传
node scripts\upload-product-images.mjs --replace # 先清空该商品旧图再传（换主图时用）
```

- 支持 `jpg/png/webp/gif`；iPhone 的 HEIC 请先在相册导出为"兼容格式（JPG）"。
- 目录名也可以用商品 id（`p25`）。脚本会打印每个目录对应到哪个商品。
- 建议：每张长边 ≤ 1600px、单张 ≤ 1.5MB，页面加载更快。

---

## 2. 数据库备份（D1）

```powershell
node scripts\backup-d1.mjs            # 导出到 backups/d1-<日期>.sql，并清理 14 天前的旧备份
node scripts\backup-d1.mjs --keep 30  # 想留更久就加 --keep
```

- 备份含客户邮箱等个人信息，**只留本地**；`backups/` 已在 `.gitignore`，不会进仓库。
- 建议每周跑一次（Windows「任务计划程序」→ 每周 → 操作填 `node`，参数填脚本路径）。
- **恢复**：`npx wrangler d1 execute beanbeanmouse-db --remote --file backups/d1-<日期>.sql`（执行前先确认要覆盖的目标，恢复会重放 SQL）。

---

## 3. 线上巡检

```powershell
node scripts\health-check.mjs          # 基础：首页 / 商品接口 / 路径路由 / 落地页 / sitemap / noindex / 接口 4xx
node scripts\health-check.mjs --full   # 追加：翻译通道、邮件通道状态
```

- 退出码 `0` 全通过、`1` 有失败项，方便挂到任务计划或监控里。
- 想更省事，也可以把站点加到 UptimeRobot 之类的免费监控（5 分钟一次，失败发邮件），但**推荐先跑这个脚本**，因为它检查的是"接口真的有数据、落地页真的能打开"，比单纯 ping 首页有用。

---

## 4. 发布 / 回滚

```powershell
node scripts\build-site.mjs                                   # 构建（含 35 个商品静态页 + sitemap）
npx wrangler pages deploy dist --project-name beanbean-mouse --commit-dirty=true

git tag -l                       # 关键节点都打了 tag（如 pet0.3-pre-path-routing）
git log --oneline -10            # 回滚代码：git revert <commit>，或从 tag 拉分支
```

Cloudflare Pages 控制台里也有历史部署列表，可以一键回滚到任意一次部署。

---

## 5. 待你提供的信息（我改一处即可全站生效）

| 项 | 位置 | 说明 |
| --- | --- | --- |
| 真实姓名 / 后续的个体户执照 | `data.js` 的 `SITE_ENTITY` | 现在是"个人主体（自然人经营）"，有执照后只改这一处：类型、名称、城市、地址、统一社会信用代码 |
| 个人二维码图片 | `assets/` | 放进 `assets/` 我接到"关于我们"页 |
| 真实商品照片 | 见本文第 1 节 | 现在用概念图，页脚已如实标注 |

---

## 6. 管理端权限细分（2026-10-06）

入口：管理端 → **权限管理**（只有具备 `system` 权限的管理员可见）。

| 权限键 | 管什么 |
| --- | --- |
| `products.publish` | 发布/编辑/上下架/删除商品、上传商品图 |
| `products.review` | 审核商品（通过/驳回） |
| `service` | 客服工作台、询盘、会话消息 |
| `orders` | 订单、物流、售后仲裁、表单记录 |
| `customers` | 用户列表、公司认证审核、地址管理 |
| `marketing` | 推广位审核、品类需求、意见箱、资讯 |
| `system` | 系统自检、审计日志、邮件通道、权限管理 |

- 权限存在 `users.permissions`（JSON 数组）；**NULL = 全权**（现有 `admin@beanbeanmouse.com` 属于这种，不受影响）。
- 前端按权限隐藏菜单；**接口层同样校验**（越权请求返回 403 `FORBIDDEN_PERM`），改前端也拿不到数据。
- 安全阀：不允许摘掉/删除**最后一个** `system` 管理员，避免所有人都进不了权限管理；取消管理员会立即失效其登录令牌。
- 演示用受限账号：`service@beanbeanmouse.com` / `BbmService2026`（只有客服权限，查验完可在权限管理里取消或直接改掉）。

## 7. 已知待办

- 商品多图排序、指定主图（目前按上传顺序）
- 上传前客户端压缩（大图上传慢）
- 真二维码的印刷版检查（小包装上的静区与尺寸）

---

## 8. 线上"能不能用"三件套（2026-10-06 新增）

部署完想确认"现在到底能不能用"，跑这三条就够了（前两条只读，第三条写测试数据但会自清理）：

```powershell
node scripts\smoke-live.mjs                  # 线上主链路：登录 + 商品 + 询盘 + 自检 + 越权拦截
node scripts\health-check.mjs --full         # 线上巡检：页面 / 接口 / 路由 / sitemap / 翻译通道
node work\probe-live-product-flow.mjs        # 商品全链路：传图→建商品→挂图→读回→删除（自清理）
```

- 冒烟脚本里的"内容准备度"提示（例如 0/12 件商品有真实图片）**不是故障**，是提醒该上传真实商品图了。
- 测试若在对象存储留下文件，用 `node work\clean-test-files.mjs <fileId>...` 删掉（不传参数则删脚本里记的默认几个）。
- 文件地址规则：后端返回的图片地址**必须带 `/api` 前缀**（`/api/files/<id>`）；裸 `/files/<id>` 是 404。
  线上靠 `API_BASE_PATH=/api` 配置（见 `wrangler.jsonc`），本地 Node 直起时该值为空。
