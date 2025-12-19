import { test, expect } from '@playwright/test';

/**
 * 範例測試檔案
 * 展示基本的 Playwright 測試寫法
 */
test.describe('應用程式基本功能測試', () => {
  test.beforeEach(async ({ page }) => {
    // 每個測試前導航到首頁
    await page.goto('/');
    // 等待應用程式載入完成
    await page.waitForLoadState('networkidle');
  });

  test('應該顯示檔案列表頁面', async ({ page }) => {
    // 等待應用程式載入（React Native Web 應用程式標題可能是路由名稱）
    await page.waitForTimeout(3000);
    
    // 檢查是否有「樂題庫」標題（這是實際顯示的標題）
    const header = page.locator('text=樂題庫');
    await expect(header).toBeVisible({ timeout: 10000 });
  });

  test('應該可以點擊匯入按鈕', async ({ page }) => {
    // 尋找匯入按鈕（📥 emoji）
    const importButton = page.locator('text=📥').first();
    await expect(importButton).toBeVisible();
    
    // 點擊匯入按鈕
    await importButton.click();
    
    // 檢查是否顯示匯入選項（可能需要等待 Modal 出現）
    // 注意：根據實際 UI 調整選擇器
  });
});

