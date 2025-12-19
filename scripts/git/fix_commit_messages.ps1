# 修正提交訊息的 PowerShell 腳本

# 設定編輯器為使用檔案內容
$env:GIT_SEQUENCE_EDITOR = "powershell -Command `"`$content = Get-Content '.git/rebase-merge/git-rebase-todo'; `$content = `$content -replace '^pick cd1ce0b', 'reword cd1ce0b'; `$content = `$content -replace '^pick 5180730', 'reword 5180730'; Set-Content '.git/rebase-merge/git-rebase-todo' `$content`""

# 開始 rebase
git rebase -i 64a0d34



