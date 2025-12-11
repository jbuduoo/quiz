import AsyncStorage from '@react-native-async-storage/async-storage';

const SELECTED_TEST_NAME_KEY = '@quiz:selectedTestName';
const USER_SETTINGS_KEY = '@quiz:userSettings';
const GEMINI_API_KEY_KEY = '@quiz:geminiApiKey';

export type TextSize = 'small' | 'medium' | 'large';
export type Theme = 'light' | 'dark';

export interface UserSettings {
  textSize: TextSize;
  theme: Theme;
}

const DEFAULT_SETTINGS: UserSettings = {
  textSize: 'medium',
  theme: 'light',
};

class SettingsService {
  // 獲取選擇的證照名稱
  async getSelectedTestName(): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(SELECTED_TEST_NAME_KEY);
      return value;
    } catch (error) {
      console.error('讀取選擇的證照失敗:', error);
      return null;
    }
  }

  // 儲存選擇的證照名稱
  async setSelectedTestName(testName: string): Promise<void> {
    try {
      await AsyncStorage.setItem(SELECTED_TEST_NAME_KEY, testName);
    } catch (error) {
      console.error('儲存選擇的證照失敗:', error);
    }
  }

  // 清除選擇的證照
  async clearSelectedTestName(): Promise<void> {
    try {
      await AsyncStorage.removeItem(SELECTED_TEST_NAME_KEY);
    } catch (error) {
      console.error('清除選擇的證照失敗:', error);
    }
  }

  // 獲取用戶設定
  async getSettings(): Promise<UserSettings> {
    try {
      const value = await AsyncStorage.getItem(USER_SETTINGS_KEY);
      if (value) {
        return JSON.parse(value) as UserSettings;
      }
      return DEFAULT_SETTINGS;
    } catch (error) {
      console.error('讀取用戶設定失敗:', error);
      return DEFAULT_SETTINGS;
    }
  }

  // 儲存用戶設定
  async setSettings(settings: UserSettings): Promise<void> {
    try {
      await AsyncStorage.setItem(USER_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('儲存用戶設定失敗:', error);
    }
  }

  // 更新文字大小
  async setTextSize(textSize: TextSize): Promise<void> {
    const settings = await this.getSettings();
    settings.textSize = textSize;
    await this.setSettings(settings);
  }

  // 更新主題
  async setTheme(theme: Theme): Promise<void> {
    const settings = await this.getSettings();
    settings.theme = theme;
    await this.setSettings(settings);
  }

  // 獲取文字大小的實際數值（px）
  getTextSizeValue(textSize: TextSize): number {
    switch (textSize) {
      case 'small':
        return 14;
      case 'medium':
        return 16;
      case 'large':
        return 18;
      default:
        return 16;
    }
  }

  // 獲取標題文字大小的實際數值（px）
  getTitleTextSizeValue(textSize: TextSize): number {
    switch (textSize) {
      case 'small':
        return 16;
      case 'medium':
        return 18;
      case 'large':
        return 20;
      default:
        return 18;
    }
  }

  // 獲取 Gemini API Key
  async getGeminiApiKey(): Promise<string | null> {
    try {
      const value = await AsyncStorage.getItem(GEMINI_API_KEY_KEY);
      return value;
    } catch (error) {
      console.error('讀取 Gemini API Key 失敗:', error);
      return null;
    }
  }

  // 儲存 Gemini API Key
  async setGeminiApiKey(apiKey: string): Promise<void> {
    try {
      await AsyncStorage.setItem(GEMINI_API_KEY_KEY, apiKey);
    } catch (error) {
      console.error('儲存 Gemini API Key 失敗:', error);
    }
  }

  // 清除 Gemini API Key
  async clearGeminiApiKey(): Promise<void> {
    try {
      await AsyncStorage.removeItem(GEMINI_API_KEY_KEY);
    } catch (error) {
      console.error('清除 Gemini API Key 失敗:', error);
    }
  }
}

export default new SettingsService();

