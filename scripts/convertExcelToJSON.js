const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * 從檔案名稱解析 testName, subject, series_no
 * 支援兩種格式：
 * 1. IPAS 格式：IPAS_01初級_L11 人工智慧基礎概論_11409.xlsx
 *    -> testName: IPAS_01, subject: L11, series_no: 11409
 * 2. 舊格式：信託實務_61期.xlsx
 *    -> testName: 信託營業員, subject: 信託實務, series_no: 61期
 */
function parseFileName(fileName) {
  // 移除副檔名
  const nameWithoutExt = fileName.replace(/\.xlsx?$/i, '');
  
  // 預設值
  let testName = '信託營業員';
  let subject = '';
  let series_no = '61期';
  
  // 檢查是否為 IPAS 格式（包含 IPAS_ 開頭）
  if (nameWithoutExt.startsWith('IPAS_')) {
    // IPAS 格式：IPAS_01初級_L11 人工智慧基礎概論_11409
    // 或：IPAS_02中級_L23機器學習技術與應用_11411
    const parts = nameWithoutExt.split('_');
    
    if (parts.length >= 4) {
      // testName: 第一個部分 + 第二個部分的前兩個字符（例如 IPAS_01）
      // parts[0] = "IPAS"
      // parts[1] = "01初級" -> 取前兩個字符 "01"
      testName = parts[0] + '_' + parts[1].substring(0, 2); // IPAS_01 或 IPAS_02
      
      // subject: 從第三個部分提取 L 開頭的代碼（例如 L11, L23）
      // parts[2] = "L11 人工智慧基礎概論" -> 提取 "L11"
      const subjectPart = parts[2];
      const subjectMatch = subjectPart.match(/L\d+/);
      if (subjectMatch) {
        subject = subjectMatch[0]; // L11 或 L23
      } else {
        subject = subjectPart; // 如果沒有匹配，使用整個部分
      }
      
      // series_no: 最後一個部分（例如 11409, 11411）
      series_no = parts[parts.length - 1];
      
      return { testName, subject, series_no };
    }
  }
  
  // 舊格式：信託實務_61期.xlsx
  // 格式：科目_期數 或 科目-期數
  const match = nameWithoutExt.match(/^(.+?)[_\-](.+期)$/);
  if (match) {
    subject = match[1].trim();
    series_no = match[2].trim();
  } else {
    // 如果沒有匹配，整個名稱作為 subject
    subject = nameWithoutExt;
  }
  
  return { testName, subject, series_no };
}

/**
 * 生成檔案名稱（使用 testName_subject_series_no 格式）
 */
function generateFileName(testName, subject, series_no) {
  // 格式：IPAS_02_L23_11411.json
  return `${testName}_${subject}_${series_no}`;
}

/**
 * 將 Excel 檔案轉換為 JSON 格式（直接符合系統格式）
 */
function convertExcelToJSON(excelPath, testName, subject, series_no) {
  try {
    // 讀取 Excel 檔案
    const workbook = XLSX.readFile(excelPath);
    
    // 取得第一個工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 轉換為 JSON
    const jsonData = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      console.warn(`⚠️  ${path.basename(excelPath)} 為空或沒有資料`);
      return [];
    }
    
    // 使用檔案名稱解析的值（不再從 Excel 欄位讀取）
    const actualTestName = testName;
    const actualSubject = subject;
    const actualSeriesNo = series_no;
    
    // 轉換為 Question 格式
    const questions = jsonData.map((row, index) => {
      return mapExcelRowToQuestion(row, index + 1, testName, subject, series_no);
    });
    
    console.log(`   實際測驗名稱: ${actualTestName || '(使用檔案名稱解析)'}`);
    console.log(`   實際科目: ${actualSubject || '(使用檔案名稱解析)'}`);
    console.log(`   實際期數: ${actualSeriesNo || '(使用檔案名稱解析)'}`);
    console.log(`✅ ${path.basename(excelPath)}: 轉換 ${questions.length} 筆題目`);
    
    return {
      questions,
      actualTestName,
      actualSubject,
      actualSeriesNo,
    };
  } catch (error) {
    console.error(`❌ 轉換 ${excelPath} 失敗:`, error);
    return null;
  }
}

/**
 * 將 Excel 資料列映射到 Question 格式
 */
function mapExcelRowToQuestion(row, index, testName, subject, series_no) {
  // 嘗試不同的欄位名稱可能性
  const id = String(row['題號'] || row['ID'] || row['id'] || row['題目編號'] || row['序號'] || index).trim();
  const content = String(row['題目'] || row['題目內容'] || row['content'] || row['問題'] || row['題幹'] || '').trim();
  const optionA = String(row['選項A'] || row['A'] || row['optionA'] || row['答案A'] || row['選項1'] || '').trim();
  const optionB = String(row['選項B'] || row['B'] || row['optionB'] || row['答案B'] || row['選項2'] || '').trim();
  const optionC = String(row['選項C'] || row['C'] || row['optionC'] || row['答案C'] || row['選項3'] || '').trim();
  const optionD = String(row['選項D'] || row['D'] || row['optionD'] || row['答案D'] || row['選項4'] || '').trim();
  
  // 處理正確答案（可能是 A/B/C/D 或 1/2/3/4）
  let correctAnswer = String(row['正確答案'] || row['答案'] || row['correctAnswer'] || row['正確選項'] || row['標準答案'] || '').trim().toUpperCase();
  if (correctAnswer === '1') correctAnswer = 'A';
  if (correctAnswer === '2') correctAnswer = 'B';
  if (correctAnswer === '3') correctAnswer = 'C';
  if (correctAnswer === '4') correctAnswer = 'D';
  
  // 驗證正確答案
  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    console.warn(`⚠️  第 ${index} 題的正確答案格式不正確：${correctAnswer}，設為 A`);
    correctAnswer = 'A';
  }
  
  const explanation = String(row['詳解'] || row['解析'] || row['explanation'] || row['說明'] || row['解答'] || '').trim();
  
  // 完全使用檔案名稱解析的值（不再從 Excel 欄位讀取 testName、subject、series_no）
  let finalTestName = testName || '信託營業員';
  let finalSubject = subject || '';
  let finalSeriesNo = series_no || '61期';
  
  // 對於 IPAS 格式，series_no 是純數字（例如 11409），不需要「期」字
  // 對於舊格式，series_no 可能包含「期」字（例如 61期）
  // 如果 series_no 是純數字且 testName 不是 IPAS 開頭，補上「期」字
  if (finalSeriesNo && /^\d+$/.test(finalSeriesNo) && !finalTestName.startsWith('IPAS_')) {
    finalSeriesNo = finalSeriesNo + '期';
  }
  
  // 保留 chapter 欄位以向後相容（可選）
  const chapter = String(row['chapter'] || row['章節'] || row['單元'] || row['類別'] || row['章節名稱'] || '').trim();
  
  return {
    id: `${finalTestName}_${finalSubject}_${finalSeriesNo}_${id}`, // 確保 ID 唯一，格式：testName_subject_series_no_題號
    content,
    options: {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD,
    },
    correctAnswer: correctAnswer,
    explanation,
    // 移除 testName、subject、series_no，這些資訊存在 metadata 中
    ...(chapter && { chapter }), // 只有當 chapter 有值時才加入
  };
}

/**
 * 批量處理 data 資料夾中的所有 Excel 檔案
 */
function convertAllExcelFiles() {
  const dataDir = path.join(__dirname, '../data');
  const outputDir = path.join(__dirname, '../assets/data');
  const questionsDir = path.join(outputDir, 'questions');
  const indexFilePath = path.join(outputDir, 'questions.json');
  
  // 確保輸出目錄存在
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  if (!fs.existsSync(questionsDir)) {
    fs.mkdirSync(questionsDir, { recursive: true });
  }
  
  // 讀取 data 資料夾中的所有檔案
  const files = fs.readdirSync(dataDir);
  // 過濾掉臨時檔案（以 ~$ 開頭的檔案）
  const excelFiles = files.filter(file => 
    /\.xlsx?$/i.test(file) && !file.startsWith('~$')
  );
  
  if (excelFiles.length === 0) {
    console.error('❌ data 資料夾中沒有找到 Excel 檔案');
    process.exit(1);
  }
  
  console.log(`📁 找到 ${excelFiles.length} 個 Excel 檔案：\n`);
  
  const questionFiles = [];
  const allTestNames = new Map();
  const allSubjects = new Map();
  const allSeries = new Map();
  
  // 處理每個 Excel 檔案
  excelFiles.forEach((file, fileIndex) => {
    const excelPath = path.join(dataDir, file);
    const { testName, subject, series_no } = parseFileName(file);
    
    console.log(`\n📄 處理檔案 ${fileIndex + 1}/${excelFiles.length}: ${file}`);
    console.log(`   測驗名稱: ${testName}`);
    console.log(`   科目: ${subject}`);
    console.log(`   期數: ${series_no}`);
    
    const result = convertExcelToJSON(excelPath, testName, subject, series_no);
    
    if (result && result.questions.length > 0) {
      const actualTestName = result.actualTestName;
      const actualSubject = result.actualSubject;
      const actualSeriesNo = result.actualSeriesNo;
      
      // 生成檔案名稱（格式：testName_subject_series_no）
      const fileName = generateFileName(actualTestName, actualSubject, actualSeriesNo);
      const questionFilePath = path.join(questionsDir, `${fileName}.json`);
      
      // 儲存題目檔案
      const questionFileData = {
        metadata: {
          testName: actualTestName,
          subject: actualSubject,
          series_no: actualSeriesNo,
          sourceFile: file,
          count: result.questions.length,
        },
        questions: result.questions,
      };
      
      fs.writeFileSync(questionFilePath, JSON.stringify(questionFileData, null, 2), 'utf8');
      
      // 記錄到 questionFiles
      questionFiles.push({
        testName: actualTestName,
        subject: actualSubject,
        series_no: actualSeriesNo,
        file: `questions/${fileName}.json`,
        count: result.questions.length,
      });
      
      // 統計 testNames
      if (!allTestNames.has(actualTestName)) {
        allTestNames.set(actualTestName, {
          totalQuestions: 0,
          questions: [],
        });
      }
      const testNameData = allTestNames.get(actualTestName);
      testNameData.totalQuestions += result.questions.length;
      testNameData.questions.push(...result.questions);
      
      // 統計 subjects
      const subjectKey = `${actualTestName}::${actualSubject}`;
      if (!allSubjects.has(subjectKey)) {
        allSubjects.set(subjectKey, {
          testName: actualTestName,
          subject: actualSubject,
          totalQuestions: 0,
          questions: [],
        });
      }
      const subjectData = allSubjects.get(subjectKey);
      subjectData.totalQuestions += result.questions.length;
      subjectData.questions.push(...result.questions);
      
      // 統計 series
      const seriesKey = `${actualTestName}::${actualSubject}::${actualSeriesNo}`;
      if (!allSeries.has(seriesKey)) {
        allSeries.set(seriesKey, {
          testName: actualTestName,
          subject: actualSubject,
          series_no: actualSeriesNo,
          totalQuestions: 0,
          questions: [],
        });
      }
      const seriesData = allSeries.get(seriesKey);
      seriesData.totalQuestions += result.questions.length;
      seriesData.questions.push(...result.questions);
      
      console.log(`   💾 已儲存到: questions/${fileName}.json`);
    }
  });
  
  if (questionFiles.length === 0) {
    console.error('\n❌ 沒有成功轉換任何題目');
    process.exit(1);
  }
  
  // 生成 testNames 列表
  const testNames = Array.from(allTestNames.entries()).map(([name, data]) => ({
    id: `test-${name}`,
    name,
    totalQuestions: data.totalQuestions,
    completedQuestions: 0,
    completionPercentage: 0,
  }));
  
  // 生成 subjects 列表
  const subjects = Array.from(allSubjects.values()).map(data => ({
    id: `subject-${data.testName}-${data.subject}`,
    name: data.subject,
    testName: data.testName,
    totalQuestions: data.totalQuestions,
    completedQuestions: 0,
    completionPercentage: 0,
  }));
  
  // 生成 series 列表
  const series = Array.from(allSeries.values()).map(data => ({
    id: `series-${data.testName}-${data.subject}-${data.series_no}`,
    name: data.series_no,
    testName: data.testName,
    subject: data.subject,
    totalQuestions: data.totalQuestions,
    completedQuestions: 0,
    completionPercentage: 0,
  }));
  
  // 建立索引檔案
  const indexData = {
    metadata: {
      version: '2.0.0',
      lastUpdated: new Date().toISOString(),
      totalQuestions: Array.from(allTestNames.values()).reduce((sum, data) => sum + data.totalQuestions, 0),
    },
    testNames,
    subjects,
    series,
    questionFiles,
  };
  
  // 寫入索引檔案
  fs.writeFileSync(indexFilePath, JSON.stringify(indexData, null, 2), 'utf8');
  
  console.log(`\n\n✅ 轉換完成！`);
  console.log(`   索引檔案：${indexFilePath}`);
  console.log(`   題目檔案目錄：${questionsDir}`);
  console.log(`   總題數：${indexData.metadata.totalQuestions} 題`);
  console.log(`   測驗名稱數：${testNames.length} 個`);
  console.log(`   科目數：${subjects.length} 個`);
  console.log(`   期數數：${series.length} 個`);
  console.log(`   題目檔案數：${questionFiles.length} 個`);
  
  // 生成題目檔案映射表
  console.log(`\n📝 生成題目檔案映射表...`);
  const { execSync } = require('child_process');
  try {
    execSync('node scripts/generateQuestionFileMap.js', { stdio: 'inherit' });
  } catch (error) {
    console.warn('⚠️  生成映射表失敗，請手動執行: node scripts/generateQuestionFileMap.js');
  }
  console.log(`\n📊 統計資訊：`);
  
  // 統計各測驗名稱
  testNames.forEach(testName => {
    console.log(`\n   ${testName.name} (${testName.totalQuestions} 題):`);
    const relatedSubjects = subjects.filter(s => s.testName === testName.name);
    relatedSubjects.forEach(subject => {
      console.log(`     - ${subject.name} (${subject.totalQuestions} 題):`);
      const relatedSeries = series.filter(s => s.testName === testName.name && s.subject === subject.name);
      relatedSeries.forEach(s => {
        console.log(`       ${s.name}: ${s.totalQuestions} 題`);
      });
    });
  });
}

// 執行批量轉換
convertAllExcelFiles();
