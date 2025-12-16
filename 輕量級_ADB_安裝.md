# 輕量級 ADB 安裝方案（不需要 Android Studio）

## 方案一：直接下載 Platform Tools（推薦）

### 步驟
1. **下載 Android Platform Tools**
   - 前往：https://developer.android.com/studio/releases/platform-tools
   - 或直接下載：https://dl.google.com/android/repository/platform-tools-latest-windows.zip
   - 檔案大小約 5-10 MB

2. **解壓縮**
   - 解壓縮到任意資料夾，例如：`C:\adb\`
   - 資料夾內會有 `adb.exe` 檔案

3. **測試 ADB**
   - 開啟 PowerShell 或命令提示字元
   - 切換到解壓縮的資料夾：
     ```powershell
     cd C:\adb
     .\adb.exe version
     ```

4. **加入 PATH（可選，方便使用）**
   - 開啟「系統環境變數」設定
   - 編輯 PATH 變數
   - 新增：`C:\adb`（或您解壓縮的資料夾路徑）
   - 重新開啟終端機後，就可以直接使用 `adb` 命令

---

## 方案二：使用 Chocolatey（如果已安裝）

```powershell
choco install adb
```

---

## 方案三：使用 Scoop（如果已安裝）

```powershell
scoop install adb
```

---

## 使用 ADB 查看應用程式日誌

### 1. 連接手機
- 啟用 USB 除錯（如之前說明）
- 使用 USB 線連接手機

### 2. 檢查連接
```bash
adb devices
```

### 3. 查看應用程式日誌
```bash
# 查看所有日誌
adb logcat

# 只查看應用程式相關日誌（過濾）
adb logcat | findstr /i "quiz expo react"

# 清除舊日誌後查看新日誌
adb logcat -c && adb logcat
```

### 4. 查看崩潰日誌
```bash
# 查看應用程式崩潰資訊
adb logcat | findstr /i "FATAL EXCEPTION"

# 查看所有錯誤
adb logcat *:E
```

---

## 如果不想安裝 ADB

### 替代方案 A：使用 Expo Go 測試
不需要 ADB，直接在手機上測試開發版本：
1. 安裝 Expo Go App
2. 執行 `npm start`
3. 掃描 QR Code

### 替代方案 B：在應用程式中添加錯誤顯示
在應用程式中捕獲錯誤並顯示在畫面上，方便查看問題。

### 替代方案 C：重新建置 APK 測試
可能已經修復了問題，直接重新建置測試。

---

## 注意事項

- ADB 工具很小（約 5-10 MB），不會影響系統效能
- 不需要安裝完整的 Android Studio
- 只需要下載解壓縮即可使用

