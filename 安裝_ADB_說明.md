# 安裝 ADB 工具指南

## 方案一：安裝 Android Studio（推薦）

### 優點
- 自動安裝完整的 Android SDK 和 ADB
- 包含圖形化介面的 Logcat 查看器
- 適合未來開發 Android 應用程式

### 步驟
1. 前往 [Android Studio 官網](https://developer.android.com/studio)
2. 下載並安裝 Android Studio
3. 安裝時選擇「Standard」安裝，會自動安裝 Android SDK
4. ADB 會自動安裝在：`C:\Users\wits\AppData\Local\Android\Sdk\platform-tools\`

### 設定環境變數（可選）
安裝完成後，可以將 ADB 加入系統 PATH：
1. 開啟「系統環境變數」設定
2. 編輯 PATH 變數
3. 新增：`C:\Users\wits\AppData\Local\Android\Sdk\platform-tools`

---

## 方案二：僅安裝 ADB（輕量級）

### 步驟
1. 下載 Android SDK Platform Tools：
   - 前往：https://developer.android.com/studio/releases/platform-tools
   - 下載 Windows 版本
2. 解壓縮到任意資料夾（例如：`C:\adb\`）
3. 將該資料夾加入系統 PATH

---

## 方案三：使用 Chocolatey（如果已安裝）

```powershell
choco install adb
```

---

## 驗證安裝

安裝完成後，重新開啟終端機，執行：

```bash
adb version
```

應該會顯示 ADB 版本號碼。

---

## 檢查手機連接

連接手機後，執行：

```bash
adb devices
```

如果看到設備列表，表示連接成功。

---

## 查看應用程式日誌

連接手機並開啟應用程式後，執行：

```bash
adb logcat | findstr /i "quiz expo react"
```

或查看所有日誌：

```bash
adb logcat
```

---

## 注意事項

- 如果使用 EAS Build 建置的 APK，不需要本地 Android SDK
- ADB 主要用於查看應用程式日誌和除錯
- 如果只是測試 APK，也可以直接安裝使用，不需要 ADB

