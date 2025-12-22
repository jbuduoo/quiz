import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import {
  ImportedQuestionData,
  importQuestionFile,
} from '../services/ImportService';
import QuestionService from '../services/QuestionService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ImportConfigRouteProp = RNRouteProp<RootStackParamList, 'ImportConfig'>;

// 從檔案名稱提取名稱（移除副檔名）
const getFileNameFromUrl = (url: string): string => {
  try {
    // 如果是 URL，嘗試從路徑中提取檔名
    if (url.includes('/')) {
      const urlObj = new URL(url);
      const pathname = urlObj.pathname;
      let fileName = pathname.split('/').pop() || url;
      // 解碼 URL 編碼的檔案名稱
      try {
        fileName = decodeURIComponent(fileName);
      } catch {
        // 如果解碼失敗，使用原始檔名
      }
      return fileName.replace(/\.(json|xlsx|txt)$/i, '');
    }
    // 如果已經是檔名，嘗試解碼並移除副檔名
    try {
      const decoded = decodeURIComponent(url);
      return decoded.replace(/\.(json|xlsx|txt)$/i, '');
    } catch {
      return url.replace(/\.(json|xlsx|txt)$/i, '');
    }
  } catch {
    // 如果解析失敗，嘗試解碼並移除副檔名
    try {
      const decoded = decodeURIComponent(url);
      return decoded.replace(/\.(json|xlsx|txt)$/i, '');
    } catch {
      return url.replace(/\.(json|xlsx|txt)$/i, '');
    }
  }
};

const ImportConfigScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ImportConfigRouteProp>();
  const { questionData: initialQuestionData, downloadUrl: initialDownloadUrl } = route.params || {};
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();

  // 使用狀態來管理 questionData 和 downloadUrl，以便本地匯入時更新
  const [questionData, setQuestionData] = useState<ImportedQuestionData | undefined>(initialQuestionData);
  const [downloadUrl, setDownloadUrl] = useState<string | undefined>(initialDownloadUrl);

  // 從 downloadUrl 提取檔案名稱
  const fileName = downloadUrl ? getFileNameFromUrl(downloadUrl) : 'IMPORTED';

  const [testName, setTestName] = useState(fileName);

  // 當 downloadUrl 改變時，自動更新 testName
  useEffect(() => {
    if (downloadUrl) {
      const extractedName = getFileNameFromUrl(downloadUrl);
      setTestName(extractedName);
    }
  }, [downloadUrl]);

  // 當初始參數改變時，更新狀態
  useEffect(() => {
    if (initialQuestionData) {
      setQuestionData(initialQuestionData);
    }
    if (initialDownloadUrl) {
      setDownloadUrl(initialDownloadUrl);
    }
  }, [initialQuestionData, initialDownloadUrl]);

  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState(false);

  const questionCount = questionData?.questions?.length || 0;
  const hasValidQuestions = questionData && questionData.questions && questionData.questions.length > 0;

  // 預覽前 3 題
  const previewQuestions = questionData?.questions?.slice(0, 3) || [];

  // 處理本地匯入
  const handleLocalImport = async () => {
    if (Platform.OS === 'web') {
      // Web 平台：使用 file input
      if (typeof window !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e: any) => {
          const file = e.target.files?.[0];
          if (!file) return;

          try {
            const text = await file.text();
            let data = JSON.parse(text);
            
            // 處理兩種格式：
            // 1. 數組格式：[{...}, {...}] -> 轉換為 ImportedQuestionData 格式
            // 2. 對象格式：{importDate, source, questions: [...]}
            if (Array.isArray(data)) {
              data = {
                source: file.name,
                importDate: new Date().toISOString().split('T')[0],
                questions: data,
              } as ImportedQuestionData;
            } else if (!data.questions) {
              // 如果沒有 questions 欄位，假設整個物件就是題目數組
              data = {
                source: file.name,
                importDate: new Date().toISOString().split('T')[0],
                questions: Array.isArray(data) ? data : [],
              } as ImportedQuestionData;
            }
            
            // 確保有 source
            if (!data.source) {
              data.source = file.name;
            }
            
            // 更新狀態
            setQuestionData(data as ImportedQuestionData);
            setDownloadUrl(file.name);
          } catch (error) {
            console.error('讀取檔案失敗:', error);
            Alert.alert('錯誤', '無法讀取檔案，請確認檔案格式正確');
          }
        };
        input.click();
      }
    } else {
      // React Native 平台（iOS/Android）：使用 expo-document-picker
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: 'application/json',
          copyToCacheDirectory: true,
        });

        if (result.canceled) {
          return; // 用戶取消選擇
        }

        const file = result.assets[0];
        if (!file) {
          return;
        }

        // 讀取檔案內容
        // 在 React Native 平台，使用 FileSystem 讀取本地檔案
        const text = await FileSystem.readAsStringAsync(file.uri);
        let data = JSON.parse(text);
        
        // 處理兩種格式：
        // 1. 數組格式：[{...}, {...}] -> 轉換為 ImportedQuestionData 格式
        // 2. 對象格式：{importDate, source, questions: [...]}
        if (Array.isArray(data)) {
          data = {
            source: file.name,
            importDate: new Date().toISOString().split('T')[0],
            questions: data,
          } as ImportedQuestionData;
        } else if (!data.questions) {
          // 如果沒有 questions 欄位，假設整個物件就是題目數組
          data = {
            source: file.name,
            importDate: new Date().toISOString().split('T')[0],
            questions: Array.isArray(data) ? data : [],
          } as ImportedQuestionData;
        }
        
        // 確保有 source
        if (!data.source) {
          data.source = file.name;
        }
        
        // 更新狀態
        setQuestionData(data as ImportedQuestionData);
        setDownloadUrl(file.name);
      } catch (error) {
        console.error('讀取檔案失敗:', error);
        Alert.alert('錯誤', '無法讀取檔案，請確認檔案格式正確');
      }
    }
  };

  const handleImport = async () => {
    // 如果沒有題庫資料，提示用戶先選擇檔案
    if (!hasValidQuestions) {
      Alert.alert('錯誤', '請先選擇要匯入的題庫檔案');
      return;
    }
    // 驗證輸入
    if (!testName.trim()) {
      Alert.alert('錯誤', '請輸入匯入名稱');
      return;
    }

    try {
      setImporting(true);

      // 使用預設值：subject 為 null，series_no 使用時間戳
      await importQuestionFile(
        questionData,
        testName.trim(),
        null,
        Date.now().toString()
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
              navigation.goBack(); // 返回上一頁
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
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../assets/back.png')}
            style={styles.backButtonImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.headerText, fontSize: titleTextSizeValue },
          ]}
        >
          匯入名稱
        </Text>
        <View style={styles.headerRight} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
      >
        {/* 合併的區塊：題庫資訊、匯入名稱、題目預覽 */}
        <View style={[styles.section, { backgroundColor: colors.surface }]}>
          {/* 題庫資訊 */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: textSizeValue + 2 }]}>
            題庫資訊
          </Text>
          {!hasValidQuestions ? (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyStateText, { color: colors.textSecondary, fontSize: textSizeValue }]}>
                尚未選擇題庫檔案
              </Text>
              <TouchableOpacity
                style={[styles.selectFileButton, { backgroundColor: colors.primary }]}
                onPress={handleLocalImport}
              >
                <Text style={[styles.selectFileButtonText, { fontSize: textSizeValue }]}>
                  📁 選擇檔案
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
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
            </>
          )}

          {/* 匯入名稱 */}
          <Text style={[styles.sectionTitle, { color: colors.text, fontSize: textSizeValue + 2, marginTop: 16 }]}>
            匯入名稱
          </Text>
          <View style={styles.inputGroup}>
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
              placeholder="例如：IPAS_01_AI_126932-阿摩線上測驗"
              placeholderTextColor={colors.textSecondary}
            />
          </View>

          {/* 題目預覽 */}
          {questionData && previewQuestions.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: colors.text, fontSize: textSizeValue + 2, marginTop: 16 }]}>
                題目預覽（前 3 題）
              </Text>
              {previewQuestions.map((q: any, index: number) => (
                <View key={index} style={styles.previewItem}>
                  <Text style={[styles.previewQuestionNumber, { color: colors.primary, fontSize: textSizeValue }]}>
                    第 {index + 1} 題
                  </Text>
                  <Text
                    style={[styles.previewQuestion, { color: colors.text, fontSize: textSizeValue, marginBottom: 8 }]}
                  >
                    {q.Q || q.content || '無題目內容'}
                  </Text>
                  {/* 顯示選項 */}
                  {q.A && (
                    <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                      A. {q.A}
                    </Text>
                  )}
                  {q.B && (
                    <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                      B. {q.B}
                    </Text>
                  )}
                  {q.C && (
                    <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                      C. {q.C}
                    </Text>
                  )}
                  {q.D && (
                    <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                      D. {q.D}
                    </Text>
                  )}
                  {/* 如果沒有 A, B, C, D，嘗試從 options 讀取 */}
                  {!q.A && q.options && (
                    <>
                      {q.options.A && (
                        <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                          A. {q.options.A}
                        </Text>
                      )}
                      {q.options.B && (
                        <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                          B. {q.options.B}
                        </Text>
                      )}
                      {q.options.C && (
                        <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                          C. {q.options.C}
                        </Text>
                      )}
                      {q.options.D && (
                        <Text style={[styles.previewOption, { color: colors.text, fontSize: textSizeValue }]}>
                          D. {q.options.D}
                        </Text>
                      )}
                    </>
                  )}
                </View>
              ))}
            </>
          )}
        </View>
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
          disabled={importing || importSuccess || !hasValidQuestions}
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonImage: {
    width: 24,
    height: 24,
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
    marginBottom: 8,
  },
  previewOption: {
    lineHeight: 20,
    marginTop: 4,
    marginLeft: 8,
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
  emptyState: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  emptyStateText: {
    marginBottom: 16,
  },
  selectFileButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectFileButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  changeFileButton: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeFileButtonText: {
    fontWeight: '600',
  },
});

export default ImportConfigScreen;

