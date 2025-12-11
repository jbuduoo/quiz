# 資料匯入說明

## Excel 轉換為 JSON

本系統支援從 Excel 檔案匯入題目資料。

### 使用方式

1. **準備 Excel 檔案**
   - 將 Excel 檔案放在 `date/` 資料夾中
   - Excel 檔案應包含以下欄位：
     - `testName`: 測驗名稱,例:信託法規乙科
     - `subject`: 科目名稱,從試卷上取得例:信託法規
	 - `series_no`: 系列編號/期別編號,例:114年度或34 屆
     - `id`: 題目編號
     - `content`: 題目內容
     - `optionA`, `optionB`, `optionC`, `optionD`: 四個選項。(若是數字，請自行轉換成ABCD)
     - `correctAnswer`: 正確答案（A/B/C/D）
     - `explanation`: 詳解

2. **執行轉換腳本**
   ```bash
   npm run convert:excel
   ```

3. **檢查輸出**
   - 轉換後的 JSON 檔案會儲存在 `assets/data/questions.json`
   - 終端機會顯示轉換統計資訊

### 欄位對應

轉換腳本會自動嘗試以下欄位名稱對應：

| CSV/JSON 欄位 | Excel 可能欄位名稱 |
|--------------|-------------------|
| `id` | 題號、ID、id、題目編號、序號 |
| `content` | 題目、題目內容、content、問題、題幹 |
| `optionA` | 選項A、A、optionA、答案A、選項1 |
| `optionB` | 選項B、B、optionB、答案B、選項2 |
| `optionC` | 選項C、C、optionC、答案C、選項3 |
| `optionD` | 選項D、D、optionD、答案D、選項4 |
| `correctAnswer` | 正確答案、答案、correctAnswer、正確選項、標準答案 |
| `explanation` | 詳解、解析、explanation、說明、解答 |
| `subject` | 科目、subject、類別、科目名稱 |
| `chapter` | 章節、chapter、單元、類別、章節名稱 |

### 正確答案格式

- 支援 `A`、`B`、`C`、`D`
- 支援 `1`、`2`、`3`、`4`（會自動轉換為 A/B/C/D）

### 資料更新

當更新 Excel 檔案後：

1. 執行轉換腳本：`npm run convert:excel`
2. 在 `QuestionService.ts` 中更新 `currentVersion`（例如：`'1.0.1'`）
3. 重新啟動 App，系統會自動載入新資料

### 目前資料

- **來源檔案**：`date/第34屆理財規劃人員專業能力.xlsx`
- **轉換後檔案**：`assets/data/questions.json`
- **題目數量**：50 題
- **科目**：理財工具
- **章節數量**：44 個章節

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
- 確認 JSON 檔案已成功生成在 `assets/data/questions.json`
- 檢查 `QuestionService.ts` 中的版本號是否已更新
- 清除 App 資料後重新啟動（會觸發重新載入）


