const fs = require('fs');
const path = require('path');

const questionsBaseDir = path.join(__dirname, '..', 'assets', 'data', 'questions');
const indexFile = path.join(__dirname, '..', 'assets', 'data', 'questions.json');
const questionFileMapFile = path.join(__dirname, '..', 'src', 'services', 'questionFileMap.ts');

// 遞迴掃描資料夾結構
function scanQuestionFolders(dir, basePath = '') {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result = [];
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = basePath ? `${basePath}/${entry.name}` : entry.name;
    
    if (entry.isDirectory()) {
      // 遞迴掃描子資料夾
      const subEntries = scanQuestionFolders(fullPath, relativePath);
      result.push(...subEntries);
    } else if (entry.isFile() && entry.name.endsWith('.json') && !entry.name.includes('.backup')) {
      // 找到 JSON 檔案
      result.push({
        filePath: relativePath,
        fullPath: fullPath,
        fileName: entry.name
      });
    }
  }
  
  return result;
}

// 從路徑解析 testName, subject, series_no
function parseFilePath(filePath) {
  // 格式1: IPAS_01/L11/11401.json (三層結構)
  // 格式2: NEW_CERT/20251216.json (兩層結構，沒有 subject)
  const parts = filePath.split('/');
  
  if (parts.length === 3) {
    // 三層結構：testName/subject/series_no.json
    const [testName, subject, fileName] = parts;
    const series_no = fileName.replace('.json', '');
    return { testName, subject, series_no, fileName };
  } else if (parts.length === 2) {
    // 兩層結構：testName/series_no.json（沒有 subject）
    const [testName, fileName] = parts;
    const series_no = fileName.replace('.json', '');
    return { testName, subject: null, series_no, fileName };
  }
  
  return null;
}

console.log('開始掃描題目檔案...\n');

// 掃描所有檔案
const allFiles = scanQuestionFolders(questionsBaseDir);

console.log(`找到 ${allFiles.length} 個題目檔案\n`);

const questionFiles = [];
const testNamesMap = new Map();
const subjectsMap = new Map();
const seriesMap = new Map();
let totalQuestions = 0;

// 處理每個檔案
allFiles.forEach(({ filePath, fullPath, fileName }) => {
  try {
    const parsed = parseFilePath(filePath);
    if (!parsed) {
      console.warn(`⚠️  路徑格式不符合: ${filePath}，跳過`);
      return;
    }
    
    const { testName, subject, series_no } = parsed;
    
    // 讀取檔案內容
    const content = fs.readFileSync(fullPath, 'utf8');
    const data = JSON.parse(content);
    
    if (!data.questions || !Array.isArray(data.questions)) {
      console.warn(`⚠️  檔案格式不正確: ${filePath}，跳過`);
      return;
    }
    
    const questionCount = data.questions.length;
    totalQuestions += questionCount;
    
    // 記錄測驗名稱
    if (!testNamesMap.has(testName)) {
      testNamesMap.set(testName, {
        id: `test-${testName}`,
        name: testName,
        totalQuestions: 0,
        completedQuestions: 0,
        completionPercentage: 0,
      });
    }
    testNamesMap.get(testName).totalQuestions += questionCount;
    
    // 記錄科目（如果存在）
    if (subject) {
      const subjectKey = `${testName}-${subject}`;
      if (!subjectsMap.has(subjectKey)) {
        subjectsMap.set(subjectKey, {
          id: `subject-${testName}-${subject}`,
          name: subject,
          testName,
          totalQuestions: 0,
          completedQuestions: 0,
          completionPercentage: 0,
        });
      }
      subjectsMap.get(subjectKey).totalQuestions += questionCount;
    }
    
    // 記錄期數
    const seriesKey = subject 
      ? `${testName}-${subject}-${series_no}`
      : `${testName}-${series_no}`;
      
    if (!seriesMap.has(seriesKey)) {
      seriesMap.set(seriesKey, {
        id: subject 
          ? `series-${testName}-${subject}-${series_no}`
          : `series-${testName}-${series_no}`,
        name: series_no,
        testName,
        subject: subject || '', // 如果沒有 subject，使用空字串
        totalQuestions: 0,
        completedQuestions: 0,
        completionPercentage: 0,
      });
    }
    seriesMap.get(seriesKey).totalQuestions += questionCount;
    
    // 記錄題目檔案（使用空字串表示沒有 subject）
    questionFiles.push({
      testName,
      subject: subject || '', // 如果沒有 subject，使用空字串
      series_no,
      file: `questions/${filePath}`,
      count: questionCount,
    });
    
    const subjectDisplay = subject || '(無科目)';
    console.log(`✅ ${filePath}: ${testName} / ${subjectDisplay} / ${series_no} (${questionCount} 題)`);
    
  } catch (error) {
    console.error(`❌ 處理檔案失敗 ${filePath}:`, error.message);
  }
});

// 建立索引資料
const indexData = {
  metadata: {
    version: '3.0.0', // 更新版本號
    lastUpdated: new Date().toISOString(),
  },
  testNames: Array.from(testNamesMap.values()),
  subjects: Array.from(subjectsMap.values()),
  series: Array.from(seriesMap.values()),
  questionFiles: questionFiles.sort((a, b) => {
    // 排序：先按 testName，再按 subject，最後按 series_no
    if (a.testName !== b.testName) return a.testName.localeCompare(b.testName);
    if (a.subject !== b.subject) return a.subject.localeCompare(b.subject);
    return a.series_no.localeCompare(b.series_no);
  }),
};

// 寫入索引檔案
fs.writeFileSync(indexFile, JSON.stringify(indexData, null, 2), 'utf8');
console.log(`\n✅ 已更新索引檔案: ${indexFile}`);
console.log(`   總題數: ${totalQuestions}`);
console.log(`   測驗名稱: ${testNamesMap.size} 個`);
console.log(`   科目: ${subjectsMap.size} 個`);
console.log(`   期數: ${seriesMap.size} 個`);

// 生成 questionFileMap.ts（使用新的路徑格式）
const mapEntries = questionFiles.map(qf => {
  // 路徑格式: questions/IPAS_01/L11/11401.json
  // require 路徑: ../../assets/data/questions/IPAS_01/L11/11401.json
  const requirePath = qf.file.replace('questions/', '../../assets/data/questions/');
  return `  '${qf.file}': () => require('${requirePath}'),`;
}).join('\n');

const mapContent = `// 此檔案由 scripts/updateQuestionIndex.js 自動生成
// 請勿手動編輯此檔案

import { QuestionFileData } from './QuestionService';

export const questionFileMap: Record<string, () => QuestionFileData> = {
${mapEntries}
};
`;

fs.writeFileSync(questionFileMapFile, mapContent, 'utf8');
console.log(`✅ 已更新映射檔案: ${questionFileMapFile}`);
