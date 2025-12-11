# 📱 Android 應用程式建置與上架指南

本指南將協助您將 Expo 應用程式建立為 Android 應用程式，並上架到 Google Play Store。

## 📋 目錄

1. [前置準備](#前置準備)
2. [安裝 EAS CLI](#安裝-eas-cli)
3. [設定應用程式資訊](#設定應用程式資訊)
4. [建立 Android 應用程式](#建立-android-應用程式)
5. [安裝到 Android 手機（測試版）](#安裝到-android-手機測試版)
6. [申請 Google Play Developer 帳號](#申請-google-play-developer-帳號)
7. [上架到 Google Play Store](#上架到-google-play-store)

---

## 前置準備

### 1. 建立 Expo 帳號

如果還沒有 Expo 帳號，請先建立：

```bash
npx expo login
```

或前往 [expo.dev](https://expo.dev) 註冊帳號。

### 2. 安裝必要工具

確保已安裝：
- Node.js (v18 或以上)
- npm 或 yarn
- Git

---

## 安裝 EAS CLI

EAS (Expo Application Services) 是用來建立和提交應用程式的工具：

```bash
npm install -g eas-cli
```

安裝完成後，登入您的 Expo 帳號：

```bash
eas login
```

---

## 設定應用程式資訊

### 1. 更新 app.json

在 `app.json` 中，確認以下資訊正確：

#### Android Package Name
確認 `package` 設定為您自己的識別碼，格式：`com.您的名字或公司.quiz`

例如：
- `com.john.quiz`
- `com.mycompany.quiz`
- `com.jbuduoo.quiz`

**重要**：這個識別碼必須是唯一的，且之後無法更改。

**檢查位置：**
```json
"android": {
  "package": "com.jbuduoo.quiz",  // ← 確認這裡
  "versionCode": 1,
  "adaptiveIcon": {
    "foregroundImage": "./assets/adaptive-icon.png",
    "backgroundColor": "#ffffff"
  }
}
```

### 2. 應用程式名稱和版本

確認以下資訊正確：
- `name`: 應用程式顯示名稱（例如：「金融證照考試題庫」）
- `version`: 版本號（例如：「1.0.0」）
- `android.versionCode`: Android 版本代碼（從 1 開始，每次上架遞增）

### 3. 圖示和啟動畫面

確認以下檔案存在且符合規格：
- `./assets/icon.png` - 應用程式圖示（1024x1024 像素）
- `./assets/adaptive-icon.png` - Android 自適應圖示（1024x1024 像素）
- `./assets/splash-icon.png` - 啟動畫面（建議 1242x2436 像素）

---

## 建立 Android 應用程式

### 步驟 1：初始化 EAS 專案

在專案根目錄執行：

```bash
eas build:configure
```

這會建立 `eas.json` 設定檔（如果還沒有）。

### 步驟 2：建立 Android 應用程式

#### 選項 A：建立測試版（Preview Build）- APK 格式

適合先測試應用程式功能，可以直接安裝到手機：

```bash
eas build --platform android --profile preview
```

**建置過程：**
1. 當詢問「Generate a new Android Keystore?」時，輸入 `y` 或 `yes`
2. EAS 會自動生成 Android Keystore（用於簽署應用程式）
3. 建置過程會在 Expo 的雲端伺服器上進行，通常需要 10-20 分鐘
4. 建置完成後會提供 APK 下載連結

#### 選項 B：建立正式版（Production Build）- AAB 格式

適合準備上架到 Google Play Store：

```bash
eas build --platform android --profile production
```

**注意：** Google Play Store 要求使用 AAB（Android App Bundle）格式，而不是 APK。

### 步驟 3：等待建置完成

建置過程會在 Expo 的雲端伺服器上進行，通常需要 10-20 分鐘。

您可以：
- 在終端查看進度
- 前往 [expo.dev](https://expo.dev) 查看建置狀態
- 建置完成後會收到通知

---

## 安裝到 Android 手機（測試版）

### 方法 1：直接下載安裝 APK

1. **下載 APK 檔案**
   - 建置完成後，EAS 會提供下載連結
   - 在電腦瀏覽器中開啟連結下載 APK
   - 或直接在 Android 手機的瀏覽器中開啟連結

2. **傳輸到手機**（如果在電腦下載）
   - 使用 USB 傳輸
   - 使用雲端硬碟（Google Drive、Dropbox 等）
   - 使用藍牙傳輸
   - 使用 Email 傳送給自己

3. **在 Android 手機上安裝**
   - 開啟檔案管理器
   - 找到下載的 APK 檔案
   - 點擊 APK 檔案
   - 如果出現「不允許安裝未知來源應用程式」警告：
     - 點擊「設定」
     - 啟用「允許安裝未知應用程式」
     - 或前往「設定」→「安全性」→ 啟用「未知來源」
     - 或前往「設定」→「應用程式」→「特殊應用程式存取」→「安裝未知應用程式」→ 選擇檔案管理器或瀏覽器 → 允許
   - 點擊「安裝」
   - 安裝完成後點擊「開啟」即可使用

### 方法 2：使用 QR Code（如果 EAS 提供）

1. 建置完成後，EAS 可能會提供 QR Code
2. 在 Android 手機上掃描 QR Code
3. 下載並安裝 APK

### 方法 3：使用內部測試（Internal Testing）

如果您已經有 Google Play Developer 帳號：

1. 建立正式版建置：`eas build --platform android --profile production`
2. 提交到 Google Play Console：`eas submit --platform android`
3. 在 Google Play Console 中設定內部測試群組
4. 邀請測試者透過 Google Play Store 安裝

---

## 申請 Google Play Developer 帳號

### 1. 前往 Google Play Console

訪問 [play.google.com/console](https://play.google.com/console)

### 2. 註冊開發者帳號

1. 使用您的 Google 帳號登入
2. 點擊「建立開發人員帳戶」
3. 填寫開發者資訊：
   - **開發者名稱**：您的名字或公司名稱
   - **電子郵件地址**：用於接收通知
   - **電話號碼**：用於驗證
   - **國家/地區**：選擇您的國家/地區
4. 同意 Google Play 開發人員分銷協議
5. 完成付款（一次性費用 $25 USD）
6. 等待審核（通常立即生效，最多 48 小時）

### 3. 啟用帳號

付款完成後，帳號即可使用。

---

## 上架到 Google Play Store

### 步驟 1：連結 Google Play Developer 帳號

在終端執行：

```bash
eas credentials
```

選擇「Android」→「Set up credentials」→「Set up Google Play API Key」

按照提示：
1. 前往 [Google Play Console](https://play.google.com/console)
2. 前往「設定」→「API 存取權限」
3. 建立服務帳號並下載 JSON 金鑰檔案
4. 將金鑰檔案路徑提供給 EAS

### 步驟 2：在 Google Play Console 建立應用程式

1. 登入 [Google Play Console](https://play.google.com/console)
2. 點擊「建立應用程式」
3. 填寫應用程式資訊：
   - **應用程式名稱**：金融證照考試題庫（或您想要的名稱）
   - **預設語言**：繁體中文
   - **應用程式或遊戲**：選擇「應用程式」
   - **免費或付費**：選擇「免費」
   - **同意條款**：勾選並同意

### 步驟 3：準備應用程式資訊

在 Google Play Console 中填寫：

#### 應用程式資訊
- **應用程式名稱**：應用程式在 Play Store 顯示的名稱（最多 50 個字元）
- **簡短說明**：簡短描述（最多 80 個字元）
- **完整說明**：詳細說明應用程式功能（最多 4000 個字元）
- **應用程式圖示**：512x512 像素（PNG，無透明度）
- **功能圖示**：1024x500 像素（可選）
- **螢幕截圖**：至少需要一組截圖
  - 手機：至少 2 張，最多 8 張
  - 建議尺寸：1080x1920 像素或更高
- **分類**：選擇「教育」或「參考資料」
- **內容分級**：完成內容分級問卷

#### 定價與分銷
- 選擇「免費」或設定價格
- 選擇可用的國家/地區
- 設定目標對象（所有年齡層或特定年齡層）

#### 隱私權政策
- 必須提供隱私權政策 URL（如果應用程式收集用戶資料）
- 如果應用程式不收集資料，可以建立簡單的隱私權政策說明

### 步驟 4：建立並提交應用程式

1. **建立正式版建置**：
   ```bash
   eas build --platform android --profile production
   ```
   這會建立 AAB（Android App Bundle）格式的檔案。

2. **提交到 Google Play Store**：
   ```bash
   eas submit --platform android
   ```
   
   按照提示：
   - 選擇應用程式（如果有多個）
   - 選擇建置版本
   - EAS 會自動處理上傳

3. **在 Google Play Console 中提交審核**：
   - 前往 Google Play Console
   - 選擇您的應用程式
   - 前往「發布」→「正式版」（或「測試版」）
   - 選擇上傳的建置版本
   - 填寫所有必要資訊
   - 點擊「提交以供審核」

### 步驟 5：等待審核

- Google 通常會在 1-3 天內完成審核
- 您可以在 Google Play Console 中查看審核狀態
- 如果被拒絕，Google 會提供詳細的拒絕原因，修正後可重新提交

---

## 常見問題

### Q: Package Name 可以更改嗎？
A: 不可以。一旦設定並建立應用程式後，Package Name 就無法更改。請謹慎選擇。

### Q: 建置失敗怎麼辦？
A: 檢查：
- `app.json` 設定是否正確
- 圖示檔案是否存在且符合規格
- 網路連線是否正常
- 查看 [expo.dev](https://expo.dev) 上的建置日誌

### Q: 如何更新應用程式？
A: 
1. 更新 `app.json` 中的版本號（`version`）和版本代碼（`versionCode`）
2. 重新建立：`eas build --platform android --profile production`
3. 提交更新：`eas submit --platform android`

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

---

## 快速參考指令

```bash
# 登入 Expo
eas login

# 設定建置配置
eas build:configure

# 建立 Android 測試版（APK）
eas build --platform android --profile preview

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

## 測試檢查清單

在提交到 Google Play Store 之前，建議測試：

- [ ] 應用程式可以正常安裝
- [ ] 應用程式可以正常啟動
- [ ] 所有功能正常運作
- [ ] 資料儲存正常（AsyncStorage）
- [ ] 畫面顯示正確（不同螢幕尺寸）
- [ ] 沒有崩潰或錯誤
- [ ] 效能表現良好
- [ ] 關閉應用程式後重新開啟，資料是否保留

---

## 下一步

1. ✅ 確認 `app.json` 中的 Package Name
2. ✅ 確認圖示和啟動畫面符合規格
3. ✅ 執行 `eas build:configure`
4. ✅ 建立測試版並安裝到手機測試
5. ✅ 申請 Google Play Developer 帳號（如果還沒有）
6. ✅ 準備 Google Play Store 所需的資訊和截圖
7. ✅ 建立正式版並提交審核

祝您上架順利！🎉

