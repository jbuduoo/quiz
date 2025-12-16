import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import SettingsService, { TextSize, Theme, UserSettings } from '../services/SettingsService';

interface ThemeContextType {
  textSize: TextSize;
  theme: Theme;
  textSizeValue: number;
  titleTextSizeValue: number;
  colors: {
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    primary: string;
    border: string;
    headerBackground: string;
    headerText: string;
  };
  updateTextSize: (size: TextSize) => Promise<void>;
  updateTheme: (theme: Theme) => Promise<void>;
  loadSettings: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// 淺色主題顏色
const lightColors = {
  background: '#F5F5F5',
  surface: '#FFFFFF',
  text: '#000000',
  textSecondary: '#666666',
  primary: '#007AFF',
  border: '#E5E5E5',
  headerBackground: '#007AFF',
  headerText: '#FFFFFF',
};

// 深色主題顏色
const darkColors = {
  background: '#121212',
  surface: '#1E1E1E',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  primary: '#0A84FF',
  border: '#333333',
  headerBackground: '#1E1E1E',
  headerText: '#FFFFFF',
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [textSize, setTextSize] = useState<TextSize>('medium');
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoading, setIsLoading] = useState(true);

  const loadSettings = async () => {
    try {
      const settings = await SettingsService.getSettings();
      setTextSize(settings.textSize);
      setTheme(settings.theme);
    } catch (error) {
      console.error('載入設定失敗:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const updateTextSize = async (size: TextSize) => {
    await SettingsService.setTextSize(size);
    setTextSize(size);
  };

  const updateTheme = async (newTheme: Theme) => {
    await SettingsService.setTheme(newTheme);
    setTheme(newTheme);
  };

  const textSizeValue = SettingsService.getTextSizeValue(textSize);
  const titleTextSizeValue = SettingsService.getTitleTextSizeValue(textSize);
  const colors = theme === 'light' ? lightColors : darkColors;

  const value: ThemeContextType = {
    textSize,
    theme,
    textSizeValue,
    titleTextSizeValue,
    colors,
    updateTextSize,
    updateTheme,
    loadSettings,
  };

  if (isLoading) {
    return null; // 或者返回一個載入中的組件
  }

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};





