# 端到端測試 (E2E Testing)

使用 Playwright 進行網頁版本的端到端測試。

## 安裝

測試依賴已包含在 `package.json` 中，執行以下命令安裝：

```bash
npm install
```

首次執行時，Playwright 會自動下載瀏覽器：

```bash
npx playwright install
```

## 執行測試

### 執行所有測試

```bash
npm run test:e2e
```

### 執行特定測試檔案

```bash
npx playwright test tests/e2e/navigation.spec.ts
```

### 以 UI 模式執行（推薦開發時使用）

```bash
npm run test:e2e:ui
```

### 以除錯模式執行

```bash
npx playwright test --debug
```

### 執行特定瀏覽器

```bash
# 只執行 Chromium
npx playwright test --project=chromium

# 只執行 Firefox
npx playwright test --project=firefox

# 只執行 WebKit (Safari)
npx playwright test --project=webkit
```

## 測試檔案結構

```
tests/e2e/
├── example.spec.ts      # 基本功能測試範例
├── navigation.spec.ts   # 導航流程測試
├── quiz-flow.spec.ts    # 測驗流程測試
├── playwright.config.ts # Playwright 配置檔案
└── README.md           # 本檔案
```

## 撰寫測試

### 基本測試結構

```typescript
import { test, expect } from '@playwright/test';

test('測試名稱', async ({ page }) => {
  // 導航到頁面
  await page.goto('/');
  
  // 等待元素出現
  await page.waitForSelector('text=樂題庫');
  
  // 執行操作
  await page.click('text=開始測驗');
  
  // 斷言檢查
  await expect(page.locator('text=第 1 題')).toBeVisible();
});
```

### 常用選擇器

- **文字選擇器**：`page.locator('text=樂題庫')`
- **按鈕選擇器**：`page.locator('button:has-text("開始測驗")')`
- **CSS 選擇器**：`page.locator('.className')`
- **資料屬性選擇器**：`page.locator('[data-testid="my-button"]')`

### 等待策略

```typescript
// 等待元素可見
await page.waitForSelector('text=樂題庫', { state: 'visible' });

// 等待網路請求完成
await page.waitForLoadState('networkidle');

// 等待特定時間
await page.waitForTimeout(1000);
```

## 測試最佳實踐

1. **使用資料測試 ID**：在元件中添加 `data-testid` 屬性，使測試更穩定
2. **避免硬編碼等待**：優先使用 `waitForSelector` 而非 `waitForTimeout`
3. **獨立測試**：每個測試應該獨立，不依賴其他測試的狀態
4. **清理狀態**：使用 `beforeEach` 和 `afterEach` 清理測試狀態

## 查看測試報告

執行測試後，會自動生成 HTML 報告：

```bash
npx playwright show-report
```

## CI/CD 整合

在 CI/CD 環境中執行測試：

```bash
# CI 模式下會自動使用 headless 模式
npx playwright test --reporter=html
```

## 除錯技巧

1. **使用 Playwright Inspector**：
   ```bash
   npx playwright test --debug
   ```

2. **截圖和視訊**：測試失敗時會自動截圖和錄製視訊

3. **追蹤檔案**：使用 `--trace on` 選項記錄詳細追蹤資訊

4. **慢動作模式**：
   ```bash
   npx playwright test --slow-mo=1000
   ```

## 注意事項

1. 測試需要應用程式在 `http://localhost:8081` 運行
2. 測試會自動啟動開發伺服器（如果未運行）
3. 某些測試可能需要等待應用程式初始化完成
4. 建議在測試中使用 `data-testid` 屬性而非依賴文字內容

