import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import {
  ImportedQuestionData,
  parseSource,
  importQuestionFile,
} from '../services/ImportService';
import QuestionService from '../services/QuestionService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ImportConfigRouteProp = RNRouteProp<RootStackParamList, 'ImportConfig'>;

const ImportConfigScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ImportConfigRouteProp>();
  const { questionData, downloadUrl } = route.params;
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();

  // 從 source 自動解析
  const parsedSource = questionData.source
    ? parseSource(questionData.source)
    : { testName: '', subject: null, series_no: '' };

  const [testName, setTestName] = useState(parsedSource.testName);
  const [subject, setSubject] = useState(parsedSource.subject || '');
  const [seriesNo, setSeriesNo] = useState(parsedSource.series_no);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const questionCount = questionData.questions?.length || 0;

  // 預覽前 3 題
  const previewQuestions = questionData.questions?.slice(0, 3) || [];

  const handleImport = async () => {
    // 驗證輸入
    if (!testName.trim()) {
      Alert.alert('錯誤', '請輸入測驗名稱');
      return;
    }
    if (!seriesNo.trim()) {
      Alert.alert('錯誤', '請輸入期數');
      return;
    }

    try {
      setImporting(true);

      await importQuestionFile(
        questionData,
        testName.trim(),
        subject.trim() || null,
        seriesNo.trim()
      );

      // 合併匯入索引
      await QuestionService.mergeImportedIndex();

      // 標記為成功
      setImportSuccess(true);

      // 顯示成功提示視窗
      Alert.alert(
        '匯入成功',
        `已成功匯入 ${questionCount} 題題庫`,
        [
          {
            text: '確定',
            onPress: () => {
              navigation.goBack();
              navigation.goBack(); // 返回兩層（ImportConfig -> ImportWebView -> 上一頁）
            },
          },
        ]
      );
    } catch (error) {
      console.error('匯入失敗:', error);
      Alert.alert(
        '匯入失敗',
        error instanceof Error ? error.message : '無法匯入題庫',
        [{ text: '確定' }]
      );
    } finally {
      setImporting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={[styles.backButtonText, { color: colors.headerText, fontSize: textSizeValue }]}>
            ← 返回
          </Text>
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.headerText, fontSize: titleTextSizeValue },
          ]}
        >
          匯入設定
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* 題庫資訊 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: textSizeValue + 2 }]}>
            題庫資訊
          </Text>
          {questionData.source && (
            <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: textSizeValue }]}>
              來源：{questionData.source}
            </Text>
          )}
          <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: textSizeValue }]}>
            題數：{questionCount} 題
          </Text>
          {questionData.importDate && (
            <Text style={[styles.infoText, { color: colors.textSecondary, fontSize: textSizeValue }]}>
              匯入日期：{questionData.importDate}
            </Text>
          )}
        </View>

        {/* 匯入設定 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: textSizeValue + 2 }]}>
            匯入設定
          </Text>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: textSizeValue }]}>
              測驗名稱 *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: textSizeValue,
                },
              ]}
              value={testName}
              onChangeText={setTestName}
              placeholder="例如：IPAS_02"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: textSizeValue }]}>
              科目（選填）
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: textSizeValue,
                },
              ]}
              value={subject}
              onChangeText={setSubject}
              placeholder="例如：L21"
              placeholderTextColor={colors.textSecondary}
            />
            <Text style={[styles.hint, { color: colors.textSecondary, fontSize: textSizeValue - 2 }]}>
              如果沒有科目，請留空
            </Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.text, fontSize: textSizeValue }]}>
              期數 *
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: textSizeValue,
                },
              ]}
              value={seriesNo}
              onChangeText={setSeriesNo}
              placeholder="例如：11411"
              placeholderTextColor={colors.textSecondary}
            />
          </View>
        </View>

        {/* 題目預覽 */}
        {previewQuestions.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.surface }]}>
            <Text style={[styles.sectionTitle, { color: colors.text, fontSize: textSizeValue + 2 }]}>
              題目預覽（前 3 題）
            </Text>
            {previewQuestions.map((q: any, index: number) => (
              <View key={index} style={styles.previewItem}>
                <Text style={[styles.previewQuestionNumber, { color: colors.primary, fontSize: textSizeValue }]}>
                  第 {index + 1} 題
                </Text>
                <Text
                  style={[styles.previewQuestion, { color: colors.text, fontSize: textSizeValue }]}
                  numberOfLines={2}
                >
                  {q.Q || q.content || '無題目內容'}
                </Text>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* 底部按鈕 */}
      <View style={[styles.footer, { backgroundColor: colors.surface, borderTopColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.importButton,
            {
              backgroundColor: importSuccess || importing 
                ? colors.textSecondary 
                : colors.primary,
              opacity: importSuccess || importing ? 0.6 : 1,
            },
          ]}
          onPress={handleImport}
          disabled={importing || importSuccess}
        >
          {importing ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : importSuccess ? (
            <Text style={[styles.importButtonText, { fontSize: textSizeValue }]}>
              ✓ 已匯入
            </Text>
          ) : (
            <Text style={[styles.importButtonText, { fontSize: textSizeValue }]}>
              確認匯入
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  backButton: {
    padding: 8,
  },
  backButtonText: {
    fontWeight: '600',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  headerRight: {
    width: 60,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  section: {
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  sectionTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  infoText: {
    marginBottom: 8,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  hint: {
    marginTop: 4,
    fontStyle: 'italic',
  },
  previewItem: {
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  previewQuestionNumber: {
    fontWeight: '600',
    marginBottom: 4,
  },
  previewQuestion: {
    lineHeight: 20,
  },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
  },
  importButton: {
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  importButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ImportConfigScreen;

