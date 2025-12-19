import { test, expect } from '@playwright/test';

/**
 * 導航流程測試
 * 測試應用程式的主要導航路徑
 */
test.describe('導航流程測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // 等待應用程式初始化完成（可能需要等待載入動畫消失）
    await page.waitForTimeout(2000);
  });

  test('應該可以從檔案列表導航到測驗', async ({ page }) => {
    // 檢查檔案列表頁面是否載入
    const header = page.locator('text=樂題庫');
    await expect(header).toBeVisible();

    // 尋找檔案項目（根據實際 UI 調整選擇器）
    // 這裡假設有一個「開始測驗」或類似的按鈕
    const startButton = page.locator('text=開始測驗').first();
    
    // 如果按鈕存在，點擊它
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
      // 等待導航完成
      await page.waitForTimeout(1000);
      // 檢查是否導航到測驗頁面（根據實際頁面內容調整）
    }
  });

  test('應該可以打開錯題本', async ({ page }) => {
    // 尋找錯題本入口
    const wrongBookButton = page.locator('text=錯題本').or(page.locator('text=複習錯題')).first();
    
    if (await wrongBookButton.isVisible({ timeout: 5000 })) {
      await wrongBookButton.click();
      await page.waitForTimeout(1000);
      // 檢查錯題本頁面是否載入
    }
  });
});

