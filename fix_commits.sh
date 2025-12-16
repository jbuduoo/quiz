#!/bin/bash
# 修正亂碼提交訊息的腳本

# 修正提交 5180730
git rebase -i 64a0d34^
# 在編輯器中將 pick 改為 reword，然後輸入正確的訊息



