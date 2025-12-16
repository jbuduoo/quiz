import { Question } from '../types';

/**
 * 分離背景和題目內容
 * 使用 ## 背景 ## 標記來分隔
 */
export function separateBackgroundAndQuestion(content: string): {
  background: string;
  questionText: string;
  hasBackground: boolean;
} {
  // 尋找 ## 背景 ## 標記
  const backgroundMarker = '## 背景 ##';
  const markerIndex = content.indexOf(backgroundMarker);
  
  if (markerIndex >= 0) {
    const background = content.substring(0, markerIndex).trim();
    const questionText = content.substring(markerIndex + backgroundMarker.length).trim();
    
    return {
      background,
      questionText,
      hasBackground: true,
    };
  }
  
  // 如果沒有標記，返回原內容作為題目
  return {
    background: '',
    questionText: content,
    hasBackground: false,
  };
}

/**
 * 獲取題組資訊
 * 檢查背景中是否包含「請根據此資訊回答 X~Y 題」
 */
export function getQuestionGroupInfo(question: Question): {
  isGroupQuestion: boolean;
  isFirstInGroup: boolean;
  groupStartNumber?: number;
  groupEndNumber?: number;
} {
  const { hasBackground, background } = separateBackgroundAndQuestion(question.content);
  
  if (!hasBackground || !background) {
    return {
      isGroupQuestion: false,
      isFirstInGroup: false,
    };
  }
  
  // 檢查背景中是否包含「請根據此資訊回答 X~Y 題」
  const groupMatch = background.match(/請根據此資訊回答\s*(\d+)~(\d+)\s*題/);
  
  if (groupMatch) {
    const startNum = parseInt(groupMatch[1]);
    const endNum = parseInt(groupMatch[2]);
    const questionNum = question.questionNumber || 0;
    const isFirst = questionNum === startNum;
    
    return {
      isGroupQuestion: true,
      isFirstInGroup: isFirst,
      groupStartNumber: startNum,
      groupEndNumber: endNum,
    };
  }
  
  return {
    isGroupQuestion: false,
    isFirstInGroup: false,
  };
}

/**
 * 獲取題目的顯示資訊
 */
export function getQuestionDisplay(question: Question, allQuestions: Question[]): {
  showBackground: boolean;
  background: string;
  questionText: string;
  isGroupQuestion: boolean;
  groupStartNumber?: number;
  groupEndNumber?: number;
} {
  const { background, questionText, hasBackground } = separateBackgroundAndQuestion(question.content);
  const groupInfo = getQuestionGroupInfo(question);
  
  if (hasBackground && groupInfo.isGroupQuestion) {
    return {
      showBackground: groupInfo.isFirstInGroup, // 只有第一題顯示背景
      background,
      questionText,
      isGroupQuestion: true,
      groupStartNumber: groupInfo.groupStartNumber,
      groupEndNumber: groupInfo.groupEndNumber,
    };
  }
  
  // 非題組題目或沒有背景標記的題目
  return {
    showBackground: false,
    background: hasBackground ? background : '',
    questionText: hasBackground ? questionText : question.content,
    isGroupQuestion: false,
  };
}

