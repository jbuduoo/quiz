const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

console.log('檢查所有檔案的 testName...\n');

const ipasAI = [];
const ipas01 = [];
const ipas02 = [];

files.forEach(fileName => {
  const filePath = path.join(questionsDir, fileName);
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(content);
    
    if (data.metadata && data.metadata.testName) {
      const testName = data.metadata.testName;
      const info = {
        file: fileName,
        testName: testName,
        subject: data.metadata.subject,
        series_no: data.metadata.series_no,
        count: data.questions ? data.questions.length : 0
      };
      
      if (testName === 'IPAS_AI') {
        ipasAI.push(info);
      } else if (testName === 'IPAS_01') {
        ipas01.push(info);
      } else if (testName === 'IPAS_02') {
        ipas02.push(info);
      }
    }
  } catch (e) {
    console.error(`錯誤: ${fileName} - ${e.message}`);
  }
});

console.log(`IPAS_AI: ${ipasAI.length} 個檔案`);
ipasAI.forEach(f => {
  console.log(`  ${f.file} - ${f.testName} / ${f.subject} / ${f.series_no} (${f.count}題)`);
});

console.log(`\nIPAS_01: ${ipas01.length} 個檔案`);
ipas01.forEach(f => {
  console.log(`  ${f.file} - ${f.testName} / ${f.subject} / ${f.series_no} (${f.count}題)`);
});

console.log(`\nIPAS_02: ${ipas02.length} 個檔案`);
ipas02.forEach(f => {
  console.log(`  ${f.file} - ${f.testName} / ${f.subject} / ${f.series_no} (${f.count}題)`);
});

const totalAI = ipasAI.reduce((sum, f) => sum + f.count, 0);
const total01 = ipas01.reduce((sum, f) => sum + f.count, 0);
const total02 = ipas02.reduce((sum, f) => sum + f.count, 0);

console.log(`\n總計:`);
console.log(`  IPAS_AI: ${totalAI} 題`);
console.log(`  IPAS_01: ${total01} 題`);
console.log(`  IPAS_02: ${total02} 題`);

