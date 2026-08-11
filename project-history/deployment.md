# 部署记录

## 1. Git 初始化与推送

仓库目录：`C:\Users\LENOVO\Desktop\git+github\trade boat`

远程仓库：`https://github.com/berber-233/trade-boat.git`

执行记录（用户侧完成）：

```text
git init -b main
git add -A
git commit -m "trade boat B2B trade platform prototype: ..."
git branch -M main
git remote add origin https://github.com/berber-233/trade-boat.git
git push -u origin main

Delta compression using up to 16 threads
Writing objects: 100% (28/28), 2.84 MiB
* [new branch] main -> main
branch 'main' set up to track 'origin/main'.
```

## 2. GitHub Pages 部署

本项目为纯静态站点，有两种启用方式（任选其一）：

### 方式 A：从分支部署（最简单，无需工作流）

1. 打开仓库 Settings → Pages；
2. Source 选择 “Deploy from a branch”；
3. Branch 选择 `main`，目录选择 `/ (root)`，点击 Save；
4. 等待 1-2 分钟，站点地址为 `https://berber-233.github.io/trade-boat/`。

> 仓库根目录已放置 `.nojekyll`（部署包内提供），避免 Jekyll 预处理静态文件。

### 方式 B：GitHub Actions 自动部署

1. 将 `.github/workflows/pages.yml`（部署包内提供）提交到仓库并推送；
2. 打开仓库 Settings → Pages，Source 选择 “GitHub Actions”；
3. 之后每次推送到 `main` 都会自动构建并发布到 Pages；
4. 也可在 Actions 页面手动触发 `workflow_dispatch`。

## 3. 目录结构（部署后仓库）

```text
trade boat/
├── index.html          # 页面入口
├── styles.css          # 全部样式
├── data.js             # 演示数据与多语言文案
├── app.js              # 路由与业务逻辑
├── README.md           # 项目说明
├── .nojekyll           # 禁止 Jekyll 处理
├── .github/workflows/  # Pages 自动部署工作流
├── screenshots/        # 各页面效果截图
└── project-history/    # 项目记录（聊天记录、设计决策、部署记录）
```

## 4. 注意事项

- 翻译接口（MyMemory / LibreTranslate）为免费公共服务，有每日额度限制；
  正式上线建议申请带密钥的翻译服务并在后端代理，避免前端泄露与额度滥用。
- 资讯与政策数据为整理稿，正式上线应接入官方信息源自动同步，并保留来源链接。
- 原型数据保存在浏览器 localStorage，清理浏览器数据会重置演示状态。
