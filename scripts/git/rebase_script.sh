#!/bin/sh
# 自動修改提交訊息的腳本

COMMIT_HASH=$(git log --format=%H -1)

if [ "$COMMIT_HASH" = "cd1ce0b3ba00f6d4654da3101d174b2f202ca044" ]; then
    cat commit_msg_cd1ce0b.txt
elif [ "$COMMIT_HASH" = "5180730ce2605cc188a99eac879029bdd7550c7b" ]; then
    cat commit_msg_5180730.txt
else
    cat
fi



