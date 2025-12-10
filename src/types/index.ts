// 題目資料結構
export interface Question {
  id: string;                    // 題目ID
  content: string;               // 題目內容
  options: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
  correctAnswer: 'A' | 'B' | 'C' | 'D';  // 正確答案
  explanation: string;           // 詳解
  testName: string;              // 測驗名稱（例如：信託營業員）
  subject: string;               // 所屬科目（例如：信託法規）
  series_no: string;             // 期數（例如：61期）
  chapter?: string;              // 所屬章節（可選，保留向後相容）
  questionNumber?: number;        // 在該期數中的題號（從1開始）
}

// 用戶答題狀態
export interface UserAnswer {
  questionId: string;
  isCorrect: boolean;            // 是否答對
  isAnswered: boolean;           // 是否已作答
  selectedAnswer?: 'A' | 'B' | 'C' | 'D';  // 用戶選擇的答案
  isFavorite: boolean;           // 是否收藏
  isInWrongBook: boolean;        // 是否在錯題本
  isUncertain: boolean;          // 是否不確定
  wrongCount: number;            // 錯誤次數
  lastAnsweredAt?: Date;         // 最後答題時間
  lastWrongAt?: Date;            // 最後答錯時間
}

// 章節資訊
export interface Chapter {
  id: string;
  name: string;
  subject: string;
  totalQuestions: number;
  completedQuestions: number;
  completionPercentage: number;
}

// 測驗名稱資訊
export interface TestName {
  id: string;
  name: string;
  totalQuestions: number;
  completedQuestions: number;
  completionPercentage: number;
}

// 科目資訊
export interface Subject {
  id: string;
  name: string;
  testName: string;
  totalQuestions: number;
  completedQuestions: number;
  completionPercentage: number;
}

// 期數資訊
export interface Series {
  id: string;
  name: string;
  testName: string;
  subject: string;
  totalQuestions: number;
  completedQuestions: number;
  completionPercentage: number;
  score?: number;  // 分數（0-100）
  correctCount?: number;  // 正確題數
}

// 錯題本篩選條件
export interface WrongBookFilter {
  subject?: string;              // 依科目篩選
  onlyWrong?: boolean;            // 僅複習錯題
  onlyFavorite?: boolean;         // 僅複習收藏題
}

