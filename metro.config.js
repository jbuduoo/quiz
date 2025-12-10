// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 確保 JSON 檔案可以被正確載入
// 在 Web 平台，JSON 檔案需要被當作資源處理
config.resolver.assetExts.push('json');

// 排除不存在的 data/questions 目錄，避免 Metro 掃描錯誤
// 使用 watchFolders 來限制 Metro 只監聽存在的目錄
const fs = require('fs');
const dataQuestionsPath = path.join(__dirname, 'data', 'questions');
if (!fs.existsSync(dataQuestionsPath)) {
  // 如果目錄不存在，確保 Metro 不會嘗試掃描它
  config.watchFolders = config.watchFolders || [];
  // 只監聽存在的目錄
  config.watchFolders = config.watchFolders.filter(folder => {
    try {
      return fs.existsSync(folder);
    } catch {
      return false;
    }
  });
}

module.exports = config;

