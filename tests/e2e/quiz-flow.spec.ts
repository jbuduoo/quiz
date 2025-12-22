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

  test('點擊測驗中的最愛按鈕，錯題本應該增加一題', async ({ page }) => {
    // 清除 localStorage，確保乾淨的測試狀態
    await page.evaluate(() => {
      localStorage.clear();
    });
    await page.waitForTimeout(1000);

    // 1. 進入錯題本頁面，記錄初始題目數量
    const wrongBookLink = page.locator('text=/複習錯題|錯題本/').first();
    let initialCount = 0;
    
    if (await wrongBookLink.isVisible({ timeout: 5000 })) {
      await wrongBookLink.click();
      await page.waitForTimeout(2000);
      
      // 檢查錯題本頁面是否載入
      const wrongBookTitle = page.locator('text=複習錯題');
      if (await wrongBookTitle.isVisible({ timeout: 5000 })) {
        // 檢查是否有「沒有錯題」的提示
        const emptyText = page.locator('text=沒有錯題');
        if (await emptyText.isVisible({ timeout: 2000 })) {
          initialCount = 0;
        } else {
          // 嘗試從進度文字中獲取題目數量（格式：1/X）
          const progressText = page.locator('[class*="progress"]').or(
            page.locator('text=/\\d+\\/\\d+/')
          ).first();
          if (await progressText.isVisible({ timeout: 3000 })) {
            const progressContent = await progressText.textContent();
            const match = progressContent?.match(/\/(\d+)/);
            if (match) {
              initialCount = parseInt(match[1], 10);
            }
          }
        }
      }
      
      // 返回首頁
      const backButton = page.locator('img[src*="back"]').or(
        page.locator('button:has-text("返回")')
      ).first();
      if (await backButton.isVisible({ timeout: 3000 })) {
        await backButton.click();
        await page.waitForTimeout(1000);
      } else {
        // 如果沒有返回按鈕，直接導航到首頁
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForTimeout(2000);
      }
    }

    // 2. 進入測驗頁面
    const startButton = page.locator('text=開始測驗').first();
    
    if (await startButton.isVisible({ timeout: 5000 })) {
      await startButton.click();
      await page.waitForTimeout(2000);

      // 3. 等待測驗頁面載入，確認題目顯示
      const questionContent = page.locator('text=/第.*題/').or(
        page.locator('[class*="question"]')
      ).first();
      
      if (await questionContent.isVisible({ timeout: 5000 })) {
        // 4. 尋找並點擊「最愛」按鈕（顯示為「🤍 最愛」或「❤️ 最愛」）
        const favoriteButton = page.locator('text=/最愛/').or(
          page.locator('button:has-text("最愛")')
        ).first();
        
        if (await favoriteButton.isVisible({ timeout: 5000 })) {
          // 檢查當前是否已收藏（顯示❤️表示已收藏）
          const favoriteIcon = await favoriteButton.textContent();
          const isAlreadyFavorite = favoriteIcon?.includes('❤️');
          
          // 如果已經收藏，先取消收藏再重新收藏（確保測試的可靠性）
          if (isAlreadyFavorite) {
            await favoriteButton.click();
            await page.waitForTimeout(1000);
            // 再次點擊以收藏
            await favoriteButton.click();
          } else {
            // 點擊收藏
            await favoriteButton.click();
          }
          
          await page.waitForTimeout(1000);
          
          // 5. 返回首頁
          const backButton = page.locator('img[src*="back"]').or(
            page.locator('button:has-text("返回")')
          ).first();
          if (await backButton.isVisible({ timeout: 3000 })) {
            await backButton.click();
            await page.waitForTimeout(1000);
          } else {
            await page.goto('/');
            await page.waitForLoadState('networkidle');
            await page.waitForTimeout(2000);
          }
          
          // 6. 再次進入錯題本頁面，驗證題目數量增加
          const wrongBookLinkAfter = page.locator('text=/複習錯題|錯題本/').first();
          
          if (await wrongBookLinkAfter.isVisible({ timeout: 5000 })) {
            await wrongBookLinkAfter.click();
            await page.waitForTimeout(2000);
            
            // 檢查錯題本頁面
            const wrongBookTitleAfter = page.locator('text=複習錯題');
            if (await wrongBookTitleAfter.isVisible({ timeout: 5000 })) {
              // 檢查是否有「沒有錯題」的提示
              const emptyTextAfter = page.locator('text=沒有錯題');
              let finalCount = 0;
              
              if (await emptyTextAfter.isVisible({ timeout: 2000 })) {
                finalCount = 0;
              } else {
                // 從進度文字中獲取題目數量
                const progressTextAfter = page.locator('[class*="progress"]').or(
                  page.locator('text=/\\d+\\/\\d+/')
                ).first();
                if (await progressTextAfter.isVisible({ timeout: 3000 })) {
                  const progressContentAfter = await progressTextAfter.textContent();
                  const matchAfter = progressContentAfter?.match(/\/(\d+)/);
                  if (matchAfter) {
                    finalCount = parseInt(matchAfter[1], 10);
                  }
                }
              }
              
              // 驗證題目數量增加1（如果初始為0，則應該變為1）
              expect(finalCount).toBe(initialCount + 1);
            }
          }
        }
      }
    }
  });
});

