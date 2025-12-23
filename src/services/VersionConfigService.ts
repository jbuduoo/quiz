import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const VERSION_CONFIG_KEY = '@quiz:versionConfig';

// 預設版本（已簡化，不再需要版本概念）
const DEFAULT_VERSION = 'default';

class VersionConfigService {
  private currentVersion: string = DEFAULT_VERSION;
  private initialized = false;

  /**
   * 從檔案載入版本設定（已簡化，不再需要版本檔案）
   */
  private async loadVersionFromFile(): Promise<string | null> {
    // 不再需要從檔案載入版本，直接返回 null
    // 版本概念已移除，所有配置都在 questions.json 中
    return null;
  }

  /**
   * 載入當前版本設定
   */
  async loadVersion(): Promise<string> {
    // 如果已經初始化，檢查檔案版本是否有變更
    if (this.initialized) {
      try {
        const fileVersion = await this.loadVersionFromFile();
        if (fileVersion && fileVersion !== this.currentVersion) {
          console.log(`🔄 [VersionConfig] 檢測到版本變更: ${this.currentVersion} -> ${fileVersion}`);
          this.currentVersion = fileVersion;
          await this.saveVersion(this.currentVersion);
          return this.currentVersion;
        }
      } catch (error) {
        // 忽略檢查錯誤，使用當前版本
      }
      return this.currentVersion;
    }

    try {
      // 優先從檔案載入版本配置
      const fileVersion = await this.loadVersionFromFile();
      if (fileVersion) {
        this.currentVersion = fileVersion;
        // 更新 AsyncStorage 以保持同步
        await this.saveVersion(this.currentVersion);
        this.initialized = true;
        console.log(`✅ [VersionConfig] 使用檔案版本: ${this.currentVersion}`);
        return this.currentVersion;
      }

      // 如果無法從檔案載入，檢查 AsyncStorage 中的版本
      try {
        const localVersion = await AsyncStorage.getItem(VERSION_CONFIG_KEY);
        if (localVersion) {
          // 即使從 AsyncStorage 載入，也記錄警告
          console.warn(`⚠️ [VersionConfig] 無法從檔案載入，使用本地儲存版本: ${localVersion}`);
          this.currentVersion = localVersion;
          this.initialized = true;
          return this.currentVersion;
        }
      } catch (error) {
        console.warn('⚠️ [VersionConfig] 無法從 AsyncStorage 載入版本:', error);
      }

      // 使用預設版本
      console.warn(`⚠️ [VersionConfig] 無法載入版本配置，使用預設版本: ${DEFAULT_VERSION}`);
      this.currentVersion = DEFAULT_VERSION;
      await this.saveVersion(DEFAULT_VERSION);
      this.initialized = true;
      return this.currentVersion;
    } catch (error) {
      console.error('❌ [VersionConfig] 載入版本配置失敗:', error);
      return DEFAULT_VERSION;
    }
  }

  /**
   * 儲存版本設定
   */
  private async saveVersion(version: string): Promise<void> {
    try {
      await AsyncStorage.setItem(VERSION_CONFIG_KEY, version);
    } catch (error) {
      console.error('儲存版本配置失敗:', error);
    }
  }

  /**
   * 取得當前版本
   */
  async getCurrentVersion(): Promise<string> {
    return await this.loadVersion();
  }

  /**
   * 取得應用程式配置檔案路徑（運行時）
   */
  async getAppConfigPath(): Promise<string> {
    const version = await this.getCurrentVersion();
    return `/assets/config/versions/${version}/app-config.json`;
  }

  /**
   * 取得題庫配置檔案路徑（運行時）
   */
  async getQuizLibraryConfigPath(): Promise<string> {
    const version = await this.getCurrentVersion();
    return `/assets/config/versions/${version}/quiz-library-config.json`;
  }

  /**
   * 取得題目資料目錄路徑（運行時）
   */
  async getQuestionsDataPath(): Promise<string> {
    return `assets/data/questions`;
  }

  /**
   * 取得索引檔案路徑（React Native require）
   * 注意：Metro bundler 需要靜態路徑，實際使用時會透過版本映射
   */
  async getIndexFilePath(): Promise<string> {
    return `../../assets/data/questions/questions.json`;
  }

  /**
   * 取得索引檔案 URL（Web fetch 路徑）
   */
  async getIndexFileUrl(): Promise<string> {
    return `/assets/assets/data/questions/questions.json`;
  }

  /**
   * 清除快取，強制重新載入
   */
  clearCache(): void {
    this.initialized = false;
    this.currentVersion = DEFAULT_VERSION;
  }
}

export default new VersionConfigService();

