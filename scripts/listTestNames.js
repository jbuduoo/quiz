const data = require('../assets/data/questions.json');
const testNames = [...new Set(data.questions.map(q => q.testName))].sort();

console.log('不重複的 testName 列表：');
console.log('');
testNames.forEach((t, i) => {
  console.log(`${i + 1}. ${t}`);
});
console.log('');
console.log(`總共 ${testNames.length} 個不重複的 testName`);




