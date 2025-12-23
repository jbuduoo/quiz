import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

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
   * 標準化配置格式：將物件或陣列統一轉換為陣列
   */
  private normalizeConfig(config: QuizLibraryConfig | QuizLibraryConfig[] | null | undefined): QuizLibraryConfig[] | null {
    if (!config) {
      return null;
    }
    
    // 如果是陣列，直接返回
    if (Array.isArray(config)) {
      return config;
    }
    
    // 如果是物件，轉換為陣列
    if (typeof config === 'object' && config !== null && 'testName' in config) {
      return [config as QuizLibraryConfig];
    }
    
    return null;
  }

  /**
   * 從 questions.json 載入配置（優先）
   */
  private async loadConfigFromQuestionsJson(): Promise<QuizLibraryConfig[] | null> {
    try {
      // 優先直接載入 questions.json（不依賴 QuestionService）
      if (Platform.OS !== 'web') {
        try {
          const questionsData = require('../../assets/data/questions/questions.json');
          const configData = questionsData?.config;
          
          // 支援新格式（扁平化）和舊格式（嵌套）
          let quizLibraryConfig: any = null;
          if (configData) {
            // 新格式：扁平化結構
            if (configData.displayName !== undefined) {
              quizLibraryConfig = {
                testName: configData.testName,
                enabled: configData.enabled !== undefined ? configData.enabled : true, // 預設為 true（啟用）
                displayName: configData.displayName,
                displayOrder: configData.displayOrder,
              };
            } 
            // 舊格式：嵌套結構
            else if (configData.quizLibraryConfig) {
              quizLibraryConfig = configData.quizLibraryConfig;
            }
          }
          // 向後相容：頂層 quizLibraryConfig
          else if (questionsData?.quizLibraryConfig) {
            quizLibraryConfig = questionsData.quizLibraryConfig;
          }
          
          if (quizLibraryConfig) {
            const normalized = this.normalizeConfig(quizLibraryConfig);
            if (normalized) {
              console.log(`✅ [QuizLibraryConfig] 從 questions.json 載入配置:`, normalized);
              return normalized;
            }
          }
        } catch (error) {
          console.warn(`⚠️ [QuizLibraryConfig] 無法從 questions.json require 載入配置:`, error);
        }
      }
      
      // Web 平台使用 fetch
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const questionsJsonPath = `/assets/assets/data/questions/questions.json`;
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 3000);
          
          const response = await fetch(`${questionsJsonPath}?t=${Date.now()}`, {
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);
          
          if (response.ok) {
            const questionsData = await response.json();
            const configData = questionsData?.config;
            
            // 支援新格式（扁平化）和舊格式（嵌套）
            let quizLibraryConfig: any = null;
            if (configData) {
              // 新格式：扁平化結構
              if (configData.displayName !== undefined) {
                quizLibraryConfig = {
                  testName: configData.testName,
                  enabled: configData.enabled,
                  displayName: configData.displayName,
                  displayOrder: configData.displayOrder,
                };
              } 
              // 舊格式：嵌套結構
              else if (configData.quizLibraryConfig) {
                quizLibraryConfig = configData.quizLibraryConfig;
              }
            }
            // 向後相容：頂層 quizLibraryConfig
            else if (questionsData?.quizLibraryConfig) {
              quizLibraryConfig = questionsData.quizLibraryConfig;
            }
            
            if (quizLibraryConfig) {
              const normalized = this.normalizeConfig(quizLibraryConfig);
              if (normalized) {
                console.log(`✅ [QuizLibraryConfig] 從 questions.json 載入配置:`, normalized);
                return normalized;
              }
            }
          }
        } catch (error: any) {
          if (error?.name === 'AbortError' || error?.message?.includes('404') || error?.name === 'TypeError') {
            // 檔案不存在，繼續嘗試其他方法
          }
          console.warn(`⚠️ [QuizLibraryConfig] 無法從 questions.json fetch 載入配置:`, error);
        }
      }
      
      // 如果直接載入失敗，嘗試從 QuestionService 的索引資料中取得配置（如果已載入）
      // 注意：QuestionService 已經會展開 config 物件並建立 quizLibraryConfig，所以這裡直接訪問即可
      try {
        const { default: QuestionService } = await import('./QuestionService');
        const indexData = (QuestionService as any).indexData;
        
        if (indexData) {
          // 優先使用 quizLibraryConfig（已由 expandConfig 建立），否則從扁平化欄位建立
          let quizLibraryConfig: any = null;
          if (indexData.quizLibraryConfig) {
            quizLibraryConfig = indexData.quizLibraryConfig;
          } else if (indexData.displayName !== undefined) {
            quizLibraryConfig = {
              testName: indexData.testName,
              enabled: indexData.enabled !== undefined ? indexData.enabled : true, // 預設為 true（啟用）
              displayName: indexData.displayName,
              displayOrder: indexData.displayOrder,
            };
          }
          
          if (quizLibraryConfig) {
            const normalized = this.normalizeConfig(quizLibraryConfig);
            if (normalized) {
              console.log(`✅ [QuizLibraryConfig] 從 QuestionService.indexData 載入配置:`, normalized);
              return normalized;
            }
          }
        }
      } catch (error) {
        // 忽略錯誤，繼續嘗試其他方法
      }
    } catch (error) {
      console.warn(`⚠️ [QuizLibraryConfig] 從 questions.json 載入配置失敗:`, error);
    }
    return null;
  }

  /**
   * 從獨立檔案載入配置（向後相容）
   */
  private async loadConfigFromFile(version: string): Promise<QuizLibraryConfig[] | null> {
    try {
      // 在 React Native 平台，使用 require
      if (Platform.OS !== 'web') {
        try {
          // 動態載入對應版本的配置檔案
          const configMap: Record<string, () => QuizLibraryConfig | QuizLibraryConfig[]> = {
            'default': () => require('../../assets/config/versions/default/quiz-library-config.json'),
            'government-procurement': () => require('../../assets/config/versions/government-procurement/quiz-library-config.json'),
          };
          
          const loader = configMap[version];
          if (loader) {
            const fileConfig = loader();
            const normalized = this.normalizeConfig(fileConfig);
            if (normalized) {
              console.log(`✅ [QuizLibraryConfig] 從獨立檔案載入配置 (${version}):`, normalized);
              return normalized;
            }
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
            const normalized = this.normalizeConfig(fileConfig);
            if (normalized) {
              console.log(`✅ [QuizLibraryConfig] 從獨立檔案載入配置 (${version}):`, normalized);
              return normalized;
            }
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
      // 優先從 questions.json 載入配置
      const questionsJsonConfig = await this.loadConfigFromQuestionsJson();
      if (questionsJsonConfig) {
        this.config = questionsJsonConfig;
        // 更新 AsyncStorage 以保持同步
        await this.saveConfig(questionsJsonConfig);
        this.lastFetchTime = Date.now();
        this.configFileExists = true;
        console.log('✅ [QuizLibraryConfig] 使用 questions.json 配置:', this.config);
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
      .filter(c => c.enabled !== false) // 預設為 true：undefined 或 true 都會通過
      .map(c => c.testName); // 不排序，保持配置中的順序（實際排序由 questionFiles 決定）
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
    return item?.enabled !== false; // 預設為 true：undefined 或 true 都返回 true
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

