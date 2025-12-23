// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 確保 JSON 檔案可以作為模組載入（用於 require()）
// 確保 sourceExts 包含 JSON（預設應該已經包含）
if (!config.resolver.sourceExts.includes('json')) {
  config.resolver.sourceExts.push('json');
}

// 在 Web 平台，JSON 檔案需要同時支援：
// 1. 作為模組載入（require()）- 通過 sourceExts
// 2. 作為資源載入（fetch('/assets/...')）- 通過 assetExts
// Metro 允許同一個擴展名同時在兩個列表中，會根據使用方式自動選擇
if (!config.resolver.assetExts.includes('json')) {
  config.resolver.assetExts.push('json');
}

// 配置 watchFolders 以確保 Metro 正確監視 assets 目錄
config.watchFolders = [
  path.resolve(__dirname, 'assets'),
];

module.exports = config;

