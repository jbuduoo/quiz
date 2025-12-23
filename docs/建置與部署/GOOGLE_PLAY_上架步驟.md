# 📱 Google Play 商店上架完整步驟指南

本指南將協助您完成從建置到上架 Google Play 商店的所有步驟。

## 📋 上架前檢查清單

### ✅ 1. 應用程式配置檢查

#### app.json 配置確認
- [ ] **Package Name**：`com.jbuduoo.ipasquiz`（已設定，無法更改）
- [ ] **版本號**：`version: "1.0.0"`（首次上架）
- [ ] **版本代碼**：`versionCode: 1`（每次更新需遞增）
- [ ] **應用程式名稱**：`name: "WITS證照考試題庫"`
- [ ] **圖示檔案**：確認 `assets/icon.png` 和 `assets/adaptive-icon.png` 存在

#### 圖示規格確認
- [ ] **應用程式圖示**：`icon.png` - 1024x1024 像素（PNG，無透明度）
- [ ] **自適應圖示**：`adaptive-icon.png` - 1024x1024 像素
- [ ] **啟動畫面**：`splash-icon.png` - 建議 1242x2436 像素

### ✅ 2. 功能測試檢查

在建立正式版之前，請確保：
- [ ] 應用程式可以正常啟動
- [ ] 所有功能正常運作（測驗、錯題本、收藏等）
- [ ] 資料儲存正常（AsyncStorage）
- [ ] 在不同螢幕尺寸上顯示正確
- [ ] 沒有崩潰或錯誤
- [ ] 關閉應用程式後重新開啟，資料是否保留
- [ ] 效能表現良好

---

## 🚀 上架步驟

### 步驟 1：安裝並登入 EAS CLI

```bash
# 安裝 EAS CLI（如果還沒安裝）
npm install -g eas-cli

# 登入 Expo 帳號
eas login
```

如果還沒有 Expo 帳號，請先註冊：
```bash
npx expo login
```
或前往 [expo.dev](https://expo.dev) 註冊。

### 步驟 2：建立正式版建置（AAB 格式）

Google Play Store 要求使用 AAB（Android App Bundle）格式：

```bash
# 建立正式版建置
eas build --platform android --profile production
```

**建置過程說明：**
1. 首次建置時，EAS 會詢問「Generate a new Android Keystore?」，輸入 `y`
2. EAS 會自動生成 Android Keystore（用於簽署應用程式）
3. 建置過程在 Expo 雲端伺服器進行，通常需要 10-20 分鐘
4. 建置完成後會提供下載連結

**查看建置狀態：**
- 在終端查看進度
- 前往 [expo.dev](https://expo.dev) 查看建置狀態
- 建置完成後會收到通知

### 步驟 3：申請 Google Play Developer 帳號

如果還沒有 Google Play Developer 帳號：

1. **前往 Google Play Console**
   - 訪問 [play.google.com/console](https://play.google.com/console)

2. **註冊開發者帳號**
   - 使用您的 Google 帳號登入
   - 點擊「建立開發人員帳戶」
   - 填寫開發者資訊：
     - **開發者名稱**：您的名字或公司名稱
     - **電子郵件地址**：用於接收通知
     - **電話號碼**：用於驗證
     - **國家/地區**：選擇您的國家/地區
   - 同意 Google Play 開發人員分銷協議
   - 完成付款（一次性費用 $25 USD）
   - 等待審核（通常立即生效，最多 48 小時）

### 步驟 4：設定 Google Play API 憑證

為了讓 EAS 可以自動上傳應用程式，需要設定 Google Play API 憑證：

```bash
eas credentials
```

選擇：
1. **Android** → **Set up credentials** → **Set up Google Play API Key**

按照提示操作：

1. **前往 Google Play Console**
   - 登入 [play.google.com/console](https://play.google.com/console)
   - 前往「設定」→「API 存取權限」

2. **建立服務帳號**
   - 點擊「建立新的服務帳號」
   - 點擊「Google Cloud Platform」連結
   - 在 Google Cloud Console 中建立服務帳號
   - 記下服務帳號的電子郵件地址（格式：xxx@xxx.iam.gserviceaccount.com）

3. **授權服務帳號**
   - 回到 Google Play Console
   - 點擊「授予存取權限」
   - 輸入服務帳號的電子郵件地址
   - 選擇角色：「管理員（所有權限）」
   - 點擊「邀請」

4. **下載 JSON 金鑰檔案**
   - 在 Google Cloud Console 中
   - 選擇建立的服務帳號
   - 前往「金鑰」標籤
   - 點擊「新增金鑰」→「建立新金鑰」
   - 選擇「JSON」格式
   - 下載 JSON 檔案

5. **提供給 EAS**
   - 回到終端，輸入下載的 JSON 檔案路徑
   - EAS 會自動設定憑證

### 步驟 5：在 Google Play Console 建立應用程式

1. **建立新應用程式**
   - 登入 [Google Play Console](https://play.google.com/console)
   - 點擊「建立應用程式」
   - 填寫應用程式資訊：
     - **應用程式名稱**：WITS證照考試題庫
     - **預設語言**：繁體中文
     - **應用程式或遊戲**：選擇「應用程式」
     - **免費或付費**：選擇「免費」
     - **同意條款**：勾選並同意
   - 點擊「建立」

2. **設定應用程式資訊**

#### 應用程式資訊
- **應用程式名稱**：WITS證照考試題庫（最多 50 個字元）
- **簡短說明**：例如「WITS證照考試題庫學習 App」（最多 80 個字元）
- **完整說明**：詳細說明應用程式功能（最多 4000 個字元）

範例完整說明：
```
WITS證照考試題庫是一個功能完整的證照考試學習應用程式。

主要功能：
• 測驗練習：提供多種證照考試題庫，包含信託營業員等測驗
• 錯題記錄：自動記錄答錯的題目，方便複習
• 收藏功能：收藏重要題目，隨時複習
• 進度追蹤：顯示每個測驗、科目、期數的完成進度
• 詳解說明：每題都提供詳細解答說明

適用對象：
• 準備證照考試的考生
• 需要複習題目的學習者
• 想要提升考試成績的學生

特色：
• 離線使用：所有題目資料都儲存在本地，無需網路即可使用
• 資料保留：答題記錄、錯題本都會保留，不會遺失
• 操作簡單：直觀的介面設計，輕鬆上手
```

#### 應用程式圖示和圖片
- **應用程式圖示**：512x512 像素（PNG，無透明度）
  - 從 `assets/icon.png` 調整尺寸後上傳
- **功能圖示**：1024x500 像素（可選）
- **螢幕截圖**：至少需要 2 張，最多 8 張
  - 建議尺寸：1080x1920 像素或更高
  - 建議截圖內容：
    1. 測驗名稱列表頁
    2. 科目列表頁
    3. 期數列表頁
    4. 作答頁面
    5. 錯題本頁面
    6. 複習頁面

#### 分類和內容分級
- **分類**：選擇「教育」或「參考資料」
- **內容分級**：完成內容分級問卷
  - 通常選擇「所有人」或「3+」

#### 定價與分銷
- 選擇「免費」
- 選擇可用的國家/地區（建議選擇「所有國家/地區」）
- 設定目標對象（所有年齡層）

#### 隱私權政策
- **必須提供隱私權政策 URL**（如果應用程式收集用戶資料）
- 如果應用程式不收集資料，可以建立簡單的隱私權政策說明

**隱私權政策範例（如果應用程式不收集資料）：**
```
隱私權政策

本應用程式（WITS證照考試題庫）重視用戶的隱私權。

資料收集：
本應用程式不會收集、儲存或傳輸任何用戶的個人資料。所有答題記錄、錯題本等資料都僅儲存在用戶的裝置本地，不會上傳到任何伺服器。

資料使用：
本應用程式不會使用或分享任何用戶資料。

資料安全：
所有用戶資料都儲存在裝置本地，僅用戶本人可以存取。

聯絡我們：
如有任何問題，請透過 [您的聯絡方式] 與我們聯絡。

最後更新日期：[更新日期]
```

### 步驟 6：上傳應用程式到 Google Play Store

#### 方法 A：使用 EAS Submit（推薦）

```bash
eas submit --platform android
```

按照提示：
- 選擇應用程式（如果有多個）
- 選擇建置版本（選擇剛才建立的 AAB 檔案）
- EAS 會自動處理上傳

#### 方法 B：手動上傳

1. **下載 AAB 檔案**
   - 從 [expo.dev](https://expo.dev) 下載建置完成的 AAB 檔案

2. **在 Google Play Console 上傳**
   - 前往 Google Play Console
   - 選擇您的應用程式
   - 前往「發布」→「正式版」（或「測試版」）
   - 點擊「建立新版本」
   - 上傳 AAB 檔案
   - 填寫版本說明（例如：「首次發布版本」）

### 步驟 7：完成發布檢查清單

在 Google Play Console 中，完成所有必要的檢查項目：

- [ ] 應用程式資訊已填寫完整
- [ ] 應用程式圖示已上傳
- [ ] 螢幕截圖已上傳（至少 2 張）
- [ ] 內容分級已完成
- [ ] 隱私權政策已提供（如果需要）
- [ ] 應用程式已上傳（AAB 檔案）
- [ ] 版本說明已填寫

### 步驟 8：提交審核

1. **檢查發布狀態**
   - 在 Google Play Console 中
   - 前往「發布」→「正式版」
   - 確認所有項目都顯示綠色勾選

2. **提交審核**
   - 點擊「提交以供審核」
   - 確認提交

3. **等待審核**
   - Google 通常會在 1-3 天內完成審核
   - 您可以在 Google Play Console 中查看審核狀態
   - 如果被拒絕，Google 會提供詳細的拒絕原因，修正後可重新提交

---

## 📝 後續更新步驟

當需要更新應用程式時：

1. **更新版本號**
   ```json
   // app.json
   {
     "version": "1.0.1",  // 更新版本號
     "android": {
       "versionCode": 2  // 遞增版本代碼
     }
   }
   ```

2. **重新建置**
   ```bash
   eas build --platform android --profile production
   ```

3. **提交更新**
   ```bash
   eas submit --platform android
   ```

4. **在 Google Play Console 中發布**
   - 前往「發布」→「正式版」
   - 選擇新版本
   - 填寫版本說明
   - 提交審核

---

## ❓ 常見問題

### Q: Package Name 可以更改嗎？
A: 不可以。一旦設定並建立應用程式後，Package Name 就無法更改。請謹慎選擇。

### Q: 建置失敗怎麼辦？
A: 檢查：
- `app.json` 設定是否正確
- 圖示檔案是否存在且符合規格
- 網路連線是否正常
- 查看 [expo.dev](https://expo.dev) 上的建置日誌

### Q: APK 和 AAB 有什麼區別？
A: 
- **APK**：適合直接安裝到手機測試
- **AAB**：Google Play Store 要求的格式，檔案更小，下載更快

### Q: 費用是多少？
A: 
- **EAS Build**：免費方案每月有有限次數的免費建置，付費方案從 $29 USD/月起
- **Google Play Developer**：$25 USD（一次性費用）

### Q: 需要 Mac 電腦嗎？
A: 不需要！使用 EAS Build，所有建置都在雲端進行，Windows 電腦也可以建立 Android 應用程式。

### Q: 審核被拒絕怎麼辦？
A: 
- 查看 Google 提供的拒絕原因
- 根據原因修正問題
- 重新提交審核

---

## 🎯 快速參考指令

```bash
# 登入 Expo
eas login

# 建立 Android 正式版（AAB）
eas build --platform android --profile production

# 提交到 Google Play Store
eas submit --platform android

# 查看建置狀態
eas build:list

# 管理憑證
eas credentials
```

---

## ✅ 完成檢查清單

在提交審核前，請確認：

- [ ] 應用程式已測試完成，功能正常
- [ ] `app.json` 配置正確
- [ ] 圖示檔案符合規格
- [ ] 已建立正式版建置（AAB）
- [ ] 已申請 Google Play Developer 帳號
- [ ] 已設定 Google Play API 憑證
- [ ] 已在 Google Play Console 建立應用程式
- [ ] 已填寫所有應用程式資訊
- [ ] 已上傳應用程式圖示和截圖
- [ ] 已完成內容分級
- [ ] 已提供隱私權政策（如果需要）
- [ ] 已上傳 AAB 檔案
- [ ] 已完成所有發布檢查項目
- [ ] 已提交審核

---

祝您上架順利！🎉

如有任何問題，請參考：
- [Android 建置指南](./ANDROID_BUILD_GUIDE.md)
- [EAS Build 文檔](https://docs.expo.dev/build/introduction/)
- [Google Play Console 說明](https://support.google.com/googleplay/android-developer)


