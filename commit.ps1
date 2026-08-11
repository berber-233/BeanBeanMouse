# Commit current changes in the trade boat project.
# Run in your own terminal (right-click -> Run with PowerShell).
Set-Location -LiteralPath 'C:\Users\LENOVO\Documents\ChatGPT\trade boat'

git add -A
git -c user.name="berber-233" -c user.email="694113406@qq.com" commit -m "Rename to trade boat; add anti-counterfeit verification; audit & roadmap" 2>$null

Write-Host ""
Write-Host "Local commit done (if there were changes)."
Write-Host "To connect this project to GitHub and push:"
Write-Host "  git remote add origin https://github.com/berber-233/trade-boat.git"
Write-Host "  git push -u origin main"
Write-Host "If GitHub already has history, a normal push will be rejected. "
Write-Host "Use 'git push -u origin main --force' ONLY if you intend to replace the remote history."
