#!/bin/bash
# NTPC Camp 爬蟲執行腳本
# 爬取資料並推送到 GitHub

set -e

echo "🚀 開始爬取 NTPC Camp 資料..."
npm run crawl

echo ""
echo "📤 推送資料到 GitHub..."

# 加入所有檔案 (包含程式碼與資料)
git add .

# 檢查是否有變更
if git diff --cached --quiet; then
    echo "⚠️ 沒有變更，跳過推送"
    exit 0
fi

# 提交並推送
git commit -m "更新爬蟲與資料 $(date '+%Y-%m-%d %H:%M')"
git push -u origin main

echo ""
echo "✅ 完成!"
