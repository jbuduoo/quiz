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
  Platform,
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { TextSize, Theme } from '../services/SettingsService';
import SettingsService from '../services/SettingsService';

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
      visible={Boolean(visible)}
      transparent={Boolean(true)}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityViewIsModal={Boolean(true)}
      {...(Platform.OS === 'web' ? {
        // Web 平台：使用 pointer-events 來防止背景交互，而不是 aria-hidden
        // 這樣可以避免無障礙警告
      } : {})}
    >
      <View 
        style={styles.modalOverlay}
        {...(Platform.OS === 'web' ? {
          // 在 Web 上，確保背景層不會阻止焦點
          accessibilityRole: 'none',
        } : {})}
      >
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
                調字體大小
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
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 4px rgba(0, 0, 0, 0.25)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    }),
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
});

export default SettingsModal;

