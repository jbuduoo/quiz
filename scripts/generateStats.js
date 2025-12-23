const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const indexFile = path.join(__dirname, '..', 'assets', 'data', 'questions.json');

const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));
const indexData = JSON.parse(fs.readFileSync(indexFile, 'utf8'));

console.log('═══════════════════════════════════════════════════════');
console.log('           題目資料統計報告');
console.log('═══════════════════════════════════════════════════════\n');

console.log('📊 總體統計：');
// 動態計算總題數
const totalQuestions = indexData.questionFiles.reduce((sum, file) => sum + (file.count || 0), 0);
console.log(`   總題數: ${totalQuestions} 題`);
console.log(`   總檔案數: ${files.length} 個`);
console.log(`   測驗名稱: ${indexData.testNames.length} 個`);
console.log(`   科目: ${indexData.subjects.length} 個`);
console.log(`   期數: ${indexData.series.length} 個\n`);

console.log('📋 測驗名稱統計：');
indexData.testNames.forEach(test => {
  console.log(`   ${test.name}: ${test.totalQuestions} 題`);
});
console.log('');

console.log('📚 科目統計：');
const subjectsByTest = {};
indexData.subjects.forEach(subject => {
  if (!subjectsByTest[subject.testName]) {
    subjectsByTest[subject.testName] = [];
  }
  subjectsByTest[subject.testName].push(subject);
});

Object.keys(subjectsByTest).forEach(testName => {
  console.log(`   ${testName}:`);
  subjectsByTest[testName].forEach(subject => {
    console.log(`     - ${subject.name}: ${subject.totalQuestions} 題`);
  });
});
console.log('');

console.log('📁 檔案明細：');
indexData.questionFiles.forEach((file, index) => {
  console.log(`   ${index + 1}. ${file.file}`);
  console.log(`      測驗: ${file.testName} | 科目: ${file.subject} | 期數: ${file.series_no} | ${file.count} 題`);
});
console.log('');

console.log('✅ 所有資料整理完成！');

