# 題庫配置說明

## 檔案位置

`assets/config/quiz-library-config.json`

## 功能說明

此配置檔案用於控制哪些題庫在應用程式中顯示。開發者可以透過編輯此檔案來開啟或關閉特定的題庫。

## 配置格式

```json
[
  {
    "testName": "IPAS_01",
    "enabled": true,
    "displayName": "IPAS AI應用規劃師初級",
    "displayOrder": 1
  },
  {
    "testName": "IPAS_02",
    "enabled": true,
    "displayName": "IPAS AI應用規劃師中級",
    "displayOrder": 2
  },
  {
    "testName": "JAVA",
    "enabled": false,
    "displayName": "Java 程式設計認證",
    "displayOrder": 3
  }
]
```

## 欄位說明

- **testName**: 題庫代碼（必須與 `questions.json` 中的 `testName` 一致）
- **enabled**: 是否啟用（`true` = 顯示，`false` = 隱藏）
- **displayName**: 顯示名稱（在應用程式中顯示的名稱）
- **displayOrder**: 顯示順序（數字越小越前面）

## 使用方式

### 1. 開啟題庫

將對應題庫的 `enabled` 設為 `true`：

```json
{
  "testName": "JAVA",
  "enabled": true,  // 改為 true
  "displayName": "Java 程式設計認證",
  "displayOrder": 3
}
```

### 2. 關閉題庫

將對應題庫的 `enabled` 設為 `false`：

```json
{
  "testName": "IPAS_01",
  "enabled": false,  // 改為 false
  "displayName": "IPAS AI應用規劃師初級",
  "displayOrder": 1
}
```

### 3. 新增題庫

在陣列中新增一個物件：

```json
{
  "testName": "PYTHON",
  "enabled": true,
  "displayName": "Python 程式設計認證",
  "displayOrder": 4
}
```

## 更新步驟

1. 編輯 `assets/config/quiz-library-config.json`
2. 儲存檔案
3. 重新載入網頁（在網頁版）或重新啟動應用程式（在行動裝置）

## 注意事項

- 配置檔案會在應用程式啟動時載入
- 網頁版會自動從 `/assets/config/quiz-library-config.json` 載入配置
- 行動裝置版本會使用本地快取的配置（首次載入後）
- 如果配置檔案載入失敗，會使用預設配置
- `testName` 必須與實際存在的題庫資料一致

## 範例：切換到 JAVA 題庫

如果要將應用程式切換為只顯示 JAVA 題庫：

```json
[
  {
    "testName": "IPAS_01",
    "enabled": false,
    "displayName": "IPAS AI應用規劃師初級",
    "displayOrder": 1
  },
  {
    "testName": "IPAS_02",
    "enabled": false,
    "displayName": "IPAS AI應用規劃師中級",
    "displayOrder": 2
  },
  {
    "testName": "JAVA",
    "enabled": true,
    "displayName": "Java 程式設計認證",
    "displayOrder": 1
  }
]
```

## 技術細節

- 配置檔案使用 JSON 格式
- 支援註解（雖然標準 JSON 不支援，但可以透過工具處理）
- 配置會快取 5 分鐘，避免頻繁請求
- 如果遠端配置載入失敗，會使用本地儲存的配置或預設配置

