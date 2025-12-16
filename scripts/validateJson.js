const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

console.log(`檢查 ${files.length} 個 JSON 檔案...\n`);

let errorCount = 0;
files.forEach(fileName => {
  const filePath = path.join(questionsDir, fileName);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // 檢查基本結構
    if (!data.metadata) {
      console.error(`❌ ${fileName}: 缺少 metadata`);
      errorCount++;
    }
    if (!data.questions || !Array.isArray(data.questions)) {
      console.error(`❌ ${fileName}: 缺少 questions 陣列`);
      errorCount++;
    } else {
      // 檢查每個題目的格式
      data.questions.forEach((q, index) => {
        if (!q.id || !q.content || !q.A || !q.B || !q.C || !q.D || !q.Ans || !q.exp) {
          console.error(`❌ ${fileName}: 題目 ${index + 1} 缺少必要欄位`);
          errorCount++;
        }
      });
    }
  } catch (e) {
    console.error(`❌ ${fileName}: ${e.message}`);
    errorCount++;
  }
});

if (errorCount === 0) {
  console.log('✅ 所有 JSON 檔案格式正確！');
} else {
  console.log(`\n❌ 發現 ${errorCount} 個錯誤`);
  process.exit(1);
}

