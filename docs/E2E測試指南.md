# 端到端測試 (E2E Testing) 使用指南

## 概述

本專案使用 [Playwright](https://playwright.dev/) 進行網頁版本的端到端測試。Playwright 是一個現代化的自動化測試框架，支援多種瀏覽器（Chromium、Firefox、WebKit）和行動裝置模擬。

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 安裝 Playwright 瀏覽器

首次執行時，Playwright 會自動下載所需的瀏覽器：

```bash
npx playwright install
```

或安裝特定瀏覽器：

```bash
npx playwright install chromium
npx playwright install firefox
npx playwright install webkit
```

### 3. 執行測試

```bash
# 執行所有測試
npm run test:e2e

# 以 UI 模式執行（推薦開發時使用）
npm run test:e2e:ui

# 除錯模式
npm run test:e2e:debug
```

## 測試腳本說明

| 腳本 | 說明 |
|------|------|
| `npm run test:e2e` | 執行所有 E2E 測試 |
| `npm run test:e2e:ui` | 以 UI 模式執行測試（可視化界面） |
| `npm run test:e2e:debug` | 除錯模式執行測試 |
| `npm run test:e2e:report` | 查看測試報告 |

## 測試檔案結構

```
tests/e2e/
├── example.spec.ts      # 基本功能測試範例
├── navigation.spec.ts   # 導航流程測試
├── quiz-flow.spec.ts    # 測驗流程測試
├── playwright.config.ts # Playwright 配置檔案
└── README.md           # 測試說明文件
```

## 撰寫測試

### 基本測試範例

```typescript
import { test, expect } from '@playwright/test';

test('測試名稱', async ({ page }) => {
  // 1. 導航到頁面
  await page.goto('/');
  
  // 2. 等待應用程式載入
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000); // 等待應用程式初始化
  
  // 3. 尋找元素並執行操作
  const header = page.locator('text=樂題庫');
  await expect(header).toBeVisible();
  
  // 4. 點擊按鈕
  const button = page.locator('text=開始測驗').first();
  await button.click();
  
  // 5. 驗證結果
  await expect(page.locator('text=第 1 題')).toBeVisible();
});
```

### 常用選擇器

#### 文字選擇器
```typescript
// 精確文字匹配
page.locator('text=樂題庫')

// 正則表達式匹配
page.locator('text=/第.*題/')

// 包含文字
page.locator('text=/開始測驗/')
```

#### CSS 選擇器
```typescript
// 類別選擇器
page.locator('.className')

// ID 選擇器
page.locator('#myId')

// 屬性選擇器
page.locator('[data-testid="my-button"]')
```

#### 組合選擇器
```typescript
// 按鈕包含特定文字
page.locator('button:has-text("開始測驗")')

// 多個條件
page.locator('button.primary:has-text("提交")')
```

### 等待策略

```typescript
// 等待元素可見
await page.waitForSelector('text=樂題庫', { state: 'visible' });

// 等待元素隱藏
await page.waitForSelector('.loading', { state: 'hidden' });

// 等待網路請求完成
await page.waitForLoadState('networkidle');

// 等待特定時間（盡量避免使用）
await page.waitForTimeout(1000);
```

### 斷言檢查

```typescript
// 檢查元素是否可見
await expect(page.locator('text=樂題庫')).toBeVisible();

// 檢查文字內容
await expect(page.locator('.title')).toHaveText('樂題庫');

// 檢查元素數量
await expect(page.locator('.item')).toHaveCount(5);

// 檢查 URL
await expect(page).toHaveURL(/.*quiz/);
```

## 測試最佳實踐

### 1. 使用資料測試 ID

在 React 元件中添加 `data-testid` 屬性，使測試更穩定：

```tsx
// 元件中
<TouchableOpacity testID="start-quiz-button">
  <Text>開始測驗</Text>
</TouchableOpacity>

// 測試中
const button = page.locator('[data-testid="start-quiz-button"]');
```

### 2. 避免硬編碼等待

優先使用 `waitForSelector` 而非 `waitForTimeout`：

```typescript
// ❌ 不好
await page.waitForTimeout(3000);

// ✅ 好
await page.waitForSelector('text=樂題庫', { state: 'visible' });
```

### 3. 獨立測試

每個測試應該獨立，不依賴其他測試的狀態：

```typescript
test.beforeEach(async ({ page }) => {
  // 每個測試前重置狀態
  await page.goto('/');
  await page.evaluate(() => {
    // 清除 localStorage
    localStorage.clear();
  });
});
```

### 4. 清理狀態

使用 `beforeEach` 和 `afterEach` 清理測試狀態：

```typescript
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  // 清理應用程式狀態
});

test.afterEach(async ({ page }) => {
  // 清理測試產生的資料
});
```

## 執行特定測試

### 執行單一測試檔案

```bash
npx playwright test tests/e2e/navigation.spec.ts --config=tests/e2e/playwright.config.ts
```

### 執行特定測試案例

```bash
npx playwright test -g "應該可以開始測驗"
```

### 執行特定瀏覽器

```bash
# Chromium
npx playwright test --project=chromium

# Firefox
npx playwright test --project=firefox

# WebKit (Safari)
npx playwright test --project=webkit

# 行動裝置
npx playwright test --project="Mobile Chrome"
```

## 除錯技巧

### 1. Playwright Inspector

使用除錯模式執行測試，會自動打開 Inspector：

```bash
npx playwright test --debug
```

### 2. 截圖和視訊

測試失敗時會自動截圖和錄製視訊，位於 `test-results/` 目錄。

### 3. 追蹤檔案

使用 `--trace on` 記錄詳細追蹤資訊：

```bash
npx playwright test --trace on
```

查看追蹤：

```bash
npx playwright show-trace trace.zip
```

### 4. 慢動作模式

以慢動作執行測試，方便觀察：

```bash
npx playwright test --slow-mo=1000
```

### 5. 暫停測試

在測試中添加 `await page.pause()` 暫停執行：

```typescript
test('測試', async ({ page }) => {
  await page.goto('/');
  await page.pause(); // 暫停，打開 Inspector
});
```

## 查看測試報告

執行測試後，會自動生成 HTML 報告：

```bash
npm run test:e2e:report
```

或手動查看：

```bash
npx playwright show-report
```

## CI/CD 整合

### GitHub Actions 範例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## 常見問題

### Q: 測試找不到元素？

A: 
1. 檢查選擇器是否正確
2. 增加等待時間
3. 使用 `page.waitForSelector()` 等待元素出現
4. 檢查應用程式是否已完全載入

### Q: 測試在 CI 環境失敗，但本地成功？

A:
1. 檢查超時設定是否足夠
2. 確認 CI 環境有足夠資源
3. 檢查網路連線是否穩定
4. 查看測試報告中的截圖和視訊

### Q: 如何測試需要登入的功能？

A:
1. 使用 `test.beforeEach` 設定登入狀態
2. 使用 Playwright 的認證功能儲存登入狀態
3. 使用 Mock API 模擬登入

## 參考資源

- [Playwright 官方文檔](https://playwright.dev/)
- [Playwright API 參考](https://playwright.dev/docs/api/class-playwright)
- [最佳實踐指南](https://playwright.dev/docs/best-practices)

