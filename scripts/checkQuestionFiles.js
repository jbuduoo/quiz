const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');

const files = [
  'A001.json', 'A002.json', 'A003.json', 'A004.json', 'A005.json',
  'A006.json', 'A007.json', 'A008.json', 'A009.json', 'A010.json',
  'A011.json', 'A012.json', 'A013.json', 'A014.json',
  'B001.json', 'B002.json', 'B003.json', 'B004.json', 'B005.json',
  'B006.json', 'B007.json', 'B008.json', 'B009.json', 'B010.json',
  'B011.json', 'B012.json', 'B013.json', 'B014.json'
];

let totalErrors = 0;
let totalWarnings = 0;

console.log('開始檢查題目檔案格式...\n');

files.forEach(fileName => {
  const filePath = path.join(questionsDir, fileName);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ ${fileName}: 檔案不存在`);
    totalErrors++;
    return;
  }
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    // 檢查是否為陣列格式
    if (!Array.isArray(data)) {
      console.error(`❌ ${fileName}: 不是陣列格式（應為 [{...}, {...}]）`);
      totalErrors++;
      return;
    }
    
    if (data.length === 0) {
      console.warn(`⚠️  ${fileName}: 陣列為空`);
      totalWarnings++;
      return;
    }
    
    // 檢查每個題目
    data.forEach((q, index) => {
      const questionNum = index + 1;
      const errors = [];
      
      // 檢查必要欄位
      if (!q.Id && !q.id) {
        errors.push('缺少 Id');
      }
      if (!q.Q && !q.content) {
        errors.push('缺少 Q');
      }
      if (!q.A) {
        errors.push('缺少 A');
      }
      if (!q.B) {
        errors.push('缺少 B');
      }
      
      // 是非題不需要 C 和 D
      const isTrueFalse = q.Type === '是非題';
      if (!isTrueFalse) {
        if (!q.C) {
          errors.push('缺少 C');
        }
        if (!q.D) {
          errors.push('缺少 D');
        }
      }
      
      if (!q.Ans) {
        errors.push('缺少 Ans');
      }
      if (!q.Exp && !q.exp) {
        errors.push('缺少 Exp');
      }
      
      if (errors.length > 0) {
        console.error(`❌ ${fileName}: 題目 ${questionNum} - ${errors.join(', ')}`);
        totalErrors++;
      }
      
      // 檢查 Ans 值是否有效
      if (q.Ans) {
        const validAnswers = ['A', 'B', 'C', 'D', 'E'];
        if (isTrueFalse) {
          if (q.Ans !== 'A' && q.Ans !== 'B') {
            console.warn(`⚠️  ${fileName}: 題目 ${questionNum} - Ans 值 "${q.Ans}" 對是非題可能無效（應為 A 或 B）`);
            totalWarnings++;
          }
        } else {
          // 檢查是否為複選題（包含逗號）
          if (q.Ans.includes(',')) {
            const answers = q.Ans.split(',').map(a => a.trim());
            const invalidAnswers = answers.filter(a => !validAnswers.includes(a));
            if (invalidAnswers.length > 0) {
              console.warn(`⚠️  ${fileName}: 題目 ${questionNum} - Ans 值包含無效選項: ${invalidAnswers.join(', ')}`);
              totalWarnings++;
            }
          } else {
            if (!validAnswers.includes(q.Ans)) {
              console.warn(`⚠️  ${fileName}: 題目 ${questionNum} - Ans 值 "${q.Ans}" 可能無效（應為 A, B, C, D 或 E）`);
              totalWarnings++;
            }
          }
        }
      }
    });
    
    console.log(`✅ ${fileName}: ${data.length} 題，格式正確`);
  } catch (e) {
    console.error(`❌ ${fileName}: JSON 解析錯誤 - ${e.message}`);
    totalErrors++;
  }
});

console.log('\n檢查完成！');
console.log(`總計: ${files.length} 個檔案`);
console.log(`錯誤: ${totalErrors} 個`);
console.log(`警告: ${totalWarnings} 個`);

if (totalErrors === 0 && totalWarnings === 0) {
  console.log('\n✅ 所有檔案格式完全正確！');
  process.exit(0);
} else {
  process.exit(1);
}





