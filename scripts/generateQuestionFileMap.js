const fs = require('fs');
const path = require('path');

const questionsDir = path.join(__dirname, '../assets/data/questions');
const outputFile = path.join(__dirname, '../src/services/questionFileMap.ts');

// 讀取所有題目檔案
const files = fs.readdirSync(questionsDir).filter(f => f.endsWith('.json'));

console.log(`找到 ${files.length} 個題目檔案`);

// 生成映射表
const mapEntries = files.map(file => {
  const filePath = `questions/${file}`;
  const requirePath = `../../assets/data/${filePath}`;
  return `  '${filePath}': () => require('${requirePath}'),`;
}).join('\n');

const content = `// 此檔案由 scripts/generateQuestionFileMap.js 自動生成
// 請勿手動編輯此檔案

import { QuestionFileData } from './QuestionService';

export const questionFileMap: Record<string, () => QuestionFileData> = {
${mapEntries}
};
`;

fs.writeFileSync(outputFile, content, 'utf8');
console.log(`✅ 已生成映射表: ${outputFile}`);




