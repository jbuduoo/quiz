import AsyncStorage from '@react-native-async-storage/async-storage';
import { Question, UserAnswer, Chapter, TestName, Subject, Series } from '../types';
import { questionFileMap } from './questionFileMap';

const USER_ANSWERS_KEY = '@quiz:userAnswers';
const CHAPTERS_KEY = '@quiz:chapters';
const DATA_VERSION_KEY = '@quiz:dataVersion';
const TEST_NAMES_KEY = '@quiz:testNames';
const SUBJECTS_KEY = '@quiz:subjects';
const SERIES_KEY = '@quiz:series';
const QUIZ_PROGRESS_KEY = '@quiz:quizProgress'; // 保存測驗進度

// 索引資料結構
interface IndexData {
  metadata: {
    version: string;
    lastUpdated: string;
    totalQuestions: number;
  };
  testNames: TestName[];
  subjects: Subject[];
  series: Series[];
  questionFiles: Array<{
    testName: string;
    subject: string;
    series_no: string;
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

// 載入索引檔案
async function loadIndexData(): Promise<IndexData | null> {
  try {
    // 在 React Native 平台，使用 require（優先）
    try {
      const indexModule = require('../../assets/data/questions.json') as IndexData;
      if (indexModule && indexModule.testNames && indexModule.subjects) {
        console.log(`✅ 成功載入索引資料（${indexModule.testNames.length} 個測驗名稱）`);
        return indexModule;
      }
    } catch (requireError) {
      console.error('❌ 無法使用 require 載入索引:', requireError);
      if (requireError instanceof Error) {
        console.error('❌ require 錯誤詳情:', requireError.message);
        console.error('❌ require 錯誤堆疊:', requireError.stack);
      }
    }
    
    // 在 Web 平台，使用 fetch
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch('/assets/data/questions.json');
        if (response.ok) {
          const data = await response.json() as IndexData;
          if (data && data.testNames && data.subjects) {
            console.log(`✅ 成功從 Web 載入索引資料（${data.testNames.length} 個測驗名稱）`);
            return data;
          }
        }
      } catch (fetchError) {
        console.warn('無法使用 fetch 載入索引:', fetchError);
      }
    }
    
    console.error('❌ 所有載入索引的方法都失敗了');
    return null;
  } catch (error) {
    console.error('❌ 載入索引資料失敗:', error);
    if (error instanceof Error) {
      console.error('❌ 錯誤詳情:', error.message);
      console.error('❌ 錯誤堆疊:', error.stack);
    }
    return null;
  }
}

// 從檔案路徑解析 testName, subject, series_no
function parseFilePath(filePath: string): { testName: string; subject: string | null; series_no: string } | null {
  // 新格式: questions/IPAS_01/L11/11401.json (三層結構)
  // 新格式: questions/NEW_CERT/20251216.json (兩層結構，沒有 subject)
  // 舊格式: questions/IPAS_01_L11_11401.json (向後相容)
  
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
  console.log(`🔍 [loadQuestionFile] 開始載入檔案: ${filePath}`);
  
  // 檢查快取
  if (questionCache.has(filePath)) {
    console.log(`📦 [loadQuestionFile] 從快取載入: ${filePath}`);
    return questionCache.get(filePath)!;
  }
  
  try {
    // 從路徑解析 testName, subject, series_no
    const pathInfo = parseFilePath(filePath);
    if (!pathInfo) {
      console.error(`❌ [loadQuestionFile] 無法解析檔案路徑: ${filePath}`);
      return [];
    }
    
    const { testName, subject, series_no } = pathInfo;
    
    // 優先使用映射表載入（適用於所有平台，包括 Web）
    // Metro Bundler 會自動處理資源打包，無需使用 fetch
    if (questionFileMap[filePath]) {
      try {
        const questionModule = questionFileMap[filePath]() as QuestionFileData;
        
        if (questionModule && questionModule.questions) {
          // 新格式：從路徑取得 testName、subject、series_no
          // 舊格式：從 metadata 取得（向後相容）
          const metadata = questionModule.metadata || {};
          const finalTestName = metadata.testName || testName;
          // 如果 subject 為 null（兩層結構），finalSubject 也為 null；否則使用 metadata 或 pathInfo 的 subject
          const finalSubject = subject === null ? null : (metadata.subject || subject || null);
          const finalSeriesNo = metadata.series_no || series_no;
          
          // 為每個題目添加題號和 metadata 資訊，並確保所有欄位類型正確
          const normalizedQuestions = questionModule.questions.map((q: any, index) => {
            // 建立完整的題目 ID
            // 三層結構：testName_subject_series_no_題號
            // 兩層結構：testName_series_no_題號（沒有 subject）
            const questionId = finalSubject 
              ? `${finalTestName}_${finalSubject}_${finalSeriesNo}_${index + 1}`
              : `${finalTestName}_${finalSeriesNo}_${index + 1}`;
            
            // 建立新的物件，確保類型正確
            const normalizedQuestion: Question = {
              id: questionId,
              content: String(q.content || ''),
              A: String(q.A || q.options?.A || ''),
              B: String(q.B || q.options?.B || ''),
              C: String(q.C || q.options?.C || ''),
              D: String(q.D || q.options?.D || ''),
              Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
              exp: String(q.exp || q.explanation || ''),
              questionNumber: index + 1,
              // 從路徑或 metadata 補充可選欄位
              testName: finalTestName,
              subject: finalSubject || undefined, // 如果沒有 subject，設為 undefined
              series_no: finalSeriesNo,
              chapter: q.chapter || undefined,
            };
            
            return normalizedQuestion;
          });
          questionCache.set(filePath, normalizedQuestions);
          console.log(`✅ 載入題目檔案: ${filePath} (${normalizedQuestions.length} 題)`);
          return normalizedQuestions;
        } else {
          console.error(`❌ [loadQuestionFile] 檔案格式錯誤: ${filePath}`, {
            hasModule: !!questionModule,
            hasQuestions: !!questionModule?.questions
          });
        }
      } catch (requireError) {
        console.error(`❌ [loadQuestionFile] 無法使用 require 載入題目檔案 ${filePath}:`, requireError);
        // 在 Android 上，如果 require 失敗，可能是資源未正確打包
        // 記錄詳細錯誤以便除錯
        if (requireError instanceof Error) {
          console.error(`❌ [loadQuestionFile] 錯誤詳情: ${requireError.message}`);
          console.error(`❌ [loadQuestionFile] 錯誤堆疊: ${requireError.stack}`);
        } else {
          console.error(`❌ [loadQuestionFile] 未知錯誤類型:`, typeof requireError, requireError);
        }
      }
    } else {
      console.warn(`找不到題目檔案映射: ${filePath}`);
      console.warn(`可用的檔案映射:`, Object.keys(questionFileMap).slice(0, 5), '...');
    }
    
    // 如果映射表載入失敗，在 Web 平台嘗試使用 fetch（作為備用方案）
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/assets/data/${filePath}`);
        if (response.ok) {
          const data = await response.json() as QuestionFileData;
          if (data && data.questions) {
            // 從路徑或 metadata 取得 testName、subject、series_no
            const metadata = data.metadata || {};
            const finalTestName = metadata.testName || testName;
            const finalSubject = metadata.subject || subject;
            const finalSeriesNo = metadata.series_no || series_no;
            
            // 為每個題目添加題號和 metadata 資訊，並確保所有欄位類型正確
            const normalizedQuestions = data.questions.map((q: any, index: number) => {
              const questionId = `${finalTestName}_${finalSubject}_${finalSeriesNo}_${index + 1}`;
              
              const normalizedQuestion: Question = {
                id: questionId,
                content: String(q.content || ''),
                A: String(q.A || q.options?.A || ''),
                B: String(q.B || q.options?.B || ''),
                C: String(q.C || q.options?.C || ''),
                D: String(q.D || q.options?.D || ''),
                Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
                exp: String(q.exp || q.explanation || ''),
                questionNumber: index + 1,
                testName: finalTestName,
                subject: finalSubject,
                series_no: finalSeriesNo,
                chapter: q.chapter || undefined,
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
    
    console.error(`無法載入題目檔案: ${filePath}`);
    return [];
  } catch (error) {
    console.error(`載入題目檔案失敗 ${filePath}:`, error);
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
    const currentVersion = '3.0.0'; // 當前版本：支援資料夾結構，簡化檔案格式
    
    try {
      const dataVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
      console.log(`📋 [initializeData] 當前資料版本: ${dataVersion}, 目標版本: ${currentVersion}`);
      
      // 載入索引資料
      console.log('📂 [initializeData] 開始載入索引資料');
      this.indexData = await loadIndexData();
      
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
                totalQuestions: 0,
              },
              testNames: JSON.parse(savedTestNames),
              subjects: JSON.parse(savedSubjects),
              series: JSON.parse(savedSeries),
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
        testNamesCount: this.indexData.testNames.length,
        subjectsCount: this.indexData.subjects.length,
        seriesCount: this.indexData.series.length,
        questionFilesCount: this.indexData.questionFiles.length
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
      
      // 儲存索引資料到 AsyncStorage（用於快速存取）
      await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(this.indexData.testNames));
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(this.indexData.subjects));
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(this.indexData.series));
      
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
              totalQuestions: 0,
            },
            testNames: JSON.parse(savedTestNames),
            subjects: JSON.parse(savedSubjects),
            series: JSON.parse(savedSeries),
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
    for (const fileInfo of this.indexData.questionFiles) {
      const questions = await loadQuestionFile(fileInfo.file);
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
      const entriesCount = Object.keys(parsed).length;
      if (entriesCount > 0) {
        console.log(`📖 [getUserAnswers] 記錄的 keys:`, Object.keys(parsed).slice(0, 5));
      }
      
      // 確保所有布林值都是真正的布林類型，而不是字串
      const normalized: Record<string, UserAnswer> = {};
      let processedCount = 0;
      let skippedCount = 0;
      
      for (const [key, value] of Object.entries(parsed)) {
        if (value && typeof value === 'object') {
          const answerValue = value as any;
          
          // 記錄第一個項目的原始類型
          if (processedCount === 0) {
            console.log(`🔍 [getUserAnswers] 第一個答案的原始類型:`, {
              key,
              isCorrect: typeof answerValue.isCorrect,
              isCorrectValue: answerValue.isCorrect,
              isAnswered: typeof answerValue.isAnswered,
              isAnsweredValue: answerValue.isAnswered,
              isFavorite: typeof answerValue.isFavorite,
              isFavoriteValue: answerValue.isFavorite,
            });
          }
          
          normalized[key] = {
            ...answerValue,
            isCorrect: Boolean(answerValue.isCorrect),
            isAnswered: Boolean(answerValue.isAnswered),
            isFavorite: Boolean(answerValue.isFavorite),
            isInWrongBook: Boolean(answerValue.isInWrongBook),
            isUncertain: Boolean(answerValue.isUncertain),
            wrongCount: typeof answerValue.wrongCount === 'number' ? answerValue.wrongCount : 0,
          } as UserAnswer;
          
          // 記錄第一個項目的轉換後類型
          if (processedCount === 0) {
            console.log(`✅ [getUserAnswers] 第一個答案轉換後:`, {
              key,
              isCorrect: typeof normalized[key].isCorrect,
              isCorrectValue: normalized[key].isCorrect,
              isAnswered: typeof normalized[key].isAnswered,
              isAnsweredValue: normalized[key].isAnswered,
              isFavorite: typeof normalized[key].isFavorite,
              isFavoriteValue: normalized[key].isFavorite,
            });
          }
          
          processedCount++;
        } else {
          skippedCount++;
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

      // 如果答錯，更新錯誤次數並自動加入錯題本
      if (answer.isCorrect === false) {
        // 如果是第一次答錯，增加錯誤次數
        if (existingAnswer.isAnswered && existingAnswer.isCorrect !== false) {
          updatedAnswer.wrongCount = existingAnswer.wrongCount + 1;
        } else if (!existingAnswer.isAnswered) {
          // 第一次答題就答錯
          updatedAnswer.wrongCount = 1;
        }
        updatedAnswer.lastWrongAt = new Date();
        // 答錯時自動加入錯題本
        updatedAnswer.isInWrongBook = true;
      }

      // 如果答對，更新答題時間
      if (answer.isCorrect === true) {
        updatedAnswer.lastAnsweredAt = new Date();
        // 答對時，如果沒有收藏，則從錯題本移除
        // 如果已收藏，則保留在錯題本中
        if (!updatedAnswer.isFavorite) {
          updatedAnswer.isInWrongBook = false;
        }
      }

      // 根據收藏狀態同步錯題本狀態
      // 已收藏 → 加入錯題本（不管答對還是答錯）
      if (updatedAnswer.isFavorite) {
        updatedAnswer.isInWrongBook = true;
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

      const newFavoriteStatus = !existingAnswer.isFavorite;
      
      // 同步更新錯題本狀態：收藏 = 加入錯題本，取消收藏 = 移除錯題本
      await this.updateUserAnswer(questionId, {
        ...existingAnswer,
        isFavorite: newFavoriteStatus,
        isInWrongBook: newFavoriteStatus, // 收藏與錯題本同步
      });

      return newFavoriteStatus;
    } catch (error) {
      console.error('切換收藏狀態失敗:', error);
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
        
        // 錯題本只顯示收藏的題目
        if (!Boolean(answer.isFavorite)) return false;
        
        // 如果指定 onlyWrong，則只顯示答錯的收藏題
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

      allQuestions.forEach(q => {
        const answer = userAnswers[q.id];
        if (answer && Boolean(answer.isFavorite)) {
          favoriteCount++;
          // 統計收藏中答錯的題數
          if (Boolean(answer.isAnswered) && !Boolean(answer.isCorrect)) {
            wrongCount++;
          }
        }
      });

      // 總數就是收藏的題數
      const total = favoriteCount;

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
    const fileInfo = this.indexData.questionFiles.find(
      f => f.testName === testName && 
           (subject ? f.subject === subject : (!f.subject || f.subject === '')) && 
           f.series_no === series_no
    );
    
    if (!fileInfo) {
      const subjectDisplay = subject || '(無科目)';
      console.warn(`找不到題目檔案: ${testName} / ${subjectDisplay} / ${series_no}`);
      return [];
    }
    
    // 載入題目檔案
    return await loadQuestionFile(fileInfo.file);
  }

  // 取得所有測驗名稱
  async getTestNames(): Promise<TestName[]> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (this.indexData) {
        // 更新進度後返回
        await this.updateProgress();
        return this.indexData.testNames;
      }
      
      // 從 AsyncStorage 讀取
      const data = await AsyncStorage.getItem(TEST_NAMES_KEY);
      return data ? JSON.parse(data) : [];
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
      
      if (this.indexData) {
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
        return this.indexData.subjects;
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
      
      if (this.indexData) {
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
      
      if (this.indexData) {
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
      
      // 更新 testNames 進度
      const updatedTestNames = await Promise.all(
        this.indexData.testNames.map(async testName => {
          const relatedFiles = this.indexData!.questionFiles.filter(
            f => f.testName === testName.name
          );
          
          let totalQuestions = 0;
          let completedQuestions = 0;
          
          // 載入所有相關題目檔案來計算進度
          for (const fileInfo of relatedFiles) {
            console.log(`📊 [updateProgress] 載入檔案計算進度: ${fileInfo.file}`);
            const questions = await loadQuestionFile(fileInfo.file);
            totalQuestions += questions.length;
            const completedInFile = questions.filter(q => {
              const answer = userAnswers[q.id];
              const isAnswered = Boolean(answer?.isAnswered);
              return isAnswered;
            }).length;
            completedQuestions += completedInFile;
            console.log(`📊 [updateProgress] 檔案 ${fileInfo.file}: ${completedInFile}/${questions.length} 已完成`);
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
      
      // 更新 subjects 進度
      console.log(`📊 [updateProgress] 開始更新 ${this.indexData.subjects.length} 個科目進度`);
      const updatedSubjects = await Promise.all(
        this.indexData.subjects.map(async (subject) => {
          const relatedFiles = this.indexData!.questionFiles.filter(
            f => f.testName === subject.testName && f.subject === subject.name
          );
          console.log(`📊 [updateProgress] 科目 ${subject.name} 相關檔案數: ${relatedFiles.length}`);
          
          let totalQuestions = 0;
          let completedQuestions = 0;
          
          for (const fileInfo of relatedFiles) {
            console.log(`📊 [updateProgress] 載入科目檔案: ${fileInfo.file}`);
            const questions = await loadQuestionFile(fileInfo.file);
            totalQuestions += questions.length;
            const completedInFile = questions.filter(q => {
              const answer = userAnswers[q.id];
              return Boolean(answer?.isAnswered);
            }).length;
            completedQuestions += completedInFile;
            console.log(`📊 [updateProgress] 科目檔案 ${fileInfo.file}: ${completedInFile}/${questions.length} 已完成`);
          }
          
          const result = {
            ...subject,
            totalQuestions,
            completedQuestions,
            completionPercentage: totalQuestions > 0
              ? Math.round((completedQuestions / totalQuestions) * 100)
              : 0,
          };
          console.log(`✅ [updateProgress] 科目 ${subject.name} 進度: ${completedQuestions}/${totalQuestions} (${result.completionPercentage}%)`);
          return result;
        })
      );
      
      // 更新 series 進度
      console.log(`📊 [updateProgress] 開始更新 ${this.indexData.series.length} 個期數進度`);
      const updatedSeries = await Promise.all(
        this.indexData.series.map(async (series) => {
          const fileInfo = this.indexData!.questionFiles.find(
            f => f.testName === series.testName && 
                 f.subject === series.subject && 
                 f.series_no === series.name
          );
          
          if (!fileInfo) {
            console.warn(`⚠️ [updateProgress] 期數 ${series.name} 找不到對應檔案`);
            return series;
          }
          
          console.log(`📊 [updateProgress] 載入期數檔案: ${fileInfo.file}`);
          const questions = await loadQuestionFile(fileInfo.file);
          const completedQuestions = questions.filter(q => {
            const answer = userAnswers[q.id];
            return Boolean(answer?.isAnswered);
          }).length;
          
          // 計算正確題數
          const correctQuestions = questions.filter(q => {
            const answer = userAnswers[q.id];
            return Boolean(answer?.isCorrect);
          }).length;
          
          console.log(`📊 [updateProgress] 期數 ${series.name}: ${completedQuestions}/${questions.length} 已完成, ${correctQuestions} 題正確`);
          
          // 只有在完成所有題目時才計算分數
          const allAnswered = completedQuestions === questions.length && questions.length > 0;
          let score = series.score;  // 保留原有分數
          
          if (allAnswered) {
            // 計算分數：正確題數 / 總題數 * 100
            score = Math.round((correctQuestions / questions.length) * 100);
            console.log(`📊 [updateProgress] 期數 ${series.name} 已完成，分數: ${score}`);
          }
          
          const result = {
            ...series,
            totalQuestions: questions.length,
            completedQuestions,
            completionPercentage: questions.length > 0
              ? Math.round((completedQuestions / questions.length) * 100)
              : 0,
            score: score,  // 保留已存在的分數，或使用新計算的分數
            correctCount: correctQuestions,  // 保存正確題數
          };
          console.log(`✅ [updateProgress] 期數 ${series.name} 進度: ${completedQuestions}/${questions.length} (${result.completionPercentage}%)`);
          return result;
        })
      );
      
      console.log(`💾 [updateProgress] 開始儲存更新後的進度到 AsyncStorage`);
      await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(updatedTestNames));
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(updatedSeries));
      console.log(`✅ [updateProgress] 進度已儲存到 AsyncStorage`);
      
      // 更新記憶體中的索引資料
      this.indexData.testNames = updatedTestNames;
      this.indexData.subjects = updatedSubjects;
      this.indexData.series = updatedSeries;
      console.log(`✅ [updateProgress] 記憶體中的索引資料已更新`);
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
          // 保留收藏狀態，但清空所有答題相關的記錄
          userAnswers[question.id] = {
            questionId: question.id,
            isCorrect: false,
            isAnswered: false,
            selectedAnswer: undefined,
            isFavorite: Boolean(existingAnswer.isFavorite), // 保留收藏狀態
            isInWrongBook: false, // 清空錯題本標記
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
}

export default new QuestionService();
