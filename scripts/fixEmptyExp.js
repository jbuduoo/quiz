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
      if (!q.exp || q.exp.trim() === '') {
        q.exp = '此題目暫無詳細說明。';
        modified = true;
        fixedCount++;
        console.log(`修正 ${fileName} 題目 ${index + 1}: ${q.id}`);
      }
    });
  }
  
  if (modified) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  }
});

console.log(`\n✅ 共修正 ${fixedCount} 個題目的空詳解欄位`);

