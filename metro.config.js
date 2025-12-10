// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 確保 JSON 檔案可以被正確載入
// 在 Web 平台，JSON 檔案需要被當作資源處理
config.resolver.assetExts.push('json');

module.exports = config;

