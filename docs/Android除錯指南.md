# Android 除錯指南

## 🔍 問題診斷

如果 Android 應用程式一直顯示載入動畫（旋轉），請按照以下步驟檢查：

### 1. 檢查版本一致性

**問題 1a**：索引檔案版本與代碼版本不一致可能導致初始化失敗

**問題 1b**：Expo Go 版本與 Expo SDK 版本不匹配可能導致載入失敗

**檢查方法**：
```bash
# 檢查索引檔案版本
node -e "const fs = require('fs'); const data = JSON.parse(fs.readFileSync('assets/data/questions.json', 'utf8')); console.log('版本:', data.metadata.version);"

# 檢查代碼中的版本
grep "currentVersion" src/services/QuestionService.ts
```

**修復**：
- 確保索引檔案版本與代碼版本一致（目前應為 `3.0.0`）
- 確保 Expo Go 版本與 Expo SDK 版本匹配（目前應為 54）

### 2. 檢查資料檔案

**檢查索引檔案是否存在**：
```bash
node scripts/validatePaths.js
```

**檢查題目檔案**：
```bash
node scripts/validateJson.js
```

### 3. 檢查 Android Logcat

在 Android Studio 或使用 `adb logcat` 查看日誌：

```bash
# 過濾相關日誌
adb logcat | grep -E "initialize|loadIndex|QuestionService"
```

**關鍵日誌**：
- `🚀 [App] initializeApp: 開始初始化應用程式`
- `🚀 [App] initializeApp: Expo SDK: 54.0.29`（確認 SDK 版本）
- `🚀 [initializeData] 開始初始化資料`
- `✅ 成功載入索引資料`
- `❌ 無法載入索引資料`
- `⚠️ [App] initializeApp: 絕對超時觸發`（如果 20 秒後仍未載入）

### 4. 常見問題與解決方案

#### 問題 1：require() 載入 JSON 失敗

**症狀**：Logcat 顯示 `無法使用 require 載入索引`

**可能原因**：
- Metro Bundler 未正確打包資源
- 檔案路徑錯誤
- JSON 格式錯誤

**解決方案**：
1. 清除快取並重新建置：
   ```bash
   npm start -- --reset-cache
   ```
2. 檢查 `metro.config.js` 配置
3. 確認 `app.json` 中的 `assetBundlePatterns` 包含 JSON 檔案

#### 問題 2：初始化超時

**症狀**：應用程式在 15 秒後停止載入

**可能原因**：
- `updateProgress()` 執行時間過長
- 載入大量題目檔案

**解決方案**：
- `updateProgress()` 已在背景執行（延遲 1 秒）
- 如果問題持續，可以增加超時時間或優化 `updateProgress()`

#### 問題 3：版本不匹配

**症狀**：Logcat 顯示版本不同，清除舊資料

**解決方案**：
- 確保索引檔案版本與代碼版本一致
- 如果版本不同，應用程式會自動清除舊資料並重新載入

#### 問題 4：Expo Go 版本不匹配

**症狀**：應用程式無法載入，Logcat 顯示模組載入錯誤

**解決方案**：
1. 確認手機上的 Expo Go 版本（應為 54）
2. 確認 `package.json` 中的 Expo SDK 版本（應為 `~54.0.29`）
3. 運行 `npx expo-doctor` 檢查依賴項
4. 清除快取並重新啟動：
   ```bash
   npx expo start --clear
   ```

### 5. 強制恢復

如果應用程式一直無法載入，可以嘗試：

1. **清除應用程式資料**：
   ```bash
   adb shell pm clear com.jbuduoo.ipasquiz
   ```

2. **重新安裝應用程式**：
   ```bash
   npm run android
   ```

3. **檢查 AsyncStorage**：
   應用程式會自動嘗試從 AsyncStorage 恢復資料

### 6. 除錯模式

在 `App.tsx` 中已添加詳細的日誌輸出：
- 初始化開始/完成
- 資料載入成功/失敗
- 錯誤詳情和堆疊

查看 Logcat 可以幫助定位問題。

## 📊 版本資訊

- **索引檔案版本**：3.0.0
- **代碼版本**：3.0.0
- **Expo SDK**：~54.0.29
- **Expo Go**：54（必須與 Expo SDK 版本匹配）
- **React Native**：0.81.5

### ⚠️ 版本匹配檢查

**重要**：確保 Expo Go 版本與專案的 Expo SDK 版本匹配。

**檢查方法**：
1. 在手機上打開 Expo Go，查看版本號（應為 54）
2. 檢查 `package.json` 中的 `expo` 版本（應為 `~54.0.29`）
3. 運行 `npx expo-doctor` 檢查依賴項相容性

**如果版本不匹配**：
- 更新 Expo Go 到最新版本（54）
- 或更新專案的 Expo SDK 版本以匹配 Expo Go

## 🔧 驗證腳本

使用以下腳本驗證資料完整性：

```bash
# 驗證所有路徑
node scripts/validatePaths.js

# 驗證 JSON 格式
node scripts/validateJson.js

# 生成統計報告
node scripts/generateStats.js
```

## 📝 日誌級別

應用程式使用以下日誌級別：
- `🚀` - 開始操作
- `✅` - 成功
- `❌` - 錯誤
- `⚠️` - 警告
- `📋` - 資訊
- `🔄` - 進行中

在 Logcat 中搜尋這些符號可以快速定位問題。

