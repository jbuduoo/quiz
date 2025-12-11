# 📱 iOS 安裝前檢查清單

本文件列出在將應用程式安裝到 iPhone 之前需要檢查和測試的事項。

## ⚠️ 重要提醒

**Expo Go vs 獨立應用程式的差異：**
- Expo Go 是一個預先建立的應用程式，您的程式碼在其中運行
- 獨立應用程式是完整的原生應用程式，行為可能與 Expo Go 略有不同
- **建議：在建立獨立應用程式之前，先建立測試版並在實體 iPhone 上測試**

---

## ✅ 必須完成的配置項目

### 1. Bundle Identifier 設定 ⚠️ 重要

**當前狀態：** `com.jbuduoo.quiz`（預設值，需要更改）

**必須修改：**
- 在 `app.json` 中將 `bundleIdentifier` 改為您自己的唯一識別碼
- 格式：`com.您的名字或公司.quiz`
- 例如：`com.john.quiz`、`com.mycompany.quiz`
- **注意：** 一旦建立應用程式後，此識別碼無法更改！

**檢查位置：**
```json
"ios": {
  "bundleIdentifier": "com.jbuduoo.quiz"  // ← 需要修改這裡
}
```

### 2. 應用程式圖示和啟動畫面

**檢查項目：**
- ✅ `./assets/icon.png` - 1024x1024 像素（PNG，無透明度）
- ✅ `./assets/splash-icon.png` - 啟動畫面（建議 1242x2436 像素）
- ✅ `./assets/adaptive-icon.png` - Android 自適應圖示（1024x1024 像素）

**驗證方法：**
- 確認檔案存在
- 確認尺寸正確
- 確認格式為 PNG

### 3. 應用程式資訊

**檢查項目：**
- ✅ 應用程式名稱：`金融證照考試題庫`
- ✅ iOS 顯示名稱：`金融證照考試題庫`（在 `infoPlist.CFBundleDisplayName`）
- ✅ 版本號：`1.0.0`
- ✅ 建置編號：`1`

---

## 🧪 建議測試項目

### 1. 基本功能測試

在建立獨立應用程式之前，建議在 Expo Go 中完整測試以下功能：

#### 📋 測驗流程
- [ ] 測驗名稱列表顯示正常
- [ ] 科目列表顯示正常
- [ ] 期數列表顯示正常
- [ ] 可以開始測驗
- [ ] 題目顯示正常（文字、選項）
- [ ] 答題功能正常
- [ ] 詳解顯示正常
- [ ] 進度條更新正常

#### ❤️ 錯題本功能
- [ ] 錯題自動加入錯題本
- [ ] 可以手動標記錯題
- [ ] 可以標記為不確定
- [ ] 錯題本列表顯示正常
- [ ] 可以從錯題本複習
- [ ] 可以從錯題本移除

#### 🔍 其他功能
- [ ] 查詢問題功能（開啟 Google 搜尋）
- [ ] 問題回報功能
- [ ] 設定功能（如果有）
- [ ] 資料儲存功能（AsyncStorage）

### 2. iOS 特定測試項目

#### 畫面顯示
- [ ] 在不同 iPhone 尺寸上測試（iPhone SE、iPhone 12/13/14、iPhone Pro Max）
- [ ] 確認 Safe Area 處理正確（不會被瀏海或底部指示器遮擋）
- [ ] 確認橫向/直向鎖定正常（目前設定為 `portrait`）
- [ ] 確認啟動畫面顯示正常

#### 效能測試
- [ ] 應用程式啟動速度
- [ ] 頁面切換流暢度
- [ ] 大量題目載入效能
- [ ] 資料儲存和讀取速度

#### 資料持久化
- [ ] 關閉應用程式後重新開啟，資料是否保留
- [ ] 錯題本資料是否正確儲存
- [ ] 答題進度是否正確儲存

### 3. 相容性檢查

#### React Native 版本
- ✅ 當前使用：React Native 0.81.5
- ✅ Expo SDK：~54.0.27
- ✅ 這些版本都支援最新的 iOS 版本

#### 依賴套件檢查
您的應用程式使用的套件都是標準且穩定的：
- ✅ `@react-navigation/native` - 導航
- ✅ `@react-native-async-storage/async-storage` - 資料儲存
- ✅ `react-native-safe-area-context` - Safe Area 處理
- ✅ `react-native-screens` - 畫面管理

**沒有使用特殊權限：**
- ✅ 不需要相機權限
- ✅ 不需要位置權限
- ✅ 不需要通知權限
- ✅ 不需要聯絡人權限

這表示您的應用程式應該不會遇到權限相關的問題。

---

## 🚀 建立測試版本的步驟

### 步驟 1：修改 Bundle Identifier

編輯 `app.json`：
```json
{
  "expo": {
    "ios": {
      "bundleIdentifier": "com.jbuduoo.quiz"  // 修改這裡
    }
  }
}
```

### 步驟 2：建立測試版

```bash
# 確保已登入 Expo
eas login

# 建立 iOS 測試版
eas build --platform ios --profile preview
```

### 步驟 3：安裝到 iPhone

1. 建置完成後，EAS 會提供下載連結
2. 在 iPhone 的 Safari 瀏覽器中開啟連結
3. 點擊「安裝」按鈕
4. 前往「設定」→「一般」→「VPN與裝置管理」
5. 信任開發者憑證
6. 回到主畫面，點擊應用程式圖示即可使用

### 步驟 4：完整測試

在實體 iPhone 上測試所有功能，確認：
- 所有功能正常運作
- 畫面顯示正確
- 資料儲存正常
- 沒有崩潰或錯誤

---

## ⚠️ 常見問題和解決方案

### Q1: 應用程式無法安裝？

**可能原因：**
- Bundle Identifier 與其他應用程式衝突
- 憑證問題
- 裝置不支援

**解決方案：**
- 確認 Bundle Identifier 是唯一的
- 確認已信任開發者憑證
- 確認 iPhone 系統版本符合要求（iOS 13.0+）

### Q2: 應用程式安裝後無法開啟？

**可能原因：**
- 資料初始化失敗
- 缺少必要的檔案

**解決方案：**
- 檢查 `assets/data` 目錄下的 JSON 檔案是否存在
- 檢查 `QuestionService.initializeData()` 是否正常執行
- 查看應用程式日誌（如果可能）

### Q3: 畫面顯示異常？

**可能原因：**
- Safe Area 處理不當
- 字體大小問題
- 顏色對比度問題

**解決方案：**
- 確認使用 `SafeAreaProvider` 和 `SafeAreaView`
- 測試不同 iPhone 尺寸
- 檢查深色模式相容性（目前設定為 `light`）

### Q4: 資料無法儲存？

**可能原因：**
- AsyncStorage 權限問題
- 儲存空間不足

**解決方案：**
- 確認 AsyncStorage 正常運作
- 檢查裝置儲存空間
- 確認資料格式正確

---

## 📝 測試記錄表

建議記錄測試結果：

| 測試項目 | 測試日期 | 測試裝置 | 結果 | 備註 |
|---------|---------|---------|------|------|
| 基本測驗流程 | | | ✅/❌ | |
| 錯題本功能 | | | ✅/❌ | |
| 資料儲存 | | | ✅/❌ | |
| 畫面顯示 | | | ✅/❌ | |
| 效能測試 | | | ✅/❌ | |

---

## ✅ 完成檢查後

如果所有測試都通過，您可以：

1. **建立正式版：**
   ```bash
   eas build --platform ios --profile production
   ```

2. **申請 Apple Developer 帳號**（如果還沒有）

3. **提交到 App Store**（參考 `BUILD_AND_PUBLISH.md`）

---

## 🎯 總結

**您目前的情況：**
- ✅ 應用程式結構良好
- ✅ 沒有使用特殊權限
- ✅ 依賴套件都是標準且穩定的
- ⚠️ **需要修改 Bundle Identifier**
- ⚠️ **建議先建立測試版並在實體 iPhone 上測試**

**建議行動順序：**
1. 修改 `app.json` 中的 Bundle Identifier
2. 建立 iOS 測試版（`eas build --platform ios --profile preview`）
3. 安裝到 iPhone 並完整測試
4. 確認無問題後，再建立正式版並提交到 App Store

**不需要 Mac 電腦：** 使用 EAS Build，所有建置都在雲端進行，Windows 電腦也可以建立 iOS 應用程式！

祝您測試順利！🎉

