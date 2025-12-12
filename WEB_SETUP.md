# Web 版本使用指南

## 快速啟動

### 方法一：使用 npm script
```bash
npm run web
```

### 方法二：使用 Expo CLI
```bash
npx expo start --web
```

### 方法三：從 Expo Dev Tools
```bash
npm start
```
然後在終端機中按 `w` 鍵啟動 Web 版本。

## 訪問應用程式

啟動後，應用程式會自動在預設瀏覽器中開啟。如果沒有自動開啟，請手動訪問：

- **本地開發**：`http://localhost:8081` 或 `http://localhost:19006`
- 終端機會顯示實際的網址

## 功能說明

Web 版本支援所有功能：

✅ **章節列表頁**
- 顯示所有章節與完成百分比
- 錯題與收藏本入口

✅ **作答頁**
- 題目顯示與選項選擇
- 答錯自動加入錯題本
- 愛心收藏功能
- 進度顯示

✅ **錯題本頁**
- 篩選功能（科目/錯題/收藏）
- 題目列表與統計

✅ **複習作答頁**
- 錯題複習
- 從錯題本移除功能

## 瀏覽器相容性

支援所有現代瀏覽器：
- Chrome/Edge (推薦)
- Firefox
- Safari
- Opera

## 響應式設計

- **桌面版**：自動限制最大寬度為 480px，模擬手機體驗
- **行動裝置**：全螢幕顯示，最佳化觸控操作

## 資料儲存

Web 版本使用瀏覽器的 LocalStorage 來儲存：
- 答題記錄
- 錯題本資料
- 收藏狀態
- 章節進度

資料會保存在瀏覽器中，清除瀏覽器資料會導致資料遺失。

## 疑難排解

### 無法啟動 Web 版本
1. 確認已安裝所有依賴：`npm install`
2. 確認已安裝 Web 相關套件：`react-dom` 和 `react-native-web`
3. 清除快取：`npx expo start -c`

### 頁面顯示異常
1. 清除瀏覽器快取
2. 使用無痕模式測試
3. 檢查瀏覽器控制台是否有錯誤訊息

### 資料無法儲存
1. 確認瀏覽器允許 LocalStorage
2. 檢查瀏覽器是否為無痕模式（無痕模式可能限制 LocalStorage）

## 部署到生產環境

### 建置靜態檔案
```bash
npx expo export:web
```

建置完成後，檔案會輸出到 `web-build` 目錄，可以部署到任何靜態網站託管服務：
- Vercel
- Netlify
- GitHub Pages
- AWS S3
- 任何支援靜態網站的服務

### 部署範例（Vercel）
```bash
npm install -g vercel
vercel
```




