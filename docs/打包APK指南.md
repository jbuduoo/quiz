# 打包 APK 指南

## 前置準備

### 1. 安裝 EAS CLI

```bash
npm install -g eas-cli
```

### 2. 登入 Expo 帳號

```bash
eas login
```

如果還沒有 Expo 帳號，請先到 [expo.dev](https://expo.dev) 註冊。

## 打包 APK

### 方法一：使用 EAS Build（推薦）

#### 1. 建置 APK

```bash
eas build --platform android --profile production
```

#### 2. 建置 APK（僅本地測試，不上傳到 Google Play）

```bash
eas build --platform android --profile preview
```

#### 3. 建置 APK（開發版本）

```bash
eas build --platform android --profile development
```

### 方法二：本地建置（需要 Android Studio）

如果您想在本機建置，需要先執行：

```bash
npx expo prebuild
```

然後使用 Android Studio 開啟 `android` 資料夾進行建置。

## EAS Build 配置說明

### 建置配置檔（eas.json）

專案中的 `eas.json` 包含以下建置配置：

- **development**: 開發版本，用於測試
- **preview**: 預覽版本，用於內部測試（APK）
- **production**: 生產版本，用於發布到 Google Play（AAB）

### 建置類型

- **APK**: 可直接安裝的檔案，適合內部測試
- **AAB**: Android App Bundle，用於發布到 Google Play Store

## 建置流程

1. **執行建置命令**
   ```bash
   eas build --platform android --profile preview
   ```

2. **等待建置完成**
   - 建置會在 Expo 的雲端伺服器上進行
   - 通常需要 10-20 分鐘
   - 可以在終端機中看到進度

3. **下載 APK**
   - 建置完成後，會提供下載連結
   - 也可以到 [expo.dev](https://expo.dev) 的專案頁面下載

## 常見問題

### Q: 建置失敗怎麼辦？

A: 檢查以下項目：
1. 確認 `app.json` 中的配置正確
2. 確認所有依賴項都已正確安裝
3. 查看建置日誌中的錯誤訊息

### Q: 如何更新版本號？

A: 在 `app.json` 中更新：
- `version`: 應用程式版本號（如：1.0.0）
- `android.versionCode`: Android 版本代碼（每次發布都要遞增）

### Q: APK 檔案太大怎麼辦？

A: 
1. 檢查 `assetBundlePatterns` 是否包含不必要的檔案
2. 使用 `eas build --platform android --profile preview --local` 進行本地建置（需要 Android Studio）

### Q: 如何簽名 APK？

A: EAS Build 會自動處理簽名。如果需要自訂簽名，請參考 [EAS Build 文件](https://docs.expo.dev/build/introduction/)。

## 快速建置命令

### 建置 APK（預覽版）
```bash
eas build --platform android --profile preview
```

### 建置 AAB（生產版，用於 Google Play）
```bash
eas build --platform android --profile production
```

### 建置並下載到本地
```bash
eas build --platform android --profile preview --local
```

## 注意事項

1. **首次建置**：需要較長時間，因為需要設定建置環境
2. **網路連線**：確保網路連線穩定
3. **Expo 帳號**：需要有效的 Expo 帳號才能使用 EAS Build
4. **版本號**：每次發布都要更新 `versionCode`

## 相關資源

- [EAS Build 文件](https://docs.expo.dev/build/introduction/)
- [Android 打包指南](https://docs.expo.dev/build/building-on-ci/)
- [Expo 官方文件](https://docs.expo.dev/)

