// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 確保 JSON 檔案可以作為模組載入（不要加入 assetExts）
// 這樣 Metro bundler 才能正確處理 require() JSON 檔案

// 確保 sourceExts 包含 JSON（預設應該已經包含）
if (!config.resolver.sourceExts.includes('json')) {
  config.resolver.sourceExts.push('json');
}

// 在 Web 平台，確保 JSON 檔案可以通過 fetch 載入
// 將 JSON 從 assetExts 中移除（如果存在），讓它們可以作為模組載入
if (config.resolver.assetExts && config.resolver.assetExts.includes('json')) {
  config.resolver.assetExts = config.resolver.assetExts.filter(ext => ext !== 'json');
}

module.exports = config;

