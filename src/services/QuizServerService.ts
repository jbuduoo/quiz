import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SERVER_URL_KEY = '@quiz:serverUrl';

/**
 * 取得預設的本地伺服器 URL
 */
export function getDefaultLocalServerUrl(): string {
  // 所有平台都使用相同的題庫網站，與 Web 版相同
  return 'https://jbuduoo.github.io/ExamBank/';
}

/**
 * 儲存伺服器 URL
 */
export async function saveServerUrl(url: string): Promise<void> {
  try {
    await AsyncStorage.setItem(SERVER_URL_KEY, url);
  } catch (error) {
    console.error('儲存伺服器 URL 失敗:', error);
  }
}

/**
 * 取得儲存的伺服器 URL
 */
export async function getServerUrl(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(SERVER_URL_KEY);
  } catch (error) {
    console.error('取得伺服器 URL 失敗:', error);
    return null;
  }
}

/**
 * 清除儲存的伺服器 URL
 */
export async function clearServerUrl(): Promise<void> {
  try {
    await AsyncStorage.removeItem(SERVER_URL_KEY);
  } catch (error) {
    console.error('清除伺服器 URL 失敗:', error);
  }
}

/**
 * 取得要使用的伺服器 URL
 * 優先順序：儲存的 URL > 預設本地伺服器
 */
export async function getEffectiveServerUrl(): Promise<string> {
  const savedUrl = await getServerUrl();
  if (savedUrl) {
    return savedUrl;
  }
  
  const defaultUrl = getDefaultLocalServerUrl();
  if (defaultUrl) {
    return defaultUrl;
  }
  
  // 如果都沒有，返回空字串，讓用戶輸入
  return '';
}

/**
 * 檢測伺服器是否可用
 */
export async function checkServerAvailable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      timeout: 3000,
    } as any);
    return response.ok;
  } catch (error) {
    return false;
  }
}



