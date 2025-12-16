import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';
import { Question } from '../src/types';

interface ExcelRow {
  [key: string]: any;
}

/**
 * 將 Excel 檔案轉換為 JSON 格式（直接符合系統格式）
 */
function convertExcelToJSON(excelPath: string, outputPath: string): void {
  try {
    // 讀取 Excel 檔案
    const workbook = XLSX.readFile(excelPath);
    
    // 取得第一個工作表
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    
    // 轉換為 JSON
    const jsonData: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet);
    
    if (jsonData.length === 0) {
      console.error('Excel 檔案為空或沒有資料');
      return;
    }
    
    // 顯示第一筆資料的結構
    console.log('Excel 檔案欄位結構：');
    const headers = Object.keys(jsonData[0]);
    console.log(headers);
    console.log('\n第一筆資料範例：');
    console.log(JSON.stringify(jsonData[0], null, 2));
    
    // 轉換為 Question 格式
    const questions: Question[] = jsonData.map((row, index) => {
      return mapExcelRowToQuestion(row, index + 1);
    });
    
    // 確保輸出目錄存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 寫入 JSON 檔案
    fs.writeFileSync(outputPath, JSON.stringify(questions, null, 2), 'utf8');
    
    console.log(`\n✅ 轉換完成！`);
    console.log(`   輸入檔案：${excelPath}`);
    console.log(`   輸出檔案：${outputPath}`);
    console.log(`   共轉換 ${questions.length} 筆資料`);
    
    // 顯示統計資訊
    const subjects = new Set(questions.map(q => q.subject));
    const chapters = new Set(questions.map(q => q.chapter));
    console.log(`\n📊 統計資訊：`);
    console.log(`   科目數量：${subjects.size}`);
    console.log(`   章節數量：${chapters.size}`);
    console.log(`   科目列表：${Array.from(subjects).join(', ')}`);
  } catch (error) {
    console.error('轉換失敗：', error);
    throw error;
  }
}

/**
 * 將 Excel 資料列映射到 Question 格式
 */
function mapExcelRowToQuestion(row: ExcelRow, index: number): Question {
  // 嘗試不同的欄位名稱可能性
  const id = String(row['題號'] || row['ID'] || row['id'] || row['題目編號'] || index).trim();
  const content = String(row['題目'] || row['題目內容'] || row['content'] || row['問題'] || '').trim();
  const optionA = String(row['選項A'] || row['A'] || row['optionA'] || row['答案A'] || '').trim();
  const optionB = String(row['選項B'] || row['B'] || row['optionB'] || row['答案B'] || '').trim();
  const optionC = String(row['選項C'] || row['C'] || row['optionC'] || row['答案C'] || '').trim();
  const optionD = String(row['選項D'] || row['D'] || row['optionD'] || row['答案D'] || '').trim();
  
  // 處理正確答案（可能是 A/B/C/D 或 1/2/3/4）
  let correctAnswer = String(row['正確答案'] || row['答案'] || row['correctAnswer'] || row['正確選項'] || '').trim().toUpperCase();
  if (correctAnswer === '1') correctAnswer = 'A';
  if (correctAnswer === '2') correctAnswer = 'B';
  if (correctAnswer === '3') correctAnswer = 'C';
  if (correctAnswer === '4') correctAnswer = 'D';
  
  // 驗證正確答案
  if (!['A', 'B', 'C', 'D'].includes(correctAnswer)) {
    console.warn(`⚠️  第 ${index} 題的正確答案格式不正確：${correctAnswer}，設為 A`);
    correctAnswer = 'A';
  }
  
  const explanation = String(row['詳解'] || row['解析'] || row['explanation'] || row['說明'] || '').trim();
  const subject = String(row['科目'] || row['subject'] || row['類別'] || '理財規劃人員').trim();
  const chapter = String(row['章節'] || row['chapter'] || row['單元'] || row['類別'] || '專業能力').trim();
  const testName = String(row['測驗名稱'] || row['testName'] || row['測驗'] || '理財規劃人員').trim();
  const series_no = String(row['期數'] || row['series_no'] || row['期'] || row['屆'] || '').trim();
  
  return {
    id,
    content,
    options: {
      A: optionA,
      B: optionB,
      C: optionC,
      D: optionD,
    },
    correctAnswer: correctAnswer as 'A' | 'B' | 'C' | 'D',
    explanation,
    testName,
    subject,
    series_no,
    chapter,
  };
}

// 執行轉換
const excelPath = path.join(__dirname, '../date/第34屆理財規劃人員專業能力.xlsx');
const outputPath = path.join(__dirname, '../assets/data/questions.json');

if (fs.existsSync(excelPath)) {
  convertExcelToJSON(excelPath, outputPath);
} else {
  console.error(`找不到 Excel 檔案：${excelPath}`);
  process.exit(1);
}






