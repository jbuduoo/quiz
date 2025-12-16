# IPAS證照考試題庫 App

一個功能完整的IPAS考試題庫應用程式，支援測驗練習、錯題記錄與複習功能。

## 功能特色

### 📋 測驗名稱列表頁 (TestNameListScreen)
- 顯示所有測驗名稱（如：信託營業員）
- 顯示每個測驗的總題數、完成題數和完成百分比
- 點擊測驗名稱進入科目列表頁

### 📚 科目列表頁 (SubjectListScreen)
- 顯示所選測驗的所有科目（如：信託法規、信託實務）
- 顯示每個科目的總題數、完成題數和完成百分比
- 點擊科目進入期數列表頁

### 📖 期數列表頁 (SeriesListScreen)
- 顯示所選科目的所有期數（如：59期、60期、61期）
- **完成狀態顯示**：
  - 全部完成：顯示 `期數(總題數 X題，正確 Y題，得分 Z分)`
  - 未完成：顯示 `期數(總題數 X題)`
- 底部整合「❤️ 錯題與收藏本」入口，顯示當前科目的錯題數量
- 點擊期數即可開始測驗
- 滑鼠懸停時顯示黃色高亮效果

### ✍️ 作答頁 (QuizScreen)
- **題號顯示**：顯示「第 X 題」，便於識別題目位置
- 顯示題目與四個選項（A/B/C/D）
- 即時顯示答題結果（正確/錯誤）
- **功能按鈕區域**（位於詳解上方）：
  - **查詢問題**：將題目加入錯題本並開啟 Google 搜尋
  - **錯題**：標記為錯題（自動加入錯題本）
  - **不確定**：標記為不確定（同時加入錯題本）
  - **問題回報**：回報題目問題，包含完整題目編號（格式：測驗名稱-科目-期數-第X題）
- 顯示詳解與正確答案
- 進度條顯示（如：1/50）
- 答錯時自動加入錯題本

### 📖 錯題本頁 (WrongBookScreen)
- **篩選功能**：
  - 依科目篩選（可選擇特定科目或全部）
  - 僅複習錯題（切換開關）
  - 僅複習收藏題（切換開關）
- 顯示錯題/收藏題/不確定題列表
- 每項顯示題目簡述、錯誤次數、收藏狀態、科目標籤
- 統計資訊：總題數、錯題數、收藏題數
- 點擊題目進入複習作答頁

### 🔄 複習作答頁 (ReviewQuizScreen)
- **題號顯示**：顯示「第 X 題」
- 專門用於錯題本複習
- **功能按鈕區域**（位於詳解上方）：
  - **查詢問題**：開啟 Google 搜尋
  - **從錯題本移除**：確認已掌握後可移除（僅在題目為錯題時顯示）
  - **問題回報**：回報題目問題，包含完整題目編號
- 顯示錯誤次數統計
- 答對後可選擇從錯題本移除
- 題目去重：即使同一題目被標記多次，在錯題本中只顯示一次

### 📑 章節列表頁 (ChapterListScreen)
- 顯示所有章節及其完成百分比
- 底部整合「❤️ 錯題與收藏本」入口
- 點擊章節可進入測驗（功能待完善）

## 技術架構

- **框架**：React Native + Expo (~54.0.27)
- **導航**：React Navigation (Native Stack)
- **資料儲存**：AsyncStorage
- **語言**：TypeScript
- **題目資料格式**：JSON 檔案（按需載入）
- **資料轉換工具**：Excel 轉 JSON 腳本

## 安裝與執行

### 前置需求
- Node.js (建議 v18 或以上)
- npm 或 yarn
- Expo CLI

### 安裝步驟

1. 安裝依賴：
```bash
npm install
```

2. 啟動開發伺服器：
```bash
npm start
```

3. 在模擬器、實體裝置或瀏覽器上執行：
- **Web (瀏覽器)**：按 `w` 鍵或執行 `npm run web`，然後在瀏覽器中開啟顯示的網址（通常是 `http://localhost:8081`）
- **iOS 模擬器**：按 `i` 鍵或執行 `npm run ios`（僅限 macOS）
- **Android 模擬器**：按 `a` 鍵或執行 `npm run android`
- **iOS 實體裝置（使用 Expo Go）**：見下方說明
- **Android 實體裝置（使用 Expo Go）**：見下方說明

### 📱 使用 Expo Go 連接實體裝置

#### iOS 手機連接步驟

1. **安裝 Expo Go App**
   - 在 iPhone 的 App Store 搜尋並安裝「Expo Go」

2. **啟動開發伺服器**
   ```bash
   npm start
   # 或使用 LAN 模式（推薦）
   npx expo start --lan
   ```

3. **確保網路連接**
   - iPhone 和電腦必須連接到**同一個 Wi-Fi 網路**
   - iPhone 請關閉行動數據，避免自動切換網路

4. **連接應用程式**
   - **方法 A：掃描 QR Code**（推薦）
     1. 打開 iPhone 上的 Expo Go App
     2. 點擊「Scan QR Code」
     3. 掃描終端中顯示的 QR Code
   - **方法 B：手動輸入地址**
     1. 打開 Expo Go App
     2. 點擊「Enter URL manually」
     3. 輸入終端顯示的 `exp://` 地址（例如：`exp://172.20.10.5:8081`）

5. **連接模式說明**
   - **LAN 模式**：`npx expo start --lan`（推薦，需同一 Wi-Fi）
   - **Tunnel 模式**：`npx expo start --tunnel`（跨網路可用，但可能較慢）

#### Android 手機連接步驟

步驟與 iOS 相同，但需在 Google Play Store 安裝 Expo Go App。

#### 故障排除

- **連接超時**：確認手機和電腦在同一 Wi-Fi 網路
- **無法掃描 QR Code**：嘗試手動輸入終端顯示的 `exp://` 地址
- **防火牆阻擋**：Windows 防火牆可能需要允許 Node.js 通過
- **Tunnel 模式端點離線**：嘗試使用 LAN 模式，或重新啟動開發伺服器

#### 開發快捷鍵

連接成功後，可在終端使用以下快捷鍵：
- `r` - 重新載入應用程式
- `m` - 切換開發選單
- `j` - 開啟除錯工具
- `w` - 開啟 Web 版本
- `?` - 顯示所有命令

### 🌐 Web 版本說明

Web 版本已完全支援，可以在任何現代瀏覽器中運行：
- 啟動後會自動在瀏覽器中開啟
- 響應式設計，在桌面和行動裝置上都能良好顯示
- 桌面版會自動限制最大寬度為 480px，模擬手機體驗
- 所有功能（測驗、錯題本、收藏）都可在 Web 上正常使用
- 支援滑鼠懸停效果（hover）

## 專案結構

```
quiz/
├── src/
│   ├── screens/                    # 畫面元件
│   │   ├── TestNameListScreen.tsx   # 測驗名稱列表頁
│   │   ├── SubjectListScreen.tsx    # 科目列表頁
│   │   ├── SeriesListScreen.tsx     # 期數列表頁
│   │   ├── ChapterListScreen.tsx    # 章節列表頁
│   │   ├── QuizScreen.tsx           # 作答頁
│   │   ├── WrongBookScreen.tsx      # 錯題本頁
│   │   └── ReviewQuizScreen.tsx     # 複習作答頁
│   ├── services/                    # 服務層
│   │   ├── QuestionService.ts       # 題目與答題記錄管理
│   │   └── questionFileMap.ts       # 題目檔案映射表
│   └── types/                       # 類型定義
│       └── index.ts                 # TypeScript 介面定義
├── assets/
│   └── data/
│       ├── questions.json           # 題目索引檔案
│       └── questions/               # 題目 JSON 檔案目錄
│           ├── q_*.json             # 各期數的題目檔案
├── data/                            # 原始 Excel 資料
│   └── *.xlsx                       # Excel 題目檔案
├── scripts/                         # 資料轉換腳本
│   ├── convertExcelToJSON.ts       # Excel 轉 JSON
│   ├── convertExcelToJSON.js        # Excel 轉 JSON (JS 版本)
│   ├── convertExcelToCSV.ts        # Excel 轉 CSV
│   ├── generateQuestionFileMap.js   # 生成題目檔案映射表
│   └── listTestNames.js             # 列出測驗名稱
├── App.tsx                         # 應用程式入口與導航設定
├── metro.config.js                 # Metro Bundler 配置
├── package.json                    # 專案依賴
└── README.md                       # 專案說明文件
```

## 核心功能流程

### 作答流程
1. 選擇測驗名稱 → 選擇科目 → 選擇期數 → 進入作答頁
2. 顯示題號（第 X 題）
3. 選擇選項作答
4. 答錯 → 自動加入錯題本
5. 可使用功能按鈕：查詢問題、標記錯題、標記不確定、問題回報
6. 繼續作答或結束測驗

### 複習流程
1. 從期數列表頁或章節列表頁點擊「錯題與收藏本」
2. 系統自動過濾當前科目的錯題（期數列表頁）或所有錯題（章節列表頁）
3. 選擇篩選條件（科目/錯題/收藏）
4. 點擊題目進入複習作答頁
5. 顯示題號
6. 作答後可選擇「從錯題本移除」
7. 繼續複習或結束複習

### 錯題本去重機制
- 即使同一題目被多次標記（查詢問題、錯題、不確定、問題回報），在錯題本中只會顯示一次
- 使用題目 ID 進行去重

## 資料結構

### 題目 (Question)
```typescript
{
  id: string;                    // 題目ID（格式：科目_期數_題號）
  content: string;               // 題目內容
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';  // 正確答案
  explanation: string;           // 詳解
  testName: string;              // 測驗名稱（例如：信託營業員）
  subject: string;               // 所屬科目（例如：信託法規）
  series_no: string;             // 期數（例如：61期）
  chapter?: string;              // 所屬章節（可選）
  questionNumber?: number;        // 在該期數中的題號（從1開始，自動生成）
}
```

### 用戶答題記錄 (UserAnswer)
```typescript
{
  questionId: string;
  isCorrect: boolean;            // 是否答對
  isAnswered: boolean;           // 是否已作答
  isFavorite: boolean;           // 是否收藏
  isInWrongBook: boolean;        // 是否在錯題本
  isUncertain: boolean;          // 是否不確定
  wrongCount: number;            // 錯誤次數
  lastAnsweredAt?: Date;         // 最後答題時間
  lastWrongAt?: Date;            // 最後答錯時間
}
```

### 期數資訊 (Series)
```typescript
{
  id: string;
  name: string;                  // 期數名稱（如：59期）
  testName: string;              // 測驗名稱
  subject: string;               // 科目
  totalQuestions: number;        // 總題數
  completedQuestions: number;     // 已完成題數
  completionPercentage: number;   // 完成百分比
  score?: number;                // 分數（0-100，僅在全部完成時顯示）
  correctCount?: number;          // 正確題數（僅在全部完成時顯示）
}
```

## 題目編號系統

### 題號顯示
- 在作答頁和複習頁顯示「第 X 題」
- 題號從 1 開始，自動根據題目在期數中的位置生成

### 實例編號（用於問題回報）
- 格式：`測驗名稱-科目-期數-第X題`
- 範例：`信託營業員-信託法規-61期-第1題`
- 用於問題回報時精確定位題目位置

## 資料管理

### 題目資料來源
- 題目資料儲存在 `assets/data/questions/` 目錄下的 JSON 檔案
- 每個期數一個 JSON 檔案
- 使用索引檔案 `questions.json` 管理所有題目檔案的元資料

### 答題記錄儲存
- 使用 AsyncStorage 儲存在本地
- 儲存鍵：`@quiz:userAnswers`
- 包含所有用戶的答題狀態、收藏狀態、錯題記錄等

### 進度追蹤
- 自動計算每個測驗、科目、期數的完成進度
- 完成所有題目後自動計算分數和正確題數

## 開發說明

### 新增題目
1. 將 Excel 檔案放入 `data/` 目錄
2. 執行轉換腳本：
   ```bash
   npm run convert:excel
   ```
3. 將 JSON 檔案放入對應的資料夾：`assets/data/questions/{testName}/{subject}/`
4. 執行更新索引腳本：
   ```bash
   node scripts/updateQuestionIndex.js
   ```
5. 驗證路徑連結：
   ```bash
   node scripts/validatePaths.js
   ```
6. 重新啟動應用程式

### 新增圖片
1. 將圖片檔案放入對應資料夾：`assets/images/{testName}/{subject}/{series_no}/`
2. 執行更新映射表腳本：
   ```bash
   node scripts/updateImageFileMap.js
   ```
3. 驗證路徑連結：
   ```bash
   node scripts/validatePaths.js
   ```

### 路徑驗證
專案提供了路徑驗證腳本，用於檢查所有檔案路徑是否正確：

```bash
node scripts/validatePaths.js
```

此腳本會驗證：
- ✅ 題目檔案路徑（questionFileMap.ts）
- ✅ 圖片檔案路徑（imageFileMap.ts）
- ✅ 索引檔案中的路徑引用
- ✅ 配置檔案格式
- ✅ 主要索引檔案結構
- ✅ 應用程式資源

### 自訂樣式
所有樣式定義在各個 Screen 元件的 `StyleSheet.create()` 中，可根據需求調整。

### Metro Bundler 配置
- `metro.config.js` 已配置支援 JSON 檔案載入
- 支援按需載入題目檔案，提升載入效能

### 重要腳本說明

| 腳本 | 功能 | 使用時機 |
|------|------|----------|
| `updateQuestionIndex.js` | 更新題目索引和映射表 | 新增/修改/刪除題目檔案後 |
| `updateImageFileMap.js` | 更新圖片映射表 | 新增/修改圖片後 |
| `validatePaths.js` | 驗證所有路徑連結 | 新增檔案後或懷疑路徑有問題時 |
| `validateJson.js` | 驗證 JSON 格式 | 檢查題目檔案格式是否正確 |
| `convertExcelToJSON.js` | Excel 轉 JSON | 將 Excel 題目轉換為 JSON 格式 |

## 文檔

專案包含完整的文檔說明：

- [README.md](./README.md) - 專案主要說明文件
- [專案結構與路徑說明](./docs/專案結構與路徑說明.md) - 詳細的路徑結構和引用說明
- [檔案功能說明](./docs/檔案功能說明.md) - 各檔案和腳本的功能說明
- [題庫配置使用指南](./docs/題庫配置使用指南.md) - 題庫配置檔案的使用方法

## 已知限制

- 問題回報功能目前僅顯示題目編號，尚未連接到 Google 表單
- 章節列表頁的導航功能待完善
- 題目資料需要手動轉換 Excel 檔案

## 授權

本專案為學習用途，僅供參考。
