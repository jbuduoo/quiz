import { Question, QuestionType } from '../types';

/**
 * 判斷題目類型
 * 優先使用 Type 欄位，如果沒有則根據選項推斷（向後相容）
 */
export function getQuestionType(question: Question): QuestionType {
  // 如果有 Type 欄位，直接使用
  if (question.Type) {
    return question.Type;
  }
  
  // 否則根據選項推斷（向後相容）
  const hasOptions = 
    (question.A && question.A.trim() !== '') ||
    (question.B && question.B.trim() !== '') ||
    (question.C && question.C.trim() !== '') ||
    (question.D && question.D.trim() !== '');
  
  if (!hasOptions) {
    return '問答題';
  }
  
  // 檢查是否為複選題（答案包含逗號）
  const ans = String(question.Ans || '');
  if (ans.includes(',')) {
    return '複選題';
  }
  
  // 檢查是否為是非題（只有 A 和 B 有值，且 C 和 D 為空）
  const onlyAB = 
    (question.A && question.A.trim() !== '') &&
    (question.B && question.B.trim() !== '') &&
    (!question.C || question.C.trim() === '') &&
    (!question.D || question.D.trim() === '');
  
  if (onlyAB) {
    return '是非題';
  }
  
  return '選擇題';
}

/**
 * 判斷是否為問答題
 */
export function isEssayQuestion(question: Question): boolean {
  return getQuestionType(question) === '問答題';
}

/**
 * 判斷是否為複選題
 */
export function isMultipleChoice(question: Question): boolean {
  return getQuestionType(question) === '複選題';
}

/**
 * 判斷是否為是非題
 */
export function isTrueFalseQuestion(question: Question): boolean {
  return getQuestionType(question) === '是非題';
}

/**
 * 判斷兩個是非題答案是否等價
 * O、A、是 都代表同一個意思（正確/是）
 * X、B、否 都代表同一個意思（錯誤/否）
 * @param answer1 第一個答案（可能是 "A"、"B"、"O"、"X"、"是"、"否" 等）
 * @param answer2 第二個答案（可能是 "A"、"B"、"O"、"X"、"是"、"否" 等）
 * @param question 題目物件（用於獲取選項內容，可選）
 * @returns 是否等價
 */
export function isTrueFalseAnswerEquivalent(
  answer1: string,
  answer2: string,
  question?: Question
): boolean {
  const a1 = String(answer1).trim();
  const a2 = String(answer2).trim();
  
  // 如果完全相同，直接返回 true
  if (a1 === a2) {
    return true;
  }
  
  // 定義等價組
  const trueGroup = ['A', 'O', 'o', '○', '是'];
  const falseGroup = ['B', 'X', 'x', '×', '否'];
  
  // 檢查是否都在同一個等價組中
  const a1InTrue = trueGroup.includes(a1);
  const a1InFalse = falseGroup.includes(a1);
  const a2InTrue = trueGroup.includes(a2);
  const a2InFalse = falseGroup.includes(a2);
  
  // 如果都在 true 組或都在 false 組，則等價
  if ((a1InTrue && a2InTrue) || (a1InFalse && a2InFalse)) {
    return true;
  }
  
  // 如果題目有選項內容，檢查是否匹配選項內容
  if (question) {
    const optionA = String(question.A || '').trim();
    const optionB = String(question.B || '').trim();
    
    // 如果答案匹配選項內容
    if ((a1 === optionA && a2 === 'A') || (a1 === 'A' && a2 === optionA)) {
      return true;
    }
    if ((a1 === optionB && a2 === 'B') || (a1 === 'B' && a2 === optionB)) {
      return true;
    }
    
    // 如果答案本身就是選項內容
    if (a1 === optionA && (a2InTrue || a2 === 'A')) {
      return true;
    }
    if (a1 === optionB && (a2InFalse || a2 === 'B')) {
      return true;
    }
    if (a2 === optionA && (a1InTrue || a1 === 'A')) {
      return true;
    }
    if (a2 === optionB && (a1InFalse || a1 === 'B')) {
      return true;
    }
  }
  
  return false;
}

/**
 * 標準化是非題答案（用於顯示）
 * 將 "O"、"X"、"是"、"否" 等格式轉換為標準格式以便顯示
 * @param answer 原始答案
 * @param question 題目物件（用於獲取選項內容）
 * @returns 標準化後的答案字串（用於顯示）
 */
export function normalizeTrueFalseAnswerForDisplay(answer: string, question: Question): string {
  const normalized = String(answer).trim();
  
  // 如果已經是 A 或 B，直接返回
  if (normalized === 'A' || normalized === 'B') {
    return normalized;
  }
  
  // 檢查答案是否匹配選項內容
  const optionA = String(question.A || '').trim();
  const optionB = String(question.B || '').trim();
  
  if (normalized === optionA) {
    return 'A';
  }
  if (normalized === optionB) {
    return 'B';
  }
  
  // 處理常見的是非題答案格式
  if (normalized === '是' || normalized === 'O' || normalized === 'o' || normalized === '○') {
    return 'A';
  }
  if (normalized === '否' || normalized === 'X' || normalized === 'x' || normalized === '×') {
    return 'B';
  }
  
  // 預設返回原始答案
  return normalized;
}

