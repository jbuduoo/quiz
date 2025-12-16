const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'assets', 'images');
const targetBaseDir = path.join(__dirname, '..', 'assets', 'images');

// 讀取所有圖片資料夾
const folders = fs.readdirSync(sourceDir).filter(f => {
  const folderPath = path.join(sourceDir, f);
  return fs.statSync(folderPath).isDirectory();
});

console.log(`找到 ${folders.length} 個圖片資料夾，開始遷移...\n`);

let migratedCount = 0;
let errorCount = 0;

// 處理每個資料夾
folders.forEach(folderName => {
  try {
    // 解析資料夾名稱
    // 格式1: IPAS_01_AI_11401 -> IPAS_01, L11, 11401 (AI 應該是 L11)
    // 格式2: IPAS_02_L23_11411 -> IPAS_02, L23, 11411
    
    let testName, subject, series_no;
    
    // 嘗試解析格式：IPAS_01_AI_11401
    const match1 = folderName.match(/^(IPAS_\d+)_AI_(\d+)$/);
    if (match1) {
      testName = match1[1];
      subject = 'L11'; // AI 對應到 L11
      series_no = match1[2];
    } else {
      // 嘗試解析格式：IPAS_02_L23_11411
      const match2 = folderName.match(/^(IPAS_\d+)_(L\d+)_(\d+)$/);
      if (match2) {
        testName = match2[1];
        subject = match2[2];
        series_no = match2[3];
      } else {
        console.warn(`⚠️  資料夾名稱格式不符合: ${folderName}，跳過`);
        errorCount++;
        return;
      }
    }
    
    // 建立目標資料夾
    const targetFolder = path.join(targetBaseDir, testName, subject, series_no);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
      console.log(`📁 建立資料夾: ${testName}/${subject}/${series_no}`);
    }
    
    // 讀取來源資料夾中的所有圖片
    const sourceFolderPath = path.join(sourceDir, folderName);
    const imageFiles = fs.readdirSync(sourceFolderPath).filter(f => 
      f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg')
    );
    
    if (imageFiles.length === 0) {
      console.warn(`⚠️  資料夾中沒有圖片: ${folderName}`);
      return;
    }
    
    // 複製每個圖片檔案
    imageFiles.forEach(imageFile => {
      const sourcePath = path.join(sourceFolderPath, imageFile);
      const targetPath = path.join(targetFolder, imageFile);
      
      // 如果目標檔案已存在，先備份
      if (fs.existsSync(targetPath)) {
        const backupPath = targetPath + '.backup';
        fs.copyFileSync(targetPath, backupPath);
        console.log(`📋 備份已存在檔案: ${imageFile}`);
      }
      
      // 複製檔案
      fs.copyFileSync(sourcePath, targetPath);
      migratedCount++;
      console.log(`✅ 遷移: ${folderName}/${imageFile} -> ${testName}/${subject}/${series_no}/${imageFile}`);
    });
    
  } catch (error) {
    console.error(`❌ 遷移失敗 ${folderName}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 遷移完成:`);
console.log(`   ✅ 成功: ${migratedCount} 個圖片檔案`);
console.log(`   ❌ 失敗: ${errorCount} 個資料夾`);
console.log(`\n💡 提示: 舊資料夾仍保留在原位置，確認無誤後可手動刪除`);

