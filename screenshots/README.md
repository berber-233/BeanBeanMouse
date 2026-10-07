# QA 截图目录（2026-10-07 瘦身）

原来这里有 **56 张 QA 截图、合计 17 MB**（单张最大 3.3 MB），把仓库 clone 体积拖得很大。
现在只保留**文档里真正引用到**的图，其余已从仓库移除。

## 现状

- 保留：`business-card-templates.png`（被 `docs/ops-depth-notes.md` 引用）
- 其余历史截图：仍在 git 历史里（例如提交 `9662ce9` 及更早），需要时用
  `git show <commit>:screenshots/<文件名> > 目标路径` 取回，不会真的丢

## 以后怎么放

- **临时/过程截图不要提交**：放到本地 `screenshots/` 即可（已在 `.gitignore` 里忽略），
  需要写进文档时再单独 `git add -f` 指定那一张。
- 要提交的图尽量控制在 **300 KB 以内**：截完先缩放（长边 ≤1600）并压成 JPEG/WebP，
  别把 2–3 MB 的原图直接推上去。
