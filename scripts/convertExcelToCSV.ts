import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

interface ExcelRow {
  [key: string]: any;
}

/**
 * 將 Excel 檔案轉換為 CSV 格式
 */
function convertExcelToCSV(excelPath: string, outputPath: string): void {
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
    
    // 顯示第一筆資料的結構，幫助了解欄位名稱
    console.log('Excel 檔案欄位結構：');
    console.log(Object.keys(jsonData[0]));
    console.log('\n第一筆資料範例：');
    console.log(JSON.stringify(jsonData[0], null, 2));
    
    // 轉換為 CSV 格式
    // 定義 CSV 欄位順序（根據系統需求）
    const csvHeaders = [
      'id',
      'content',
      'optionA',
      'optionB',
      'optionC',
      'optionD',
      'correctAnswer',
      'explanation',
      'subject',
      'chapter',
    ];
    
    // 建立 CSV 內容
    let csvContent = csvHeaders.join(',') + '\n';
    
    jsonData.forEach((row, index) => {
      // 根據 Excel 欄位映射到 CSV 欄位
      // 這裡需要根據實際 Excel 檔案的欄位名稱來調整
      const csvRow = mapExcelRowToCSV(row, index + 1);
      csvContent += csvRow + '\n';
    });
    
    // 確保輸出目錄存在
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    // 寫入 CSV 檔案（使用 UTF-8 BOM 以確保 Excel 正確顯示中文）
    fs.writeFileSync(outputPath, '\ufeff' + csvContent, 'utf8');
    
    console.log(`\n✅ 轉換完成！`);
    console.log(`   輸入檔案：${excelPath}`);
    console.log(`   輸出檔案：${outputPath}`);
    console.log(`   共轉換 ${jsonData.length} 筆資料`);
  } catch (error) {
    console.error('轉換失敗：', error);
    throw error;
  }
}

/**
 * 將 Excel 資料列映射到 CSV 格式
 * 需要根據實際 Excel 檔案的欄位名稱來調整
 */
function mapExcelRowToCSV(row: ExcelRow, index: number): string {
  // 這裡需要根據實際 Excel 檔案的欄位名稱來映射
  // 以下是常見的欄位名稱對應，可能需要調整
  
  // 嘗試不同的欄位名稱可能性
  const id = row['題號'] || row['ID'] || row['id'] || row['題目編號'] || index.toString();
  const content = row['題目'] || row['題目內容'] || row['content'] || row['問題'] || '';
  const optionA = row['選項A'] || row['A'] || row['optionA'] || row['答案A'] || '';
  const optionB = row['選項B'] || row['B'] || row['optionB'] || row['答案B'] || '';
  const optionC = row['選項C'] || row['C'] || row['optionC'] || row['答案C'] || '';
  const optionD = row['選項D'] || row['D'] || row['optionD'] || row['答案D'] || '';
  const correctAnswer = row['正確答案'] || row['答案'] || row['correctAnswer'] || row['正確選項'] || '';
  const explanation = row['詳解'] || row['解析'] || row['explanation'] || row['說明'] || '';
  const subject = row['科目'] || row['subject'] || row['類別'] || '理財規劃人員';
  const chapter = row['章節'] || row['chapter'] || row['單元'] || row['類別'] || '專業能力';
  
  // 清理資料並轉義 CSV 特殊字元
  const escapeCSV = (str: string): string => {
    if (!str) return '';
    const strValue = String(str).trim();
    // 如果包含逗號、引號或換行，需要用引號包圍
    if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
      return '"' + strValue.replace(/"/g, '""') + '"';
    }
    return strValue;
  };
  
  return [
    escapeCSV(id),
    escapeCSV(content),
    escapeCSV(optionA),
    escapeCSV(optionB),
    escapeCSV(optionC),
    escapeCSV(optionD),
    escapeCSV(correctAnswer),
    escapeCSV(explanation),
    escapeCSV(subject),
    escapeCSV(chapter),
  ].join(',');
}

// 執行轉換
const excelPath = path.join(__dirname, '../date/第34屆理財規劃人員專業能力.xlsx');
const outputPath = path.join(__dirname, '../assets/data/questions.csv');

if (fs.existsSync(excelPath)) {
  convertExcelToCSV(excelPath, outputPath);
} else {
  console.error(`找不到 Excel 檔案：${excelPath}`);
  process.exit(1);
}






