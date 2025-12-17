const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');

// 遞迴找出所有 JSON 檔案
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

// 轉換單個檔案
function convertFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // 檢查是否已經是 new format（檢查是否有 Q 欄位）
    const isNewFormat = data.questions && data.questions.length > 0 && 
                       (data.questions[0].Q !== undefined || data.questions[0].Q === null);
    
    if (isNewFormat) {
      console.log(`⏭️  跳過（已是新格式）: ${path.relative(questionsDir, filePath)}`);
      return { converted: false, skipped: true };
    }
    
    if (!data.questions || !Array.isArray(data.questions)) {
      console.log(`⚠️  跳過（格式不符）: ${path.relative(questionsDir, filePath)}`);
      return { converted: false, skipped: true };
    }
    
    // 轉換每個題目
    data.questions = data.questions.map(q => {
      const newQ = {
        Id: q.Id || q.id,
        Q: q.Q || q.content,
        A: q.A,
        B: q.B,
        C: q.C,
        D: q.D,
        Ans: q.Ans
      };
      
      // 處理 Exp/exp
      if (q.Exp !== undefined) {
        newQ.Exp = q.Exp;
      } else if (q.exp !== undefined) {
        newQ.Exp = q.exp;
      }
      
      // 保留其他可選欄位
      if (q.hint !== undefined) newQ.hint = q.hint;
      if (q.diagram !== undefined) newQ.diagram = q.diagram;
      if (q.chapter !== undefined) newQ.chapter = q.chapter;
      
      return newQ;
    });
    
    // 寫回檔案
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✅ 轉換完成: ${path.relative(questionsDir, filePath)} (${data.questions.length} 題)`);
    return { converted: true, count: data.questions.length };
    
  } catch (error) {
    console.error(`❌ 轉換失敗 ${path.relative(questionsDir, filePath)}:`, error.message);
    return { converted: false, error: error.message };
  }
}

// 主程式
console.log('開始轉換所有 JSON 檔案為新格式...\n');

const jsonFiles = findJsonFiles(questionsDir);
console.log(`找到 ${jsonFiles.length} 個 JSON 檔案\n`);

let convertedCount = 0;
let skippedCount = 0;
let errorCount = 0;
let totalQuestions = 0;

jsonFiles.forEach(filePath => {
  const result = convertFile(filePath);
  if (result.converted) {
    convertedCount++;
    totalQuestions += result.count || 0;
  } else if (result.skipped) {
    skippedCount++;
  } else {
    errorCount++;
  }
});

console.log(`\n📊 轉換完成統計:`);
console.log(`   ✅ 成功轉換: ${convertedCount} 個檔案 (共 ${totalQuestions} 題)`);
console.log(`   ⏭️  已跳過: ${skippedCount} 個檔案（已是新格式或格式不符）`);
console.log(`   ❌ 失敗: ${errorCount} 個檔案`);

