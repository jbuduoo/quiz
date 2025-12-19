import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright 端到端測試配置
 * 用於測試 Web 版本的應用程式
 */
export default defineConfig({
  testDir: '.',
  /* 測試超時時間 */
  timeout: 30 * 1000,
  expect: {
    /* 斷言超時時間 */
    timeout: 5000
  },
  /* 並行執行測試 */
  fullyParallel: true,
  /* CI 模式下失敗時不重試 */
  forbidOnly: !!process.env.CI,
  /* CI 模式下重試 */
  retries: process.env.CI ? 2 : 0,
  /* 並行 worker 數量 */
  workers: process.env.CI ? 1 : undefined,
  /* 報告器配置 */
  reporter: 'html',
  /* 共享設定 */
  use: {
    /* 基礎 URL */
    baseURL: 'http://localhost:8081',
    /* 收集追蹤資訊 */
    trace: 'on-first-retry',
    /* 截圖設定 */
    screenshot: 'only-on-failure',
    /* 視訊錄製 */
    video: 'retain-on-failure',
  },

  /* 配置測試專案 */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    // 註解掉其他瀏覽器，需要時可以取消註解並安裝瀏覽器
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
    // /* 行動裝置測試 */
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  /* 開發伺服器配置 */
  webServer: {
    command: 'npm run web',
    url: 'http://localhost:8081',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});

