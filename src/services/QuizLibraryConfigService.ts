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
  private configFileExists: boolean | null = null; // null: 未檢查, true: 存在, false: 不存在

  /**
   * 載入配置（優先從遠端，失敗則使用本地）
   */
  async loadConfig(): Promise<QuizLibraryConfig[]> {
    try {
      // 嘗試從遠端載入（僅在 Web 平台）
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const now = Date.now();
        // 如果之前確認配置文件不存在，直接跳過遠端載入
        if (this.configFileExists === false) {
          // 配置文件不存在，直接使用本地配置
        } else if (now - this.lastFetchTime > this.CACHE_DURATION || this.config.length === 0) {
          try {
            // 嘗試載入遠端配置
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000); // 3秒超時
            
            const response = await fetch(`${REMOTE_CONFIG_URL}?t=${now}`, {
              signal: controller.signal,
            });
            
            clearTimeout(timeoutId);
            
            if (response.ok) {
              const remoteConfig = await response.json();
              this.config = remoteConfig;
              await this.saveConfig(remoteConfig);
              this.lastFetchTime = now;
              this.configFileExists = true;
              console.log('✅ 從遠端載入題庫配置', remoteConfig);
              return this.config;
            } else if (response.status === 404) {
              // 配置文件不存在，記錄狀態，避免重複請求
              this.configFileExists = false;
            }
          } catch (error: any) {
            // 網絡錯誤、超時或其他錯誤，靜默處理
            // 如果是 404 或超時，記錄狀態
            if (error?.name === 'AbortError' || error?.message?.includes('404') || error?.name === 'TypeError') {
              this.configFileExists = false;
            }
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
    this.configFileExists = null; // 重置文件存在狀態，下次會重新檢查
  }
}

export default new QuizLibraryConfigService();

