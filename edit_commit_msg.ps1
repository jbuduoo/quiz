param($file)
if (Test-Path "commit_msg_cd1ce0b.txt") {
    $hash = git log --format=%H -1
    if ($hash -like "*cd1ce0b*") {
        Copy-Item "commit_msg_cd1ce0b.txt" $file
        exit
    }
}
if (Test-Path "commit_msg_5180730.txt") {
    $hash = git log --format=%H -1
    if ($hash -like "*5180730*" -or $hash -like "*cf3b977*") {
        Copy-Item "commit_msg_5180730.txt" $file
        exit
    }
}
# 如果不是目標提交，使用預設編輯器
notepad $file



