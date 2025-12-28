const fs = require('fs');
const path = require('path');

const questionsJsonPath = path.join(__dirname, '..', 'assets', 'data', 'questions', 'questions.json');
const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');

const questionsJson = JSON.parse(fs.readFileSync(questionsJsonPath, 'utf8'));

const checkCount = (file, expected) => {
  try {
    const filePath = path.join(questionsDir, file);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const actual = Array.isArray(data) ? data.length : (data.questions?.length || 0);
    if (actual !== expected) {
      console.log(`⚠️  ${file}: 索引中 count=${expected}, 實際=${actual}`);
      return false;
    }
    return true;
  } catch(e) {
    console.log(`❌ ${file}: ${e.message}`);
    return false;
  }
};

let allMatch = true;

if (questionsJson.questionListFiles) {
  questionsJson.questionListFiles.forEach(group => {
    group.children.forEach(child => {
      if (!checkCount(child.file, child.count)) {
        allMatch = false;
      }
    });
  });
}

if (allMatch) {
  console.log('✅ 所有檔案的 count 都與實際題目數量一致');
} else {
  console.log('\n❌ 發現 count 不一致的檔案，請更新 questions.json');
  process.exit(1);
}





