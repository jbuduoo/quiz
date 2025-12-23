import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, UserAnswer, Chapter, TestName, Subject, Series, QuestionType } from '../types';
import { loadImportedQuestionFile, getImportedQuestionFiles } from './ImportService';
import { loadLocalQuestionFile } from '../utils/fileLoader';
import QuizLibraryConfigService from './QuizLibraryConfigService';

const USER_ANSWERS_KEY = '@quiz:userAnswers';
const CHAPTERS_KEY = '@quiz:chapters';
const DATA_VERSION_KEY = '@quiz:dataVersion';
const TEST_NAMES_KEY = '@quiz:testNames';
const SUBJECTS_KEY = '@quiz:subjects';
const SERIES_KEY = '@quiz:series';
const QUIZ_PROGRESS_KEY = '@quiz:quizProgress'; // 保存測驗進度

// 索引資料結構
interface IndexData {
  // 新格式：扁平化欄位（優先）
  dataVersion?: string;  // 資料格式版本（新格式）
  lastUpdated?: string;  // 最後更新時間（新格式）
  testName?: string;  // 根層級的 testName
  appName?: string;  // 應用程式名稱（新格式）
  enableImport?: boolean;  // 是否啟用匯入功能（新格式）
  enableTrash?: boolean;  // 是否啟用錯題本（新格式）
  enableFavor?: boolean;  // 是否啟用清除最愛功能（新格式）
  configVersion?: string;  // 配置版本（新格式，取代 appConfig.version）
  enabled?: boolean;  // 題庫是否啟用（新格式）
  displayName?: string;  // 題庫顯示名稱（新格式）
  displayOrder?: number;  // 題庫顯示順序（新格式）
  
  // 舊格式：嵌套結構（向後相容）
  metadata?: {
    version: string;
    lastUpdated: string;
  };
  appConfig?: {  // 應用程式配置（可選，可從 questions.json 或獨立檔案載入）
    appName: string;
    enableImport: boolean;
    enableTrash: boolean;
    enableFavor: boolean;
    questionsPath?: string;
    version: string;
  };
  quizLibraryConfig?: {  // 題庫配置（可選，可從 questions.json 或獨立檔案載入）
    testName: string;
    enabled: boolean;
    displayName: string;
    displayOrder: number;
  } | Array<{  // 支援物件或陣列格式（向後相容）
    testName: string;
    enabled: boolean;
    displayName: string;
    displayOrder: number;
  }>;
  
  // 通用欄位
  testNames?: TestName[];  // 可選，已廢棄，保留用於向後相容
  subjects?: Subject[];  // 可選，已廢棄，保留用於向後相容
  series?: Series[];  // 可選，已廢棄，保留用於向後相容
  questionFiles: Array<{
    testName?: string;  // 可選，如果沒有則使用根層級的 testName
    subject?: string;  // 可選，如果沒有則表示沒有科目分類
    series_no: string;
    displayName?: string;  // 顯示名稱（中文），用於列表顯示
    file: string;
    count: number;
  }>;
}

// 題目檔案資料結構（新格式：簡化版）
export interface QuestionFileData {
  importDate?: string;
  source?: string;
  questions: Question[];
  // 舊格式支援（向後相容）
  metadata?: {
    testName?: string;
    subject?: string;
    series_no?: string;
    sourceFile?: string;
    count?: number;
  };
}

// 快取已載入的題目檔案
const questionCache = new Map<string, Question[]>();

// 索引檔案映射（Metro bundler 需要靜態 require）
const indexMap: () => IndexData | any = () => require('../../assets/data/questions/questions.json');

/**
 * 展開 config 物件：如果資料有 config 物件，則將其內容展開到頂層（向後相容）
 * 同時處理扁平化結構和嵌套結構的轉換
 */
function expandConfig(data: any): IndexData {
  // 如果有 config 物件，展開它
  if (data && data.config && typeof data.config === 'object') {
    const { config, questionFiles, ...rest } = data;
    const expanded: any = {
      questionFiles: questionFiles || data.questionFiles,  // 保留 questionFiles
      ...rest,  // 保留其他頂層欄位（向後相容）
    };
    
    // 處理扁平化結構（新格式）
    if (config.dataVersion !== undefined) {
      expanded.dataVersion = config.dataVersion;
      expanded.lastUpdated = config.lastUpdated;
      expanded.testName = config.testName;
      expanded.appName = config.appName;
      expanded.enableImport = config.enableImport;
      expanded.enableTrash = config.enableTrash;
      expanded.enableFavor = config.enableFavor !== undefined ? config.enableFavor : false;
      expanded.configVersion = config.configVersion;
      expanded.enabled = config.enabled !== undefined ? config.enabled : true; // 預設為 true（啟用）
      expanded.displayName = config.displayName;
      expanded.displayOrder = config.displayOrder;
      
      // 同時建立舊格式結構以保持向後相容
      expanded.metadata = {
        version: config.dataVersion,
        lastUpdated: config.lastUpdated || new Date().toISOString(),
      };
      expanded.appConfig = {
        appName: config.appName,
        enableImport: config.enableImport,
        enableTrash: config.enableTrash,
        enableFavor: config.enableFavor !== undefined ? config.enableFavor : false,
        version: config.configVersion,
        questionsPath: config.configVersion,  // 使用 configVersion 作為 questionsPath
      };
      expanded.quizLibraryConfig = {
        testName: config.testName,
        enabled: config.enabled !== undefined ? config.enabled : true, // 預設為 true（啟用）
        displayName: config.displayName,
        displayOrder: config.displayOrder,
      };
    } else {
      // 舊格式：嵌套結構，直接展開
      Object.assign(expanded, config);
    }
    
    return expanded as IndexData;
  }
  // 如果沒有 config 物件，直接返回（向後相容舊格式）
  return data as IndexData;
}

// 載入索引檔案
async function loadIndexData(): Promise<IndexData | null> {
  console.log('📂 [loadIndexData] 開始載入索引資料');
  console.log('📂 [loadIndexData] 時間:', new Date().toISOString());
  
  const indexFileUrl = '/assets/assets/data/questions/questions.json';
  
  try {
    // 在 React Native 平台（iOS/Android），使用靜態 require
    // 注意：Metro bundler 需要靜態路徑
    if (Platform.OS !== 'web') {
      console.log('📂 [loadIndexData] 在 React Native 平台，嘗試使用 require 載入索引');
      try {
        const rawData = indexMap();
        const indexModule = expandConfig(rawData);
        console.log('📂 [loadIndexData] require 成功，檢查資料結構', {
          hasIndexModule: !!indexModule,
          hasQuestionFiles: !!indexModule?.questionFiles,
          questionFilesLength: indexModule?.questionFiles?.length
        });
        if (indexModule && indexModule.questionFiles) {
          console.log(`✅ [loadIndexData] 成功載入索引資料（${indexModule.questionFiles.length} 個題目檔案）`);
          return indexModule;
        } else {
          console.warn('⚠️ [loadIndexData] 索引資料結構不完整', {
            hasIndexModule: !!indexModule,
            hasQuestionFiles: !!indexModule?.questionFiles
          });
        }
      } catch (requireError) {
        console.error('❌ [loadIndexData] 無法使用 require 載入索引:', requireError);
        if (requireError instanceof Error) {
          console.error('❌ [loadIndexData] require 錯誤詳情:', requireError.message);
          console.error('❌ [loadIndexData] require 錯誤堆疊:', requireError.stack);
        } else {
          console.error('❌ [loadIndexData] require 錯誤類型:', typeof requireError);
          console.error('❌ [loadIndexData] require 錯誤內容:', requireError);
        }
      }
    }
    
    // 在 Web 平台，使用 fetch
    if (typeof window !== 'undefined') {
      console.log('📂 [loadIndexData] 在 Web 平台，嘗試使用 fetch 載入索引');
      try {
        console.log(`📂 [loadIndexData] 執行 fetch("${indexFileUrl}")`);
        const response = await fetch(indexFileUrl);
        console.log('📂 [loadIndexData] fetch 回應:', {
          ok: response.ok,
          status: response.status,
          statusText: response.statusText,
          contentType: response.headers.get('content-type')
        });
        if (response.ok) {
          const rawData = await response.json();
          const data = expandConfig(rawData);
          console.log('📂 [loadIndexData] fetch JSON 解析成功', {
            hasData: !!data,
            hasQuestionFiles: !!data?.questionFiles,
            questionFilesLength: data?.questionFiles?.length
          });
          if (data && data.questionFiles) {
            console.log(`✅ [loadIndexData] 成功從 Web 載入索引資料（${data.questionFiles.length} 個題目檔案）`);
            return data;
          }
        } else {
          console.error(`❌ [loadIndexData] fetch 回應失敗: ${response.status} ${response.statusText}`);
        }
      } catch (fetchError) {
        console.error('❌ [loadIndexData] 無法使用 fetch 載入索引:', fetchError);
        if (fetchError instanceof Error) {
          console.error('❌ [loadIndexData] fetch 錯誤詳情:', fetchError.message);
          console.error('❌ [loadIndexData] fetch 錯誤堆疊:', fetchError.stack);
        }
      }
    }
    
    console.error('❌ [loadIndexData] 所有載入索引的方法都失敗了');
    return null;
  } catch (error) {
    console.error('❌ [loadIndexData] 載入索引資料失敗:', error);
    if (error instanceof Error) {
      console.error('❌ [loadIndexData] 錯誤詳情:', error.message);
      console.error('❌ [loadIndexData] 錯誤堆疊:', error.stack);
    } else {
      console.error('❌ [loadIndexData] 錯誤類型:', typeof error);
      console.error('❌ [loadIndexData] 錯誤內容:', error);
    }
    return null;
  }
}

// 移除問題開頭的編號（例如 "1. " 或 "2 "）
function removeQuestionNumberPrefix(text: string): string {
  if (!text) return text;
  // 匹配開頭的編號格式：數字 + 可選的點 + 空格
  // 例如："1. "、"2 "、"10. " 等
  return text.replace(/^\d+\.?\s+/, '');
}

// 從檔案路徑解析 testName, subject, series_no
function parseFilePath(filePath: string): { testName: string; subject: string | null; series_no: string } | null {
  // 新格式: questions/IPAS_01/L11/11401.json (三層結構)
  // 新格式: questions/NEW_CERT/20251216.json (兩層結構，沒有 subject)
  // 舊格式: questions/IPAS_01_L11_11401.json (向後相容)
  
  // 檢查 filePath 是否有效
  if (!filePath || typeof filePath !== 'string') {
    console.error(`❌ [parseFilePath] 無效的檔案路徑: ${filePath}`);
    return null;
  }
  
  if (filePath.includes('/')) {
    // 新格式：資料夾結構
    // 嘗試匹配三層結構
    const threeLayerMatch = filePath.match(/questions\/([^/]+)\/([^/]+)\/([^/]+)\.json$/);
    if (threeLayerMatch) {
      const [, testName, subject, series_no] = threeLayerMatch;
      return { testName, subject, series_no };
    }
    
    // 嘗試匹配兩層結構（沒有 subject）
    const twoLayerMatch = filePath.match(/questions\/([^/]+)\/([^/]+)\.json$/);
    if (twoLayerMatch) {
      const [, testName, fileName] = twoLayerMatch;
      const series_no = fileName.replace('.json', '');
      return { testName, subject: null, series_no };
    }
  } else {
    // 舊格式：檔名包含所有資訊
    const match = filePath.match(/questions\/(IPAS_\d+)_(L\d+)_(\d+)\.json$/);
    if (match) {
      const [, testName, subject, series_no] = match;
      return { testName, subject, series_no };
    }
  }
  
  return null;
}

// 按需載入題目檔案
async function loadQuestionFile(filePath: string): Promise<Question[]> {
  // 檢查 filePath 是否有效
  if (!filePath || typeof filePath !== 'string') {
    console.error(`❌ [loadQuestionFile] 無效的檔案路徑: ${filePath}`);
    return [];
  }
  
  console.log(`🔍 [loadQuestionFile] 開始載入檔案: ${filePath}`);
  
  // 檢查快取
  if (questionCache.has(filePath)) {
    console.log(`📦 [loadQuestionFile] 從快取載入: ${filePath}`);
    return questionCache.get(filePath)!;
  }
  
  try {
    // 只載入 assets/data/questions 裡的資料，不從匯入題庫載入
    // 從路徑解析 testName, subject, series_no
    let pathInfo = parseFilePath(filePath);
    
    // 如果 parseFilePath 失敗，嘗試從索引資料中查找檔案資訊
    if (!pathInfo) {
      console.log(`ℹ️ [loadQuestionFile] 無法從路徑解析檔案資訊，嘗試從索引資料查找: ${filePath}`);
      try {
        const indexData = await loadIndexData();
        if (indexData && indexData.questionFiles) {
          const fileInfo = indexData.questionFiles.find(f => f.file === filePath);
          if (fileInfo) {
            pathInfo = {
              testName: fileInfo.testName || indexData.testName || '',
              subject: fileInfo.subject || null,  // 如果沒有 subject，設為 null
              series_no: fileInfo.series_no
            };
            console.log(`✅ [loadQuestionFile] 從索引資料找到檔案資訊:`, pathInfo);
          }
        }
      } catch (indexError) {
        console.warn(`⚠️ [loadQuestionFile] 無法從索引資料查找檔案資訊:`, indexError);
      }
    }
    
    if (!pathInfo) {
      console.error(`❌ [loadQuestionFile] 無法解析檔案路徑: ${filePath}`);
      return [];
    }
    
    const { testName, subject, series_no } = pathInfo;
    
    // 使用 loadLocalQuestionFile 載入題目檔案（直接讀取方式）
    console.log(`ℹ️ [loadQuestionFile] 使用 loadLocalQuestionFile 載入: ${filePath}`);
    try {
      // 如果 filePath 包含路徑分隔符，提取檔名；否則直接使用
      const fileName = filePath.includes('/') ? filePath.split('/').pop() || filePath : filePath;
      const localFileData = await loadLocalQuestionFile(fileName);
      
      if (localFileData) {
        // 處理載入的資料：可能是陣列格式或物件格式
        let questionsArray: any[] = [];
        if (Array.isArray(localFileData)) {
          questionsArray = localFileData;
        } else if (localFileData.questions && Array.isArray(localFileData.questions)) {
          questionsArray = localFileData.questions;
        }
        
        if (questionsArray.length > 0) {
          // 標準化題目格式（使用 pathInfo 中的變數）
          const finalTestName = testName;
          const finalSubject = subject === null ? null : subject;
          const finalSeriesNo = series_no;
          
          const normalizedQuestions = questionsArray.map((q: any, index: number) => {
            // 生成題目 ID：使用 series_no + 題目檔案中的 Id 欄位
            // 如果題目有 Id 欄位，使用它；否則使用 index + 1 作為備用
            const questionIdFromFile = q.Id || q.id || String(index + 1);
            const questionId = `${finalSeriesNo}_${questionIdFromFile}`;
            
            const rawContent = String(q.Q || q.content || '');
            const cleanedContent = removeQuestionNumberPrefix(rawContent);
            
            const EValue = (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') 
              ? String(q.E) 
              : (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '')
                ? String(q.options.E)
                : undefined;
            
            const normalizedQuestion: Question = {
              id: questionId,
              content: cleanedContent,
              A: String(q.A || q.options?.A || ''),
              B: String(q.B || q.options?.B || ''),
              C: String(q.C || q.options?.C || ''),
              D: String(q.D || q.options?.D || ''),
              E: EValue,
              Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D' | 'E' | string,
              exp: String(q.Exp || q.exp || q.explanation || ''),
              questionNumber: index + 1,
              testName: finalTestName,
              subject: finalSubject || undefined,
              series_no: finalSeriesNo,
              chapter: q.chapter || undefined,
              Type: q.Type as QuestionType | undefined,
            };
            return normalizedQuestion;
          });
          
          questionCache.set(filePath, normalizedQuestions);
          console.log(`✅ [loadQuestionFile] 使用 loadLocalQuestionFile 載入成功: ${filePath} (${normalizedQuestions.length} 題)`);
          return normalizedQuestions;
        }
      }
    } catch (localLoadError) {
      console.warn(`⚠️ [loadQuestionFile] loadLocalQuestionFile 載入失敗: ${filePath}`, localLoadError);
    }
    
    // 如果 loadLocalQuestionFile 失敗，在 Web 平台嘗試使用 fetch（作為備用方案）
    if (typeof window !== 'undefined') {
      try {
        // 對檔名進行 URL 編碼以支援中文檔名
        // 如果 filePath 包含路徑分隔符，則分割處理；否則直接編碼檔名
        let encodedFileName: string;
        if (filePath.includes('/')) {
          // 包含路徑分隔符：將路徑分割，只對檔名部分進行編碼
          const pathParts = filePath.split('/');
          const encodedParts = pathParts.map((part, index) => {
            // 最後一部分是檔名，需要編碼
            if (index === pathParts.length - 1) {
              return encodeURIComponent(part);
            }
            return part;
          });
          encodedFileName = encodedParts.join('/');
        } else {
          // 只是檔名：直接編碼
          encodedFileName = encodeURIComponent(filePath);
        }
        // Web 平台需要 /assets/assets/ 前綴（Metro bundler 會自動移除第一個 /assets/）
        const fetchPath = `/assets/assets/data/questions/${encodedFileName}`;
        
        console.log(`🌐 [loadQuestionFile] Web 平台 fetch 路徑: ${fetchPath} (原始: ${filePath})`);
        const response = await fetch(fetchPath);
        if (response.ok) {
          const data = await response.json() as QuestionFileData;
          if (data && data.questions) {
            // 從路徑或 metadata 取得 testName、subject、series_no
            const metadata = data.metadata || {};
            const finalTestName = metadata.testName || testName;
            // 如果 subject 為 null 或空字串（兩層結構），finalSubject 也為 null；否則使用 metadata 或 pathInfo 的 subject
            const finalSubject = (subject === null || subject === '') ? null : (metadata.subject || subject || null);
            const finalSeriesNo = metadata.series_no || series_no;
            
            // 為每個題目添加題號和 metadata 資訊，並確保所有欄位類型正確
            const normalizedQuestions = data.questions.map((q: any, index: number) => {
              // 生成題目 ID：使用 series_no + 題目檔案中的 Id 欄位
              // 如果題目有 Id 欄位，使用它；否則使用 index + 1 作為備用
              const questionIdFromFile = q.Id || q.id || String(index + 1);
              const questionId = `${finalSeriesNo}_${questionIdFromFile}`;
              
              // 支援新格式（Id, Q, Exp）和舊格式（id, content, exp）的映射
              // 移除問題開頭的編號
              const rawContent = String(q.Q || q.content || '');
              const cleanedContent = removeQuestionNumberPrefix(rawContent);
              
              const normalizedQuestion: Question = {
                id: questionId,
                content: cleanedContent,
                A: String(q.A || q.options?.A || ''),
                B: String(q.B || q.options?.B || ''),
                C: String(q.C || q.options?.C || ''),
                D: String(q.D || q.options?.D || ''),
                E: (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') 
                  ? String(q.E) 
                  : (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '')
                    ? String(q.options.E)
                    : undefined,
                Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D' | 'E' | string,
                exp: String(q.Exp || q.exp || q.explanation || ''),
                questionNumber: index + 1,
                testName: finalTestName,
                subject: finalSubject || undefined, // 如果沒有 subject，設為 undefined
                series_no: finalSeriesNo,
                chapter: q.chapter || undefined,
                // 支援 Type 欄位（新格式）
                Type: q.Type as QuestionType | undefined,
              };
              return normalizedQuestion;
            });
            questionCache.set(filePath, normalizedQuestions);
            console.log(`✅ 從 Web fetch 載入題目檔案: ${filePath} (${normalizedQuestions.length} 題)`);
            return normalizedQuestions;
          }
        }
      } catch (fetchError) {
        // 靜默失敗，因為已經嘗試過映射表載入
      }
    }
    
    console.warn(`⚠️ 無法載入題目檔案: ${filePath} (檔案不存在)`);
    return [];
  } catch (error) {
    console.warn(`⚠️ 載入題目檔案失敗 ${filePath}:`, error);
    // 確保錯誤不會導致應用程式崩潰
    if (error instanceof Error) {
      console.error(`錯誤詳情: ${error.message}`);
    }
    return [];
  }
}

class QuestionService {
  private indexData: IndexData | null = null;

  // 初始化資料
  async initializeData(): Promise<void> {
    console.log('🚀 [initializeData] 開始初始化資料');
    console.log('🚀 [initializeData] 時間:', new Date().toISOString());
    const currentVersion = '3.0.0'; // 當前版本：支援資料夾結構，簡化檔案格式
    
    try {
      console.log('📋 [initializeData] 讀取資料版本');
      const dataVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
      console.log(`📋 [initializeData] 當前資料版本: ${dataVersion}, 目標版本: ${currentVersion}`);
      
      // 載入索引資料
      console.log('📂 [initializeData] 開始載入索引資料');
      console.log('📂 [initializeData] 呼叫 loadIndexData()');
      this.indexData = await loadIndexData();
      console.log('📂 [initializeData] loadIndexData() 完成', {
        hasIndexData: !!this.indexData,
        questionFilesCount: this.indexData?.questionFiles?.length || 0
      });
      
      if (!this.indexData) {
        console.error('❌ [initializeData] 無法載入索引資料，嘗試從 AsyncStorage 恢復');
        // 嘗試從 AsyncStorage 恢復
        try {
          const savedTestNames = await AsyncStorage.getItem(TEST_NAMES_KEY);
          const savedSubjects = await AsyncStorage.getItem(SUBJECTS_KEY);
          const savedSeries = await AsyncStorage.getItem(SERIES_KEY);
          
          if (savedTestNames && savedSubjects && savedSeries) {
            console.log('✅ [initializeData] 從 AsyncStorage 恢復索引資料');
            this.indexData = {
              metadata: {
                version: currentVersion,
                lastUpdated: new Date().toISOString(),
              },
              testNames: savedTestNames ? JSON.parse(savedTestNames) : [],
              subjects: savedSubjects ? JSON.parse(savedSubjects) : [],
              series: savedSeries ? JSON.parse(savedSeries) : [],
              questionFiles: [],
            };
          } else {
            console.error('❌ [initializeData] AsyncStorage 中也沒有備份資料');
            // 即使沒有資料，也繼續執行，讓應用程式可以顯示錯誤訊息
          }
        } catch (recoveryError) {
          console.error('❌ [initializeData] 恢復索引資料失敗:', recoveryError);
          // 繼續執行，讓應用程式可以顯示錯誤訊息
        }
        
        // 如果還是沒有資料，返回（但不會拋出錯誤，讓應用程式繼續運行）
        if (!this.indexData) {
          console.error('❌ [initializeData] 無法載入或恢復索引資料，應用程式將使用空資料');
          return;
        }
      }
      
      console.log(`✅ [initializeData] 索引資料載入成功:`, {
        questionFilesCount: this.indexData.questionFiles.length,
        testName: this.indexData.testName
      });
      
      // 如果版本不同，清除舊資料（包括用戶答題記錄，因為 ID 格式已改變）
      if (dataVersion !== currentVersion) {
        console.log(`🔄 [initializeData] 版本不同，清除舊資料`);
        await AsyncStorage.removeItem(TEST_NAMES_KEY);
        await AsyncStorage.removeItem(SUBJECTS_KEY);
        await AsyncStorage.removeItem(SERIES_KEY);
        await AsyncStorage.removeItem(USER_ANSWERS_KEY); // 清除舊的答題記錄（ID 格式已改變）
        await AsyncStorage.removeItem(QUIZ_PROGRESS_KEY); // 清除舊的測驗進度
        await AsyncStorage.setItem(DATA_VERSION_KEY, currentVersion);
        console.log('✅ 已清除舊的用戶答題記錄和測驗進度（資料版本已更新）');
      }
      
      // 合併匯入的索引
      await this.mergeImportedIndex();
      
      // 儲存索引資料到 AsyncStorage（用於快速存取）
      // 如果存在這些欄位，則儲存；否則儲存空陣列
      await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(this.indexData.testNames || []));
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(this.indexData.subjects || []));
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(this.indexData.series || []));
      
      const existingAnswers = await AsyncStorage.getItem(USER_ANSWERS_KEY);
      if (!existingAnswers) {
        await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify({}));
      }
      
      // 延遲更新進度統計，避免阻塞初始化
      // 使用 setTimeout 讓應用程式先完成初始化，進度更新在背景進行
      // 增加延遲時間，確保應用程式完全啟動後再更新進度
      setTimeout(() => {
        this.updateProgress().catch(error => {
          console.error('❌ [initializeData] 更新進度統計失敗:', error);
        });
      }, 1000); // 增加延遲到 1 秒，確保應用程式完全啟動
      console.log('✅ [initializeData] 初始化完成');
    } catch (error) {
      console.error('❌ [initializeData] 初始化資料失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [initializeData] 錯誤詳情:', error.message);
        console.error('❌ [initializeData] 錯誤堆疊:', error.stack);
      }
      // 即使初始化失敗，也確保應用程式可以繼續運行
      // 嘗試從 AsyncStorage 載入已儲存的索引資料
      try {
        const savedTestNames = await AsyncStorage.getItem(TEST_NAMES_KEY);
        const savedSubjects = await AsyncStorage.getItem(SUBJECTS_KEY);
        const savedSeries = await AsyncStorage.getItem(SERIES_KEY);
        
        if (savedTestNames && savedSubjects && savedSeries) {
          console.log('✅ 從 AsyncStorage 恢復索引資料');
          // 建立一個基本的 indexData 結構
          this.indexData = {
            metadata: {
              version: currentVersion,
              lastUpdated: new Date().toISOString(),
            },
            testNames: savedTestNames ? JSON.parse(savedTestNames) : [],
            subjects: savedSubjects ? JSON.parse(savedSubjects) : [],
            series: savedSeries ? JSON.parse(savedSeries) : [],
            questionFiles: [],
          };
        }
      } catch (recoveryError) {
        console.error('恢復索引資料失敗:', recoveryError);
      }
    }
  }

  // 取得所有題目（載入所有題目檔案，用於錯題本等功能）
  async getAllQuestions(): Promise<Question[]> {
    if (!this.indexData) {
      this.indexData = await loadIndexData();
    }
    
    if (!this.indexData) {
      return [];
    }
    
    const allQuestions: Question[] = [];
    
    // 載入所有題目檔案
    // 支援兩種格式：
    // 1. 字串陣列：["file1.json", "file2.json"]
    // 2. 物件陣列：[{file: "file1.json", testName: "...", ...}]
    for (const fileInfo of this.indexData.questionFiles) {
      let filePath: string;
      
      // 檢查是字串還是物件
      if (typeof fileInfo === 'string') {
        filePath = fileInfo;
      } else if (fileInfo && typeof fileInfo === 'object' && 'file' in fileInfo) {
        filePath = fileInfo.file;
      } else {
        console.warn(`⚠️ [getAllQuestions] 無效的檔案資訊格式:`, fileInfo);
        continue;
      }
      
      const questions = await loadQuestionFile(filePath);
      allQuestions.push(...questions);
    }
    
    return allQuestions;
  }

  // 依章節取得題目
  async getQuestionsByChapter(chapterName: string): Promise<Question[]> {
    const allQuestions = await this.getAllQuestions();
    return allQuestions.filter(q => q.chapter === chapterName);
  }

  // 取得用戶答題記錄
  async getUserAnswers(): Promise<Record<string, UserAnswer>> {
    try {
      const data = await AsyncStorage.getItem(USER_ANSWERS_KEY);
      if (!data) {
        return {};
      }
      
      const parsed = JSON.parse(data);
      
      // 確保所有布林值都是真正的布林類型，而不是字串
      const normalized: Record<string, UserAnswer> = {};
      
      for (const [key, value] of Object.entries(parsed)) {
        if (value && typeof value === 'object') {
          const answerValue = value as any;
          
          normalized[key] = {
            ...answerValue,
            isCorrect: Boolean(answerValue.isCorrect),
            isAnswered: Boolean(answerValue.isAnswered),
            isFavorite: Boolean(answerValue.isFavorite),
            isInWrongBook: Boolean(answerValue.isInWrongBook),
            isUncertain: Boolean(answerValue.isUncertain),
            wrongCount: typeof answerValue.wrongCount === 'number' ? answerValue.wrongCount : 0,
          } as UserAnswer;
        }
      }
      
        return normalized;
    } catch (error) {
      console.error('❌ [getUserAnswers] 取得答題記錄失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [getUserAnswers] 錯誤詳情:', error.message);
        console.error('❌ [getUserAnswers] 錯誤堆疊:', error.stack);
      }
      return {};
    }
  }

  // 更新用戶答題記錄
  async updateUserAnswer(questionId: string, answer: Partial<UserAnswer>): Promise<void> {
    try {
      const userAnswers = await this.getUserAnswers();
      const existingAnswer = userAnswers[questionId] || {
        questionId,
        isCorrect: false,
        isAnswered: false,
        selectedAnswer: undefined,
        isFavorite: false,
        isInWrongBook: false,
        isUncertain: false,
        wrongCount: 0,
      };

      const updatedAnswer: UserAnswer = {
        ...existingAnswer,
        ...answer,
        questionId,
      };

      // 錯題本邏輯：錯題本和我的最愛是同一件事
      // 按下最愛 → 加入錯題本
      // 取消最愛 → 移除錯題本
      const previousIsInWrongBook = updatedAnswer.isInWrongBook;
      updatedAnswer.isInWrongBook = updatedAnswer.isFavorite;
      
      // 記錄同步狀態（僅在狀態改變時記錄）
      if (previousIsInWrongBook !== updatedAnswer.isInWrongBook) {
        console.log(`📋 [updateUserAnswer] 同步錯題本狀態: isFavorite=${updatedAnswer.isFavorite} → isInWrongBook=${updatedAnswer.isInWrongBook}`);
      }

      userAnswers[questionId] = updatedAnswer;
      await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify(userAnswers));

      // 更新進度
      await this.updateProgress();
    } catch (error) {
      console.error('更新答題記錄失敗:', error);
    }
  }

  // 切換收藏狀態（同步更新錯題本）
  async toggleFavorite(questionId: string): Promise<boolean> {
    try {
      console.log(`📋 [toggleFavorite] 開始切換收藏狀態，題目ID: ${questionId}`);
      console.log(`📋 [toggleFavorite] 平台: ${Platform.OS}`);
      const userAnswers = await this.getUserAnswers();
      const existingAnswer = userAnswers[questionId] || {
        questionId,
        isCorrect: false,
        isAnswered: false,
        selectedAnswer: undefined,
        isFavorite: false,
        isInWrongBook: false,
        isUncertain: false,
        wrongCount: 0,
      };

      console.log(`📋 [toggleFavorite] 當前收藏狀態: ${existingAnswer.isFavorite}`);
      const newFavoriteStatus = !existingAnswer.isFavorite;
      console.log(`📋 [toggleFavorite] 新收藏狀態: ${newFavoriteStatus}`);
      
      // 同步更新錯題本狀態：收藏 = 加入錯題本，取消收藏 = 移除錯題本
      console.log(`📋 [toggleFavorite] 更新答題記錄，isFavorite: ${newFavoriteStatus}, isInWrongBook: ${newFavoriteStatus}`);
      await this.updateUserAnswer(questionId, {
        ...existingAnswer,
        isFavorite: newFavoriteStatus,
        isInWrongBook: newFavoriteStatus, // 收藏與錯題本同步
      });

      // 驗證更新結果
      const updatedAnswers = await this.getUserAnswers();
      const updatedAnswer = updatedAnswers[questionId];
      console.log(`✅ [toggleFavorite] 更新完成，驗證結果:`, {
        isFavorite: updatedAnswer?.isFavorite,
        isInWrongBook: updatedAnswer?.isInWrongBook,
        同步: updatedAnswer?.isFavorite === updatedAnswer?.isInWrongBook
      });

      return newFavoriteStatus;
    } catch (error) {
      console.error('❌ [toggleFavorite] 切換收藏狀態失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [toggleFavorite] 錯誤訊息:', error.message);
        console.error('❌ [toggleFavorite] 錯誤堆疊:', error.stack);
      }
      return false;
    }
  }

  // 切換不確定狀態
  async toggleUncertain(questionId: string): Promise<boolean> {
    try {
      const userAnswers = await this.getUserAnswers();
      const existingAnswer = userAnswers[questionId] || {
        questionId,
        isCorrect: false,
        isAnswered: false,
        selectedAnswer: undefined,
        isFavorite: false,
        isInWrongBook: false,
        isUncertain: false,
        wrongCount: 0,
      };

      const newUncertainStatus = !existingAnswer.isUncertain;
      await this.updateUserAnswer(questionId, {
        ...existingAnswer,
        isUncertain: newUncertainStatus,
      });

      return newUncertainStatus;
    } catch (error) {
      console.error('切換不確定狀態失敗:', error);
      return false;
    }
  }

  // 從錯題本移除（同時清除收藏狀態）
  async removeFromWrongBook(questionId: string): Promise<void> {
    try {
      await this.updateUserAnswer(questionId, {
        isInWrongBook: false,
        isFavorite: false,  // 取消收藏
        isUncertain: false,  // 清除不確定記錄
        // 注意：查詢問題和問題回報目前沒有專門的記錄欄位
        // 如果未來添加了相關欄位，也需要在這裡清除
      });
    } catch (error) {
      console.error('從錯題本移除失敗:', error);
    }
  }

  // 取得所有章節
  async getChapters(): Promise<Chapter[]> {
    try {
      const data = await AsyncStorage.getItem(CHAPTERS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('取得章節失敗:', error);
      return [];
    }
  }

  // 更新章節進度
  async updateChapterProgress(): Promise<void> {
    try {
      const userAnswers = await this.getUserAnswers();
      const allQuestions = await this.getAllQuestions();

      const chapterMap = new Map<string, { name: string; subject: string; questions: Question[] }>();
      
      allQuestions.forEach(q => {
        if (q.chapter) {
          if (!chapterMap.has(q.chapter)) {
            chapterMap.set(q.chapter, {
              name: q.chapter,
              subject: q.subject || '未知科目',
              questions: [],
            });
          }
          chapterMap.get(q.chapter)!.questions.push(q);
        }
      });

      const chapters: Chapter[] = [];
      let chapterIndex = 1;
      chapterMap.forEach((chapterData, chapterName) => {
        const completedQuestions = chapterData.questions.filter(q => {
          const answer = userAnswers[q.id];
          return Boolean(answer?.isAnswered);
        }).length;

        chapters.push({
          id: `chapter${chapterIndex}`,
          name: chapterName,
          subject: chapterData.subject,
          totalQuestions: chapterData.questions.length,
          completedQuestions,
          completionPercentage: chapterData.questions.length > 0
            ? Math.round((completedQuestions / chapterData.questions.length) * 100)
            : 0,
        });
        chapterIndex++;
      });

      await AsyncStorage.setItem(CHAPTERS_KEY, JSON.stringify(chapters));
    } catch (error) {
      console.error('更新章節進度失敗:', error);
    }
  }

  // 取得錯題本題目（只顯示收藏的題目）
  async getWrongBookQuestions(filter?: {
    subject?: string;
    testName?: string;
    onlyWrong?: boolean;
    onlyFavorite?: boolean;
  }): Promise<Question[]> {
    try {
      const allQuestions = await this.getAllQuestions();
      const userAnswers = await this.getUserAnswers();

      let filteredQuestions = allQuestions.filter(q => {
        const answer = userAnswers[q.id];
        if (!answer) return false;

        // 過濾 testName
        if (filter?.testName && q.testName !== filter.testName) return false;
        
        // 過濾 subject
        if (filter?.subject) {
          if (q.subject !== filter.subject) return false;
          // 如果題目沒有 subject 但篩選條件有指定 subject，則過濾掉
          if (!q.subject) return false;
        }
        
        // 錯題本只顯示收藏的題目（收藏和錯題本是同步的）
        const isFavorite = Boolean(answer.isFavorite);
        
        // 如果題目沒有收藏，則過濾掉
        if (!isFavorite) return false;
        
        // 如果指定 onlyWrong，則只顯示收藏中答錯的題目
        if (filter?.onlyWrong && Boolean(answer.isCorrect)) return false;

        return true;
      });

      // 確保題目列表去重（基於 questionId）
      const uniqueQuestionsMap = new Map<string, Question>();
      filteredQuestions.forEach(q => {
        if (!uniqueQuestionsMap.has(q.id)) {
          uniqueQuestionsMap.set(q.id, q);
        }
      });

      return Array.from(uniqueQuestionsMap.values());
    } catch (error) {
      console.error('取得錯題本題目失敗:', error);
      return [];
    }
  }

  // 取得錯題本統計（只統計收藏的題目）
  async getWrongBookStats(): Promise<{
    total: number;
    wrongCount: number;
    favoriteCount: number;
  }> {
    try {
      const allQuestions = await this.getAllQuestions();
      const userAnswers = await this.getUserAnswers();

      let wrongCount = 0;
      let favoriteCount = 0;
      let total = 0;

      allQuestions.forEach(q => {
        const answer = userAnswers[q.id];
        if (!answer) return;
        
        const isFavorite = Boolean(answer.isFavorite);
        
        // 統計錯題本中的題目（只統計收藏的題目）
        if (isFavorite) {
          total++;
          favoriteCount++;
          
          // 統計收藏中答錯的題數
          if (Boolean(answer.isAnswered) && !Boolean(answer.isCorrect)) {
            wrongCount++;
          }
        }
      });

      return { total, wrongCount, favoriteCount };
    } catch (error) {
      console.error('取得錯題本統計失敗:', error);
      return { total: 0, wrongCount: 0, favoriteCount: 0 };
    }
  }

  // 依測驗名稱、科目、期數取得題目（按需載入）
  async getQuestionsByTestNameSubjectSeries(
    testName: string,
    subject: string | null,
    series_no: string
  ): Promise<Question[]> {
    if (!this.indexData) {
      this.indexData = await loadIndexData();
    }
    
    if (!this.indexData) {
      return [];
    }
    
    // 找到對應的題目檔案
    // 如果 subject 為 null 或空字串，表示沒有科目
    // 如果 questionFiles 中沒有 testName，則使用根層級的 testName
    const rootTestName = this.indexData.testName;
    const fileInfo = this.indexData.questionFiles.find(
      f => {
        const fileTestName = f.testName || rootTestName;
        // 如果 subject 為 null，則匹配沒有 subject 的檔案；否則匹配相同 subject
        const subjectMatch = subject 
          ? (f.subject === subject)
          : (!f.subject || f.subject === '');
        return fileTestName === testName && subjectMatch && f.series_no === series_no;
      }
    );
    
    if (!fileInfo) {
      const subjectDisplay = subject || '(無科目)';
      console.warn(`找不到題目檔案: ${testName} / ${subjectDisplay} / ${series_no}`);
      return [];
    }
    
    // 載入題目檔案
    return await loadQuestionFile(fileInfo.file);
  }

  // 取得所有測驗名稱（僅返回啟用的題庫）
  async getTestNames(): Promise<TestName[]> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      // 取得所有 testNames
      let allTestNames: TestName[] = [];
      if (this.indexData) {
        allTestNames = this.indexData.testNames || [];
      } else {
        // 從 AsyncStorage 讀取
        const data = await AsyncStorage.getItem(TEST_NAMES_KEY);
        allTestNames = data ? JSON.parse(data) : [];
      }
      
      // 如果沒有 testNames，返回空陣列
      if (allTestNames.length === 0) {
        return [];
      }
      
      // 取得啟用的 testName 列表
      try {
        const enabledTestNames = await QuizLibraryConfigService.getEnabledTestNames();
        
        // 如果沒有配置或配置為空，返回所有 testNames（向後相容）
        if (enabledTestNames.length === 0) {
          console.log('⚠️ [getTestNames] 沒有啟用的題庫配置，返回所有題庫（向後相容）');
          return allTestNames;
        }
        
        // 過濾只返回啟用的 testNames，保持原始順序（即 questionFiles 的順序）
        const filteredTestNames = allTestNames.filter(testName => 
          enabledTestNames.includes(testName.name)
        );
        
        console.log(`✅ [getTestNames] 過濾後返回 ${filteredTestNames.length}/${allTestNames.length} 個啟用的題庫（已按 questionFiles 順序）`);
        return filteredTestNames;
      } catch (configError) {
        console.warn('⚠️ [getTestNames] 無法載入題庫配置，返回所有題庫（向後相容）:', configError);
        // 如果載入配置失敗，返回所有 testNames（向後相容）
        return allTestNames;
      }
    } catch (error) {
      console.error('取得測驗名稱失敗:', error);
      return [];
    }
  }

  // 依測驗名稱取得科目列表
  async getSubjectsByTestName(testName: string): Promise<Subject[]> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (this.indexData && this.indexData.subjects) {
        return this.indexData.subjects.filter(s => s.testName === testName);
      }
      
      const data = await AsyncStorage.getItem(SUBJECTS_KEY);
      if (data) {
        const allSubjects: Subject[] = JSON.parse(data);
        return allSubjects.filter(s => s.testName === testName);
      }
      
      return [];
    } catch (error) {
      console.error('取得科目列表失敗:', error);
      return [];
    }
  }

  // 取得所有科目
  async getAllSubjects(): Promise<Subject[]> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (this.indexData) {
        return this.indexData.subjects || [];
      }
      
      const data = await AsyncStorage.getItem(SUBJECTS_KEY);
      return data ? JSON.parse(data) : [];
    } catch (error) {
      console.error('取得所有科目失敗:', error);
      return [];
    }
  }

  // 依測驗名稱和科目取得期數列表
  async getSeriesByTestNameAndSubject(
    testName: string,
    subject: string
  ): Promise<Series[]> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (this.indexData && this.indexData.series) {
        return this.indexData.series.filter(
          s => s.testName === testName && s.subject === subject
        );
      }
      
      const data = await AsyncStorage.getItem(SERIES_KEY);
      if (data) {
        const allSeries: Series[] = JSON.parse(data);
        return allSeries.filter(
          s => s.testName === testName && s.subject === subject
        );
      }
      
      return [];
    } catch (error) {
      console.error('取得期數列表失敗:', error);
      return [];
    }
  }

  // 依測驗名稱取得期數列表（沒有科目）
  async getSeriesByTestNameOnly(testName: string): Promise<Series[]> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (this.indexData && this.indexData.series) {
        return this.indexData.series.filter(
          s => s.testName === testName && (!s.subject || s.subject === '')
        );
      }
      
      const data = await AsyncStorage.getItem(SERIES_KEY);
      if (data) {
        const allSeries: Series[] = JSON.parse(data);
        return allSeries.filter(
          s => s.testName === testName && (!s.subject || s.subject === '')
        );
      }
      
      return [];
    } catch (error) {
      console.error('取得期數列表失敗:', error);
      return [];
    }
  }

  // 取得期數的顯示名稱（從 questionFiles 中查找 displayName）
  async getSeriesDisplayName(
    series_no: string,
    testName?: string | null,
    subject?: string | null
  ): Promise<string | null> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (this.indexData && this.indexData.questionFiles) {
        // 查找對應的 questionFile
        // 如果 questionFiles 中沒有 testName，則使用根層級的 testName
        const rootTestName = this.indexData.testName;
        const fileInfo = this.indexData.questionFiles.find(f => {
          const matchSeries = f.series_no === series_no;
          const fileTestName = f.testName || rootTestName;
          const matchTestName = !testName || fileTestName === testName;
          // 如果 subject 為 null，則匹配沒有 subject 的檔案；否則匹配相同 subject
          const matchSubject = !subject 
            ? (!f.subject || f.subject === '')
            : (f.subject === subject);
          return matchSeries && matchTestName && matchSubject;
        });
        
        // 如果找到且有關聯的 displayName，則返回 displayName
        if (fileInfo?.displayName) {
          return fileInfo.displayName;
        }
      }
      
      return null;
    } catch (error) {
      console.error('取得期數顯示名稱失敗:', error);
      return null;
    }
  }

  // 更新進度統計
  async updateProgress(): Promise<void> {
    console.log('📊 [updateProgress] 開始更新進度統計');
    try {
      if (!this.indexData) {
        console.log('📊 [updateProgress] 索引資料不存在，重新載入');
        this.indexData = await loadIndexData();
      }
      
      if (!this.indexData) {
        console.error('❌ [updateProgress] 無法載入索引資料');
        return;
      }
      
      console.log(`📊 [updateProgress] 索引資料: ${this.indexData.questionFiles.length} 個檔案`);
      const userAnswers = await this.getUserAnswers();
      console.log(`📊 [updateProgress] 用戶答案: ${Object.keys(userAnswers).length} 筆`);
      
      // 更新進度統計
      // 注意：testNames, subjects, series 欄位已廢棄，不再更新
      // 如果這些欄位存在，則更新；否則跳過
      if (this.indexData.testNames && this.indexData.testNames.length > 0) {
        const rootTestName = this.indexData.testName;
        const updatedTestNames = await Promise.all(
          (this.indexData.testNames || []).map(async testName => {
            const relatedFiles = this.indexData!.questionFiles.filter(
              f => {
                const fileTestName = f.testName || rootTestName;
                return fileTestName === testName.name;
              }
            );
            
            let totalQuestions = 0;
            let completedQuestions = 0;
            
            for (const fileInfo of relatedFiles) {
              const questions = await loadQuestionFile(fileInfo.file);
              totalQuestions += questions.length;
              completedQuestions += questions.filter(q => {
                const answer = userAnswers[q.id];
                return Boolean(answer?.isAnswered);
              }).length;
            }
            
            return {
              ...testName,
              totalQuestions,
              completedQuestions,
              completionPercentage: totalQuestions > 0
                ? Math.round((completedQuestions / totalQuestions) * 100)
                : 0,
            };
          })
        );
        await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(updatedTestNames));
        this.indexData.testNames = updatedTestNames;
      }
      
      if (this.indexData.subjects && this.indexData.subjects.length > 0) {
        const rootTestName = this.indexData.testName;
        const updatedSubjects = await Promise.all(
          (this.indexData.subjects || []).map(async (subject) => {
            const relatedFiles = this.indexData!.questionFiles.filter(
              f => {
                const fileTestName = f.testName || rootTestName;
                return fileTestName === subject.testName && (f.subject === subject.name || (!f.subject && subject.name === ''));
              }
            );
            
            let totalQuestions = 0;
            let completedQuestions = 0;
            
            for (const fileInfo of relatedFiles) {
              const questions = await loadQuestionFile(fileInfo.file);
              totalQuestions += questions.length;
              completedQuestions += questions.filter(q => {
                const answer = userAnswers[q.id];
                return Boolean(answer?.isAnswered);
              }).length;
            }
            
            return {
              ...subject,
              totalQuestions,
              completedQuestions,
              completionPercentage: totalQuestions > 0
                ? Math.round((completedQuestions / totalQuestions) * 100)
                : 0,
            };
          })
        );
        await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
        this.indexData.subjects = updatedSubjects;
      }
      
      if (this.indexData.series && this.indexData.series.length > 0) {
        const rootTestName = this.indexData.testName;
        const updatedSeries = await Promise.all(
          (this.indexData.series || []).map(async (series) => {
            const fileInfo = this.indexData!.questionFiles.find(
              f => {
                const fileTestName = f.testName || rootTestName;
                const subjectMatch = series.subject 
                  ? (f.subject === series.subject)
                  : (!f.subject || f.subject === '');
                return fileTestName === series.testName && subjectMatch && f.series_no === series.name;
              }
            );
            
            if (!fileInfo) {
              return series;
            }
            
            const questions = await loadQuestionFile(fileInfo.file);
            const completedQuestions = questions.filter(q => {
              const answer = userAnswers[q.id];
              return Boolean(answer?.isAnswered);
            }).length;
            
            const correctQuestions = questions.filter(q => {
              const answer = userAnswers[q.id];
              return Boolean(answer?.isCorrect);
            }).length;
            
            const allAnswered = completedQuestions === questions.length && questions.length > 0;
            let score = series.score;
            
            if (allAnswered) {
              score = Math.round((correctQuestions / questions.length) * 100);
            }
            
            return {
              ...series,
              totalQuestions: questions.length,
              completedQuestions,
              completionPercentage: questions.length > 0
                ? Math.round((completedQuestions / questions.length) * 100)
                : 0,
              score: score,
              correctCount: correctQuestions,
            };
          })
        );
        await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(updatedSeries));
        this.indexData.series = updatedSeries;
      }
      
      console.log(`✅ [updateProgress] 進度更新完成`);
      console.log(`✅ [updateProgress] 進度更新完成`);
    } catch (error) {
      console.error('❌ [updateProgress] 更新進度統計失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [updateProgress] 錯誤詳情:', error.message);
        console.error('❌ [updateProgress] 錯誤堆疊:', error.stack);
      } else {
        console.error('❌ [updateProgress] 未知錯誤類型:', typeof error, error);
      }
    }
  }

  // 保存測驗分數
  async saveQuizScore(
    testName: string,
    subject: string | null,
    series_no: string,
    score: number
  ): Promise<void> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (!this.indexData) {
        return;
      }
      
      // 更新 series 的分數（使用 name 欄位來匹配 series_no）
      // 如果 subject 為 null，匹配沒有 subject 的 series
      // 注意：series 欄位已廢棄，如果不存在則跳過
      if (this.indexData.series && this.indexData.series.length > 0) {
        const seriesIndex = this.indexData.series.findIndex(
          s => s.testName === testName && 
               (subject !== null 
                 ? s.subject === subject 
                 : (!s.subject || s.subject === '')) && 
               s.name === series_no
        );
        
        if (seriesIndex !== -1) {
          this.indexData.series[seriesIndex].score = score;
          
          // 保存到 AsyncStorage
          await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(this.indexData.series));
        }
      }
    } catch (error) {
      console.error('保存測驗分數失敗:', error);
    }
  }

  // 保存測驗進度（當前題目索引）
  async saveQuizProgress(
    testName: string,
    subject: string | null,
    series_no: string,
    currentIndex: number
  ): Promise<void> {
    try {
      const progressData = await this.getQuizProgress();
      // 如果沒有 subject，使用空字串
      const quizKey = subject 
        ? `${testName}_${subject}_${series_no}`
        : `${testName}_${series_no}`;
      progressData[quizKey] = currentIndex;
      await AsyncStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progressData));
    } catch (error) {
      console.error('保存測驗進度失敗:', error);
    }
  }

  // 取得測驗進度（當前題目索引）
  async getQuizProgress(): Promise<Record<string, number>> {
    try {
      const data = await AsyncStorage.getItem(QUIZ_PROGRESS_KEY);
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('取得測驗進度失敗:', error);
      return {};
    }
  }

  // 取得特定測驗的進度
  async getQuizProgressByKey(
    testName: string,
    subject: string | null,
    series_no: string
  ): Promise<number | null> {
    try {
      const progressData = await this.getQuizProgress();
      // 如果沒有 subject，使用空字串
      const quizKey = subject 
        ? `${testName}_${subject}_${series_no}`
        : `${testName}_${series_no}`;
      return progressData[quizKey] ?? null;
    } catch (error) {
      console.error('取得測驗進度失敗:', error);
      return null;
    }
  }

  // 清除測驗進度（當測驗完成時）
  async clearQuizProgress(
    testName: string,
    subject: string | null,
    series_no: string
  ): Promise<void> {
    try {
      const progressData = await this.getQuizProgress();
      // 如果沒有 subject，使用空字串
      const quizKey = subject 
        ? `${testName}_${subject}_${series_no}`
        : `${testName}_${series_no}`;
      delete progressData[quizKey];
      await AsyncStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progressData));
    } catch (error) {
      console.error('清除測驗進度失敗:', error);
    }
  }

  // 清空指定期數的所有答題記錄（用於重新測驗）
  async clearSeriesAnswers(
    testName: string,
    subject: string | null,
    series_no: string
  ): Promise<void> {
    try {
      const questions = await this.getQuestionsByTestNameSubjectSeries(
        testName,
        subject,
        series_no
      );
      const userAnswers = await this.getUserAnswers();
      
      // 清空該期數所有題目的答題記錄（保留收藏狀態）
      questions.forEach(question => {
        if (userAnswers[question.id]) {
          const existingAnswer = userAnswers[question.id];
          const isFavorite = Boolean(existingAnswer.isFavorite);
          // 保留收藏狀態，但清空所有答題相關的記錄
          // 錯題本狀態應該與收藏狀態同步
          userAnswers[question.id] = {
            questionId: question.id,
            isCorrect: false,
            isAnswered: false,
            selectedAnswer: undefined,
            isFavorite: isFavorite, // 保留收藏狀態
            isInWrongBook: isFavorite, // 錯題本狀態與收藏狀態同步
            isUncertain: false, // 清空不確定標記
            wrongCount: 0, // 重置錯誤次數
          };
        }
      });
      
      await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify(userAnswers));
      
      // 清除該期數的測驗進度
      await this.clearQuizProgress(testName, subject, series_no);
      
      // 更新進度統計
      await this.updateProgress();
    } catch (error) {
      console.error('清空期數答題記錄失敗:', error);
    }
  }

  // 清空指定檔案的所有答題記錄（用於直接檔案）
  async clearFileAnswers(fileName: string): Promise<void> {
    try {
      console.log(`🔄 [QuestionService] clearFileAnswers: 開始清空檔案答題記錄`, { fileName });
      
      const userAnswers = await this.getUserAnswers();
      console.log(`📋 [QuestionService] clearFileAnswers: 當前總答題記錄數`, {
        totalAnswers: Object.keys(userAnswers).length,
      });
      
      // 對於匯入的檔案（以 questions/ 開頭），需要載入題目來獲取實際的題目 ID
      let questionIds: string[] = [];
      
      if (fileName.startsWith('questions/')) {
        // 匯入的檔案：載入題目以獲取實際的題目 ID
        console.log(`📂 [QuestionService] clearFileAnswers: 匯入檔案，載入題目以獲取 ID`);
        const { loadImportedQuestionFile } = await import('./ImportService');
        const questions = await loadImportedQuestionFile(fileName);
        questionIds = questions.map(q => q.id);
        console.log(`📋 [QuestionService] clearFileAnswers: 從題目載入的 ID`, {
          questionCount: questions.length,
          questionIds: questionIds.slice(0, 5),
          allQuestionIds: questionIds,
        });
        
        // 檢查這些 ID 是否在用戶答案中存在
        const existingQuestionIds = questionIds.filter(id => userAnswers[id]);
        console.log(`🔍 [QuestionService] clearFileAnswers: 檢查題目 ID 是否存在於用戶答案中`, {
          totalQuestionIds: questionIds.length,
          existingQuestionIds: existingQuestionIds.length,
          existingIds: existingQuestionIds.slice(0, 5),
          allUserAnswerKeys: Object.keys(userAnswers).slice(0, 10),
        });
        
        // 使用存在的題目 ID
        questionIds = existingQuestionIds;
      } else {
        // 本地打包的檔案：使用檔案名稱匹配
        questionIds = Object.keys(userAnswers).filter(id => id.startsWith(`${fileName}_`));
        console.log(`🔍 [QuestionService] clearFileAnswers: 本地檔案，使用檔案名稱匹配`, {
          fileName,
          questionIdsCount: questionIds.length,
          questionIds: questionIds.slice(0, 5),
        });
      }
      
      console.log(`🔍 [QuestionService] clearFileAnswers: 找到相關題目`, {
        fileName,
        questionIdsCount: questionIds.length,
        questionIds: questionIds.slice(0, 5), // 只顯示前5個
      });
      
      let clearedCount = 0;
      let favoritePreservedCount = 0;
      
      // 清空這些題目的答題記錄（保留收藏狀態）
      questionIds.forEach(questionId => {
        const existingAnswer = userAnswers[questionId];
        if (existingAnswer) {
          const isFavorite = Boolean(existingAnswer.isFavorite);
          const wasAnswered = existingAnswer.isAnswered;
          const wasCorrect = existingAnswer.isCorrect;
          
          userAnswers[questionId] = {
            questionId,
            isCorrect: false,
            isAnswered: false,
            selectedAnswer: undefined,
            isFavorite: isFavorite, // 保留收藏狀態
            isInWrongBook: isFavorite, // 錯題本狀態與收藏狀態同步
            isUncertain: false, // 清空不確定標記
            wrongCount: 0, // 重置錯誤次數
          };
          
          clearedCount++;
          if (isFavorite) {
            favoritePreservedCount++;
          }
          
          // 記錄前3個題目的詳細資訊
          if (clearedCount <= 3) {
            console.log(`📝 [QuestionService] clearFileAnswers: 清空題目 ${clearedCount}`, {
              questionId,
              wasAnswered,
              wasCorrect,
              isFavorite,
              after: userAnswers[questionId],
            });
          }
        }
      });
      
      console.log(`📊 [QuestionService] clearFileAnswers: 清空統計`, {
        clearedCount,
        favoritePreservedCount,
        totalQuestionIds: questionIds.length,
      });
      
      await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify(userAnswers));
      console.log(`💾 [QuestionService] clearFileAnswers: 已儲存到 AsyncStorage`);
      
      // 清除該檔案的測驗進度
      await this.clearQuizProgress('DIRECT_FILE', null, fileName);
      console.log(`🗑️ [QuestionService] clearFileAnswers: 已清除測驗進度`);
      
      console.log(`✅ [QuestionService] clearFileAnswers: 已清空檔案 ${fileName} 的答題記錄`, {
        clearedCount,
        favoritePreservedCount,
      });
    } catch (error) {
      console.error(`❌ [QuestionService] clearFileAnswers: 清空檔案答題記錄失敗`, {
        fileName,
        error,
      });
      if (error instanceof Error) {
        console.error(`❌ [QuestionService] clearFileAnswers: 錯誤訊息`, error.message);
        console.error(`❌ [QuestionService] clearFileAnswers: 錯誤堆疊`, error.stack);
      }
      throw error;
    }
  }

  // 清空錯題本中所有題目的答題記錄（用於錯題本重新測驗）
  async clearWrongBookAnswers(): Promise<void> {
    try {
      const wrongBookQuestions = await this.getWrongBookQuestions();
      const userAnswers = await this.getUserAnswers();
      
      // 清空錯題本中所有題目的答題記錄（保留收藏狀態）
      wrongBookQuestions.forEach(question => {
        if (userAnswers[question.id]) {
          const existingAnswer = userAnswers[question.id];
          const isFavorite = Boolean(existingAnswer.isFavorite);
          userAnswers[question.id] = {
            questionId: question.id,
            isCorrect: false,
            isAnswered: false,
            selectedAnswer: undefined,
            isFavorite: isFavorite, // 保留收藏狀態
            isInWrongBook: isFavorite, // 錯題本狀態與收藏狀態同步
            isUncertain: false, // 清空不確定標記
            wrongCount: 0, // 重置錯誤次數
          };
        }
      });
      
      await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify(userAnswers));
      
      // 更新進度統計
      await this.updateProgress();
      
      console.log(`✅ 已清空錯題本的答題記錄`);
    } catch (error) {
      console.error('清空錯題本答題記錄失敗:', error);
    }
  }

  // 清除所有錯題本（清除所有收藏）
  async clearAllWrongBook(): Promise<void> {
    try {
      const userAnswers = await this.getUserAnswers();
      let clearedCount = 0;
      
      // 清除所有收藏的題目
      Object.keys(userAnswers).forEach(questionId => {
        const answer = userAnswers[questionId];
        if (answer && Boolean(answer.isFavorite)) {
          // 清除收藏狀態和錯題本狀態
          userAnswers[questionId] = {
            ...answer,
            isFavorite: false,
            isInWrongBook: false,
          };
          clearedCount++;
        }
      });
      
      await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify(userAnswers));
      
      // 更新進度統計
      await this.updateProgress();
      
      console.log(`✅ 已清除所有錯題本（共 ${clearedCount} 題）`);
    } catch (error) {
      console.error('清除所有錯題本失敗:', error);
      throw error;
    }
  }

  // 取得索引檔案中的 questionFiles
  async getQuestionFiles(): Promise<Array<{
    testName?: string;
    subject?: string;
    series_no: string;
    displayName?: string;
    file: string;
    count: number;
  }>> {
    if (!this.indexData) {
      this.indexData = await loadIndexData();
    }
    
    if (!this.indexData) {
      return [];
    }
    
    return this.indexData.questionFiles || [];
  }

  // 合併匯入的索引到主索引
  async mergeImportedIndex(): Promise<void> {
    try {
      const importedFiles = await getImportedQuestionFiles();
      if (importedFiles.length === 0) {
        return;
      }

      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }

      if (!this.indexData) {
        console.warn('無法載入主索引，跳過合併匯入索引');
        return;
      }

      // 讀取匯入索引
      const importedIndexData = await AsyncStorage.getItem('@quiz:importedIndex');
      if (!importedIndexData) {
        return;
      }

      const importedData = JSON.parse(importedIndexData);

      // 合併 questionFiles
      for (const fileInfo of importedData.questionFiles || []) {
        const exists = this.indexData.questionFiles.some(
          f => f.file === fileInfo.file
        );
        if (!exists) {
          // 確保類型匹配：subject 為可選
          const normalizedFileInfo = {
            ...fileInfo,
            subject: fileInfo.subject || undefined,  // 空字串轉為 undefined
          };
          this.indexData.questionFiles.push(normalizedFileInfo);
        }
      }

      // 合併 testNames（如果存在）
      if (importedData.testNames && importedData.testNames.length > 0) {
        if (!this.indexData.testNames) {
          this.indexData.testNames = [];
        }
        for (const testName of importedData.testNames) {
          const exists = this.indexData.testNames.some(
            t => t.name === testName.name
          );
          if (!exists) {
            this.indexData.testNames.push(testName);
          }
        }
      }

      // 合併 subjects（如果存在）
      if (importedData.subjects && importedData.subjects.length > 0) {
        if (!this.indexData.subjects) {
          this.indexData.subjects = [];
        }
        for (const subject of importedData.subjects) {
          const exists = this.indexData.subjects.some(
            s => s.id === subject.id
          );
          if (!exists) {
            this.indexData.subjects.push(subject);
          }
        }
      }

      // 合併 series（如果存在）
      if (importedData.series && importedData.series.length > 0) {
        if (!this.indexData.series) {
          this.indexData.series = [];
        }
        for (const series of importedData.series) {
          const exists = this.indexData.series.some(
            s => s.id === series.id
          );
          if (!exists) {
            this.indexData.series.push(series);
          }
        }
      }

      // 更新 AsyncStorage
      await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(this.indexData.testNames || []));
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(this.indexData.subjects || []));
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(this.indexData.series || []));

      console.log('✅ 成功合併匯入索引');
    } catch (error) {
      console.error('合併匯入索引失敗:', error);
    }
  }
}

export default new QuestionService();
