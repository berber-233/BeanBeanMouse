# 提交并推送 BeanBeanMouse（豆豆鼠）的改动。
#
# 用法（在仓库根目录、自己的终端里跑）：
#   .\commit.ps1 -Message "fix(ui): 修顶部导航截断"
#   .\commit.ps1 -Message "..." -All        # 连同未跟踪的新文件一起提交（会先列出来确认）
#
# 与旧版的区别（2026-10-07 重写）：
#   1) 提交信息必须自己给，不再写死早期那句无关文案；
#   2) 默认只提交**已跟踪文件**的改动（git add -u），新文件要用 -All 并逐个确认，
#      避免 `git add -A` 把 node_modules、备份、临时截图之类一起推上去；
#   3) 推送前显示将要提交的文件清单，推送后核对本地与远端是否一致。
param(
  [Parameter(Mandatory = $true)][string]$Message,
  [switch]$All
)

Set-Location -LiteralPath $PSScriptRoot

Write-Host "== 改动概览 ==" -ForegroundColor Cyan
git status --short

if ($All) {
  Write-Host ""
  Write-Host "以下未跟踪文件会被加入本次提交（-All）：" -ForegroundColor Yellow
  git ls-files --others --exclude-standard
  $ans = Read-Host "确认全部加入？(y/N)"
  if ($ans -ne 'y') { Write-Host "已取消。"; exit 1 }
  git add -A
} else {
  # 只提交已跟踪文件的修改/删除；新文件请用 -All
  git add -u
}

if (-not (git diff --cached --name-only)) {
  Write-Host "没有可提交的改动。" -ForegroundColor Yellow
  exit 0
}

git -c user.name="berber-233" -c user.email="694113406@qq.com" commit -m $Message

if ($LASTEXITCODE -ne 0) { Write-Host "提交失败。" -ForegroundColor Red; exit 1 }

Write-Host ""
Write-Host "正在推送…" -ForegroundColor Cyan
git push

if ($LASTEXITCODE -eq 0) {
  $head = git rev-parse HEAD
  $remote = git rev-parse origin/main
  if ($head -eq $remote) {
    Write-Host "推送成功，本地与远端一致：$head" -ForegroundColor Green
  } else {
    Write-Host "推送命令成功，但本地($head)与远端($remote)不一致，请检查。" -ForegroundColor Yellow
  }
} else {
  Write-Host ""
  Write-Host "推送失败，常见原因：" -ForegroundColor Red
  Write-Host "  1. 网络抖动 / 连不上 GitHub —— 等一会儿直接重跑一次（实测常见）；"
  Write-Host "  2. 远端有新提交 —— 先 git pull --rebase 再推；"
  Write-Host "  3. 仓库改名 —— git remote set-url origin https://github.com/berber-233/<新仓库名>.git"
  Write-Host "  4. 只有在确定要覆盖远端历史时才用 git push -f（会丢别人的提交，慎用）。"
}
