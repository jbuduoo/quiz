import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { TestName } from '../types';
import QuestionService from '../services/QuestionService';
import SettingsService from '../services/SettingsService';
import { useTheme } from '../contexts/ThemeContext';
import { getTestNameDisplay } from '../utils/nameMapper';

interface TestNameSelectorModalProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (testName: string) => void;
  currentTestName: string;
  canClose?: boolean; // 是否可以關閉 Modal（首次載入時不可關閉）
}

const TestNameSelectorModal: React.FC<TestNameSelectorModalProps> = ({
  visible,
  onClose,
  onSelect,
  currentTestName,
  canClose = true,
}) => {
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();
  const [testNames, setTestNames] = useState<TestName[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (visible) {
      loadTestNames();
    }
  }, [visible]);

  const loadTestNames = async () => {
    setLoading(true);
    try {
      await QuestionService.initializeData();
      const testNamesData = await QuestionService.getTestNames();
      setTestNames(testNamesData);
    } catch (error) {
      console.error('載入證照列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = async (testName: string) => {
    // 儲存選擇的證照
    await SettingsService.setSelectedTestName(testName);
    onSelect(testName);
    onClose();
  };

  const renderTestNameItem = ({ item }: { item: TestName }) => {
    const isSelected = item.name === currentTestName;
    
    return (
      <TouchableOpacity
        style={[
          styles.testNameItem,
          {
            backgroundColor: colors.surface,
            borderColor: isSelected ? colors.primary : colors.border,
            borderWidth: isSelected ? 2 : 1,
          },
        ]}
        onPress={() => handleSelect(item.name)}
      >
        <View style={styles.testNameContent}>
          <View style={styles.testNameContainer}>
            <Text
              style={[
                styles.testNameText,
                {
                  color: colors.text,
                  fontSize: textSizeValue,
                  fontWeight: isSelected ? '600' : '400',
                },
              ]}
            >
              {getTestNameDisplay(item.name)}
            </Text>
            <View
              style={[
                styles.questionCountBadge,
                { backgroundColor: 'transparent' },
              ]}
            >
              <Text
                style={[
                  styles.questionCountText,
                  { fontSize: textSizeValue - 2 },
                ]}
              >
                ({item.totalQuestions})
              </Text>
            </View>
            {isSelected && (
              <Text style={[styles.checkmark, { color: colors.primary }]}>
                ✓
              </Text>
            )}
          </View>
          <View style={styles.progressContainer}>
            <Text
              style={[
                styles.progressText,
                {
                  color: colors.textSecondary,
                  fontSize: textSizeValue - 2,
                },
              ]}
            >
              {item.completionPercentage}%
            </Text>
          </View>
        </View>
        {item.totalQuestions > 0 && (
          <View
            style={[
              styles.progressBarContainer,
              { backgroundColor: colors.border },
            ]}
          >
            <View
              style={[
                styles.progressBar,
                {
                  width: `${item.completionPercentage}%`,
                  backgroundColor: colors.primary,
                },
              ]}
            />
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
              選擇證照
            </Text>
            {canClose && (
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
            )}
            {!canClose && <View style={styles.closeButton} />}
          </View>

          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : (
            <FlatList
              data={testNames}
              renderItem={renderTestNameItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.listContent}
            />
          )}
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
  loadingContainer: {
    padding: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  testNameItem: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  testNameContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  testNameText: {
    fontWeight: '600',
  },
  questionCountBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  questionCountText: {
    color: '#000000',
    fontWeight: '600',
  },
  checkmark: {
    marginLeft: 8,
    fontSize: 18,
    fontWeight: 'bold',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default TestNameSelectorModal;

