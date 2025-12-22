import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question } from '../types';
// 延遲導入 QuestionService 以避免循環依賴
// import QuestionService from './QuestionService';

const IMPORTED_QUESTIONS_KEY = '@quiz:importedQuestions';
const IMPORTED_INDEX_KEY = '@quiz:importedIndex';

// 匯入的題庫資料結構（2層結構）
export interface ImportedQuestionData {
  source?: string;
  importDate?: string;
  questions: Array<{
    Id?: string;
    Q?: string;
    A?: string;
    B?: string;
    C?: string;
    D?: string;
    E?: string;  // 複選題的 E 選項
    Ans?: string;
    Exp?: string;
    // 舊格式支援
    id?: string;
    content?: string;
    options?: {
      A?: string;
      B?: string;
      C?: string;
      D?: string;
      E?: string;  // 複選題的 E 選項
    };
    correctAnswer?: string;
    exp?: string;
    explanation?: string;
  }>;
}

// 從 source 字串解析出 testName, subject, series_no
export interface ParsedSource {
  testName: string;
  subject: string | null;
  series_no: string;
}

/**
 * 從 source 字串中解析出 testName, subject, series_no
 * 範例：IPAS_02中級_L21人工智慧技術應用與規劃_11411.xlsx
 */
export function parseSource(source: string): ParsedSource {
  let testName = '';
  let subject: string | null = null;
  let series_no = '';

  // 嘗試提取 testName（開頭的測驗名稱，例如 IPAS_02）
  const testNameMatch = source.match(/^([A-Z0-9_]+)/);
  if (testNameMatch) {
    testName = testNameMatch[1];
  }

  // 嘗試提取 subject（L 開頭的科目代碼，例如 L21）
  const subjectMatch = source.match(/_(L\d+)/);
  if (subjectMatch) {
    subject = subjectMatch[1];
  }

  // 嘗試提取 series_no（最後的數字，例如 11411）
  // 先移除副檔名
  const withoutExt = source.replace(/\.(json|xlsx|txt)$/i, '');
  const seriesMatch = withoutExt.match(/(\d+)$/);
  if (seriesMatch) {
    series_no = seriesMatch[1];
  }

  // 如果無法自動提取，使用預設值
  if (!testName) {
    testName = 'IMPORTED';
  }
  if (!series_no) {
    // 使用時間戳作為預設 series_no
    series_no = Date.now().toString();
  }

  return { testName, subject, series_no };
}

/**
 * 移除問題開頭的編號（例如 "1. " 或 "2 "）
 */
function removeQuestionNumberPrefix(text: string): string {
  if (!text) return text;
  // 匹配開頭的編號格式：數字 + 可選的點 + 空格
  // 例如："1. "、"2 "、"10. " 等
  return text.replace(/^\d+\.?\s+/, '');
}

/**
 * 將匯入的題目格式標準化
 */
function normalizeQuestion(
  q: ImportedQuestionData['questions'][0],
  index: number,
  testName: string,
  subject: string | null,
  series_no: string
): Question {
  const questionId = subject
    ? `${testName}_${subject}_${series_no}_${index + 1}`
    : `${testName}_${series_no}_${index + 1}`;

  // 移除問題開頭的編號
  const rawContent = String(q.Q || q.content || '');
  const cleanedContent = removeQuestionNumberPrefix(rawContent);

  // 處理 E 選項：優先使用 q.E，其次使用 q.options?.E
  // 與 QuestionService.ts 中的邏輯保持一致
  const EValue = (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') 
    ? String(q.E) 
    : (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '')
      ? String(q.options.E)
      : undefined;

  return {
    id: questionId,
    content: cleanedContent,
    A: String(q.A || q.options?.A || ''),
    B: String(q.B || q.options?.B || ''),
    C: String(q.C || q.options?.C || ''),
    D: String(q.D || q.options?.D || ''),
    E: EValue,  // 處理 E 選項（用於複選題）
    Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D' | 'E' | string,
    exp: String(q.Exp || q.exp || q.explanation || ''),
    questionNumber: index + 1,
    testName,
    subject: subject || undefined,
    series_no,
  };
}

/**
 * 從 URL 下載 JSON 檔案
 */
export async function downloadQuestionFile(url: string, timeout: number = 30000): Promise<ImportedQuestionData> {
  try {
    console.log(`📋 [downloadQuestionFile] 開始下載: ${url}`);
    
    // 創建帶超時的 fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`下載失敗: ${response.status} ${response.statusText}`);
      }
      
      console.log(`📋 [downloadQuestionFile] 開始解析 JSON`);
      const data = await response.json() as ImportedQuestionData;
      console.log(`✅ [downloadQuestionFile] 下載完成，題數: ${data.questions?.length || 0}`);
      return data;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        throw new Error('下載超時，請檢查網路連線或稍後再試');
      }
      throw fetchError;
    }
  } catch (error) {
    console.error('❌ [downloadQuestionFile] 下載題庫檔案失敗:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('下載失敗，請確認 URL 正確且網路連線正常');
  }
}

/**
 * 匯入題庫並保存到 AsyncStorage
 */
export async function importQuestionFile(
  data: ImportedQuestionData | any,
  testName: string,
  subject: string | null,
  series_no: string
): Promise<void> {
  try {
    // 處理不同的數據格式
    let questions: ImportedQuestionData['questions'] = [];
    
    // 如果 data 是數組，直接使用
    if (Array.isArray(data)) {
      questions = data;
    }
    // 如果 data 有 questions 屬性，使用它
    else if (data && Array.isArray(data.questions)) {
      questions = data.questions;
    }
    // 如果 data 是對象但沒有 questions，嘗試將整個對象視為單一題目
    else if (data && typeof data === 'object' && !Array.isArray(data)) {
      // 檢查是否可能是單一題目格式
      if (data.Q || data.content || data.id) {
        questions = [data];
      } else {
        throw new Error('無法識別的數據格式：缺少 questions 屬性或數據不是數組');
      }
    }
    else {
      throw new Error('無效的數據格式：數據必須是數組或包含 questions 屬性的對象');
    }

    if (questions.length === 0) {
      throw new Error('題庫中沒有題目');
    }

    // 標準化題目
    const normalizedQuestions = questions.map((q, index) =>
      normalizeQuestion(q, index, testName, subject, series_no)
    );

    // 建立檔案路徑
    const filePath = subject
      ? `questions/${testName}/${subject}/${series_no}.json`
      : `questions/${testName}/${series_no}.json`;

    // 建立題目檔案資料
    // 保存原始資料以便未來重新標準化（例如修復 E 選項問題）
    const questionFileData = {
      importDate: (data && typeof data === 'object' && !Array.isArray(data) ? data.importDate : undefined) || new Date().toISOString().split('T')[0],
      source: (data && typeof data === 'object' && !Array.isArray(data) ? data.source : undefined) || '',
      questions: normalizedQuestions,
      // 保存原始資料以便未來重新標準化
      rawQuestions: questions,
    };

    // 保存到 AsyncStorage（使用檔案路徑作為 key）
    await AsyncStorage.setItem(
      `${IMPORTED_QUESTIONS_KEY}:${filePath}`,
      JSON.stringify(questionFileData)
    );

    // 更新匯入索引
    await updateImportedIndex(filePath, testName, subject, series_no, normalizedQuestions.length);

    console.log(`✅ 成功匯入題庫: ${filePath} (${normalizedQuestions.length} 題)`);
  } catch (error) {
    console.error('匯入題庫失敗:', error);
    throw error;
  }
}

/**
 * 更新匯入索引
 */
async function updateImportedIndex(
  filePath: string,
  testName: string,
  subject: string | null,
  series_no: string,
  count: number
): Promise<void> {
  try {
    // 讀取現有的匯入索引
    const existingIndexData = await AsyncStorage.getItem(IMPORTED_INDEX_KEY);
    const indexData = existingIndexData
      ? JSON.parse(existingIndexData)
      : {
          questionFiles: [],
          testNames: [],
          subjects: [],
          series: [],
        };

    // 檢查是否已存在
    const existingIndex = indexData.questionFiles.findIndex(
      (f: any) => f.file === filePath
    );

    const fileInfo = {
      testName,
      subject: subject || '',
      series_no,
      file: filePath,
      count,
    };

    if (existingIndex >= 0) {
      // 更新現有項目
      indexData.questionFiles[existingIndex] = fileInfo;
    } else {
      // 新增項目
      indexData.questionFiles.push(fileInfo);
    }

    // 更新 testNames
    if (!indexData.testNames.find((t: any) => t.name === testName)) {
      indexData.testNames.push({
        id: `test-${testName}`,
        name: testName,
        totalQuestions: 0,
        completedQuestions: 0,
        completionPercentage: 0,
      });
    }

    // 更新 subjects（如果有 subject）
    if (subject) {
      const subjectId = `subject-${testName}-${subject}`;
      if (!indexData.subjects.find((s: any) => s.id === subjectId)) {
        indexData.subjects.push({
          id: subjectId,
          name: subject,
          testName,
          totalQuestions: 0,
          completedQuestions: 0,
          completionPercentage: 0,
        });
      }
    }

    // 更新 series
    const seriesId = subject
      ? `series-${testName}-${subject}-${series_no}`
      : `series-${testName}-${series_no}`;
    if (!indexData.series.find((s: any) => s.id === seriesId)) {
      indexData.series.push({
        id: seriesId,
        name: series_no,
        testName,
        subject: subject || '',
        totalQuestions: count,
        completedQuestions: 0,
        completionPercentage: 0,
      });
    }

    // 保存更新後的索引
    await AsyncStorage.setItem(IMPORTED_INDEX_KEY, JSON.stringify(indexData));
  } catch (error) {
    console.error('更新匯入索引失敗:', error);
    throw error;
  }
}

/**
 * 取得所有匯入的題庫檔案路徑
 */
export async function getImportedQuestionFiles(): Promise<string[]> {
  try {
    const indexData = await AsyncStorage.getItem(IMPORTED_INDEX_KEY);
    if (!indexData) {
      return [];
    }
    const data = JSON.parse(indexData);
    return data.questionFiles.map((f: any) => f.file);
  } catch (error) {
    console.error('取得匯入題庫檔案列表失敗:', error);
    return [];
  }
}

/**
 * 從檔案路徑解析 testName, subject, series_no（用於匯入的檔案）
 */
function parseImportedFilePath(filePath: string): { testName: string; subject: string | null; series_no: string } | null {
  // 新格式: questions/IPAS_01/L11/11401.json (三層結構)
  // 新格式: questions/NEW_CERT/20251216.json (兩層結構，沒有 subject)
  if (filePath.startsWith('questions/')) {
    const parts = filePath.replace(/^questions\//, '').split('/');
    if (parts.length === 3) {
      // 三層結構: testName/subject/series_no.json
      const [testName, subject, seriesFile] = parts;
      const series_no = seriesFile.replace(/\.json$/, '');
      return { testName, subject, series_no };
    } else if (parts.length === 2) {
      // 兩層結構: testName/series_no.json
      const [testName, seriesFile] = parts;
      const series_no = seriesFile.replace(/\.json$/, '');
      return { testName, subject: null, series_no };
    }
  }
  return null;
}

/**
 * 載入匯入的題目檔案
 * 如果題目缺少 E 選項，會嘗試從原始資料重新標準化
 */
export async function loadImportedQuestionFile(filePath: string): Promise<Question[]> {
  try {
    const data = await AsyncStorage.getItem(`${IMPORTED_QUESTIONS_KEY}:${filePath}`);
    if (!data) {
      return [];
    }
    const questionFileData = JSON.parse(data);
    let questions: Question[] = questionFileData.questions || [];
    
    // 檢查是否有題目缺少 E 選項但應該有（例如複選題）
    // 如果題目已經標準化過，就不需要重新處理
    // 但如果是在修復之前匯入的，可能需要重新標準化
    
    // 檢查是否有題目缺少 E 選項
    const needsNormalization = questions.some(q => {
      // 如果答案是複選題（包含逗號），但沒有 E 選項，可能需要檢查
      const ans = String(q.Ans || '');
      const isMultiple = ans.includes(',');
      // 如果答案是複選題且包含 E，但題目沒有 E 選項，需要重新標準化
      if (isMultiple && ans.includes('E') && (!q.E || q.E.trim() === '')) {
        return true;
      }
      return false;
    });
    
    // 如果需要重新標準化，且有原始資料，從原始資料重新標準化
    if (needsNormalization && questionFileData.rawQuestions) {
      const pathInfo = parseImportedFilePath(filePath);
      if (pathInfo) {
        const { testName, subject, series_no } = pathInfo;
        console.log(`🔄 [loadImportedQuestionFile] 檢測到題目缺少 E 選項，從原始資料重新標準化: ${filePath}`);
        
        // 從原始資料重新標準化
        const rawQuestions = questionFileData.rawQuestions;
        questions = rawQuestions.map((q: any, index: number) =>
          normalizeQuestion(q, index, testName, subject, series_no)
        );
        
        // 更新儲存的資料
        const updatedQuestionFileData = {
          ...questionFileData,
          questions: questions,
        };
        await AsyncStorage.setItem(
          `${IMPORTED_QUESTIONS_KEY}:${filePath}`,
          JSON.stringify(updatedQuestionFileData)
        );
        
        console.log(`✅ [loadImportedQuestionFile] 重新標準化完成，已更新儲存的資料`);
      }
    }
    
    return questions;
  } catch (error) {
    console.error('載入匯入題庫檔案失敗:', error);
    return [];
  }
}

/**
 * 合併匯入的索引到主索引
 */
export async function mergeImportedIndex(): Promise<void> {
  try {
    const importedIndexData = await AsyncStorage.getItem(IMPORTED_INDEX_KEY);
    if (!importedIndexData) {
      return;
    }

    const importedData = JSON.parse(importedIndexData);
    
    // 這裡可以選擇性地將匯入的索引合併到 QuestionService 的索引中
    // 由於 QuestionService 使用打包的 questions.json，我們暫時只保存到 AsyncStorage
    // 未來可以考慮動態載入機制
    console.log('✅ 匯入索引已保存到 AsyncStorage');
  } catch (error) {
    console.error('合併匯入索引失敗:', error);
  }
}

/**
 * 刪除匯入的題庫檔案
 */
export async function deleteImportedQuestionFile(filePath: string): Promise<void> {
  try {
    // 載入題目檔案以獲取所有題目 ID
    const questions = await loadImportedQuestionFile(filePath);
    
    // 延遲導入 QuestionService 以避免循環依賴
    const QuestionService = (await import('./QuestionService')).default;
    
    // 刪除所有相關題目的用戶答案（包括錯題本記錄）
    const userAnswers = await QuestionService.getUserAnswers();
    const updatedAnswers: Record<string, any> = { ...userAnswers };
    
    for (const question of questions) {
      if (updatedAnswers[question.id]) {
        // 從用戶答案中移除該題目
        delete updatedAnswers[question.id];
      }
    }
    
    // 保存更新後的用戶答案
    await AsyncStorage.setItem('@quiz:userAnswers', JSON.stringify(updatedAnswers));
    
    // 刪除題目檔案
    await AsyncStorage.removeItem(`${IMPORTED_QUESTIONS_KEY}:${filePath}`);
    
    // 從索引中移除
    const indexData = await AsyncStorage.getItem(IMPORTED_INDEX_KEY);
    if (indexData) {
      const data = JSON.parse(indexData);
      data.questionFiles = data.questionFiles.filter((f: any) => f.file !== filePath);
      
      // 檢查是否還有其他檔案使用相同的 testName
      const remainingFiles = data.questionFiles.filter((f: any) => {
        const pathParts = f.file.replace(/^questions\//, '').split('/');
        const testName = pathParts[0];
        const deletedPathParts = filePath.replace(/^questions\//, '').split('/');
        const deletedTestName = deletedPathParts[0];
        return testName === deletedTestName;
      });
      
      // 如果沒有其他檔案使用該 testName，從 testNames 中移除
      if (remainingFiles.length === 0) {
        const pathParts = filePath.replace(/^questions\//, '').split('/');
        const testName = pathParts[0];
        data.testNames = data.testNames.filter((t: any) => t.name !== testName);
      }
      
      // 檢查並清理 subjects 和 series
      const pathParts = filePath.replace(/^questions\//, '').split('/');
      const testName = pathParts[0];
      const subject = pathParts.length === 3 ? pathParts[1] : undefined;
      const series_no = pathParts.length === 2 
        ? pathParts[1].replace(/\.json$/, '')
        : pathParts[2]?.replace(/\.json$/, '') || '';
      
      if (subject) {
        // 檢查是否還有其他檔案使用相同的 subject
        const remainingSubjectFiles = data.questionFiles.filter((f: any) => {
          const fPathParts = f.file.replace(/^questions\//, '').split('/');
          return fPathParts[0] === testName && fPathParts[1] === subject;
        });
        
        if (remainingSubjectFiles.length === 0) {
          data.subjects = data.subjects.filter((s: any) => 
            !(s.testName === testName && s.name === subject)
          );
        }
      }
      
      // 移除 series
      const seriesId = subject
        ? `series-${testName}-${subject}-${series_no}`
        : `series-${testName}-${series_no}`;
      data.series = data.series.filter((s: any) => s.id !== seriesId);
      
      await AsyncStorage.setItem(IMPORTED_INDEX_KEY, JSON.stringify(data));
    }
    
    console.log(`✅ 成功刪除題庫: ${filePath}`);
  } catch (error) {
    console.error('刪除題庫失敗:', error);
    throw error;
  }
}


