import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { TextSize, Theme } from '../services/SettingsService';
import SettingsService from '../services/SettingsService';
import GeminiService from '../services/GeminiService';

interface SettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ visible, onClose }) => {
  const {
    textSize,
    theme,
    textSizeValue,
    titleTextSizeValue,
    colors,
    updateTextSize,
    updateTheme,
  } = useTheme();
  
  const [geminiApiKey, setGeminiApiKey] = useState('');
  const [isSavingApiKey, setIsSavingApiKey] = useState(false);

  useEffect(() => {
    if (visible) {
      loadApiKey();
    }
  }, [visible]);

  const loadApiKey = async () => {
    try {
      const savedKey = await SettingsService.getGeminiApiKey();
      if (savedKey) {
        setGeminiApiKey(savedKey);
      } else {
        setGeminiApiKey('');
      }
    } catch (error) {
      console.error('載入 API Key 失敗:', error);
    }
  };

  const handleSaveApiKey = async () => {
    if (!geminiApiKey.trim()) {
      Alert.alert('錯誤', '請輸入 Gemini API Key');
      return;
    }

    setIsSavingApiKey(true);
    try {
      await GeminiService.setApiKey(geminiApiKey.trim());
      Alert.alert('成功', 'API Key 已儲存');
    } catch (error) {
      Alert.alert('錯誤', '儲存 API Key 失敗');
    } finally {
      setIsSavingApiKey(false);
    }
  };

  const handleClearApiKey = async () => {
    Alert.alert(
      '確認',
      '確定要清除 API Key 嗎？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          style: 'destructive',
          onPress: async () => {
            await SettingsService.clearGeminiApiKey();
            setGeminiApiKey('');
            await GeminiService.setApiKey('');
            Alert.alert('成功', 'API Key 已清除');
          },
        },
      ]
    );
  };

  const textSizeOptions: { label: string; value: TextSize }[] = [
    { label: '小', value: 'small' },
    { label: '中', value: 'medium' },
    { label: '大', value: 'large' },
  ];

  const themeOptions: { label: string; value: Theme }[] = [
    { label: '淺色', value: 'light' },
    { label: '深色', value: 'dark' },
  ];

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
            },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: colors.border },
            ]}
          >
            <Text
              style={[
                styles.modalTitle,
                {
                  color: colors.text,
                  fontSize: titleTextSizeValue,
                },
              ]}
            >
              設定
            </Text>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
            >
              <Text
                style={[
                  styles.closeButtonText,
                  {
                    color: colors.text,
                    fontSize: titleTextSizeValue,
                  },
                ]}
              >
                ✕
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
          >
            {/* 文字大小設定 */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.text,
                    fontSize: textSizeValue,
                  },
                ]}
              >
                文字大小
              </Text>
              <View style={styles.optionsContainer}>
                {textSizeOptions.map((option) => {
                  const isSelected = textSize === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.background,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      onPress={() => updateTextSize(option.value)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : colors.text,
                            fontSize: textSizeValue,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <View style={styles.previewContainer}>
                <Text
                  style={[
                    styles.previewText,
                    {
                      color: colors.textSecondary,
                      fontSize: textSizeValue - 2,
                    },
                  ]}
                >
                  預覽：這是文字大小範例
                </Text>
                <Text
                  style={[
                    styles.previewText,
                    {
                      color: colors.text,
                      fontSize: textSizeValue,
                    },
                  ]}
                >
                  這是文字大小範例
                </Text>
              </View>
            </View>

            {/* 明暗模式設定 */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.text,
                    fontSize: textSizeValue,
                  },
                ]}
              >
                明暗模式
              </Text>
              <View style={styles.optionsContainer}>
                {themeOptions.map((option) => {
                  const isSelected = theme === option.value;
                  return (
                    <TouchableOpacity
                      key={option.value}
                      style={[
                        styles.optionButton,
                        {
                          backgroundColor: isSelected
                            ? colors.primary
                            : colors.background,
                          borderColor: isSelected
                            ? colors.primary
                            : colors.border,
                        },
                      ]}
                      onPress={() => updateTheme(option.value)}
                    >
                      <Text
                        style={[
                          styles.optionText,
                          {
                            color: isSelected
                              ? '#FFFFFF'
                              : colors.text,
                            fontSize: textSizeValue,
                          },
                        ]}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Gemini API Key 設定 */}
            <View style={styles.section}>
              <Text
                style={[
                  styles.sectionTitle,
                  {
                    color: colors.text,
                    fontSize: textSizeValue,
                  },
                ]}
              >
                Gemini API Key
              </Text>
              <Text
                style={[
                  styles.sectionDescription,
                  {
                    color: colors.textSecondary,
                    fontSize: textSizeValue - 2,
                  },
                ]}
              >
                輸入您的 Google Gemini API Key 以啟用 AI 功能
              </Text>
              <TextInput
                style={[
                  styles.apiKeyInput,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                    color: colors.text,
                    fontSize: textSizeValue - 2,
                  },
                ]}
                value={geminiApiKey}
                onChangeText={setGeminiApiKey}
                placeholder="請輸入 Gemini API Key"
                placeholderTextColor={colors.textSecondary}
                secureTextEntry={true}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.apiKeyButtons}>
                <TouchableOpacity
                  style={[
                    styles.apiKeyButton,
                    styles.apiKeyButtonSave,
                    {
                      backgroundColor: colors.primary,
                    },
                  ]}
                  onPress={handleSaveApiKey}
                  disabled={isSavingApiKey}
                >
                  <Text
                    style={[
                      styles.apiKeyButtonText,
                      {
                        color: '#FFFFFF',
                        fontSize: textSizeValue - 2,
                      },
                    ]}
                  >
                    {isSavingApiKey ? '儲存中...' : '儲存'}
                  </Text>
                </TouchableOpacity>
                {geminiApiKey && (
                  <TouchableOpacity
                    style={[
                      styles.apiKeyButton,
                      styles.apiKeyButtonClear,
                      {
                        backgroundColor: colors.background,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={handleClearApiKey}
                  >
                    <Text
                      style={[
                        styles.apiKeyButtonText,
                        {
                          color: colors.text,
                          fontSize: textSizeValue - 2,
                        },
                      ]}
                    >
                      清除
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontWeight: '600',
  },
  closeButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  optionButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontWeight: '500',
  },
  previewContainer: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
  },
  previewText: {
    marginBottom: 4,
  },
  sectionDescription: {
    marginBottom: 8,
    lineHeight: 20,
  },
  apiKeyInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    marginBottom: 12,
    fontFamily: 'monospace',
  },
  apiKeyButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  apiKeyButton: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  apiKeyButtonSave: {
    // backgroundColor set dynamically
  },
  apiKeyButtonClear: {
    borderWidth: 1,
  },
  apiKeyButtonText: {
    fontWeight: '500',
  },
});

export default SettingsModal;

