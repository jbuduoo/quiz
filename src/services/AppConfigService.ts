import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import VersionConfigService from './VersionConfigService';

const APP_CONFIG_KEY = '@quiz:appConfig';

export interface AppConfig {
  appName: string;
  enableImport: boolean;
  enableTrash: boolean;
  questionsPath: string;
  version: string;
}

const DEFAULT_CONFIG: AppConfig = {
  appName: 'WITS證照考試題庫',
  enableImport: true,
  enableTrash: true,
  questionsPath: 'default',
  version: 'default',
};

class AppConfigService {
  private config: AppConfig = DEFAULT_CONFIG;
  private initialized = false;

  /**
   * 從檔案載入配置
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
            console.log(`✅ [AppConfig] 從檔案載入配置 (${version}):`, config);
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
            console.log(`✅ [AppConfig] 從檔案載入配置 (${version}):`, config);
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
      // 先取得當前版本
      const version = await VersionConfigService.getCurrentVersion();
      console.log(`📋 [AppConfig] 當前版本: ${version}`);

      // 優先從檔案載入配置
      const fileConfig = await this.loadConfigFromFile(version);
      if (fileConfig) {
        this.config = fileConfig;
        // 更新 AsyncStorage 以保持同步
        await this.saveConfig(this.config);
        this.initialized = true;
        console.log('✅ [AppConfig] 使用檔案配置:', this.config);
        return this.config;
      }

      // 如果無法從檔案載入，嘗試從本地儲存載入
      try {
        const localConfig = await AsyncStorage.getItem(APP_CONFIG_KEY);
        if (localConfig) {
          const parsed = JSON.parse(localConfig);
          // 檢查版本是否一致
          if (parsed.version === version) {
            this.config = parsed;
            this.initialized = true;
            console.log('✅ [AppConfig] 從本地儲存載入配置:', this.config);
            return this.config;
          } else {
            // 版本不一致，需要重新載入
            console.log(`🔄 [AppConfig] 版本已變更: ${parsed.version} -> ${version}，重新載入配置`);
          }
        }
      } catch (error) {
        console.warn('⚠️ [AppConfig] 無法從 AsyncStorage 載入配置:', error);
      }

      // 使用預設配置（帶版本資訊）
      this.config = {
        ...DEFAULT_CONFIG,
        version,
        questionsPath: version
      };
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

