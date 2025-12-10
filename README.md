# 證照考試題庫學習 App

一個功能完整的證照考試題庫學習應用程式，支援測驗練習、錯題記錄與複習功能。

## 功能特色

### 📚 章節列表頁 (Screen A)
- 顯示所有子科目及其完成百分比
- 底部整合「❤️ 錯題與收藏本」入口，顯示題目總數
- 點擊章節即可開始測驗

### ✍️ 作答頁 (Screen B)
- 顯示題目與四個選項（A/B/C/D）
- 即時顯示答題結果（正確/錯誤）
- **愛心收藏功能**：可手動收藏題目
- **自動錯題記錄**：答錯時自動加入錯題本
- 顯示詳解與正確答案
- 進度條顯示（如：1/99）

### 📖 錯題本頁 (Screen C)
- **篩選功能**：
  - 依科目篩選
  - 僅複習錯題
  - 僅複習收藏題
- 顯示錯題/收藏題列表
- 每項顯示題目簡述、錯誤次數、收藏狀態
- 統計資訊：總題數、錯題數、收藏題數

### 🔄 複習作答頁 (Screen D)
- 專門用於錯題本複習
- **「從錯題本移除」按鈕**：確認已掌握後可移除
- 顯示錯誤次數統計
- 答對後可提示移除選項

## 技術架構

- **框架**：React Native + Expo
- **導航**：React Navigation (Native Stack)
- **資料儲存**：AsyncStorage
- **語言**：TypeScript

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
- iOS: 按 `i` 鍵或執行 `npm run ios`
- Android: 按 `a` 鍵或執行 `npm run android`

### 🌐 Web 版本說明

Web 版本已完全支援，可以在任何現代瀏覽器中運行：
- 啟動後會自動在瀏覽器中開啟
- 響應式設計，在桌面和行動裝置上都能良好顯示
- 桌面版會自動限制最大寬度為 480px，模擬手機體驗
- 所有功能（測驗、錯題本、收藏）都可在 Web 上正常使用

## 專案結構

```
quiz/
├── src/
│   ├── screens/          # 畫面元件
│   │   ├── ChapterListScreen.tsx    # 章節列表頁
│   │   ├── QuizScreen.tsx           # 作答頁
│   │   ├── WrongBookScreen.tsx     # 錯題本頁
│   │   └── ReviewQuizScreen.tsx     # 複習作答頁
│   ├── services/         # 服務層
│   │   └── QuestionService.ts       # 題目與答題記錄管理
│   └── types/            # 類型定義
│       └── index.ts                 # TypeScript 介面定義
├── App.tsx               # 應用程式入口與導航設定
├── package.json          # 專案依賴
└── README.md            # 專案說明文件
```

## 核心功能流程

### 作答流程
1. 選擇章節 → 進入作答頁
2. 選擇選項作答
3. 答錯 → 自動加入錯題本
4. 可選擇收藏題目
5. 繼續作答或結束測驗

### 複習流程
1. 從章節列表頁點擊「錯題與收藏本」
2. 選擇篩選條件（科目/錯題/收藏）
3. 點擊題目進入複習作答頁
4. 作答後可選擇「從錯題本移除」
5. 繼續複習或結束複習

## 資料結構

### 題目 (Question)
```typescript
{
  id: string;
  content: string;
  options: { A: string; B: string; C: string; D: string };
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  subject: string;
  chapter: string;
}
```

### 用戶答題記錄 (UserAnswer)
```typescript
{
  questionId: string;
  isCorrect: boolean;
  isAnswered: boolean;
  isFavorite: boolean;
  isInWrongBook: boolean;
  wrongCount: number;
  lastAnsweredAt?: Date;
  lastWrongAt?: Date;
}
```

## 開發說明

### 新增題目
題目資料目前儲存在 `src/services/QuestionService.ts` 的 `mockQuestions` 陣列中。實際應用中應從 API 或資料庫載入。

### 自訂樣式
所有樣式定義在各個 Screen 元件的 `StyleSheet.create()` 中，可根據需求調整。

## 授權

本專案為學習用途，僅供參考。

