/**
 * 動態載入題目檔案的工具函數
 * 支援 React Native 和 Web 平台
 * 
 * 注意：
 * - 此函數僅用於載入系統預設的本地打包檔案（如 example.json）
 * - 使用者匯入的檔案應通過 ImportService 從 AsyncStorage 讀取
 * - 使用者匯入的檔案檔名以 'questions/' 開頭，不會使用此函數
 */

import { Platform } from 'react-native';

// 檔案映射表：用於 React Native 平台的靜態 require
// 僅包含系統預設的本地打包檔案
// 注意：Metro bundler 需要靜態路徑，因此使用檔案映射
// 格式：檔案名 -> require 函數
const fileMap: Record<string, () => any> = {
  'example.json': () => require('../../assets/data/questions/example.json'),
  '2025122301.json': () => require('../../assets/data/questions/2025122301.json'),
  '2025122302.json': () => require('../../assets/data/questions/2025122302.json'),
  '2025122303.json': () => require('../../assets/data/questions/2025122303.json'),
  '2025122304.json': () => require('../../assets/data/questions/2025122304.json'),
};

/**
 * 載入系統預設的本地打包 JSON 檔案
 * 
 * 此函數僅用於載入系統預設檔案（如 example.json）
 * 使用者匯入的檔案應通過 ImportService.loadImportedQuestionFile() 從 AsyncStorage 讀取
 * 
 * @param fileName 檔案名稱（例如：example.json）
 * @returns 檔案資料或 null
 */
export async function loadLocalQuestionFile(fileName: string): Promise<any> {
  console.log(`📋 [fileLoader] 嘗試載入系統預設檔案: ${fileName}`);
  
  // 在 React Native 平台（iOS/Android），使用檔案映射表進行靜態 require
  // Metro bundler 需要靜態路徑，因此我們使用預先定義的檔案映射表
  if (Platform.OS !== 'web' && typeof require !== 'undefined') {
    try {
      const fileLoader = fileMap[fileName];
      if (fileLoader) {
        console.log(`📋 [fileLoader] 使用檔案映射表載入: ${fileName}`);
        const fileData = fileLoader();
        console.log(`✅ [fileLoader] require 成功: ${fileName}`, {
          isArray: Array.isArray(fileData),
          hasQuestions: !Array.isArray(fileData) && !!fileData?.questions,
          type: typeof fileData
        });
        return fileData;
      } else {
        console.warn(`⚠️ [fileLoader] 檔案 ${fileName} 不在映射表中`);
        console.warn(`💡 [fileLoader] 提示：此函數僅用於載入系統預設檔案`);
        console.warn(`💡 [fileLoader] 如果是使用者匯入的檔案，應使用 ImportService.loadImportedQuestionFile()`);
        console.warn(`💡 [fileLoader] 如需新增系統預設檔案，請在 src/utils/fileLoader.ts 的 fileMap 中添加映射`);
      }
    } catch (requireError: any) {
      console.error(`❌ [fileLoader] require 失敗: ${fileName}`, requireError?.message || requireError);
      if (requireError?.message?.includes('Cannot find module')) {
        console.warn(`⚠️ [fileLoader] 檔案可能不存在或未被打包: ${fileName}`);
        console.warn(`💡 [fileLoader] 提示：確保檔案位於 assets/data/questions/ 目錄，並在 app.json 的 assetBundlePatterns 中包含`);
      }
      // 重新拋出錯誤，讓調用者知道載入失敗
      throw requireError;
    }
  }
  
  // 在 Web 平台，使用 fetch（支援動態載入）
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      // 對檔名進行 URL 編碼以支援中文檔名
      const encodedFileName = encodeURIComponent(fileName);
      const filePath = `/assets/assets/data/questions/${encodedFileName}`;
      console.log(`📋 [fileLoader] 嘗試 fetch: ${filePath} (原始檔名: ${fileName})`);
      const response = await fetch(filePath);
      
      if (response.ok) {
        const fileData = await response.json();
        console.log(`✅ [fileLoader] fetch 成功: ${fileName}`, {
          isArray: Array.isArray(fileData),
          hasQuestions: !Array.isArray(fileData) && !!fileData?.questions,
          type: typeof fileData
        });
        return fileData;
      } else {
        console.warn(`⚠️ [fileLoader] fetch 回應失敗: ${response.status} ${response.statusText}`);
      }
    } catch (fetchError) {
      console.warn(`⚠️ [fileLoader] fetch 失敗: ${fileName}`, fetchError);
    }
  }
  
  console.error(`❌ [fileLoader] 無法載入檔案: ${fileName}`);
  return null;
}

