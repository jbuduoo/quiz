// 圖片檔案映射表
// 用於在 Android/iOS 上載入本地圖片資源
// 新格式：{testName}/{subject}/{series_no}/{imageFileName}
// 舊格式：{testName}_{subject}_{series_no}/{imageFileName} (向後相容)
// 此檔案由 scripts/updateImageFileMap.js 自動生成

export const imageFileMap: Record<string, any> = {
  'IPAS_01/L11/11401/12Q1.png': require('../../assets/images/IPAS_01/L11/11401/12Q1.png'),
  'IPAS_01/L11/11401/15Q1.png': require('../../assets/images/IPAS_01/L11/11401/15Q1.png'),
  'IPAS_01/L11/11401/3Q1.png': require('../../assets/images/IPAS_01/L11/11401/3Q1.png'),
  'IPAS_01/L11/11401/5A1.png': require('../../assets/images/IPAS_01/L11/11401/5A1.png'),
  'IPAS_01/L11/11401/5B1.png': require('../../assets/images/IPAS_01/L11/11401/5B1.png'),
  'IPAS_01/L11/11401/5C1.png': require('../../assets/images/IPAS_01/L11/11401/5C1.png'),
  'IPAS_01/L11/11401/5D1.png': require('../../assets/images/IPAS_01/L11/11401/5D1.png'),
  'IPAS_01/L11/11401/6Q1.png': require('../../assets/images/IPAS_01/L11/11401/6Q1.png'),
  'IPAS_02/L23/11411/41Q1.png': require('../../assets/images/IPAS_02/L23/11411/41Q1.png'),
  'IPAS_02/L23/11411/42Q1.png': require('../../assets/images/IPAS_02/L23/11411/42Q1.png'),
  'IPAS_02/L23/11411/43Q1.png': require('../../assets/images/IPAS_02/L23/11411/43Q1.png'),
  'IPAS_02/L23/11411/44Q1.png': require('../../assets/images/IPAS_02/L23/11411/44Q1.png'),
  'IPAS_02/L23/11411/45A1.png': require('../../assets/images/IPAS_02/L23/11411/45A1.png'),
  'IPAS_02/L23/11411/45B1.png': require('../../assets/images/IPAS_02/L23/11411/45B1.png'),
  'IPAS_02/L23/11411/45C1.png': require('../../assets/images/IPAS_02/L23/11411/45C1.png'),
  'IPAS_02/L23/11411/45D1.png': require('../../assets/images/IPAS_02/L23/11411/45D1.png'),
  'IPAS_02/L23/11411/45Q1.png': require('../../assets/images/IPAS_02/L23/11411/45Q1.png'),
};

/**
 * 根據圖片路徑獲取圖片資源
 * @param imagePath 圖片路徑，格式：
 *   - 新格式：assets/images/{testName}/{subject}/{series_no}/{imageFileName}
 *   - 舊格式：assets/images/{testName}_{subject}_{series_no}/{imageFileName}
 * @returns 圖片資源（可用於 Image 組件的 source 屬性）
 */
export function getImageSource(imagePath: string): any {
  // 從路徑中提取關鍵部分
  // 新格式：assets/images/IPAS_01/L11/11401/3Q1.png -> IPAS_01/L11/11401/3Q1.png
  // 舊格式：assets/images/IPAS_02_L23_11411/45A1.png -> IPAS_02_L23_11411/45A1.png
  const pathMatch = imagePath.match(new RegExp('assets/images/(.+)$'));
  if (!pathMatch) {
    console.warn(`⚠️ [getImageSource] 無法解析圖片路徑: ${imagePath}`);
    return null;
  }
  
  const imageKey = pathMatch[1];
  const imageResource = imageFileMap[imageKey];
  
  if (!imageResource) {
    console.warn(`⚠️ [getImageSource] 找不到圖片映射: ${imageKey}`);
    return null;
  }
  
  return imageResource;
}
