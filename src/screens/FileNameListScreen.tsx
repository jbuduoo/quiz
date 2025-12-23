import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Modal,
  Alert,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../../App';
import { Question } from '../types';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QuestionService from '../services/QuestionService';
import AppConfigService from '../services/AppConfigService';
import { ImportedQuestionData, parseSource, importQuestionFile, getImportedQuestionFiles, loadImportedQuestionFile, deleteImportedQuestionFile } from '../services/ImportService';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { loadLocalQuestionFile } from '../utils/fileLoader';

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
  testName?: string; // 測驗名稱（用於索引檔案）
  series_no?: string; // 期數（用於索引檔案）
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
  const [appConfig, setAppConfig] = useState<{ enableImport: boolean; enableTrash: boolean; enableFavor: boolean } | null>(null);
  const [appName, setAppName] = useState<string>('樂題庫'); // 預設值
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();

  useEffect(() => {
    loadAppConfig();
    loadData();
  }, []);

  const loadAppConfig = async () => {
    try {
      const config = await AppConfigService.getConfig();
      setAppConfig({
        enableImport: config.enableImport,
        enableTrash: config.enableTrash,
        enableFavor: config.enableFavor,
      });
    } catch (error) {
      console.error('載入應用程式配置失敗:', error);
      // 預設配置
      setAppConfig({
        enableImport: true,
        enableTrash: true,
        enableFavor: false,
      });
    }
  };

  const handleClearAllFavorites = async () => {
    // 顯示確認對話框
    const confirmMessage = '確定要取消所有我的最愛嗎？此操作無法復原。';
    
    if (typeof window !== 'undefined') {
      // Web 平台
      if (window.confirm(confirmMessage)) {
        try {
          await QuestionService.clearAllWrongBook();
          // 清除後重新載入資料
          await loadData();
        } catch (error) {
          console.error('清除所有最愛失敗:', error);
          Alert.alert('錯誤', '清除所有最愛時發生錯誤');
        }
      }
    } else {
      // 原生平台
      Alert.alert(
        '確認',
        confirmMessage,
        [
          {
            text: '取消',
            style: 'cancel',
          },
          {
            text: '確定',
            style: 'destructive',
            onPress: async () => {
              try {
                await QuestionService.clearAllWrongBook();
                // 清除後重新載入資料
                await loadData();
              } catch (error) {
                console.error('清除所有最愛失敗:', error);
                Alert.alert('錯誤', '清除所有最愛時發生錯誤');
              }
            },
          },
        ]
      );
    }
  };

  // 使用 useFocusEffect 確保每次頁面獲得焦點時都重新載入資料
  useFocusEffect(
    React.useCallback(() => {
      console.log('📋 [FileNameListScreen] useFocusEffect 觸發，重新載入資料');
      // 檢查是否有剛完成的測驗
      const checkAndReload = async () => {
        try {
          const lastQuizInfo = await AsyncStorage.getItem('@quiz:lastCompletedQuiz');
          if (lastQuizInfo) {
            console.log('📋 [FileNameListScreen] 檢測到剛完成的測驗，重新載入資料');
            const quizInfo = JSON.parse(lastQuizInfo);
            console.log('📋 [FileNameListScreen] 測驗資訊:', quizInfo);
            // 清除標記，避免重複觸發
            await AsyncStorage.removeItem('@quiz:lastCompletedQuiz');
          }
        } catch (error) {
          console.error('檢查最後完成的測驗失敗:', error);
        }
        // 重新載入資料
        await loadData();
      };
      checkAndReload();
    }, [])
  );

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
        
        // 導航到匯入設定頁面
        navigation.navigate('ImportConfig', {
          questionData: data as ImportedQuestionData,
          downloadUrl: file.name,
        });
      } catch (error) {
        console.error('讀取檔案失敗:', error);
        Alert.alert('錯誤', '無法讀取檔案，請確認檔案格式正確');
      }
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
  const handleRemoteImport = async () => {
    setShowImportModal(false);
    const url = 'https://drive.google.com/drive/folders/1uL6STVwEhZwdxNJCshQDz0dBj6MSsZEF?usp=sharing';
    
    try {
      if (Platform.OS === 'web') {
        // Web 平台：在新分頁打開
        if (typeof window !== 'undefined') {
          window.open(url, '_blank');
        }
      } else {
        // 原生平台：使用 Linking 打開瀏覽器
        const canOpen = await Linking.canOpenURL(url);
        if (canOpen) {
          await Linking.openURL(url);
        } else {
          Alert.alert('錯誤', '無法開啟瀏覽器');
        }
      }
    } catch (error) {
      console.error('開啟網頁失敗:', error);
      Alert.alert('錯誤', '無法開啟網頁，請稍後再試');
    }
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
    console.log('📋 [FileNameListScreen] loadData: 開始載入資料');
    setLoading(true);
    
    try {
      // 載入錯題本統計
      console.log('📋 [FileNameListScreen] loadData: 載入錯題本統計');
      const wrongBookStats = await QuestionService.getWrongBookStats();
      console.log('📋 [FileNameListScreen] loadData: 錯題本統計:', wrongBookStats);
      setWrongBookCount(wrongBookStats.total);
      
      const fileItems: FileNameItem[] = [];
      
      // 先添加索引檔案中的 questionFiles（系統預設檔案）
      console.log('📋 [FileNameListScreen] loadData: 載入索引檔案中的 questionFiles');
      try {
        const questionFiles = await QuestionService.getQuestionFiles();
        console.log(`📋 [FileNameListScreen] loadData: 找到 ${questionFiles.length} 個索引檔案`);
        
        // 載入索引資料以取得根層級的 testName 和 appName
        // 直接載入索引檔案來取得根層級的 testName 和 appName
        let rootTestNameValue: string | undefined = undefined;
        let appNameValue: string | undefined = undefined;
        try {
          const { default: VersionConfigService } = await import('../services/VersionConfigService');
          const version = await VersionConfigService.getCurrentVersion();
          const indexFileUrl = await VersionConfigService.getIndexFileUrl();
          
          // 在 React Native 平台使用 require，在 Web 平台使用 fetch
          if (typeof window === 'undefined') {
            // React Native 平台
            try {
              const indexData = require('../../assets/data/questions/questions.json');
              rootTestNameValue = indexData?.testName;
              // 讀取 appName：優先從根層級讀取，其次從 config.appName 讀取
              appNameValue = indexData?.appName || indexData?.config?.appName;
            } catch (error) {
              console.warn('⚠️ [FileNameListScreen] 無法使用 require 載入索引:', error);
            }
          } else {
            // Web 平台
            const response = await fetch(indexFileUrl);
            if (response.ok) {
              const indexData = await response.json();
              rootTestNameValue = indexData?.testName;
              // 讀取 appName：優先從根層級讀取，其次從 config.appName 讀取
              appNameValue = indexData?.appName || indexData?.config?.appName;
            }
          }
        } catch (error) {
          console.warn('⚠️ [FileNameListScreen] loadData: 無法載入索引資料取得根層級 testName:', error);
        }
        
        // 設定 appName
        if (appNameValue) {
          setAppName(appNameValue);
        }
        
        for (const fileInfo of questionFiles) {
          try {
            const fileName = fileInfo.file;
            console.log(`📋 [FileNameListScreen] loadData: 處理索引檔案: ${fileName}`);
            
            // 載入題目檔案並標準化題目 ID（確保與答題時使用的 ID 格式一致）
            let questions: Question[] = [];
            try {
              // 取得 testName、subject、series_no（用於生成題目 ID）
              const testNameForId = fileInfo.testName || rootTestNameValue || '';
              const subjectForId = fileInfo.subject || null;
              const seriesNoForId = fileInfo.series_no || '';
              
              // 載入題目檔案
              const fileData = await loadLocalQuestionFile(fileName);
              if (!fileData) {
                console.warn(`⚠️ [FileNameListScreen] loadData: ${fileName} 載入失敗（檔案不存在或格式不正確）`);
                continue;
              }
              
              // 解析題目資料
              const isArray = Array.isArray(fileData);
              const questionsArray = isArray ? fileData : (fileData.questions || []);
              
              if (questionsArray.length === 0) {
                console.warn(`⚠️ [FileNameListScreen] loadData: ${fileName} 沒有題目，跳過`);
                continue;
              }
              
              // 標準化題目格式，生成正確的題目 ID（使用 series_no + 題目檔案中的 Id）
              questions = questionsArray.map((q: any, index: number) => {
                // 生成題目 ID：使用 series_no + 題目檔案中的 Id 欄位
                // 如果題目有 Id 欄位，使用它；否則使用 index + 1 作為備用
                const questionIdFromFile = q.Id || q.id || String(index + 1);
                const questionId = `${seriesNoForId}_${questionIdFromFile}`;
                
                // 移除問題開頭的編號
                const rawContent = String(q.Q || q.content || '');
                const cleanedContent = rawContent.replace(/^\d+\.?\s+/, '');
                
                // 處理 E 選項
                const EValue = (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') 
                  ? String(q.E) 
                  : (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '')
                    ? String(q.options.E)
                    : undefined;
                
                return {
                  id: questionId,
                  content: cleanedContent,
                  A: String(q.A || q.options?.A || ''),
                  B: String(q.B || q.options?.B || ''),
                  C: String(q.C || q.options?.C || ''),
                  D: String(q.D || q.options?.D || ''),
                  E: EValue,
                  Ans: String(q.Ans || q.correctAnswer || 'A'),
                  exp: String(q.Exp || q.exp || q.explanation || ''),
                  questionNumber: index + 1,
                  testName: testNameForId,
                  subject: subjectForId || undefined,
                  series_no: seriesNoForId,
                  Type: q.Type,
                } as Question;
              });
              
              console.log(`✅ [FileNameListScreen] loadData: ${fileName} 載入成功，題數: ${questions.length}`);
            } catch (loadError) {
              console.error(`❌ [FileNameListScreen] loadData: 載入 ${fileName} 失敗:`, loadError);
              continue;
            }
            
            // 計算已完成題數（使用題目本身的 ID，確保格式一致）
            const userAnswers = await QuestionService.getUserAnswers();
            let completedCount = 0;
            questions.forEach((q: Question) => {
              // 直接使用題目本身的 ID，確保與答題時使用的 ID 一致
              const answer = userAnswers[q.id];
              if (answer?.isAnswered) {
                completedCount++;
              }
            });
            
            // 使用 displayName 或生成顯示名稱
            const displayName = fileInfo.displayName || fileName;
            
            // 取得 testName 和 series_no
            const testName = fileInfo.testName || rootTestNameValue || '';
            const series_no = fileInfo.series_no || '';
            
            console.log(`📊 [FileNameListScreen] loadData: 索引檔案項目`, {
              fileName,
              displayName,
              testName,
              subject: fileInfo.subject,
              series_no,
              fileCount: questions.length,
              completedCount,
              sampleQuestionIds: questions.slice(0, 3).map(q => q.id),
              sampleAnswers: questions.slice(0, 3).map(q => ({
                questionId: q.id,
                answer: userAnswers[q.id],
                isAnswered: userAnswers[q.id]?.isAnswered,
                selectedAnswer: userAnswers[q.id]?.selectedAnswer,
              })),
            });
            
            fileItems.push({
              id: fileName,
              fileName: fileName,
              displayName: displayName,
              fileCount: questions.length,
              completedCount: completedCount,
              importDate: undefined,
              source: undefined,
              testName: testName,
              series_no: series_no,
            });
          } catch (error) {
            console.error(`❌ [FileNameListScreen] loadData: 處理索引檔案 ${fileInfo.file} 失敗:`, error);
          }
        }
      } catch (error) {
        console.error(`❌ [FileNameListScreen] loadData: 載入索引檔案失敗:`, error);
      }
      
      // 讀取匯入的題庫檔案
      console.log('📋 [FileNameListScreen] loadData: 讀取匯入的題庫檔案');
      const importedFiles = await getImportedQuestionFiles();
      console.log('📋 [FileNameListScreen] loadData: 匯入檔案列表:', importedFiles);
      
      for (const filePath of importedFiles) {
        try {
          console.log(`📋 [FileNameListScreen] loadData: 處理匯入檔案: ${filePath}`);
          // 從檔案路徑提取資訊
          // 格式：questions/{testName}/{subject}/{series_no}.json 或 questions/{testName}/{series_no}.json
          const pathParts = filePath.replace(/^questions\//, '').split('/');
          let testName = pathParts[0];
          let series_no = pathParts.length === 2 
            ? pathParts[1].replace(/\.json$/, '')
            : pathParts[2]?.replace(/\.json$/, '') || '';
          const subject = pathParts.length === 3 ? pathParts[1] : undefined;
          
          // 移除時間戳（純數字部分）
          // 如果 series_no 是純數字（時間戳），則不顯示它
          // 如果 testName 末尾有時間戳格式（_數字），也移除
          if (/^\d+$/.test(series_no)) {
            // series_no 是純數字時間戳，不顯示
            series_no = '';
          }
          
          // 移除 testName 末尾的時間戳格式（_數字）
          testName = testName.replace(/_\d+$/, '');
          
          console.log(`📋 [FileNameListScreen] loadData: 解析路徑 - testName: ${testName}, subject: ${subject}, series_no: ${series_no}`);
          
          // 載入題目檔案
          console.log(`📋 [FileNameListScreen] loadData: 載入題目檔案: ${filePath}`);
          const questions = await loadImportedQuestionFile(filePath);
          console.log(`📋 [FileNameListScreen] loadData: 載入完成，題數: ${questions.length}`);
          
          if (questions.length === 0) {
            console.warn(`⚠️ [FileNameListScreen] loadData: 檔案 ${filePath} 沒有題目，跳過`);
            continue;
          }
          
          // 計算已完成題數
          const userAnswers = await QuestionService.getUserAnswers();
          let completedCount = 0;
          questions.forEach((q: Question) => {
            const answer = userAnswers[q.id];
            // 只要 isAnswered 為 true 就算完成（包括問答題和未答被標記為錯誤的題目）
            if (answer?.isAnswered) {
              completedCount++;
            }
          });
          
          console.log(`📊 [FileNameListScreen] loadData: 計算完成題數`, {
            filePath,
            testName,
            subject,
            series_no,
            totalQuestions: questions.length,
            completedCount,
            sampleQuestionIds: questions.slice(0, 3).map(q => q.id),
            sampleAnswers: questions.slice(0, 3).map(q => ({
              questionId: q.id,
              answer: userAnswers[q.id],
              isAnswered: userAnswers[q.id]?.isAnswered,
              selectedAnswer: userAnswers[q.id]?.selectedAnswer,
            })),
          });
          
          // 生成顯示名稱（移除時間戳後）
          let displayName = '';
          if (subject) {
            displayName = series_no 
              ? `${testName}_${subject}_${series_no}`
              : `${testName}_${subject}`;
          } else {
            displayName = series_no 
              ? `${testName}_${series_no}`
              : testName;
          }
          
          const isCompleted = completedCount >= questions.length && questions.length > 0;
          console.log(`📊 [FileNameListScreen] loadData: 檔案項目狀態`, {
            displayName,
            fileCount: questions.length,
            completedCount,
            isCompleted,
            shouldShowViewButton: isCompleted, // 匯入檔案不是錯題本，所以直接檢查 isCompleted
          });
          
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
      
      
      // 添加錯題本項目（始終顯示）
      console.log('📋 [FileNameListScreen] loadData: 添加錯題本項目');
      fileItems.push({
        id: 'wrong-book',
        fileName: '',
        displayName: wrongBookStats.total > 0 ? `複習錯題 (${wrongBookStats.total}題)` : '錯題本',
        fileCount: wrongBookStats.total,
        completedCount: 0,
        isWrongBook: true,
      });
      
      console.log(`✅ [FileNameListScreen] loadData: 載入完成，共 ${fileItems.length} 個項目`);
      console.log('📋 [FileNameListScreen] loadData: 檔案項目列表:', fileItems.map(item => ({
        id: item.id,
        displayName: item.displayName,
        fileCount: item.fileCount
      })));
      setFileNames(fileItems);
      setLoading(false);
    } catch (error) {
      console.error('❌ [FileNameListScreen] loadData: 載入檔案列表失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [FileNameListScreen] loadData: 錯誤訊息:', error.message);
        console.error('❌ [FileNameListScreen] loadData: 錯誤堆疊:', error.stack);
      }
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
        console.log(`🔵 [FileNameListScreen] handlePress: 開始處理`, {
          fileName: item.fileName,
          displayName: item.displayName,
          isWrongBook: item.isWrongBook,
          completedCount: item.completedCount,
          fileCount: item.fileCount,
        });
        
        // 如果是錯題本，導航到錯題本頁面
        if (item.isWrongBook) {
          console.log(`📚 [FileNameListScreen] handlePress: 處理錯題本`);
          // 如果是「開始測驗」，先清除錯題本的答題記錄
          const isStartTest = true; // 錯題本固定顯示「開始測驗」
          if (isStartTest) {
            console.log(`🔄 [FileNameListScreen] handlePress: 清空錯題本答題記錄`);
            await QuestionService.clearWrongBookAnswers();
            console.log(`✅ [FileNameListScreen] handlePress: 錯題本答題記錄已清空`);
          }
          navigation.navigate('WrongBook');
          return;
        }
        
        // 判斷按鈕文字：開始測驗、繼續測驗、重新測驗
        const isCompleted = (item.completedCount || 0) >= item.fileCount && item.fileCount > 0;
        const isStartTest = !isCompleted && (!item.completedCount || item.completedCount === 0);
        const buttonText = isCompleted ? '重新測驗' : (isStartTest ? '開始測驗' : '繼續測驗');
        
        console.log(`📊 [FileNameListScreen] handlePress: 按鈕狀態判斷`, {
          completedCount: item.completedCount,
          fileCount: item.fileCount,
          isCompleted,
          isStartTest,
          buttonText,
        });
        
        // 如果是「開始測驗」或「重新測驗」，先清除該檔案的答題記錄（重頭開始）
        if (isStartTest || isCompleted) {
          console.log(`🔄 [FileNameListScreen] handlePress: 準備清空答題記錄`, {
            fileName: item.fileName,
            reason: isStartTest ? '開始測驗' : '重新測驗',
          });
          
          // 清空前，先檢查當前的答題記錄狀態
          const userAnswersBefore = await QuestionService.getUserAnswers();
          
          // 對於匯入的檔案，需要載入題目來獲取實際的題目 ID
          let questionIdsBefore: string[] = [];
          if (item.fileName.startsWith('questions/')) {
            // 匯入的檔案：載入題目以獲取實際的題目 ID
            console.log(`📂 [FileNameListScreen] handlePress: 匯入檔案，載入題目以獲取 ID`);
            const questions = await loadImportedQuestionFile(item.fileName);
            questionIdsBefore = questions.map(q => q.id).filter(id => userAnswersBefore[id]);
            console.log(`📋 [FileNameListScreen] handlePress: 從題目載入的 ID`, {
              questionCount: questions.length,
              matchedIds: questionIdsBefore.length,
              questionIds: questionIdsBefore.slice(0, 5),
            });
          } else {
            // 本地打包的檔案：使用檔案名稱匹配
            questionIdsBefore = Object.keys(userAnswersBefore).filter(id => id.startsWith(`${item.fileName}_`));
          }
          
          // 檢查所有題目 ID 的格式，以便除錯
          const allQuestionIds = Object.keys(userAnswersBefore);
          const sampleQuestionIds = allQuestionIds.slice(0, 10);
          console.log(`📋 [FileNameListScreen] handlePress: 清空前的答題記錄`, {
            fileName: item.fileName,
            searchPattern: item.fileName.startsWith('questions/') ? '使用題目 ID 匹配' : `${item.fileName}_`,
            totalAnswers: Object.keys(userAnswersBefore).length,
            fileAnswers: questionIdsBefore.length,
            sampleQuestionIds,
            questionIdsBefore: questionIdsBefore.slice(0, 5),
            sampleAnswer: questionIdsBefore.length > 0 ? userAnswersBefore[questionIdsBefore[0]] : null,
          });
          
          console.log(`🔄 [FileNameListScreen] handlePress: 開始執行清空操作`);
          try {
            await QuestionService.clearFileAnswers(item.fileName);
            console.log(`✅ [FileNameListScreen] handlePress: 答題記錄已清空`);
            
            // 清空後，檢查答題記錄狀態
            const userAnswersAfter = await QuestionService.getUserAnswers();
            
            // 使用相同的邏輯來檢查清空後的狀態
            let questionIdsAfter: string[] = [];
            if (item.fileName.startsWith('questions/')) {
              // 匯入的檔案：使用之前載入的題目 ID
              const questions = await loadImportedQuestionFile(item.fileName);
              questionIdsAfter = questions.map(q => q.id).filter(id => userAnswersAfter[id]);
            } else {
              // 本地打包的檔案：使用檔案名稱匹配
              questionIdsAfter = Object.keys(userAnswersAfter).filter(id => id.startsWith(`${item.fileName}_`));
            }
            
            console.log(`📋 [FileNameListScreen] handlePress: 清空後的答題記錄`, {
              totalAnswers: Object.keys(userAnswersAfter).length,
              fileAnswers: questionIdsAfter.length,
              sampleAnswer: questionIdsAfter.length > 0 ? userAnswersAfter[questionIdsAfter[0]] : null,
            });
            
            // 更新進度以反映清空後的狀態
            console.log(`🔄 [FileNameListScreen] handlePress: 更新進度統計`);
            await QuestionService.updateProgress();
            console.log(`✅ [FileNameListScreen] handlePress: 進度統計已更新`);
          } catch (clearError) {
            console.error(`❌ [FileNameListScreen] handlePress: 清空答題記錄失敗`, clearError);
            if (clearError instanceof Error) {
              console.error(`❌ [FileNameListScreen] handlePress: 錯誤訊息`, clearError.message);
              console.error(`❌ [FileNameListScreen] handlePress: 錯誤堆疊`, clearError.stack);
            }
            // 即使清空失敗，也繼續執行，讓用戶可以開始測驗
            console.log(`⚠️ [FileNameListScreen] handlePress: 清空失敗，但繼續執行測驗流程`);
          }
        } else {
          console.log(`ℹ️ [FileNameListScreen] handlePress: 繼續測驗模式，不清空答題記錄`);
        }
        
        let questions: Question[] = [];
        
        // 判斷是匯入的檔案還是本地打包的檔案
        console.log(`📋 [FileNameListScreen] handlePress: 處理檔案 ${item.fileName}`);
        if (item.fileName.startsWith('questions/')) {
          // 匯入的檔案：從 AsyncStorage 讀取
          console.log(`📋 [FileNameListScreen] handlePress: 從 AsyncStorage 讀取匯入檔案: ${item.fileName}`);
          questions = await loadImportedQuestionFile(item.fileName);
          console.log(`✅ [FileNameListScreen] handlePress: 載入完成，題數: ${questions.length}`);
        } else {
          // 本地打包的檔案：使用動態載入函數
          console.log(`📋 [FileNameListScreen] handlePress: 使用動態載入函數載入本地檔案: ${item.fileName}`);
          let fileData: any;
          
          // 支援所有符合格式的檔案
          try {
              fileData = await loadLocalQuestionFile(item.fileName);
              if (!fileData) {
                throw new Error(`無法載入檔案: ${item.fileName}`);
              }
              console.log(`✅ [FileNameListScreen] handlePress: ${item.fileName} 載入成功`, {
                isArray: Array.isArray(fileData),
                type: typeof fileData,
                length: Array.isArray(fileData) ? fileData.length : (fileData?.questions?.length || 0)
              });
            } catch (loadError) {
              console.error(`❌ [FileNameListScreen] handlePress: 載入 ${item.fileName} 失敗:`, loadError);
              if (loadError instanceof Error) {
                console.error(`❌ [FileNameListScreen] handlePress: 錯誤訊息: ${loadError.message}`);
                console.error(`❌ [FileNameListScreen] handlePress: 錯誤堆疊:`, loadError.stack);
              }
              throw loadError;
            }
          
          // 處理兩種格式：
          // 1. 數組格式：[{...}, {...}]
          // 2. 對象格式：{importDate, source, questions: [...]}
          const isArray = Array.isArray(fileData);
          const questionsData = isArray ? fileData : (fileData.questions || []);
          console.log(`📋 [FileNameListScreen] handlePress: 解析題目資料 - isArray: ${isArray}, 題數: ${questionsData.length}`);
          
          // 標準化題目格式（與 QuizScreen 保持一致）
          questions = questionsData.map((q: any, index: number) => {
            // 處理 E 選項：優先使用 q.E，其次使用 q.options?.E
            let EValue: string | undefined = undefined;
            if (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') {
              EValue = String(q.E);
            } else if (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '') {
              EValue = String(q.options.E);
            }
            
            return {
              id: `${item.fileName}_${index + 1}`,
              content: String(q.Q || q.content || ''),
              A: String(q.A || q.options?.A || ''),
              B: String(q.B || q.options?.B || ''),
              C: String(q.C || q.options?.C || ''),
              D: String(q.D || q.options?.D || ''),
              E: EValue,
              Ans: String(q.Ans || q.correctAnswer || 'A'),
              exp: String(q.Exp || q.exp || q.explanation || ''),
              questionNumber: index + 1,
              // 支援 Type 欄位（新格式）
              Type: q.Type,
            };
          });
          console.log(`✅ [FileNameListScreen] handlePress: 標準化完成，題數: ${questions.length}`);
        }
        
        if (questions.length === 0) {
          Alert.alert('錯誤', '無法載入題目資料');
          return;
        }
        
        // 將題目資料存儲到 AsyncStorage，供 Quiz 頁面讀取
        console.log(`💾 [FileNameListScreen] handlePress: 儲存題目到 AsyncStorage`, {
          questionCount: questions.length,
          fileName: item.fileName,
        });
        await AsyncStorage.setItem('@quiz:directQuestions', JSON.stringify(questions));
        console.log(`✅ [FileNameListScreen] handlePress: 題目已儲存到 AsyncStorage`);
        
        // 導航到題目頁
        // 如果是索引檔案（有 series_no 且不是匯入檔案），使用正確的參數；否則使用 DIRECT_FILE
        // 判斷邏輯：如果有 series_no 且不是匯入檔案（不以 questions/ 開頭），則視為索引檔案
        const isIndexFile = !!(item.series_no && !item.fileName.startsWith('questions/'));
        const navigationTestName = isIndexFile ? (item.testName || 'GOVERNMENT_PROCUREMENT') : 'DIRECT_FILE';
        const navigationSeriesNo = isIndexFile ? item.series_no! : item.fileName;
        
        console.log(`🚀 [FileNameListScreen] handlePress: 準備導航到測驗頁面`, {
          isIndexFile,
          testName: navigationTestName,
          subject: '',
          series_no: navigationSeriesNo,
          directFileName: isIndexFile ? undefined : item.fileName,
        });
        
        navigation.navigate('Quiz', {
          testName: navigationTestName,
          subject: '',
          series_no: navigationSeriesNo,
          ...(isIndexFile ? {} : { directFileName: item.fileName }),
        });
        
        console.log(`✅ [FileNameListScreen] handlePress: 已導航到測驗頁面`);
        console.log(`🎉 [FileNameListScreen] handlePress: 已完成 - 重新測驗流程執行完畢`, {
          fileName: item.fileName,
          displayName: item.displayName,
          questionCount: questions.length,
          isCompleted,
          isStartTest,
        });
      } catch (error) {
        console.error(`❌ [FileNameListScreen] handlePress: 載入檔案失敗`, error);
        if (error instanceof Error) {
          console.error(`❌ [FileNameListScreen] handlePress: 錯誤訊息`, error.message);
          console.error(`❌ [FileNameListScreen] handlePress: 錯誤堆疊`, error.stack);
        }
        Alert.alert('錯誤', '載入檔案失敗，請稍後再試');
      }
    };
    
    const completionPercentage = item.fileCount > 0 
      ? Math.round((item.completedCount || 0) / item.fileCount * 100) 
      : 0;
    const isCompleted = (item.completedCount || 0) >= item.fileCount && item.fileCount > 0;
    const isInProgress = (item.completedCount || 0) > 0 && !isCompleted;
    // 只有完成測驗的才顯示檢視按鈕
    const shouldShowViewButton = !item.isWrongBook && isCompleted;
    
    const handleViewPress = async () => {
      try {
        let questions: Question[] = [];
        
        // 判斷是匯入的檔案還是本地打包的檔案
        if (item.fileName.startsWith('questions/')) {
          // 匯入的檔案：從 AsyncStorage 讀取
          questions = await loadImportedQuestionFile(item.fileName);
        } else {
          // 本地打包的檔案：使用動態載入函數
          let fileData: any;
          
          try {
            fileData = await loadLocalQuestionFile(item.fileName);
            if (!fileData) {
              console.error(`❌ [FileNameListScreen] handleViewPress: ${item.fileName} 載入失敗（檔案不存在或格式不正確）`);
              Alert.alert('錯誤', `無法載入檔案: ${item.fileName}`);
              return;
            }
          } catch (loadError) {
            console.error(`❌ [FileNameListScreen] handleViewPress: 載入 ${item.fileName} 失敗:`, loadError);
            Alert.alert('錯誤', `無法載入題目資料: ${loadError instanceof Error ? loadError.message : '未知錯誤'}`);
            return;
          }
          
          // 處理兩種格式
          const isArray = Array.isArray(fileData);
          const questionsData = isArray ? fileData : (fileData.questions || []);
          
          // 標準化題目格式（與 QuizScreen 保持一致）
          questions = questionsData.map((q: any, index: number) => {
            // 處理 E 選項：優先使用 q.E，其次使用 q.options?.E
            let EValue: string | undefined = undefined;
            if (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') {
              EValue = String(q.E);
            } else if (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '') {
              EValue = String(q.options.E);
            }
            
            return {
              id: `${item.fileName}_${index + 1}`,
              content: String(q.Q || q.content || ''),
              A: String(q.A || q.options?.A || ''),
              B: String(q.B || q.options?.B || ''),
              C: String(q.C || q.options?.C || ''),
              D: String(q.D || q.options?.D || ''),
              E: EValue,
              Ans: String(q.Ans || q.correctAnswer || 'A'),
              exp: String(q.Exp || q.exp || q.explanation || ''),
              questionNumber: index + 1,
              // 支援 Type 欄位（新格式）
              Type: q.Type,
            };
          });
        }
        
        if (questions.length === 0) {
          Alert.alert('錯誤', '沒有題目可檢視');
          return;
        }
        
        const questionIds = questions.map(q => q.id);
        
        console.log('📋 [FileNameListScreen] handleViewPress: 準備導航到檢視畫面', {
          questionCount: questions.length,
          questionIds: questionIds.slice(0, 3),
          fileName: item.fileName,
        });
        
        // 導航到檢視畫面（傳遞題目資料，避免從 getAllQuestions 中查找）
        navigation.navigate('ReviewQuiz', {
          questionId: questionIds[0],
          questionIds: questionIds,
          questions: questions, // 直接傳遞題目資料
        });
      } catch (error) {
        console.error('檢視題目失敗:', error);
        Alert.alert('錯誤', '檢視題目失敗，請稍後再試');
      }
    };

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
            <View style={styles.buttonContainer}>
              {shouldShowViewButton && (
                <TouchableOpacity
                  style={[
                    styles.actionButton,
                    styles.viewButton,
                    {
                      backgroundColor: '#4CAF50',
                      borderColor: '#4CAF50',
                      borderWidth: 1,
                      // 安卓和 iOS 平台：按鈕大小為 80%
                      ...(Platform.OS !== 'web' ? {
                        paddingHorizontal: 12 * 0.8,
                        paddingVertical: 8 * 0.8,
                        borderRadius: 7.2 * 0.8,
                        minWidth: 0,
                        minHeight: 50 * 0.8,
                      } : {
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        minWidth: 0,
                        minHeight: 50,
                      }),
                    },
                  ]}
                  onPress={handleViewPress}
                >
                  {Platform.OS === 'web' ? (
                    <View style={{
                      height: textSizeValue * 1.2 * 1.3 * 2,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                    }}>
                      <Text
                        style={[
                          styles.actionButtonText,
                          {
                            color: '#FFFFFF',
                            fontWeight: '600',
                            fontSize: textSizeValue * 1.2,
                            textAlign: 'center',
                            lineHeight: textSizeValue * 1.2 * 1.3,
                            includeFontPadding: false,
                          },
                        ]}
                      >
                        檢視
                      </Text>
                    </View>
                  ) : (
                    <View style={{
                      height: textSizeValue * 1.2 * 0.8 * 1.3 * 2,
                      justifyContent: 'center',
                      alignItems: 'center',
                      width: '100%',
                    }}>
                      <Text
                        style={[
                          styles.actionButtonText,
                          {
                            color: '#FFFFFF',
                            fontWeight: '600',
                            fontSize: textSizeValue * 1.2 * 0.8,
                            textAlign: 'center',
                            lineHeight: textSizeValue * 1.2 * 0.8 * 1.3,
                            includeFontPadding: false,
                          },
                        ]}
                      >
                        檢視
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  { 
                    backgroundColor: colors.primary,
                    // 安卓和 iOS 平台：按鈕大小為 80%
                    ...(Platform.OS !== 'web' ? {
                      paddingHorizontal: 12 * 0.8,
                      paddingVertical: 8 * 0.8,
                      borderRadius: 7.2 * 0.8,
                      minWidth: 60 * 0.8,
                      minHeight: 50 * 0.8,
                    } : {
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      minWidth: 60,
                      minHeight: 50,
                    }),
                  },
                ]}
                onPress={handlePress}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: '#FFFFFF',
                      fontSize: Platform.OS !== 'web' 
                        ? textSizeValue * 1.2 * 0.8 
                        : textSizeValue * 1.2,
                      textAlign: 'center',
                      lineHeight: Platform.OS !== 'web' 
                        ? textSizeValue * 1.2 * 0.8 * 1.3 
                        : textSizeValue * 1.2 * 1.3,
                      includeFontPadding: false,
                      width: Platform.OS !== 'web' ? 48 : 60,
                    },
                  ]}
                  numberOfLines={2}
                >
                  {item.isWrongBook ? '開始\n測驗' : (isCompleted ? '重新\n測驗' : (item.completedCount && item.completedCount > 0 ? '繼續\n測驗' : '開始\n測驗'))}
                </Text>
              </TouchableOpacity>
            </View>
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
      edges={['top', 'bottom']}
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
          {appName}
        </Text>
        <View style={styles.headerRight}>
          {!isDeleteMode ? (
            <>
              {appConfig?.enableFavor && (
                <TouchableOpacity
                  onPress={handleClearAllFavorites}
                  style={[styles.headerButton, styles.clearAllButton]}
                >
                  <Text
                    style={[
                      styles.clearAllButtonText,
                      {
                        color: colors.headerText,
                      },
                    ]}
                  >
                    清除最愛
                  </Text>
                </TouchableOpacity>
              )}
              {appConfig?.enableTrash && (
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
              )}
              {appConfig?.enableImport && (
                <TouchableOpacity
                  onPress={() => {
                    // 所有平台：顯示匯入選項 Modal（包含本地匯入和遠端網站匯入）
                    setShowImportModal(true);
                  }}
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
              )}
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

            {/* 本地匯入選項 - 所有平台都顯示 */}
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

            {/* 遠端網站匯入選項 */}
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
  clearAllButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.5)',
    minWidth: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearAllButtonText: {
    fontWeight: '700',
    fontSize: 12,
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
    width: '100%',
  },
  fileNameContainer: {
    flex: 1,
    marginRight: 8,
    flexDirection: 'column',
    flexShrink: 1,
    minWidth: 0,
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
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
    flexShrink: 0,
    marginLeft: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 7.2,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    alignSelf: 'center',
    minHeight: 0,
  },
  viewButton: {
    // 檢視按鈕的特殊樣式（綠色背景）
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

