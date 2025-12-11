/**
 * Gemini AI 服務
 * 使用 Google Gemini API 提供 AI 功能
 */

import SettingsService from './SettingsService';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent';

export interface GeminiResponse {
  text: string;
  error?: string;
}

class GeminiService {
  private apiKey: string | null = null;
  private initialized: boolean = false;

  constructor() {
    // 從環境變數或設定服務載入 API Key
    this.loadApiKey();
  }

  /**
   * 載入 API Key
   */
  private async loadApiKey(): Promise<void> {
    if (this.initialized) return;
    
    // 優先從環境變數讀取
    const envKey = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
    if (envKey) {
      this.apiKey = envKey;
      this.initialized = true;
      return;
    }

    // 從設定服務讀取
    try {
      const savedKey = await SettingsService.getGeminiApiKey();
      if (savedKey) {
        this.apiKey = savedKey;
      }
    } catch (error) {
      console.error('載入 Gemini API Key 失敗:', error);
    }
    
    this.initialized = true;
  }

  /**
   * 設定 API Key
   */
  async setApiKey(apiKey: string): Promise<void> {
    this.apiKey = apiKey;
    // 同時儲存到設定服務
    await SettingsService.setGeminiApiKey(apiKey);
  }

  /**
   * 檢查 API Key 是否已設定
   */
  hasApiKey(): boolean {
    return !!this.apiKey && this.apiKey.trim() !== '';
  }

  /**
   * 發送請求到 Gemini API
   */
  private async sendRequest(prompt: string): Promise<GeminiResponse> {
    // 確保已載入 API Key
    if (!this.initialized) {
      await this.loadApiKey();
    }

    if (!this.hasApiKey()) {
      return {
        text: '',
        error: 'Gemini API Key 未設定，請在設定頁面輸入 API Key',
      };
    }

    try {
      const response = await fetch(
        `${GEMINI_API_URL}?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    text: prompt,
                  },
                ],
              },
            ],
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          text: '',
          error: `API 請求失敗: ${response.status} ${errorData.error?.message || response.statusText}`,
        };
      }

      const data = await response.json();
      
      if (data.candidates && data.candidates[0] && data.candidates[0].content) {
        const text = data.candidates[0].content.parts[0].text;
        return { text };
      }

      return {
        text: '',
        error: 'API 回應格式錯誤',
      };
    } catch (error) {
      return {
        text: '',
        error: `請求失敗: ${error instanceof Error ? error.message : '未知錯誤'}`,
      };
    }
  }

  /**
   * 生成題目詳解
   */
  async generateExplanation(question: string, options: { A: string; B: string; C: string; D: string }, correctAnswer: string): Promise<GeminiResponse> {
    const prompt = `請為以下題目提供詳細的解釋：

題目：${question}

選項：
A. ${options.A}
B. ${options.B}
C. ${options.C}
D. ${options.D}

正確答案：${correctAnswer}

請用繁體中文詳細解釋為什麼答案是 ${correctAnswer}，並說明其他選項為什麼錯誤。`;

    return this.sendRequest(prompt);
  }

  /**
   * 生成學習建議
   */
  async generateStudySuggestion(subject: string, wrongCount: number, totalCount: number): Promise<GeminiResponse> {
    const accuracy = totalCount > 0 ? ((totalCount - wrongCount) / totalCount * 100).toFixed(1) : '0';
    
    const prompt = `我目前在學習「${subject}」這個科目，總共做了 ${totalCount} 題，錯了 ${wrongCount} 題，正確率是 ${accuracy}%。

請用繁體中文給我一些學習建議，包括：
1. 針對錯誤題目的學習重點
2. 建議的複習方法
3. 需要加強的知識點

請用友善、鼓勵的語氣回答。`;

    return this.sendRequest(prompt);
  }

  /**
   * 回答問題（通用方法）
   */
  async askQuestion(question: string): Promise<GeminiResponse> {
    const prompt = `請用繁體中文回答以下問題，回答要簡潔明確：

${question}`;

    return this.sendRequest(prompt);
  }
}

export default new GeminiService();

