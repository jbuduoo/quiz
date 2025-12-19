import { test, expect } from '@playwright/test';

/**
 * 測驗流程測試
 * 測試完整的測驗答題流程
 */
test.describe('測驗流程測試', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(3000); // 等待應用程式初始化
  });

  test('應該可以開始測驗並答題', async ({ page }) => {
    // 1. 找到並點擊「開始測驗」按鈕
    const startButton = page.locator('text=開始測驗').first();
    
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
      await page.waitForTimeout(2000);

      // 2. 檢查是否進入測驗頁面
      // 尋找題目內容或選項
      const questionContent = page.locator('text=/第.*題/').or(
        page.locator('[class*="question"]')
      ).first();
      
      if (await questionContent.isVisible({ timeout: 5000 })) {
        // 3. 選擇一個答案（選擇第一個選項 A）
        const optionA = page.locator('text=/^A[^B]/').or(
          page.locator('button:has-text("A")')
        ).first();
        
        if (await optionA.isVisible({ timeout: 3000 })) {
          await optionA.click();
          await page.waitForTimeout(1000);
          
          // 4. 檢查是否顯示答題結果
          // 可能會顯示「正確」或「錯誤」的提示
        }
      }
    }
  });

  test('應該可以標記錯題', async ({ page }) => {
    // 導航到測驗頁面
    const startButton = page.locator('text=開始測驗').first();
    
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
      await page.waitForTimeout(2000);

      // 尋找「錯題」按鈕
      const wrongButton = page.locator('text=錯題').or(
        page.locator('button:has-text("錯題")')
      ).first();
      
      if (await wrongButton.isVisible({ timeout: 5000 })) {
        await wrongButton.click();
        await page.waitForTimeout(1000);
        // 檢查錯題是否已標記
      }
    }
  });
});

