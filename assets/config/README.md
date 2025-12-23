# 版本配置說明

## 目錄結構

```
assets/
  config/
    version.config.json          # 版本選擇檔（唯一設定點）
    versions/                    # 存放所有版本的配置
      default/
        app-config.json          # 應用程式配置
        quiz-library-config.json # 題庫配置
      government-procurement/
        app-config.json
        quiz-library-config.json
  data/
    questions/
      versions/                  # 存放所有版本的題目資料
        default/
          questions.json
          example.json
          ...
        government-procurement/
          questions.json
          ...
```

## 切換版本

### 方法 1：修改 version.config.json

編輯 `assets/config/version.config.json`：

```json
{
  "currentVersion": "government-procurement"
}
```

可用的版本：
- `default` - 預設版本（WITS證照考試題庫）
- `government-procurement` - 政府採購法版本

### 方法 2：使用命令列（建置時）

```bash
# 建置預設版本
npm run build:android:apk

# 建置前先修改 version.config.json 為目標版本
# 然後執行建置命令
```

## 配置檔案說明

### app-config.json

每個版本的應用程式配置：

```json
{
  "appName": "應用程式名稱",
  "enableImport": true,      // 是否啟用匯入功能
  "enableTrash": true,       // 是否啟用垃圾桶功能
  "questionsPath": "版本名稱",
  "version": "版本名稱"
}
```

### quiz-library-config.json

題庫配置，定義哪些題庫啟用：

```json
[
  {
    "testName": "題庫代碼",
    "enabled": true,
    "displayName": "顯示名稱",
    "displayOrder": 1
  }
]
```

## 建置流程

1. **開發時**：
   - 修改 `version.config.json` 選擇版本
   - 執行 `npm start` 進行開發
   - 應用程式會從 `versions/` 目錄讀取配置和資料

2. **建置時**：
   - 執行 `npm run build:android:apk` 或 `npm run build:android:aab`
   - 建置腳本會：
     - 讀取 `version.config.json` 取得當前版本
     - 驗證版本目錄是否存在
   - EAS Build 會打包所有版本的目錄（根據 app.json 的 assetBundlePatterns）
   - 運行時根據 `version.config.json` 選擇對應版本載入

## 新增版本

1. 在 `assets/config/versions/` 下建立新版本目錄（例如：`new-version`）
2. 建立 `app-config.json` 和 `quiz-library-config.json`
3. 在 `assets/data/questions/versions/` 下建立對應的題目資料目錄
4. 將題目資料放入該目錄
5. 修改 `version.config.json` 的 `currentVersion` 為新版本名稱

## 注意事項

- 所有版本都會被打包到 APK 中，運行時根據 `version.config.json` 選擇版本
- 新增版本時需要在代碼中添加對應的映射（見下方說明）
- 建置前請確認 `version.config.json` 中的版本名稱正確
- 每個版本的配置和資料應該獨立管理
