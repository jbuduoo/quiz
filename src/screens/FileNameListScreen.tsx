import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
  TextInput,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../../App';
import { Question } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuestionService from '../services/QuestionService';
import { ImportedQuestionData, parseSource, importQuestionFile, getImportedQuestionFiles, loadImportedQuestionFile, deleteImportedQuestionFile } from '../services/ImportService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

// 檔案名稱列表項目
interface FileNameItem {
  id: string;
  fileName: string;
  displayName: string;
  fileCount: number;
  importDate?: string;
  source?: string;
  completedCount?: number; // 已完成題數
  isWrongBook?: boolean; // 是否為錯題本項目
}

const FileNameListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [fileNames, setFileNames] = useState<FileNameItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [wrongBookCount, setWrongBookCount] = useState(0);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showUrlInputModal, setShowUrlInputModal] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [isDeleteMode, setIsDeleteMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  // 處理本地匯入
  const handleLocalImport = async () => {
    setShowImportModal(false);
    
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
            
            // 導航到匯入設定頁面
            navigation.navigate('ImportConfig', {
              questionData: data as ImportedQuestionData,
              downloadUrl: file.name,
            });
          } catch (error) {
            console.error('讀取檔案失敗:', error);
            Alert.alert('錯誤', '無法讀取檔案，請確認檔案格式正確');
          }
        };
        input.click();
      }
    } else {
      // React Native 平台：顯示 URL 輸入 Modal
      setShowUrlInputModal(true);
    }
  };

  // 處理 URL 下載
  const handleUrlDownload = async () => {
    if (!urlInput.trim()) {
      Alert.alert('錯誤', '請輸入有效的 URL');
      return;
    }

    try {
      setDownloading(true);
      setShowUrlInputModal(false);
      
      const { downloadQuestionFile } = await import('../services/ImportService');
      const data = await downloadQuestionFile(urlInput.trim());
      
      navigation.navigate('ImportConfig', {
        questionData: data,
        downloadUrl: urlInput.trim(),
      });
      
      setUrlInput(''); // 清空輸入
    } catch (error) {
      console.error('下載失敗:', error);
      Alert.alert('錯誤', '無法下載檔案，請確認 URL 正確');
    } finally {
      setDownloading(false);
    }
  };

  // 處理遠端網站匯入
  const handleRemoteImport = () => {
    setShowImportModal(false);
    navigation.navigate('ImportWebView');
  };

  const handleToggleSelect = (itemId: string) => {
    const newSelected = new Set(selectedItems);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedItems(newSelected);
  };

  const handleDeleteSelected = async () => {
    if (selectedItems.size === 0) return;

    const confirmMessage = `確定要刪除選取的 ${selectedItems.size} 項測驗嗎？\n\n刪除後將同時清除相關的錯題記錄。`;
    
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const confirmed = window.confirm(confirmMessage);
      if (!confirmed) return;
    } else {
      return new Promise<void>((resolve) => {
        Alert.alert('確認刪除', confirmMessage, [
          { text: '取消', style: 'cancel', onPress: () => resolve() },
          {
            text: '確定',
            style: 'destructive',
            onPress: async () => {
              await performDelete();
              resolve();
            },
          },
        ]);
      });
    }

    await performDelete();
  };

  const performDelete = async () => {
    try {
      setLoading(true);
      
      for (const itemId of selectedItems) {
        const item = fileNames.find(f => f.id === itemId);
        if (!item || item.isWrongBook) continue;
        
        // 只刪除匯入的檔案（以 questions/ 開頭）
        if (item.fileName.startsWith('questions/')) {
          await deleteImportedQuestionFile(item.fileName);
        }
        // 本地打包的檔案無法刪除，跳過
      }
      
      // 重新載入資料
      await loadData();
      
      // 退出刪除模式
      setIsDeleteMode(false);
      setSelectedItems(new Set());
      
      Alert.alert('成功', '已刪除選取的測驗');
    } catch (error) {
      console.error('刪除失敗:', error);
      Alert.alert('錯誤', '刪除失敗，請稍後再試');
    } finally {
      setLoading(false);
    }
  };

  const loadData = async () => {
    setLoading(true);
    
    try {
      // 載入錯題本統計
      const wrongBookStats = await QuestionService.getWrongBookStats();
      setWrongBookCount(wrongBookStats.total);
      
      const fileItems: FileNameItem[] = [];
      
      // 讀取匯入的題庫檔案
      const importedFiles = await getImportedQuestionFiles();
      
      for (const filePath of importedFiles) {
        try {
          // 從檔案路徑提取資訊
          // 格式：questions/{testName}/{subject}/{series_no}.json 或 questions/{testName}/{series_no}.json
          const pathParts = filePath.replace(/^questions\//, '').split('/');
          const testName = pathParts[0];
          const series_no = pathParts.length === 2 
            ? pathParts[1].replace(/\.json$/, '')
            : pathParts[2]?.replace(/\.json$/, '') || '';
          const subject = pathParts.length === 3 ? pathParts[1] : undefined;
          
          // 載入題目檔案
          const questions = await loadImportedQuestionFile(filePath);
          
          if (questions.length === 0) continue;
          
          // 計算已完成題數
          const userAnswers = await QuestionService.getUserAnswers();
          let completedCount = 0;
          questions.forEach((q: Question) => {
            const answer = userAnswers[q.id];
            if (answer?.isAnswered && answer?.selectedAnswer !== undefined) {
              completedCount++;
            }
          });
          
          // 生成顯示名稱
          const displayName = subject 
            ? `${testName}_${subject}_${series_no}`
            : `${testName}_${series_no}`;
          
          fileItems.push({
            id: filePath,
            fileName: filePath,
            displayName: displayName,
            fileCount: questions.length,
            completedCount: completedCount,
            importDate: undefined, // 可以從 AsyncStorage 讀取詳細資訊
            source: undefined,
          });
        } catch (error) {
          console.error(`載入匯入檔案 ${filePath} 失敗:`, error);
        }
      }
      
      // 讀取本地打包的檔案（保留原有功能）
      const localFileList = [
        'IPAS_01_AI_126932-阿摩線上測驗.json',
      ];
      
      for (const fileName of localFileList) {
        try {
          let fileData: any;
          
          if (fileName === 'IPAS_01_AI_126932-阿摩線上測驗.json') {
            fileData = require('../../assets/data/questions/IPAS_01_AI_126932-阿摩線上測驗.json');
          } else {
            continue;
          }
          
          const fileNameWithoutExt = fileName.replace(/\.json$/, '');
          
          const isArray = Array.isArray(fileData);
          const questions = isArray ? fileData : (fileData.questions || []);
          
          const userAnswers = await QuestionService.getUserAnswers();
          let completedCount = 0;
          questions.forEach((q: any, index: number) => {
            const questionId = `${fileName}_${index + 1}`;
            const answer = userAnswers[questionId];
            if (answer?.isAnswered && answer?.selectedAnswer !== undefined) {
              completedCount++;
            }
          });
          
          fileItems.push({
            id: fileName,
            fileName: fileName,
            displayName: fileNameWithoutExt,
            fileCount: questions.length,
            completedCount: completedCount,
            importDate: isArray ? undefined : fileData.importDate,
            source: isArray ? undefined : fileData.source,
          });
        } catch (error) {
          console.error(`載入檔案 ${fileName} 失敗:`, error);
        }
      }
      
      // 添加錯題本項目（始終顯示）
      fileItems.push({
        id: 'wrong-book',
        fileName: '',
        displayName: `複習錯題 (${wrongBookStats.total}題)`,
        fileCount: wrongBookStats.total,
        completedCount: 0,
        isWrongBook: true,
      });
      
      setFileNames(fileItems);
      setLoading(false);
    } catch (error) {
      console.error('載入檔案列表失敗:', error);
      setLoading(false);
      setFileNames([]);
    }
  };

  const renderFileNameItem = ({ item }: { item: FileNameItem }) => {
    const isSelected = selectedItems.has(item.id);
    
    const handlePress = async () => {
      // 刪除模式下，切換選擇狀態
      if (isDeleteMode) {
        if (!item.isWrongBook) {
          handleToggleSelect(item.id);
        }
        return;
      }
      
      try {
        // 如果是錯題本，導航到錯題本頁面
        if (item.isWrongBook) {
          // 如果是「開始測驗」，先清除錯題本的答題記錄
          const isStartTest = true; // 錯題本固定顯示「開始測驗」
          if (isStartTest) {
            await QuestionService.clearWrongBookAnswers();
          }
          navigation.navigate('WrongBook');
          return;
        }
        
        // 判斷按鈕文字：開始測驗、繼續測驗、重新測驗
        const isCompleted = (item.completedCount || 0) >= item.fileCount && item.fileCount > 0;
        const isStartTest = !isCompleted && (!item.completedCount || item.completedCount === 0);
        
        // 如果是「開始測驗」，先清除該檔案的答題記錄
        if (isStartTest) {
          await QuestionService.clearFileAnswers(item.fileName);
        }
        
        let questions: Question[] = [];
        
        // 判斷是匯入的檔案還是本地打包的檔案
        if (item.fileName.startsWith('questions/')) {
          // 匯入的檔案：從 AsyncStorage 讀取
          questions = await loadImportedQuestionFile(item.fileName);
        } else {
          // 本地打包的檔案：使用 require
          let fileData: any;
          
          if (item.fileName === 'IPAS_01_AI_126932-阿摩線上測驗.json') {
            fileData = require('../../assets/data/questions/IPAS_01_AI_126932-阿摩線上測驗.json');
          } else {
            throw new Error(`不支援的檔案: ${item.fileName}`);
          }
          
          // 處理兩種格式：
          // 1. 數組格式：[{...}, {...}]
          // 2. 對象格式：{importDate, source, questions: [...]}
          const isArray = Array.isArray(fileData);
          const questionsData = isArray ? fileData : (fileData.questions || []);
          
          // 標準化題目格式
          questions = questionsData.map((q: any, index: number) => ({
            id: `${item.fileName}_${index + 1}`,
            content: String(q.Q || q.content || ''),
            A: String(q.A || q.options?.A || ''),
            B: String(q.B || q.options?.B || ''),
            C: String(q.C || q.options?.C || ''),
            D: String(q.D || q.options?.D || ''),
            Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
            exp: String(q.Exp || q.exp || q.explanation || ''),
            questionNumber: index + 1,
          }));
        }
        
        if (questions.length === 0) {
          Alert.alert('錯誤', '無法載入題目資料');
          return;
        }
        
        // 將題目資料存儲到 AsyncStorage，供 Quiz 頁面讀取
        await AsyncStorage.setItem('@quiz:directQuestions', JSON.stringify(questions));
        
        // 導航到題目頁，使用 directFileName 參數標識這是直接載入的檔案
        navigation.navigate('Quiz', {
          testName: 'DIRECT_FILE',
          subject: '',
          series_no: item.fileName,
          directFileName: item.fileName,
        });
      } catch (error) {
        console.error('載入檔案失敗:', error);
        Alert.alert('錯誤', '載入檔案失敗，請稍後再試');
      }
    };
    
    const completionPercentage = item.fileCount > 0 
      ? Math.round((item.completedCount || 0) / item.fileCount * 100) 
      : 0;
    const isCompleted = (item.completedCount || 0) >= item.fileCount && item.fileCount > 0;

    const isHovered = hoveredItem === item.id;
    
    return (
      <TouchableOpacity
        style={[
          styles.fileNameItem,
          {
            backgroundColor: isHovered && !isDeleteMode 
              ? '#FFF9C4' 
              : colors.surface,
            borderWidth: isHovered && !isDeleteMode 
              ? 2 
              : (isDeleteMode && isSelected ? 3 : 0),
            borderColor: isHovered && !isDeleteMode
              ? '#FFD700'
              : (isDeleteMode && isSelected ? '#FF3B30' : 'transparent'),
            opacity: isDeleteMode && !item.isWrongBook && !isSelected ? 0.5 : 1,
            ...(Platform.OS === 'web' ? {} : { shadowColor: colors.text }),
          },
        ]}
        onPress={handlePress}
        {...(Platform.OS === 'web' ? {
          onMouseEnter: () => setHoveredItem(item.id),
          onMouseLeave: () => setHoveredItem(null),
        } : {})}
      >
        {/* 主容器：左側內容和右側按鈕 */}
        <View style={styles.fileNameHeader}>
          {/* 左側：標題和進度 */}
          <View style={styles.fileNameContainer}>
            {/* 標題 */}
            <View style={styles.titleRow}>
              {isDeleteMode && !item.isWrongBook && (
                <View style={styles.checkboxContainer}>
                  <View style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected ? colors.primary : 'transparent',
                      borderColor: isSelected ? colors.primary : colors.border,
                    },
                  ]}>
                    {isSelected && (
                      <Text style={styles.checkboxCheckmark}>✓</Text>
                    )}
                  </View>
                </View>
              )}
              <Text
                style={[
                  styles.fileNameText,
                  {
                    color: colors.text,
                    fontSize: (textSizeValue + 2) * 1.2,
                  },
                ]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {item.displayName}
              </Text>
            </View>
            
            {/* 進度文字和進度條 */}
            {!item.isWrongBook && item.fileCount > 0 && (
              <>
                {/* 第二行：進度文字 */}
                <Text
                  style={[
                    styles.progressText,
                    {
                      color: colors.textSecondary,
                      fontSize: textSizeValue - 2,
                      marginTop: 4,
                    },
                  ]}
                >
                  完成 {item.completedCount || 0}/{item.fileCount} 題
                </Text>
                {/* 第三行：進度條 */}
                <View style={styles.progressBarWrapper}>
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
                          width: `${completionPercentage}%`,
                          backgroundColor: colors.primary,
                        },
                      ]}
                    />
                  </View>
                </View>
              </>
            )}
          </View>
          
          {/* 右側：按鈕 */}
          {!isDeleteMode && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                { 
                  backgroundColor: colors.primary,
                },
              ]}
              onPress={handlePress}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: '#FFFFFF',
                    fontSize: textSizeValue * 1.2,
                  },
                ]}
              >
                {item.isWrongBook ? '開始測驗' : (isCompleted ? '重新測驗' : (item.completedCount && item.completedCount > 0 ? '繼續測驗' : '開始測驗'))}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        { backgroundColor: colors.background },
      ]}
    >
      <View
        style={[
          styles.header,
          { backgroundColor: colors.headerBackground },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.headerText,
              fontSize: titleTextSizeValue * 1.5,
            },
          ]}
        >
          樂題庫
        </Text>
        <View style={styles.headerRight}>
          {!isDeleteMode ? (
            <>
              <TouchableOpacity
                onPress={() => setIsDeleteMode(true)}
                style={styles.headerButton}
              >
                <Text
                  style={[
                    styles.headerIcon,
                    {
                      color: colors.headerText,
                      fontSize: titleTextSizeValue * 1.5,
                    },
                  ]}
                >
                  🗑️
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setShowImportModal(true)}
                style={styles.headerButton}
              >
                <Text
                  style={[
                    styles.headerIcon,
                    {
                      color: colors.headerText,
                      fontSize: titleTextSizeValue * 2,
                    },
                  ]}
                >
                  📥
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TouchableOpacity
                onPress={handleDeleteSelected}
                style={styles.headerButton}
                disabled={selectedItems.size === 0}
              >
                <Text
                  style={[
                    styles.headerIcon,
                    {
                      color: selectedItems.size === 0 ? colors.textSecondary : '#FF3B30',
                      fontSize: titleTextSizeValue,
                    },
                  ]}
                >
                  刪除 ({selectedItems.size})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setIsDeleteMode(false);
                  setSelectedItems(new Set());
                }}
                style={styles.headerButton}
              >
                <Text
                  style={[
                    styles.headerIcon,
                    {
                      color: colors.headerText,
                      fontSize: titleTextSizeValue,
                    },
                  ]}
                >
                  取消
                </Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>

      <FlatList
        data={fileNames}
        renderItem={renderFileNameItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />

      {/* 匯入選項 Modal */}
      <Modal
        visible={showImportModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImportModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
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
              選擇匯入方式
            </Text>

            <TouchableOpacity
              style={[
                styles.modalOption,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleLocalImport}
            >
              <Text
                style={[
                  styles.modalOptionIcon,
                  { fontSize: titleTextSizeValue + 4 },
                ]}
              >
                📁
              </Text>
              <View style={styles.modalOptionText}>
                <Text
                  style={[
                    styles.modalOptionTitle,
                    {
                      color: colors.text,
                      fontSize: textSizeValue + 2,
                    },
                  ]}
                >
                  本地匯入
                </Text>
                <Text
                  style={[
                    styles.modalOptionDescription,
                    {
                      color: colors.textSecondary,
                      fontSize: textSizeValue - 2,
                    },
                  ]}
                >
                  從設備選擇 JSON 檔案
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalOption,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                },
              ]}
              onPress={handleRemoteImport}
            >
              <Text
                style={[
                  styles.modalOptionIcon,
                  { fontSize: titleTextSizeValue + 4 },
                ]}
              >
                🌐
              </Text>
              <View style={styles.modalOptionText}>
                <Text
                  style={[
                    styles.modalOptionTitle,
                    {
                      color: colors.text,
                      fontSize: textSizeValue + 2,
                    },
                  ]}
                >
                  遠端網站匯入
                </Text>
                <Text
                  style={[
                    styles.modalOptionDescription,
                    {
                      color: colors.textSecondary,
                      fontSize: textSizeValue - 2,
                    },
                  ]}
                >
                  打開網站下載後匯入
                </Text>
              </View>
            </TouchableOpacity>

            {/* 匯入範例 */}
            <View style={styles.exampleContainer}>
              <Text
                style={[
                  styles.exampleTitle,
                  {
                    color: colors.text,
                    fontSize: textSizeValue,
                    fontWeight: '600',
                    marginBottom: 8,
                  },
                ]}
              >
                匯入範例
              </Text>
              <View
                style={[
                  styles.exampleCode,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.exampleCodeText,
                    {
                      color: colors.text,
                      fontSize: textSizeValue - 2,
                    },
                  ]}
                >
                  {`[
  {
    "Q": "題目內容",
    "A": "選項A",
    "B": "選項B",
    "C": "選項C",
    "D": "選項D",
    "Ans": "A",
    "Exp": "詳解內容"
  }
]`}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={[
                styles.modalCancelButton,
                {
                  backgroundColor: colors.border,
                },
              ]}
              onPress={() => setShowImportModal(false)}
            >
              <Text
                style={[
                  styles.modalCancelButtonText,
                  {
                    color: colors.text,
                    fontSize: textSizeValue,
                  },
                ]}
              >
                取消
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* URL 輸入 Modal（React Native 平台） */}
      <Modal
        visible={showUrlInputModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUrlInputModal(false);
          setUrlInput('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContent,
              { backgroundColor: colors.surface },
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
              輸入檔案 URL
            </Text>

            <TextInput
              style={[
                styles.urlInput,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.border,
                  color: colors.text,
                  fontSize: textSizeValue,
                },
              ]}
              placeholder="請輸入 JSON 檔案的 URL"
              placeholderTextColor={colors.textSecondary}
              value={urlInput}
              onChangeText={setUrlInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />

            <View style={styles.urlButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.urlButton,
                  {
                    backgroundColor: colors.border,
                    marginRight: 8,
                  },
                ]}
                onPress={() => {
                  setShowUrlInputModal(false);
                  setUrlInput('');
                }}
              >
                <Text
                  style={[
                    styles.urlButtonText,
                    {
                      color: colors.text,
                      fontSize: textSizeValue,
                    },
                  ]}
                >
                  取消
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.urlButton,
                  {
                    backgroundColor: colors.primary,
                    flex: 1,
                  },
                ]}
                onPress={handleUrlDownload}
                disabled={downloading || !urlInput.trim()}
              >
                {downloading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text
                    style={[
                      styles.urlButtonText,
                      {
                        color: '#FFFFFF',
                        fontSize: textSizeValue,
                      },
                    ]}
                  >
                    下載
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerButton: {
    padding: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 18,
  },
  listContent: {
    padding: 16,
  },
  fileNameItem: {
    borderRadius: 8,
    marginBottom: 7,
    padding: 10,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  fileNameHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  fileNameContainer: {
    flex: 1,
    marginRight: 8,
    flexDirection: 'column',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fileNameText: {
    fontWeight: '600',
  },
  fileCountBadge: {
    backgroundColor: '#FFEB3B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  fileCountText: {
    color: '#000000',
    fontWeight: '600',
  },
  progressContainer: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressBarWrapper: {
    width: '100%',
    marginTop: 4,
  },
  progressBarContainer: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    fontWeight: '400',
  },
  actionButton: {
    paddingHorizontal: 24,
    paddingVertical: 14.4,
    borderRadius: 7.2,
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'center',
    minHeight: 52.8,
  },
  actionButtonText: {
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  descriptionText: {
    fontWeight: '400',
  },
  dateText: {
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.3)',
    } : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalOptionIcon: {
    marginRight: 12,
  },
  modalOptionText: {
    flex: 1,
  },
  modalOptionTitle: {
    fontWeight: '600',
    marginBottom: 4,
  },
  modalOptionDescription: {
    fontWeight: '400',
  },
  modalCancelButton: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalCancelButtonText: {
    fontWeight: '600',
  },
  exampleContainer: {
    marginTop: 16,
    marginBottom: 8,
  },
  exampleTitle: {
    marginBottom: 8,
  },
  exampleCode: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  exampleCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    lineHeight: 18,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  urlButtonContainer: {
    flexDirection: 'row',
  },
  urlButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    minWidth: 80,
  },
  urlButtonText: {
    fontWeight: '600',
  },
  checkboxContainer: {
    marginRight: 12,
    justifyContent: 'center',
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 4,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxCheckmark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default FileNameListScreen;

