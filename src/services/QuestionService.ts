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

// 題目檔案資料結構
interface QuestionFileData {
  metadata: {
    testName: string;
    subject: string;
    series_no: string;
    sourceFile: string;
    count: number;
  };
  questions: Question[];
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
      console.warn('無法使用 require 載入索引:', requireError);
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
    
    return null;
  } catch (error) {
    console.error('載入索引資料失敗:', error);
    return null;
  }
}

// 按需載入題目檔案
async function loadQuestionFile(filePath: string): Promise<Question[]> {
  // 檢查快取
  if (questionCache.has(filePath)) {
    return questionCache.get(filePath)!;
  }
  
  try {
    // 優先使用映射表載入（適用於所有平台，包括 Web）
    // Metro Bundler 會自動處理資源打包，無需使用 fetch
    if (questionFileMap[filePath]) {
      try {
        const questionModule = questionFileMap[filePath]() as QuestionFileData;
        if (questionModule && questionModule.questions) {
          // 為每個題目添加題號
          questionModule.questions.forEach((q, index) => {
            q.questionNumber = index + 1;
          });
          questionCache.set(filePath, questionModule.questions);
          console.log(`✅ 載入題目檔案: ${filePath} (${questionModule.questions.length} 題)`);
          return questionModule.questions;
        }
      } catch (requireError) {
        console.warn(`無法使用 require 載入題目檔案 ${filePath}:`, requireError);
      }
    } else {
      console.warn(`找不到題目檔案映射: ${filePath}`);
    }
    
    // 如果映射表載入失敗，在 Web 平台嘗試使用 fetch（作為備用方案）
    if (typeof window !== 'undefined') {
      try {
        const response = await fetch(`/assets/data/${filePath}`);
        if (response.ok) {
          const data = await response.json() as QuestionFileData;
          if (data && data.questions) {
            // 為每個題目添加題號
            data.questions.forEach((q, index) => {
              q.questionNumber = index + 1;
            });
            questionCache.set(filePath, data.questions);
            console.log(`✅ 從 Web fetch 載入題目檔案: ${filePath} (${data.questions.length} 題)`);
            return data.questions;
          }
        }
      } catch (fetchError) {
        // 靜默失敗，因為已經嘗試過映射表載入
      }
    }
    
    return [];
  } catch (error) {
    console.error(`載入題目檔案失敗 ${filePath}:`, error);
    return [];
  }
}

class QuestionService {
  private indexData: IndexData | null = null;

  // 初始化資料
  async initializeData(): Promise<void> {
    try {
      const dataVersion = await AsyncStorage.getItem(DATA_VERSION_KEY);
      const currentVersion = '3.0.0'; // 新版本：使用分離的題目檔案結構
      
      // 載入索引資料
      this.indexData = await loadIndexData();
      
      if (!this.indexData) {
        console.error('無法載入索引資料');
        return;
      }
      
      // 如果版本不同，清除舊資料
      if (dataVersion !== currentVersion) {
        await AsyncStorage.removeItem(TEST_NAMES_KEY);
        await AsyncStorage.removeItem(SUBJECTS_KEY);
        await AsyncStorage.removeItem(SERIES_KEY);
        await AsyncStorage.setItem(DATA_VERSION_KEY, currentVersion);
      }
      
      // 儲存索引資料到 AsyncStorage（用於快速存取）
      await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(this.indexData.testNames));
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(this.indexData.subjects));
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(this.indexData.series));
      
      const existingAnswers = await AsyncStorage.getItem(USER_ANSWERS_KEY);
      if (!existingAnswers) {
        await AsyncStorage.setItem(USER_ANSWERS_KEY, JSON.stringify({}));
      }
      
      // 更新進度統計
      await this.updateProgress();
    } catch (error) {
      console.error('初始化資料失敗:', error);
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
      return data ? JSON.parse(data) : {};
    } catch (error) {
      console.error('取得答題記錄失敗:', error);
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

      // 如果答錯，更新錯誤次數
      if (answer.isCorrect === false && existingAnswer.isAnswered) {
        updatedAnswer.wrongCount = existingAnswer.wrongCount + 1;
        updatedAnswer.lastWrongAt = new Date();
      }

      // 如果答對，更新答題時間
      if (answer.isCorrect === true) {
        updatedAnswer.lastAnsweredAt = new Date();
      }

      // 根據收藏狀態同步錯題本狀態（不管答對還是答錯）
      // 已收藏 → 加入錯題本
      // 未收藏 → 從錯題本移除
      updatedAnswer.isInWrongBook = updatedAnswer.isFavorite;

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
              subject: q.subject,
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
          return answer?.isAnswered === true;
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
    onlyWrong?: boolean;
    onlyFavorite?: boolean;
  }): Promise<Question[]> {
    try {
      const allQuestions = await this.getAllQuestions();
      const userAnswers = await this.getUserAnswers();

      let filteredQuestions = allQuestions.filter(q => {
        const answer = userAnswers[q.id];
        if (!answer) return false;

        if (filter?.subject && q.subject !== filter.subject) return false;
        
        // 錯題本只顯示收藏的題目
        if (!answer.isFavorite) return false;
        
        // 如果指定 onlyWrong，則只顯示答錯的收藏題
        if (filter?.onlyWrong && answer.isCorrect) return false;

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
        if (answer && answer.isFavorite) {
          favoriteCount++;
          // 統計收藏中答錯的題數
          if (answer.isAnswered && !answer.isCorrect) {
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
    subject: string,
    series_no: string
  ): Promise<Question[]> {
    if (!this.indexData) {
      this.indexData = await loadIndexData();
    }
    
    if (!this.indexData) {
      return [];
    }
    
    // 找到對應的題目檔案
    const fileInfo = this.indexData.questionFiles.find(
      f => f.testName === testName && f.subject === subject && f.series_no === series_no
    );
    
    if (!fileInfo) {
      console.warn(`找不到題目檔案: ${testName} / ${subject} / ${series_no}`);
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

  // 更新進度統計
  async updateProgress(): Promise<void> {
    try {
      if (!this.indexData) {
        this.indexData = await loadIndexData();
      }
      
      if (!this.indexData) {
        return;
      }
      
      const userAnswers = await this.getUserAnswers();
      
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
            const questions = await loadQuestionFile(fileInfo.file);
            totalQuestions += questions.length;
            completedQuestions += questions.filter(q => {
              const answer = userAnswers[q.id];
              return answer?.isAnswered === true;
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
      
      // 更新 subjects 進度
      const updatedSubjects = await Promise.all(
        this.indexData.subjects.map(async subject => {
          const relatedFiles = this.indexData!.questionFiles.filter(
            f => f.testName === subject.testName && f.subject === subject.name
          );
          
          let totalQuestions = 0;
          let completedQuestions = 0;
          
          for (const fileInfo of relatedFiles) {
            const questions = await loadQuestionFile(fileInfo.file);
            totalQuestions += questions.length;
            completedQuestions += questions.filter(q => {
              const answer = userAnswers[q.id];
              return answer?.isAnswered === true;
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
      
      // 更新 series 進度
      const updatedSeries = await Promise.all(
        this.indexData.series.map(async series => {
          const fileInfo = this.indexData!.questionFiles.find(
            f => f.testName === series.testName && 
                 f.subject === series.subject && 
                 f.series_no === series.name
          );
          
          if (!fileInfo) {
            return series;
          }
          
          const questions = await loadQuestionFile(fileInfo.file);
          const completedQuestions = questions.filter(q => {
            const answer = userAnswers[q.id];
            return answer?.isAnswered === true;
          }).length;
          
          // 計算正確題數
          const correctQuestions = questions.filter(q => {
            const answer = userAnswers[q.id];
            return answer?.isCorrect === true;
          }).length;
          
          // 只有在完成所有題目時才計算分數
          const allAnswered = completedQuestions === questions.length && questions.length > 0;
          let score = series.score;  // 保留原有分數
          
          if (allAnswered) {
            // 計算分數：正確題數 / 總題數 * 100
            score = Math.round((correctQuestions / questions.length) * 100);
          }
          
          return {
            ...series,
            totalQuestions: questions.length,
            completedQuestions,
            completionPercentage: questions.length > 0
              ? Math.round((completedQuestions / questions.length) * 100)
              : 0,
            score: score,  // 保留已存在的分數，或使用新計算的分數
            correctCount: correctQuestions,  // 保存正確題數
          };
        })
      );
      
      await AsyncStorage.setItem(TEST_NAMES_KEY, JSON.stringify(updatedTestNames));
      await AsyncStorage.setItem(SUBJECTS_KEY, JSON.stringify(updatedSubjects));
      await AsyncStorage.setItem(SERIES_KEY, JSON.stringify(updatedSeries));
      
      // 更新記憶體中的索引資料
      this.indexData.testNames = updatedTestNames;
      this.indexData.subjects = updatedSubjects;
      this.indexData.series = updatedSeries;
    } catch (error) {
      console.error('更新進度失敗:', error);
    }
  }

  // 保存測驗分數
  async saveQuizScore(
    testName: string,
    subject: string,
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
      const seriesIndex = this.indexData.series.findIndex(
        s => s.testName === testName && 
             s.subject === subject && 
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
    subject: string,
    series_no: string,
    currentIndex: number
  ): Promise<void> {
    try {
      const progressData = await this.getQuizProgress();
      const quizKey = `${testName}_${subject}_${series_no}`;
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
    subject: string,
    series_no: string
  ): Promise<number | null> {
    try {
      const progressData = await this.getQuizProgress();
      const quizKey = `${testName}_${subject}_${series_no}`;
      return progressData[quizKey] ?? null;
    } catch (error) {
      console.error('取得測驗進度失敗:', error);
      return null;
    }
  }

  // 清除測驗進度（當測驗完成時）
  async clearQuizProgress(
    testName: string,
    subject: string,
    series_no: string
  ): Promise<void> {
    try {
      const progressData = await this.getQuizProgress();
      const quizKey = `${testName}_${subject}_${series_no}`;
      delete progressData[quizKey];
      await AsyncStorage.setItem(QUIZ_PROGRESS_KEY, JSON.stringify(progressData));
    } catch (error) {
      console.error('清除測驗進度失敗:', error);
    }
  }

  // 清空指定期數的所有答題記錄（用於重新測驗）
  async clearSeriesAnswers(
    testName: string,
    subject: string,
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
            isFavorite: existingAnswer.isFavorite || false, // 保留收藏狀態
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
