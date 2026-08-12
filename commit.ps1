# Commit current changes in the BeanBeanMouse (豆豆鼠) project.
# Run in your own terminal (right-click -> Run with PowerShell).
# 脚本放在仓库根目录，无论文件夹叫什么名字都能正确执行。
Set-Location -LiteralPath $PSScriptRoot

git add -A
git -c user.name="berber-233" -c user.email="694113406@qq.com" commit -m "Add stick-figure delivery mascot; design guide; robust paths; help widget; docs & tests"

Write-Host ""
Write-Host "Local commit done (if there were changes)."
git push
if ($LASTEXITCODE -eq 0) {
  Write-Host "Pushed to GitHub successfully."
} else {
  Write-Host ""
  Write-Host "Push failed. Common reasons:"
  Write-Host "  1. GitHub repo name changed -> update remote:"
  Write-Host "     git remote set-url origin https://github.com/berber-233/<new-repo-name>.git"
  Write-Host "  2. Remote history diverged -> pull/merge first:"
  Write-Host "     git pull --rebase"
  Write-Host "  3. Force push ONLY if you intend to replace remote history:"
  Write-Host "     git push -f"
}
