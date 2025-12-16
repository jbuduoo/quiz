# 📱 建立獨立應用程式與上架指南

本指南將協助您將 Expo 應用程式建立為獨立應用程式，並上架到 Apple App Store。

## 📋 目錄

1. [前置準備](#前置準備)
2. [安裝 EAS CLI](#安裝-eas-cli)
3. [設定應用程式資訊](#設定應用程式資訊)
4. [建立 iOS 應用程式](#建立-ios-應用程式)
5. [安裝到 iPhone（測試版）](#安裝到-iphone測試版)
6. [申請 Apple Developer 帳號](#申請-apple-developer-帳號)
7. [上架到 App Store](#上架到-app-store)
8. [建立 Android 應用程式](#建立-android-應用程式)

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

在 `app.json` 中，您需要修改以下資訊：

#### iOS Bundle Identifier
將 `com.jbuduoo.quiz` 改為您自己的識別碼，格式：`com.您的公司或名字.quiz`

例如：
- `com.john.quiz`
- `com.mycompany.quiz`
- `com.quizapp.certification`

**重要**：這個識別碼必須是唯一的，且之後無法更改。

#### Android Package Name
同樣將 `com.jbuduooo.quiz` 改為與 iOS 相同的識別碼（或不同的，但建議保持一致）。

### 2. 應用程式名稱和版本

確認以下資訊正確：
- `name`: WITS證照考試題庫
- `version`: 1.0.0
- `ios.buildNumber`: 1
- `android.versionCode`: 1

### 3. 圖示和啟動畫面

確認以下檔案存在且符合規格：
- `./assets/icon.png` - 應用程式圖示（1024x1024 像素）
- `./assets/adaptive-icon.png` - Android 自適應圖示（1024x1024 像素）
- `./assets/splash-icon.png` - 啟動畫面（建議 1242x2436 像素）

---

## 建立 iOS 應用程式

### 步驟 1：初始化 EAS 專案

在專案根目錄執行：

```bash
eas build:configure
```

這會建立 `eas.json` 設定檔（已為您建立）。

### 步驟 2：建立 iOS 應用程式

#### 選項 A：建立測試版（Preview Build）

適合先測試應用程式功能：

```bash
eas build --platform ios --profile preview
```

這會建立一個 `.ipa` 檔案，可以安裝到 iPhone 上測試。

#### 選項 B：建立正式版（Production Build）

適合準備上架到 App Store：

```bash
eas build --platform ios --profile production
```

### 步驟 3：等待建置完成

建置過程會在 Expo 的雲端伺服器上進行，通常需要 10-20 分鐘。

您可以：
- 在終端查看進度
- 前往 [expo.dev](https://expo.dev) 查看建置狀態
- 建置完成後會收到通知

---

## 安裝到 iPhone（測試版）

### 方法 1：使用 EAS Build 下載連結

1. 建置完成後，EAS 會提供一個下載連結
2. 在 iPhone 的 Safari 瀏覽器中開啟連結
3. 點擊「安裝」按鈕
4. 前往「設定」→「一般」→「VPN與裝置管理」
5. 信任開發者憑證
6. 回到主畫面，點擊應用程式圖示即可使用

### 方法 2：使用 TestFlight（推薦）

TestFlight 是 Apple 提供的測試平台，更方便管理測試版本：

1. 先完成 [申請 Apple Developer 帳號](#申請-apple-developer-帳號)
2. 建立正式版建置：`eas build --platform ios --profile production`
3. 提交到 TestFlight：`eas submit --platform ios`
4. 在 App Store Connect 中設定 TestFlight 測試群組
5. 邀請測試者透過 TestFlight App 安裝

---

## 申請 Apple Developer 帳號

### 1. 前往 Apple Developer 網站

訪問 [developer.apple.com](https://developer.apple.com)

### 2. 註冊開發者帳號

1. 點擊「Account」→「Sign In」
2. 使用您的 Apple ID 登入（如果沒有，請先建立）
3. 點擊「Enroll」開始註冊流程
4. 選擇帳號類型：
   - **個人開發者**：$99 USD/年（適合個人開發者）
   - **組織開發者**：$99 USD/年（適合公司，需要 D-U-N-S 號碼）

### 3. 完成註冊

1. 填寫個人/組織資訊
2. 同意開發者協議
3. 完成付款（信用卡）
4. 等待審核（通常 24-48 小時）

### 4. 啟用帳號

審核通過後，您會收到確認郵件，帳號即可使用。

---

## 上架到 App Store

### 步驟 1：連結 Apple Developer 帳號

在終端執行：

```bash
eas credentials
```

選擇「iOS」→「Set up credentials」→「Set up Apple App Store Connect API Key」

按照提示：
1. 前往 [App Store Connect](https://appstoreconnect.apple.com)
2. 建立 API Key（使用者與存取權限 → 金鑰 → 產生 API 金鑰）
3. 下載 `.p8` 檔案
4. 將 Key ID 和 Issuer ID 提供給 EAS

### 步驟 2：在 App Store Connect 建立應用程式

1. 登入 [App Store Connect](https://appstoreconnect.apple.com)
2. 點擊「我的 App」→「+」
3. 選擇「建立新 App」
4. 填寫應用程式資訊：
   - **平台**：iOS
   - **名稱**：WITS證照考試題庫
   - **主要語言**：繁體中文
   - **套件 ID**：選擇您設定的 Bundle Identifier
   - **SKU**：唯一的識別碼（例如：quiz-app-001）
   - **使用者存取權限**：完整存取權限

### 步驟 3：準備應用程式資訊

在 App Store Connect 中填寫：

#### 應用程式資訊
- **名稱**：應用程式在 App Store 顯示的名稱（最多 30 個字元）
- **副標題**：簡短描述（最多 30 個字元）
- **類別**：選擇「教育」或「參考資料」
- **內容版權**：您的名字或公司名稱
- **年齡分級**：選擇適當的年齡分級

#### 定價與可用性
- 選擇「免費」或設定價格
- 選擇可用的國家/地區

#### 隱私權政策
- 必須提供隱私權政策 URL（如果應用程式收集用戶資料）

#### 應用程式圖示和截圖
- **應用程式圖示**：1024x1024 像素（PNG，無透明度）
- **截圖**：至少需要一組截圖
  - iPhone 6.7"：1290x2796 像素
  - iPhone 6.5"：1242x2688 像素
  - iPhone 5.5"：1242x2208 像素

#### 應用程式描述
- **描述**：詳細說明應用程式功能（最多 4000 個字元）
- **關鍵字**：用於搜尋的關鍵字（最多 100 個字元）
- **宣傳文字**：簡短宣傳語（最多 170 個字元，可隨時更新）

### 步驟 4：建立並提交應用程式

1. **建立正式版建置**：
   ```bash
   eas build --platform ios --profile production
   ```

2. **提交到 App Store**：
   ```bash
   eas submit --platform ios
   ```

   按照提示：
   - 選擇應用程式（如果有多個）
   - 選擇建置版本
   - EAS 會自動處理上傳

3. **在 App Store Connect 中提交審核**：
   - 前往 App Store Connect
   - 選擇您的應用程式
   - 點擊「+ 版本」或選擇現有版本
   - 填寫所有必要資訊
   - 選擇建置版本
   - 回答出口合規性問題
   - 點擊「提交以供審核」

### 步驟 5：等待審核

- Apple 通常會在 24-48 小時內完成審核
- 您可以在 App Store Connect 中查看審核狀態
- 如果被拒絕，Apple 會提供詳細的拒絕原因，修正後可重新提交

---

## 建立 Android 應用程式

### 步驟 1：建立 Android 應用程式

#### 測試版（APK）
```bash
eas build --platform android --profile preview
```

#### 正式版（AAB，用於 Google Play）
```bash
eas build --platform android --profile production
```

### 步驟 2：安裝到 Android 手機

1. 建置完成後，EAS 會提供下載連結
2. 在 Android 手機上開啟連結
3. 下載並安裝 APK 檔案
4. 如果出現「不允許安裝未知來源應用程式」，請前往設定允許安裝

### 步驟 3：上架到 Google Play Store

1. 前往 [Google Play Console](https://play.google.com/console)
2. 建立開發者帳號（一次性費用 $25 USD）
3. 建立應用程式
4. 填寫應用程式資訊
5. 上傳 AAB 檔案（使用 `eas submit --platform android`）
6. 提交審核

---

## 常見問題

### Q: Bundle Identifier 可以更改嗎？
A: 不可以。一旦設定並建立應用程式後，Bundle Identifier 就無法更改。請謹慎選擇。

### Q: 建置失敗怎麼辦？
A: 檢查：
- `app.json` 設定是否正確
- 圖示檔案是否存在且符合規格
- 網路連線是否正常
- 查看 [expo.dev](https://expo.dev) 上的建置日誌

### Q: 如何更新應用程式？
A: 
1. 更新 `app.json` 中的版本號（`version`）和建置編號（`buildNumber`/`versionCode`）
2. 重新建立：`eas build --platform ios --profile production`
3. 提交更新：`eas submit --platform ios`

### Q: 需要 Mac 電腦嗎？
A: 不需要！使用 EAS Build，所有建置都在雲端進行，Windows 電腦也可以建立 iOS 應用程式。

### Q: 費用是多少？
A: 
- **EAS Build**：免費方案每月有有限次數的免費建置，付費方案從 $29 USD/月起
- **Apple Developer**：$99 USD/年
- **Google Play Developer**：$25 USD（一次性）

---

## 快速參考指令

```bash
# 登入 Expo
eas login

# 設定建置配置
eas build:configure

# 建立 iOS 測試版
eas build --platform ios --profile preview

# 建立 iOS 正式版
eas build --platform ios --profile production

# 建立 Android 測試版
eas build --platform android --profile preview

# 建立 Android 正式版
eas build --platform android --profile production

# 提交到 App Store
eas submit --platform ios

# 提交到 Google Play
eas submit --platform android

# 查看建置狀態
eas build:list

# 管理憑證
eas credentials
```

---

## 下一步

1. ✅ 修改 `app.json` 中的 Bundle Identifier
2. ✅ 確認圖示和啟動畫面符合規格
3. ✅ 執行 `eas build:configure`
4. ✅ 建立測試版並安裝到手機測試
5. ✅ 申請 Apple Developer 帳號
6. ✅ 準備 App Store 所需的資訊和截圖
7. ✅ 建立正式版並提交審核

祝您上架順利！🎉





