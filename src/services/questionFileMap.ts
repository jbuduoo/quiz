// 此檔案由 scripts/generateQuestionFileMap.js 自動生成
// 請勿手動編輯此檔案

import { Question } from '../types';

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

export const questionFileMap: Record<string, () => QuestionFileData> = {
  'questions/q_0f7eee9d.json': () => require('../../assets/data/questions/q_0f7eee9d.json'),
  'questions/q_4660f77e.json': () => require('../../assets/data/questions/q_4660f77e.json'),
  'questions/q_4ea9a96d.json': () => require('../../assets/data/questions/q_4ea9a96d.json'),
  'questions/q_809c044b.json': () => require('../../assets/data/questions/q_809c044b.json'),
  'questions/q_a403a076.json': () => require('../../assets/data/questions/q_a403a076.json'),
  'questions/q_b3c96f79.json': () => require('../../assets/data/questions/q_b3c96f79.json'),
  'questions/q_c04e8330.json': () => require('../../assets/data/questions/q_c04e8330.json'),
  'questions/q_e3b6ec3e.json': () => require('../../assets/data/questions/q_e3b6ec3e.json'),
  'questions/q_f256c22a.json': () => require('../../assets/data/questions/q_f256c22a.json'),
  'questions/q_f7a81613.json': () => require('../../assets/data/questions/q_f7a81613.json'),
};
