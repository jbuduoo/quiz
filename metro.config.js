// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// 確保 JSON 檔案可以作為模組載入（不要加入 assetExts）
// 這樣 Metro bundler 才能正確處理 require() JSON 檔案

// 排除不存在的 data/questions 目錄，避免 Metro 掃描錯誤
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

// 確保 sourceExts 包含 JSON（預設應該已經包含）
if (!config.resolver.sourceExts.includes('json')) {
  config.resolver.sourceExts.push('json');
}

module.exports = config;

