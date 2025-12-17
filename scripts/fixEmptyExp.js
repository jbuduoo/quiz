const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

let fixedCount = 0;

files.forEach(fileName => {
  const filePath = path.join(questionsDir, fileName);
  const content = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(content);
  
  let modified = false;
  
  if (data.questions && Array.isArray(data.questions)) {
    data.questions.forEach((q, index) => {
      // 支援新格式（Exp）和舊格式（exp）
      const expValue = q.Exp || q.exp;
      if (!expValue || expValue.trim() === '') {
        // 優先使用新格式，如果不存在則建立
        if (q.Q !== undefined || q.content !== undefined) {
          q.Exp = '此題目暫無詳細說明。';
          // 如果舊格式存在，也更新它（向後相容）
          if (q.exp !== undefined) {
            q.exp = '此題目暫無詳細說明。';
          }
        } else {
          q.exp = '此題目暫無詳細說明。';
        }
        modified = true;
        fixedCount++;
        const questionId = q.Id || q.id || index + 1;
        console.log(`修正 ${fileName} 題目 ${index + 1}: ${questionId}`);
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
});

console.log(`\n✅ 共修正 ${fixedCount} 個題目的空詳解欄位`);

