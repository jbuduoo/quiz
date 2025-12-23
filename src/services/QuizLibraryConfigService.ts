import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import VersionConfigService from './VersionConfigService';

const QUIZ_LIBRARY_CONFIG_KEY = '@quiz:libraryConfig';

export interface QuizLibraryConfig {
  testName: string;
  enabled: boolean;
  displayName: string;
  displayOrder: number;
}

// 預設配置
const DEFAULT_CONFIG: QuizLibraryConfig[] = [
  {
    testName: 'IPAS_01',
    enabled: true,
    displayName: 'IPAS AI應用規劃師初級',
    displayOrder: 1,
  },
  {
    testName: 'IPAS_02',
    enabled: true,
    displayName: 'IPAS AI應用規劃師中級',
    displayOrder: 2,
  },
  {
    testName: 'JAVA',
    enabled: false,
    displayName: 'Java 程式設計認證',
    displayOrder: 3,
  },
];

class QuizLibraryConfigService {
  private config: QuizLibraryConfig[] = [];
  private lastFetchTime: number = 0;
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5分鐘快取
  private configFileExists: boolean | null = null; // null: 未檢查, true: 存在, false: 不存在

  /**
   * 從檔案載入配置
   */
  private async loadConfigFromFile(version: string): Promise<QuizLibraryConfig[] | null> {
    try {
      // 在 React Native 平台，使用 require
      if (Platform.OS !== 'web') {
        try {
          // 動態載入對應版本的配置檔案
          const configMap: Record<string, () => QuizLibraryConfig[]> = {
            'default': () => require('../../assets/config/versions/default/quiz-library-config.json'),
            'government-procurement': () => require('../../assets/config/versions/government-procurement/quiz-library-config.json'),
          };
          
          const loader = configMap[version];
          if (loader) {
            const fileConfig = loader();
            console.log(`✅ [QuizLibraryConfig] 從檔案載入配置 (${version}):`, fileConfig);
            return fileConfig;
          }
        } catch (error) {
          console.warn(`⚠️ [QuizLibraryConfig] 無法使用 require 載入配置 (${version}):`, error);
        }
      }

      // 在 Web 平台，使用 fetch
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const configPath = `/assets/config/versions/${version}/quiz-library-config.json`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超時
          
          const response = await fetch(`${configPath}?t=${Date.now()}`, {
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const fileConfig = await response.json();
            console.log(`✅ [QuizLibraryConfig] 從檔案載入配置 (${version}):`, fileConfig);
            return fileConfig;
          } else if (response.status === 404) {
            this.configFileExists = false;
          }
        } catch (error: any) {
          if (error?.name === 'AbortError' || error?.message?.includes('404') || error?.name === 'TypeError') {
            this.configFileExists = false;
          }
          console.warn(`⚠️ [QuizLibraryConfig] 無法使用 fetch 載入配置 (${version}):`, error);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [QuizLibraryConfig] 載入配置檔案失敗 (${version}):`, error);
    }
    return null;
  }

  /**
   * 載入配置（優先從檔案，失敗則使用本地）
   */
  async loadConfig(): Promise<QuizLibraryConfig[]> {
    try {
      // 取得當前版本
      const version = await VersionConfigService.getCurrentVersion();
      console.log(`📋 [QuizLibraryConfig] 當前版本: ${version}`);

      // 優先從檔案載入配置
      const fileConfig = await this.loadConfigFromFile(version);
      if (fileConfig) {
        this.config = fileConfig;
        // 更新 AsyncStorage 以保持同步
        await this.saveConfig(fileConfig);
        this.lastFetchTime = Date.now();
        this.configFileExists = true;
        console.log('✅ [QuizLibraryConfig] 使用檔案配置:', this.config);
        return this.config;
      }

      // 如果無法從檔案載入，嘗試從本地儲存載入
      try {
        const localConfig = await AsyncStorage.getItem(QUIZ_LIBRARY_CONFIG_KEY);
        if (localConfig) {
          this.config = JSON.parse(localConfig);
          console.log('✅ [QuizLibraryConfig] 從本地儲存載入配置:', this.config);
          return this.config;
        }
      } catch (error) {
        console.warn('⚠️ [QuizLibraryConfig] 無法從 AsyncStorage 載入配置:', error);
      }

      // 使用預設配置
      this.config = DEFAULT_CONFIG;
      await this.saveConfig(DEFAULT_CONFIG);
      console.log('✅ [QuizLibraryConfig] 使用預設配置:', this.config);
      return this.config;
    } catch (error) {
      console.error('❌ [QuizLibraryConfig] 載入題庫配置失敗:', error);
      return DEFAULT_CONFIG;
    }
  }

  /**
   * 儲存配置到本地
   */
  private async saveConfig(config: QuizLibraryConfig[]): Promise<void> {
    try {
      await AsyncStorage.setItem(QUIZ_LIBRARY_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('儲存題庫配置失敗:', error);
    }
  }

  /**
   * 取得啟用的題庫列表
   */
  async getEnabledTestNames(): Promise<string[]> {
    const config = await this.loadConfig();
    return config
      .filter(c => c.enabled)
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map(c => c.testName);
  }

  /**
   * 取得題庫顯示名稱
   */
  async getDisplayName(testName: string): Promise<string> {
    const config = await this.loadConfig();
    const item = config.find(c => c.testName === testName);
    return item?.displayName || testName;
  }

  /**
   * 取得所有配置（包含未啟用的）
   */
  async getAllConfig(): Promise<QuizLibraryConfig[]> {
    return await this.loadConfig();
  }

  /**
   * 檢查題庫是否啟用
   */
  async isTestNameEnabled(testName: string): Promise<boolean> {
    const config = await this.loadConfig();
    const item = config.find(c => c.testName === testName);
    return item?.enabled ?? false;
  }

  /**
   * 清除快取，強制重新載入
   */
  clearCache(): void {
    this.lastFetchTime = 0;
    this.config = [];
    this.configFileExists = null; // 重置文件存在狀態，下次會重新檢查
  }
}

export default new QuizLibraryConfigService();

