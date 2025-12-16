/**
 * 名稱映射工具
 * 將代碼映射為完整的顯示名稱
 */

import QuizLibraryConfigService from '../services/QuizLibraryConfigService';

// 預設測驗名稱映射（作為後備）
const DEFAULT_TEST_NAME_MAP: Record<string, string> = {
  'IPAS_01': 'IPAS AI應用規劃師初級',
  'IPAS_02': 'IPAS AI應用規劃師中級',
  'JAVA': 'Java 程式設計認證',
  'AZ900': 'Microsoft Azure Fundamentals (AZ-900)',
};

// 科目名稱映射
const SUBJECT_NAME_MAP: Record<string, string> = {
  'L11': 'L11 人工智慧基礎概論',
  'L12': 'L12生成式AI應用與規劃',
  'L21': 'L21人工智慧技術應用與規劃',
  'L22': 'L22大數據處理分析與應用',
  'L23': 'L23機器學習技術與應用',
  // JAVA 科目
  'JAVA Basic': 'JAVA Basic',
  'Spring boot': 'Spring Boot',
  'JAVA_BASIC': 'Java 基礎',
  'JAVA_ADVANCED': 'Java 進階',
  // AZ900 科目
  'part1': 'Part 1 基礎概念',
};

/**
 * 獲取測驗名稱的顯示名稱（同步版本，使用預設映射）
 * @param testName 測驗代碼（例如：IPAS_01）
 * @returns 顯示名稱（例如：IPAS AI應用規劃師初級）
 */
export function getTestNameDisplay(testName: string | undefined | null): string {
  if (!testName) return '未知測驗';
  return DEFAULT_TEST_NAME_MAP[testName] || testName;
}

/**
 * 獲取測驗名稱的顯示名稱（異步版本，從配置檔案載入）
 * @param testName 測驗代碼（例如：IPAS_01）
 * @returns 顯示名稱（例如：IPAS AI應用規劃師初級）
 */
export async function getTestNameDisplayAsync(testName: string | undefined | null): Promise<string> {
  if (!testName) return '未知測驗';
  
  try {
    const displayName = await QuizLibraryConfigService.getDisplayName(testName);
    return displayName || DEFAULT_TEST_NAME_MAP[testName] || testName;
  } catch (error) {
    return DEFAULT_TEST_NAME_MAP[testName] || testName;
  }
}

/**
 * 獲取科目名稱的顯示名稱
 * @param subject 科目代碼（例如：L11）
 * @returns 顯示名稱（例如：L11 人工智慧基礎概論）
 */
export function getSubjectDisplay(subject: string | undefined | null): string {
  if (!subject) return '未知科目';
  return SUBJECT_NAME_MAP[subject] || subject;
}

/**
 * 獲取期數的顯示名稱（目前不需要映射，直接返回）
 * @param series_no 期數（例如：11409）
 * @returns 顯示名稱
 */
export function getSeriesDisplay(series_no: string | undefined | null): string {
  if (!series_no) return '未知期數';
  return series_no;
}

