import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUIZ_LIBRARY_CONFIG_KEY = '@quiz:libraryConfig';
const REMOTE_CONFIG_URL = '/assets/config/quiz-library-config.json';

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

  /**
   * 載入配置（優先從遠端，失敗則使用本地）
   */
  async loadConfig(): Promise<QuizLibraryConfig[]> {
    try {
      // 嘗試從遠端載入（僅在 Web 平台）
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const now = Date.now();
        // 減少快取時間或強制重新載入（開發時可以設為 0 或更短）
        if (now - this.lastFetchTime > this.CACHE_DURATION || this.config.length === 0) {
          try {
            // 添加時間戳避免瀏覽器快取
            const response = await fetch(`${REMOTE_CONFIG_URL}?t=${now}`);
            if (response.ok) {
              const remoteConfig = await response.json();
              this.config = remoteConfig;
              await this.saveConfig(remoteConfig);
              this.lastFetchTime = now;
              console.log('✅ 從遠端載入題庫配置', remoteConfig);
              return this.config;
            }
          } catch (error) {
            console.warn('⚠️ 無法從遠端載入配置，使用本地配置:', error);
          }
        } else {
          // 使用快取的配置
          console.log('📦 使用快取的配置');
          return this.config;
        }
      }

      // 從本地儲存載入
      try {
        const localConfig = await AsyncStorage.getItem(QUIZ_LIBRARY_CONFIG_KEY);
        if (localConfig) {
          this.config = JSON.parse(localConfig);
          return this.config;
        }
      } catch (error) {
        console.warn('無法從 AsyncStorage 載入配置:', error);
      }

      // 使用預設配置
      this.config = DEFAULT_CONFIG;
      await this.saveConfig(DEFAULT_CONFIG);
      return this.config;
    } catch (error) {
      console.error('❌ 載入題庫配置失敗:', error);
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
  }
}

export default new QuizLibraryConfigService();

