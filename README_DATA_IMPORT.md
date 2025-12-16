# 資料匯入說明

## Excel 轉換為 JSON

本系統支援從 Excel 檔案匯入題目資料，支援多個檔案同時轉換。

### 使用方式

1. **準備 Excel 檔案**
   - 將 Excel 檔案放在 `data/` 資料夾中
   - **檔案名稱格式**：`{testName}_{subject}_{series_no}.xlsx`
     - 例如：`IPAS_01初級_L11 人工智慧基礎概論_11409.xlsx`
     - 系統會自動從檔案名稱解析：
       - `testName`: `IPAS_01`（測驗名稱）
       - `subject`: `L11`（科目代碼）
       - `series_no`: `11409`（期數）
   - Excel 檔案應包含以下欄位：
     - `id` 或 `題號`: 題目編號
     - `content` 或 `題目`: 題目內容
     - `optionA` 或 `選項A`: 選項 A
     - `optionB` 或 `選項B`: 選項 B
     - `optionC` 或 `選項C`: 選項 C
     - `optionD` 或 `選項D`: 選項 D
     - `correctAnswer` 或 `正確答案`: 正確答案（A/B/C/D 或 1/2/3/4）
     - `explanation` 或 `詳解`: 詳解
     - `chapter` 或 `章節`: 章節名稱（可選）

2. **執行轉換腳本**
   ```bash
   node scripts/convertExcelToJSON.js
   ```
   或
   ```bash
   npm run convert:excel
   ```

3. **檢查輸出**
   - 索引檔案：`assets/data/questions.json`
   - 題目檔案：`assets/data/questions/{testName}_{subject}_{series_no}.json`
   - 映射表：`src/services/questionFileMap.ts`（自動生成）
   - 終端機會顯示轉換統計資訊

### 欄位對應

轉換腳本會自動嘗試以下欄位名稱對應：

| JSON 欄位 | Excel 可能欄位名稱 |
|----------|-------------------|
| `id` | 題號、ID、id、題目編號、序號 |
| `content` | 題目、題目內容、content、問題、題幹 |
| `optionA` | 選項A、A、optionA、答案A、選項1 |
| `optionB` | 選項B、B、optionB、答案B、選項2 |
| `optionC` | 選項C、C、optionC、答案C、選項3 |
| `optionD` | 選項D、D、optionD、答案D、選項4 |
| `correctAnswer` | 正確答案、答案、correctAnswer、正確選項、標準答案 |
| `explanation` | 詳解、解析、explanation、說明、解答 |
| `chapter` | 章節、chapter、單元、類別、章節名稱 |

**重要：**
- ⚠️ `testName`、`subject`、`series_no` **不再從 Excel 欄位讀取**
- ✅ 這些資訊**必須**從檔案名稱解析
- ✅ 如果檔案名稱格式不正確，會使用預設值

### 正確答案格式

- 支援 `A`、`B`、`C`、`D`
- 支援 `1`、`2`、`3`、`4`（會自動轉換為 A/B/C/D）

### 資料更新

當更新 Excel 檔案後：

1. **執行轉換腳本**
   ```bash
   node scripts/convertExcelToJSON.js
   ```
   - 會自動處理 `data/` 目錄中的所有 Excel 檔案
   - 自動生成索引檔案和題目檔案
   - 自動更新題目檔案映射表

2. **更新版本號（如果需要清除舊記錄）**
   - 在 `src/services/QuestionService.ts` 中修改：
   ```typescript
   const currentVersion = '4.0.1'; // 從 4.0.0 改為 4.0.1
   ```
   - ⚠️ **注意**：版本號改變會自動清除所有用戶答題記錄和測驗進度

3. **重新啟動 App**
   - 系統會自動載入新資料
   - 如果版本號改變，會清除舊的答題記錄

### 檔案名稱格式範例

| 檔案名稱 | testName | subject | series_no |
|---------|----------|---------|-----------|
| `IPAS_01初級_L11 人工智慧基礎概論_11409.xlsx` | `IPAS_01` | `L11` | `11409` |
| `IPAS_02中級_L23機器學習技術與應用_11411.xlsx` | `IPAS_02` | `L23` | `11411` |

### 生成的檔案結構

```
assets/data/
├── questions.json                    # 索引檔案
└── questions/                        # 題目檔案目錄
    ├── IPAS_01_L11_11409.json
    ├── IPAS_01_L11_11411.json
    ├── IPAS_02_L22_11411.json
    └── ...
```

### 題目 ID 格式

- **格式**：`{testName}_{subject}_{series_no}_{題號}`
- **範例**：`IPAS_01_L11_11409_1`、`IPAS_02_L22_11411_45`
- ⚠️ 舊格式（`L22_11411_1`）已棄用

### 疑難排解

**問題：轉換失敗**
- 確認 Excel 檔案路徑正確
- 確認 Excel 檔案格式正確（第一行為欄位名稱）
- 檢查終端機錯誤訊息

**問題：資料格式不正確**
- 檢查 Excel 欄位名稱是否符合支援的格式
- 確認正確答案欄位為 A/B/C/D 或 1/2/3/4
- 檢查是否有空值或格式錯誤

**問題：App 無法載入資料**
- 確認索引檔案已成功生成：`assets/data/questions.json`
- 確認題目檔案已成功生成：`assets/data/questions/*.json`
- 確認映射表已生成：`src/services/questionFileMap.ts`
- 檢查 `QuestionService.ts` 中的版本號是否已更新
- 清除 App 資料後重新啟動（會觸發重新載入）

**問題：檔案名稱解析錯誤**
- 確認檔案名稱格式正確：`{testName}_{subject}_{series_no}.xlsx`
- 檢查檔案名稱中是否包含特殊字元
- 查看終端機輸出，確認解析結果是否正確

**問題：題目 ID 格式錯誤**
- 確認轉換腳本已更新到最新版本
- 檢查生成的 JSON 檔案中題目 `id` 格式是否為 `{testName}_{subject}_{series_no}_{題號}`




