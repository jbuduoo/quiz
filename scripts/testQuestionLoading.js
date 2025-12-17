const fs = require('fs');
const path = require('path');

// 模擬 QuestionService 的載入邏輯
const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');

function findJsonFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      findJsonFiles(filePath, fileList);
    } else if (file.endsWith('.json')) {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}

function loadQuestionFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.questions || !Array.isArray(data.questions)) {
      return { success: false, error: '缺少 questions 陣列' };
    }
    
    // 模擬 QuestionService 的映射邏輯
    const normalizedQuestions = data.questions.map((q, index) => {
      return {
        id: q.Id || q.id || `question_${index + 1}`,
        content: q.Q || q.content || '',
        A: q.A || '',
        B: q.B || '',
        C: q.C || '',
        D: q.D || '',
        Ans: q.Ans || 'A',
        exp: q.Exp || q.exp || '',
        questionNumber: index + 1
      };
    });
    
    return {
      success: true,
      count: normalizedQuestions.length,
      questions: normalizedQuestions
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 主程式
console.log('開始測試題目載入功能...\n');

const jsonFiles = findJsonFiles(questionsDir);
console.log(`找到 ${jsonFiles.length} 個 JSON 檔案\n`);

let successCount = 0;
let errorCount = 0;
let totalQuestions = 0;
const errors = [];

// 測試每個檔案
jsonFiles.forEach(filePath => {
  const relativePath = path.relative(questionsDir, filePath);
  const result = loadQuestionFile(filePath);
  
  if (result.success) {
    successCount++;
    totalQuestions += result.count;
    console.log(`✅ ${relativePath}: ${result.count} 題`);
    
    // 檢查第一個題目的格式
    if (result.questions.length > 0) {
      const firstQ = result.questions[0];
      const hasAllFields = firstQ.id && firstQ.content && firstQ.A && 
                          firstQ.B && firstQ.C && firstQ.D && firstQ.Ans && firstQ.exp;
      if (!hasAllFields) {
        errors.push(`${relativePath}: 題目格式不完整`);
      }
    }
  } else {
    errorCount++;
    errors.push(`${relativePath}: ${result.error}`);
    console.error(`❌ ${relativePath}: ${result.error}`);
  }
});

console.log(`\n📊 測試完成統計:`);
console.log(`   ✅ 成功載入: ${successCount} 個檔案`);
console.log(`   ❌ 載入失敗: ${errorCount} 個檔案`);
console.log(`   📝 總題數: ${totalQuestions} 題`);

if (errors.length > 0) {
  console.log(`\n⚠️  發現問題:`);
  errors.forEach(err => console.log(`   - ${err}`));
  process.exit(1);
} else {
  console.log(`\n✅ 所有檔案載入測試通過！`);
  process.exit(0);
}

