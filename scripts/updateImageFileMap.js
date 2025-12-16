const fs = require('fs');
const path = require('path');

const imagesDir = path.join(__dirname, '..', 'assets', 'images');
const imageFileMapFile = path.join(__dirname, '..', 'src', 'services', 'imageFileMap.ts');

// 遞迴掃描圖片資料夾結構（只掃描新格式：testName/subject/series_no/）
function scanImageFolders(dir, basePath = '', depth = 0) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    
    // 跳過舊格式的資料夾（格式：IPAS_01_AI_11401 或 IPAS_02_L23_11411）
    // 舊格式特徵：包含底線且不是三層結構
    if (entry.isDirectory() && depth === 0) {
      // 第一層應該是 testName（如 IPAS_01），不應該包含底線分隔的完整路徑
      if (entry.name.includes('_') && entry.name.match(/^IPAS_\d+_(AI|L\d+)_\d+$/)) {
        console.log(`⏭️  跳過舊格式資料夾: ${entry.name}`);
        continue;
      }
    }
    
    if (entry.isDirectory()) {
      // 遞迴掃描子資料夾（最多三層：testName/subject/series_no）
      if (depth < 3) {
        const subEntries = scanImageFolders(fullPath, relativePath, depth + 1);
        result.push(...subEntries);
      }
    } else if (entry.isFile() && 
               (entry.name.endsWith('.png') || 
                entry.name.endsWith('.jpg') || 
                entry.name.endsWith('.jpeg'))) {
      // 找到圖片檔案（應該在第三層：testName/subject/series_no/）
      if (depth === 3) {
        result.push({
          filePath: relativePath,
          fullPath: fullPath,
          fileName: entry.name,
          folderPath: basePath
        });
      }
    }
  }
  
  return result;
}

console.log('開始掃描圖片檔案...\n');

// 掃描所有圖片檔案（新結構：images/{testName}/{subject}/{series_no}/{imageFile}）
const allImages = scanImageFolders(imagesDir);

console.log(`找到 ${allImages.length} 個圖片檔案\n`);

const imageEntries = [];

allImages.forEach(({ filePath, fullPath, fileName, folderPath }) => {
  // 新格式：IPAS_01/L11/11401/3Q1.png
  // 舊格式：IPAS_01_AI_11401/3Q1.png (向後相容)
  
  // 構建映射鍵（用於查找）
  // 新格式：IPAS_01/L11/11401/3Q1.png
  // 舊格式：IPAS_01_AI_11401/3Q1.png
  const imageKey = filePath.replace(/\\/g, '/'); // 統一使用斜線
  
  // require 路徑
  const requirePath = filePath.replace(/\\/g, '/');
  
  imageEntries.push(`  '${imageKey}': require('../../assets/images/${requirePath}'),`);
  console.log(`✅ ${imageKey}`);
});

// 生成 imageFileMap.ts
const mapContent = `// 圖片檔案映射表
// 用於在 Android/iOS 上載入本地圖片資源
// 新格式：{testName}/{subject}/{series_no}/{imageFileName}
// 舊格式：{testName}_{subject}_{series_no}/{imageFileName} (向後相容)
// 此檔案由 scripts/updateImageFileMap.js 自動生成

export const imageFileMap: Record<string, any> = {
${imageEntries.join('\n')}
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
    console.warn(\`⚠️ [getImageSource] 無法解析圖片路徑: \${imagePath}\`);
    return null;
  }
  
  const imageKey = pathMatch[1];
  const imageResource = imageFileMap[imageKey];
  
  if (!imageResource) {
    console.warn(\`⚠️ [getImageSource] 找不到圖片映射: \${imageKey}\`);
    return null;
  }
  
  return imageResource;
}
`;

fs.writeFileSync(imageFileMapFile, mapContent, 'utf8');
console.log(`\n✅ 已更新圖片映射檔案: ${imageFileMapFile}`);
console.log(`   總圖片數: ${imageEntries.length}`);

