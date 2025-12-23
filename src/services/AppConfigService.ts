import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const APP_CONFIG_KEY = '@quiz:appConfig';

export interface AppConfig {
  appName: string;
  enableImport: boolean;
  enableTrash: boolean;
  enableFavor: boolean;
  questionsPath: string;
  version: string;  // configVersion 的別名（向後相容）
}

const DEFAULT_CONFIG: AppConfig = {
  appName: 'WITS證照考試題庫',
  enableImport: true,
  enableTrash: true,
  enableFavor: false,
  questionsPath: 'default',
  version: 'default',
};

class AppConfigService {
  private config: AppConfig = DEFAULT_CONFIG;
  private initialized = false;

  /**
   * 從 questions.json 載入配置（優先）
   */
  private async loadConfigFromQuestionsJson(): Promise<AppConfig | null> {
    try {
      // 優先直接載入 questions.json（不依賴 QuestionService）
      if (Platform.OS !== 'web') {
        try {
          const questionsData = require('../../assets/data/questions/questions.json');
          const configData = questionsData?.config;
          
          // 支援新格式（扁平化）和舊格式（嵌套）
          let appConfig: any = null;
          if (configData) {
            // 新格式：扁平化結構
            if (configData.appName !== undefined) {
              appConfig = {
                appName: configData.appName,
                enableImport: configData.enableImport,
                enableTrash: configData.enableTrash,
                enableFavor: configData.enableFavor !== undefined ? configData.enableFavor : false,
                questionsPath: configData.configVersion || configData.questionsPath || 'default',
                version: configData.configVersion || 'default',
              };
            } 
            // 舊格式：嵌套結構
            else if (configData.appConfig) {
              appConfig = configData.appConfig;
            }
          }
          // 向後相容：頂層 appConfig
          else if (questionsData?.appConfig) {
            appConfig = questionsData.appConfig;
          }
          
          if (appConfig) {
            const config = {
              ...DEFAULT_CONFIG,
              ...appConfig,
            };
            console.log(`✅ [AppConfig] 從 questions.json 載入配置:`, config);
            return config;
          }
        } catch (error) {
          console.warn(`⚠️ [AppConfig] 無法從 questions.json require 載入配置:`, error);
        }
      }
      
      // Web 平台使用 fetch
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          const questionsJsonPath = `/assets/assets/data/questions/questions.json`;
          const response = await fetch(`${questionsJsonPath}?t=${Date.now()}`);
          if (response.ok) {
            const questionsData = await response.json();
            const configData = questionsData?.config;
            
            // 支援新格式（扁平化）和舊格式（嵌套）
            let appConfig: any = null;
            if (configData) {
              // 新格式：扁平化結構
              if (configData.appName !== undefined) {
                appConfig = {
                  appName: configData.appName,
                  enableImport: configData.enableImport,
                  enableTrash: configData.enableTrash,
                  enableFavor: configData.enableFavor !== undefined ? configData.enableFavor : false,
                  questionsPath: configData.configVersion || configData.questionsPath || 'default',
                  version: configData.configVersion || 'default',
                };
              } 
              // 舊格式：嵌套結構
              else if (configData.appConfig) {
                appConfig = configData.appConfig;
              }
            }
            // 向後相容：頂層 appConfig
            else if (questionsData?.appConfig) {
              appConfig = questionsData.appConfig;
            }
            
            if (appConfig) {
              const config = {
                ...DEFAULT_CONFIG,
                ...appConfig,
              };
              console.log(`✅ [AppConfig] 從 questions.json 載入配置:`, config);
              return config;
            }
          }
        } catch (error) {
          console.warn(`⚠️ [AppConfig] 無法從 questions.json fetch 載入配置:`, error);
        }
      }
      
      // 如果直接載入失敗，嘗試從 QuestionService 的索引資料中取得配置（如果已載入）
      // 注意：QuestionService 已經會展開 config 物件並建立 appConfig，所以這裡直接訪問即可
      try {
        const { default: QuestionService } = await import('./QuestionService');
        const indexData = (QuestionService as any).indexData;
        
        if (indexData) {
          // 優先使用 appConfig（已由 expandConfig 建立），否則從扁平化欄位建立
          let appConfig: any = null;
          if (indexData.appConfig) {
            appConfig = indexData.appConfig;
          } else if (indexData.appName !== undefined) {
            appConfig = {
              appName: indexData.appName,
              enableImport: indexData.enableImport,
              enableTrash: indexData.enableTrash,
              enableFavor: indexData.enableFavor !== undefined ? indexData.enableFavor : false,
              questionsPath: indexData.configVersion || 'default',
              version: indexData.configVersion || 'default',
            };
          }
          
          if (appConfig) {
            const config = {
              ...DEFAULT_CONFIG,
              ...appConfig,
            };
            console.log(`✅ [AppConfig] 從 QuestionService.indexData 載入配置:`, config);
            return config;
          }
        }
      } catch (error) {
        // 忽略錯誤，繼續嘗試其他方法
      }
    } catch (error) {
      console.warn(`⚠️ [AppConfig] 從 questions.json 載入配置失敗:`, error);
    }
    return null;
  }

  /**
   * 從獨立檔案載入配置（向後相容）
   */
  private async loadConfigFromFile(version: string): Promise<AppConfig | null> {
    try {
      // 在 React Native 平台，使用 require
      if (Platform.OS !== 'web') {
        try {
          // 動態載入對應版本的配置檔案
          const configMap: Record<string, () => AppConfig> = {
            'default': () => require('../../assets/config/versions/default/app-config.json'),
            'government-procurement': () => require('../../assets/config/versions/government-procurement/app-config.json'),
          };
          
          const loader = configMap[version];
          if (loader) {
            const fileConfig = loader();
            const config = {
              ...DEFAULT_CONFIG,
              ...fileConfig,
              version,
              questionsPath: version
            };
            console.log(`✅ [AppConfig] 從獨立檔案載入配置 (${version}):`, config);
            return config;
          }
        } catch (error) {
          console.warn(`⚠️ [AppConfig] 無法使用 require 載入配置 (${version}):`, error);
        }
      }

      // 在 Web 平台，使用 fetch
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        try {
          // Web 平台需要 /assets/assets/ 前綴（Metro bundler 會自動移除第一個 /assets/）
          const configPath = `/assets/assets/config/versions/${version}/app-config.json`;
          const response = await fetch(`${configPath}?t=${Date.now()}`);
          if (response.ok) {
            const fileConfig = await response.json();
            const config = {
              ...DEFAULT_CONFIG,
              ...fileConfig,
              version,
              questionsPath: version
            };
            console.log(`✅ [AppConfig] 從獨立檔案載入配置 (${version}):`, config);
            return config;
          }
        } catch (error) {
          console.warn(`⚠️ [AppConfig] 無法使用 fetch 載入配置 (${version}):`, error);
        }
      }
    } catch (error) {
      console.warn(`⚠️ [AppConfig] 載入配置檔案失敗 (${version}):`, error);
    }
    return null;
  }

  async loadConfig(): Promise<AppConfig> {
    if (this.initialized) {
      return this.config;
    }

    try {
      // 優先從 questions.json 載入配置
      const questionsJsonConfig = await this.loadConfigFromQuestionsJson();
      if (questionsJsonConfig) {
        this.config = questionsJsonConfig;
        // 更新 AsyncStorage 以保持同步
        await this.saveConfig(this.config);
        this.initialized = true;
        console.log('✅ [AppConfig] 使用 questions.json 配置:', this.config);
        return this.config;
      }

      // 如果無法從檔案載入，嘗試從本地儲存載入
      try {
        const localConfig = await AsyncStorage.getItem(APP_CONFIG_KEY);
        if (localConfig) {
          const parsed = JSON.parse(localConfig);
          this.config = parsed;
          this.initialized = true;
          console.log('✅ [AppConfig] 從本地儲存載入配置:', this.config);
          return this.config;
        }
      } catch (error) {
        console.warn('⚠️ [AppConfig] 無法從 AsyncStorage 載入配置:', error);
      }

      // 使用預設配置
      this.config = DEFAULT_CONFIG;
      await this.saveConfig(this.config);
      this.initialized = true;
      console.log('✅ [AppConfig] 使用預設配置:', this.config);
      return this.config;
    } catch (error) {
      console.error('❌ [AppConfig] 載入應用程式配置失敗:', error);
      return DEFAULT_CONFIG;
    }
  }

  private async saveConfig(config: AppConfig): Promise<void> {
    try {
      await AsyncStorage.setItem(APP_CONFIG_KEY, JSON.stringify(config));
    } catch (error) {
      console.error('儲存應用程式配置失敗:', error);
    }
  }

  async getConfig(): Promise<AppConfig> {
    return await this.loadConfig();
  }

  clearCache(): void {
    this.initialized = false;
    this.config = DEFAULT_CONFIG;
  }
}

export default new AppConfigService();

