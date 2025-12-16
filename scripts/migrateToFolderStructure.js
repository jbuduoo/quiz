const fs = require('fs');
const path = require('path');

const sourceDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const targetBaseDir = path.join(__dirname, '..', 'assets', 'data', 'questions');

// 讀取所有 JSON 檔案
const files = fs.readdirSync(sourceDir).filter(f => f.endsWith('.json'));

console.log(`找到 ${files.length} 個題目檔案，開始遷移...\n`);

let migratedCount = 0;
let errorCount = 0;

// 處理每個檔案
files.forEach(fileName => {
  try {
    // 解析檔名：IPAS_01_L11_11401.json
    const match = fileName.match(/^(IPAS_\d+)_(L\d+)_(\d+)\.json$/);
    if (!match) {
      console.warn(`⚠️  檔名格式不符合: ${fileName}，跳過`);
      return;
    }
    
    const [, testName, subject, series_no] = match;
    
    // 建立目標資料夾
    const targetFolder = path.join(targetBaseDir, testName, subject);
    if (!fs.existsSync(targetFolder)) {
      fs.mkdirSync(targetFolder, { recursive: true });
      console.log(`📁 建立資料夾: ${testName}/${subject}`);
    }
    
    // 讀取檔案內容
    const filePath = path.join(sourceDir, fileName);
    const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!content.questions || !Array.isArray(content.questions)) {
      console.warn(`⚠️  檔案格式不正確: ${fileName}，跳過`);
      errorCount++;
      return;
    }
    
    // 簡化檔案格式
    const simplifiedContent = {
      importDate: new Date().toISOString().split('T')[0],
      source: content.metadata?.sourceFile || fileName,
      questions: content.questions.map((q, index) => ({
        id: String(index + 1), // 簡化為序號
        content: String(q.content || ''),
        A: String(q.A || ''),
        B: String(q.B || ''),
        C: String(q.C || ''),
        D: String(q.D || ''),
        Ans: (q.Ans || 'A'),
        exp: String(q.exp || '')
      }))
    };
    
    // 新檔名：使用期數
    const newFilename = `${series_no}.json`;
    const targetPath = path.join(targetFolder, newFilename);
    
    // 如果目標檔案已存在，先備份
    if (fs.existsSync(targetPath)) {
      const backupPath = targetPath + '.backup';
      fs.copyFileSync(targetPath, backupPath);
      console.log(`📋 備份已存在檔案: ${newFilename}`);
    }
    
    // 寫入新檔案
    fs.writeFileSync(
      targetPath,
      JSON.stringify(simplifiedContent, null, 2),
      'utf-8'
    );
    
    migratedCount++;
    console.log(`✅ 遷移: ${fileName} -> ${testName}/${subject}/${newFilename} (${simplifiedContent.questions.length} 題)`);
    
  } catch (error) {
    console.error(`❌ 遷移失敗 ${fileName}:`, error.message);
    errorCount++;
  }
});

console.log(`\n📊 遷移完成:`);
console.log(`   ✅ 成功: ${migratedCount} 個檔案`);
console.log(`   ❌ 失敗: ${errorCount} 個檔案`);
console.log(`\n💡 提示: 舊檔案仍保留在原位置，確認無誤後可手動刪除`);

