const fs = require('fs');
const path = require('path');

console.log('📦 準備建置...');

// 驗證必要的檔案是否存在
const questionsJsonPath = path.join(__dirname, '../assets/data/questions/questions.json');

console.log('\n📋 驗證檔案...');

if (!fs.existsSync(questionsJsonPath)) {
  console.error(`❌ questions.json 不存在: ${questionsJsonPath}`);
  console.error(`   請確認檔案存在於: assets/data/questions/questions.json`);
  process.exit(1);
}
console.log(`✅ questions.json 存在: ${questionsJsonPath}`);

// 驗證 questions.json 格式
try {
  const questionsData = JSON.parse(fs.readFileSync(questionsJsonPath, 'utf8'));
  if (!questionsData.questionFiles || !Array.isArray(questionsData.questionFiles)) {
    console.warn(`⚠️  警告: questions.json 格式不完整（缺少 questionFiles）`);
  } else {
    console.log(`✅ questions.json 格式正確（${questionsData.questionFiles.length} 個題目檔案）`);
  }
  
  // 驗證每個題目檔案是否存在
  if (questionsData.questionFiles && Array.isArray(questionsData.questionFiles)) {
    const questionsDir = path.join(__dirname, '../assets/data/questions');
    let missingFiles = [];
    
    questionsData.questionFiles.forEach(fileInfo => {
      const filePath = path.join(questionsDir, fileInfo.file);
      if (!fs.existsSync(filePath)) {
        missingFiles.push(fileInfo.file);
      }
    });
    
    if (missingFiles.length > 0) {
      console.warn(`⚠️  警告: 以下題目檔案不存在:`);
      missingFiles.forEach(file => console.warn(`   - ${file}`));
    } else {
      console.log(`✅ 所有題目檔案都存在`);
    }
  }
} catch (error) {
  console.error(`❌ 無法解析 questions.json: ${error.message}`);
  process.exit(1);
}

console.log(`\n✅ 驗證完成！`);
