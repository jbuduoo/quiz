import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp, CommonActions } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Question, UserAnswer } from '../types';
import QuestionService from '../services/QuestionService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { RootStackParamList } from '../../App';
import RichTextWithImages from '../components/RichTextWithImages';
import SearchQuestionModal from '../components/SearchQuestionModal';
import { getQuestionDisplay, separateBackgroundAndQuestion } from '../utils/questionGroupParser';
import { getTestNameDisplay, getSubjectDisplay } from '../utils/nameMapper';
import { useTheme } from '../contexts/ThemeContext';
import { loadLocalQuestionFile } from '../utils/fileLoader';
import { loadImportedQuestionFile } from '../services/ImportService';
import { isTrueFalseQuestion, isTrueFalseAnswerEquivalent, isMultipleChoice as isMultipleChoiceHelper, isEssayQuestion } from '../utils/questionTypeHelper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QuizRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

const QuizScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<QuizRouteProp>();
  const { testName, subject, series_no, isReviewMode, directFileName } = route.params;
  const isReviewModeBool = Boolean(isReviewMode);
  const insets = useSafeAreaInsets();
  const { answerPageTextSizeValue } = useTheme();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E' | string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<'A' | 'B' | 'C' | 'D' | 'E'>>([]); // 複選題的多選答案
  const [isMultipleChoice, setIsMultipleChoice] = useState(false); // 是否為複選題
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [isUncertain, setIsUncertain] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showBackgroundForGroup, setShowBackgroundForGroup] = useState(false);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [showEssayAnswer, setShowEssayAnswer] = useState(false);
  const [scoreData, setScoreData] = useState<{
    correctCount: number;
    wrongCount: number;
    totalCount: number;
    score: number;
  } | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      loadUserAnswer();
    }
  }, [questions, currentIndex]);

  // 當題目改變時，重置背景展開狀態和問答題答案顯示狀態
  useEffect(() => {
    setShowBackgroundForGroup(false);
    setShowEssayAnswer(false);
  }, [currentIndex]);

  // 檢測是否為複選題
  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      const currentQuestion = questions[currentIndex];
      if (currentQuestion) {
        const isMultiple = isMultipleChoiceHelper(currentQuestion);
        setIsMultipleChoice(isMultiple);
        if (!isMultiple) {
          // 單選題重置為單選模式
          setSelectedAnswers([]);
        }
      }
    }
  }, [currentIndex, questions]);

  const loadQuestions = async () => {
    setLoading(true);
    
    let questionsData: Question[] = [];
    
    // 如果是直接載入的檔案，從 AsyncStorage 讀取
    if (directFileName && testName === 'DIRECT_FILE') {
      try {
        // 暫時清除 AsyncStorage 快取，強制重新載入檔案（確保 E 選項被正確處理）
        // TODO: 可以在未來添加版本檢查機制，而不是每次都清除
        await AsyncStorage.removeItem('@quiz:directQuestions');
        const storedData = await AsyncStorage.getItem('@quiz:directQuestions');
        if (storedData) {
          // 從 AsyncStorage 讀取的資料也需要經過標準化處理，確保 E 選項被正確處理
          const parsedData = JSON.parse(storedData);
          const isArray = Array.isArray(parsedData);
          const questionsArray = isArray ? parsedData : (parsedData.questions || []);
          
          if (questionsArray.length > 0) {
            questionsData = questionsArray.map((q: any, index: number) => {
              // 處理 E 選項：優先使用 q.E，其次使用 q.options?.E
              let EValue: string | undefined = undefined;
              if (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') {
                EValue = String(q.E);
              } else if (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '') {
                EValue = String(q.options.E);
              }
              
              // 調試：檢查第2題（複選題）的 E 選項載入情況（從 AsyncStorage）
              if (index === 1) {
                console.log('🔍 [載入題目-AsyncStorage] 第2題（複選題）E 選項載入:', {
                  rawE: q.E,
                  rawEType: typeof q.E,
                  optionsE: q.options?.E,
                  finalE: EValue,
                  hasE: EValue !== undefined,
                  fullQuestion: q
                });
              }
              
              return {
                id: q.id || `${directFileName}_${index + 1}`,
                content: String(q.content || q.Q || ''),
                A: String(q.A || q.options?.A || ''),
                B: String(q.B || q.options?.B || ''),
                C: String(q.C || q.options?.C || ''),
                D: String(q.D || q.options?.D || ''),
                E: EValue,
                Ans: String(q.Ans || q.correctAnswer || 'A'),
                exp: String(q.exp || q.Exp || q.explanation || ''),
                questionNumber: q.questionNumber || index + 1,
                // 支援 Type 欄位（新格式）
                Type: q.Type,
              };
            });
            console.log(`✅ [QuizScreen] loadQuestions: 從 AsyncStorage 載入並標準化完成，題數: ${questionsData.length}`);
            // 調試：檢查第2題的 E 選項是否正確載入
            if (questionsData.length > 1) {
              console.log('🔍 [載入題目-AsyncStorage] 第2題最終資料:', {
                id: questionsData[1].id,
                E: questionsData[1].E,
                EType: typeof questionsData[1].E,
                hasE: questionsData[1].E !== undefined
              });
            }
          } else {
            questionsData = [];
          }
        } else {
          // 如果 AsyncStorage 沒有，根據檔案類型選擇載入方式
          console.log(`📋 [QuizScreen] loadQuestions: AsyncStorage 沒有快取，直接載入檔案: ${directFileName}`);
          
          if (directFileName) {
            // 判斷是使用者匯入的檔案還是系統預設檔案
            if (directFileName.startsWith('questions/')) {
              // 使用者匯入的檔案：從 ImportService 載入
              console.log(`📋 [QuizScreen] loadQuestions: 從 ImportService 載入使用者匯入檔案: ${directFileName}`);
              try {
                questionsData = await loadImportedQuestionFile(directFileName);
                if (questionsData.length > 0) {
                  console.log(`✅ [QuizScreen] loadQuestions: 從 ImportService 載入成功，題數: ${questionsData.length}`);
                } else {
                  console.error(`❌ [QuizScreen] loadQuestions: ${directFileName} 載入失敗（檔案不存在或格式不正確）`);
                }
              } catch (importError) {
                console.error(`❌ [QuizScreen] loadQuestions: 載入使用者匯入檔案 ${directFileName} 時發生錯誤:`, importError);
              }
            } else {
              // 系統預設檔案：使用 loadLocalQuestionFile
              console.log(`📋 [QuizScreen] loadQuestions: 載入系統預設檔案: ${directFileName}`);
              let fileData: any;
              
              try {
                fileData = await loadLocalQuestionFile(directFileName);
                if (fileData) {
                  console.log(`✅ [QuizScreen] loadQuestions: ${directFileName} 載入成功`);
                  
                  // 處理兩種格式：
                  // 1. 數組格式：[{...}, {...}]
                  // 2. 對象格式：{importDate, source, questions: [...]}
                  console.log(`📋 [QuizScreen] loadQuestions: 解析檔案資料`);
                  const isArray = Array.isArray(fileData);
                  const questionsArray = isArray ? fileData : (fileData.questions || []);
                  console.log(`📋 [QuizScreen] loadQuestions: isArray: ${isArray}, 題數: ${questionsArray.length}`);
                  
                  if (questionsArray.length > 0) {
                    questionsData = questionsArray.map((q: any, index: number) => {
                      // 處理 E 選項：優先使用 q.E，其次使用 q.options?.E
                      let EValue: string | undefined = undefined;
                      if (q.E !== undefined && q.E !== null && String(q.E).trim() !== '') {
                        EValue = String(q.E);
                      } else if (q.options?.E !== undefined && q.options?.E !== null && String(q.options.E).trim() !== '') {
                        EValue = String(q.options.E);
                      }
                      
                      // 調試：檢查第2題（複選題）的 E 選項載入情況
                      if (index === 1) {
                        console.log('🔍 [載入題目] 第2題（複選題）E 選項載入:', {
                          rawE: q.E,
                          rawEType: typeof q.E,
                          optionsE: q.options?.E,
                          finalE: EValue,
                          hasE: EValue !== undefined
                        });
                      }
                      
                      return {
                        id: `${directFileName}_${index + 1}`,
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
                    console.log(`✅ [QuizScreen] loadQuestions: 標準化完成，題數: ${questionsData.length}`);
                  }
                } else {
                  console.error(`❌ [QuizScreen] loadQuestions: ${directFileName} 載入失敗（檔案不存在或格式不正確）`);
                }
              } catch (loadError) {
                console.error(`❌ [QuizScreen] loadQuestions: 載入系統預設檔案 ${directFileName} 時發生錯誤:`, loadError);
              }
            }
          } else {
            console.warn(`⚠️ [QuizScreen] loadQuestions: 未指定檔案名稱`);
          }
        }
      } catch (error) {
        console.error('載入直接檔案失敗:', error);
      }
    } else {
      // 使用原有的載入方式
      questionsData = await QuestionService.getQuestionsByTestNameSubjectSeries(
        testName,
        subject || null,
        series_no
      );
    }
    
    setQuestions(questionsData);
    
    // 載入上次的進度，如果有的話
    const savedIndex = await QuestionService.getQuizProgressByKey(testName, subject || null, series_no);
    if (savedIndex !== null && savedIndex >= 0 && savedIndex < questionsData.length) {
      setCurrentIndex(savedIndex);
    } else {
      setCurrentIndex(0);
    }
    
    setLoading(false);
  };

  const loadUserAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const answers = await QuestionService.getUserAnswers();
    setUserAnswers(answers);
    const answer = answers[currentQuestion.id];
    
    // 檢查題目在當前測驗中是否答過（有選擇答案才算答過）
    const isAnsweredInCurrentQuiz = answer?.isAnswered && answer?.selectedAnswer !== undefined;
    
    if (isAnsweredInCurrentQuiz) {
      // 如果題目在當前測驗中已答過，恢復之前的狀態
      const savedAnswer = answer.selectedAnswer || null;
      setSelectedAnswer(savedAnswer);
      
      // 如果是複選題且答案包含逗號，解析為陣列
      const isMultiple = isMultipleChoiceHelper(currentQuestion);
      if (isMultiple && savedAnswer && typeof savedAnswer === 'string' && savedAnswer.includes(',')) {
        setSelectedAnswers(savedAnswer.split(',').map(a => a.trim()) as Array<'A' | 'B' | 'C' | 'D' | 'E'>);
      } else if (isMultiple) {
        setSelectedAnswers([]);
      }
      
      setShowResult(true);
      setIsCorrect(Boolean(answer.isCorrect));
      setIsUncertain(Boolean(answer?.isUncertain));
      setIsFavorite(Boolean(answer?.isFavorite));
    } else {
      // 如果題目在當前測驗中未答過
      setSelectedAnswer(null);
      setSelectedAnswers([]);
      setIsCorrect(false);
      setIsUncertain(false);
      // 載入收藏狀態（如果之前收藏過）
      setIsFavorite(Boolean(answer?.isFavorite));
      
      // 檢視模式下，未答的題目也顯示結果（標示為未作答）
      if (isReviewModeBool) {
        setShowResult(true);
      } else {
        setShowResult(false);
      }
    }
  };

  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D' | 'E') => {
    // 檢視模式下不允許選擇答案
    if (isReviewModeBool || showResult) return;

    const currentQuestion = questions[currentIndex];
    const correctAnswer = String(currentQuestion.Ans);
    const isMultiple = isMultipleChoiceHelper(currentQuestion);

    if (isMultiple) {
      // 複選題：切換選項選擇狀態
      setSelectedAnswers(prev => {
        if (prev.includes(option)) {
          return prev.filter(a => a !== option);
        } else {
          return [...prev, option];
        }
      });
      // 不立即顯示結果，等待提交
    } else {
      // 單選題或是非題：立即顯示結果
      setSelectedAnswer(option);
      
      // 處理是非題的特殊答案格式
      let correct: boolean;
      if (isTrueFalseQuestion(currentQuestion)) {
        // 是非題：使用等價比較（O/A/是 等價，X/B/否 等價）
        correct = isTrueFalseAnswerEquivalent(option, correctAnswer, currentQuestion);
      } else {
        // 一般單選題：直接比較
        correct = option === correctAnswer;
      }
      
      setIsCorrect(correct);
      setShowResult(true);

      // 更新答題記錄，保存選擇的答案
      await QuestionService.updateUserAnswer(currentQuestion.id, {
        isCorrect: correct,
        isAnswered: true,
        selectedAnswer: option,
      });

      // 答題後，收藏狀態會自動同步錯題本狀態（在 updateUserAnswer 中處理）

      // 保存當前進度
      await QuestionService.saveQuizProgress(testName, subject || null, series_no, currentIndex);

      // 重新載入用戶答案
      await loadUserAnswer();
    }
  };

  // 提交複選題答案
  const handleSubmitAnswer = async () => {
    if (selectedAnswers.length === 0) return;

    const currentQuestion = questions[currentIndex];
    const correctAnswer = String(currentQuestion.Ans);
    const correctOptions = correctAnswer.split(',').map(a => a.trim()).sort();
    const selectedOptions = [...selectedAnswers].sort();
    
    // 比較兩個陣列是否完全相同（選項和數量都要對）
    const isCorrect = 
      correctOptions.length === selectedOptions.length &&
      correctOptions.every((val, index) => val === selectedOptions[index]);
    
    setIsCorrect(isCorrect);
    setShowResult(true);
    const answerString = selectedAnswers.join(',');
    setSelectedAnswer(answerString); // 保存為字串格式，用於顯示
    
    await QuestionService.updateUserAnswer(currentQuestion.id, {
      isCorrect,
      isAnswered: true,
      selectedAnswer: answerString,
    });
    
    await QuestionService.saveQuizProgress(testName, subject || null, series_no, currentIndex);
    await loadUserAnswer();
  };

  const handleSearchQuestion = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // 開啟搜尋 Modal（會顯示 Google 搜尋結果，包含 AI 摘要）
    setShowSearchModal(true);
  };

  // 切換收藏狀態（同步錯題本）
  const handleToggleFavorite = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    console.log(`📋 [QuizScreen] handleToggleFavorite: 題目ID: ${currentQuestion.id}, 平台: ${Platform.OS}`);
    const newFavoriteStatus = await QuestionService.toggleFavorite(currentQuestion.id);
    console.log(`📋 [QuizScreen] handleToggleFavorite: 新狀態: ${newFavoriteStatus}`);
    setIsFavorite(newFavoriteStatus);
    
    // 重新載入用戶答案以更新狀態
    await loadUserAnswer();
    
    // 驗證狀態
    const answers = await QuestionService.getUserAnswers();
    const answer = answers[currentQuestion.id];
    console.log(`✅ [QuizScreen] handleToggleFavorite: 驗證結果:`, {
      isFavorite: answer?.isFavorite,
      isInWrongBook: answer?.isInWrongBook,
      同步: answer?.isFavorite === answer?.isInWrongBook
    });
  };

  const handleReportProblem = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    try {
      // 問題回報不會主動加入錯題本
      await loadUserAnswer();
      
      // 直接使用題目 ID
      const instanceId = currentQuestion.id;
      
      // 開啟 Google 表單，並將題目編號作為 URL 參數傳遞（自動填入表單）
      const googleFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfnfLFKCPYCRXbY12_xv5abVfvon_FTULBc0FYd4d7xD2A7ZQ/viewform?usp=pp_url&entry.654895695=${encodeURIComponent(instanceId)}`;
      
      console.log('📝 [handleReportProblem] 準備開啟 Google 表單:', googleFormUrl);
      
      // 直接開啟 Google 表單
      if (Platform.OS === 'web') {
        // Web 平台
        if (typeof window !== 'undefined') {
          window.open(googleFormUrl, '_blank');
          console.log('✅ [handleReportProblem] Web 平台：已開啟新視窗');
        }
      } else {
        // 原生平台（iOS/Android）
        const canOpen = await Linking.canOpenURL(googleFormUrl);
        if (canOpen) {
          Linking.openURL(googleFormUrl)
            .then(() => {
              console.log('✅ [handleReportProblem] 已開啟 Google 表單');
            })
            .catch(err => {
              console.error('❌ [handleReportProblem] 無法開啟 Google 表單:', err);
              Alert.alert(
                '無法開啟表單',
                `無法開啟 Google 表單，請手動複製題目編號：\n\n${instanceId}`,
                [
                  { text: '複製編號', onPress: async () => {
                    try {
                      // 使用 React Native 的 Clipboard API（需要從 @react-native-clipboard/clipboard 導入）
                      // 如果沒有安裝，則顯示題目編號讓用戶手動複製
                      const Clipboard = require('@react-native-clipboard/clipboard').default || require('@react-native-clipboard/clipboard');
                      if (Clipboard && Clipboard.setString) {
                        Clipboard.setString(instanceId);
                        Alert.alert('已複製', '題目編號已複製到剪貼簿');
                      } else {
                        Alert.alert('請手動複製', instanceId);
                      }
                    } catch (clipboardError) {
                      console.error('無法使用剪貼簿:', clipboardError);
                      Alert.alert('請手動複製', instanceId);
                    }
                  }},
                  { text: '確定', style: 'cancel' }
                ]
              );
            });
        } else {
          console.error('❌ [handleReportProblem] 無法開啟 URL:', googleFormUrl);
          Alert.alert(
            '錯誤',
            `無法開啟 Google 表單，請手動複製題目編號：\n\n${instanceId}`,
            [
              { text: '複製編號', onPress: async () => {
                try {
                  const Clipboard = require('@react-native-clipboard/clipboard').default || require('@react-native-clipboard/clipboard');
                  if (Clipboard && Clipboard.setString) {
                    Clipboard.setString(instanceId);
                    Alert.alert('已複製', '題目編號已複製到剪貼簿');
                  } else {
                    Alert.alert('請手動複製', instanceId);
                  }
                } catch (clipboardError) {
                  console.error('無法使用剪貼簿:', clipboardError);
                  Alert.alert('請手動複製', instanceId);
                }
              }},
              { text: '確定', style: 'cancel' }
            ]
          );
        }
      }
    } catch (error) {
      console.error('❌ [handleReportProblem] 發生錯誤:', error);
      Alert.alert('錯誤', '處理問題回報時發生錯誤，請稍後再試');
    }
  };

  const handlePrevious = async () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      // 保存進度
      await QuestionService.saveQuizProgress(testName, subject || null, series_no, newIndex);
      // 不重置狀態，讓 loadUserAnswer 來恢復狀態
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      // 保存進度
      await QuestionService.saveQuizProgress(testName, subject || null, series_no, newIndex);
      // 不重置狀態，讓 loadUserAnswer 來恢復狀態
    } else {
      // 已經是最後一題，檢查是否已答題
      const currentQuestion = questions[currentIndex];
      if (currentQuestion) {
        const answers = await QuestionService.getUserAnswers();
        const answer = answers[currentQuestion.id];
        
        // 如果最後一題已答題，直接顯示成績
        if (answer?.isAnswered) {
          await handleShowScore();
        } else {
          // 如果最後一題未答題，詢問是否結束測驗
          if (typeof window !== 'undefined') {
            // Web 平台
            const confirmed = window.confirm('是否結束測驗？');
            if (confirmed) {
              await handleEndQuizConfirm();
            }
          } else {
            // 原生平台
            Alert.alert('確認', '是否結束測驗？', [
              { text: '否', style: 'cancel' },
              {
                text: '是',
                onPress: async () => {
                  await handleEndQuizConfirm();
                },
              },
            ]);
          }
        }
      }
    }
  };

  const handleShowScore = async () => {
    // 計算成績
    const userAnswers = await QuestionService.getUserAnswers();
    let correctCount = 0;
    let wrongCount = 0;
    
    questions.forEach(q => {
      const answer = userAnswers[q.id];
      // 檢測是否為問答題
      const isEssay = isEssayQuestion(q);
      
      if (answer?.isAnswered) {
        if (answer.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      } else if (isEssay) {
        // 問答題如果未答過，自動當作答對處理
        correctCount++;
      }
    });
    
    const totalAnswered = correctCount + wrongCount;
    const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    
    // 保存分數（如果適用）
    if (!directFileName) {
      await QuestionService.saveQuizScore(testName, subject || null, series_no, score);
    }
    
    // 設置成績資料並顯示 Modal
    setScoreData({
      correctCount,
      wrongCount,
      totalCount: questions.length,
      score,
    });
    setShowScoreModal(true);
  };

  const handleEndQuizConfirm = async () => {
    // 計算已完成和未完成的題數
    const userAnswers = await QuestionService.getUserAnswers();
    let completedCount = 0;
    
    for (const q of questions) {
      const answer = userAnswers[q.id];
      // 檢測是否為問答題
      const isEssay = isEssayQuestion(q);
      
      if (answer?.isAnswered) {
        completedCount++;
      } else if (isEssay) {
        // 問答題如果未答過，自動標記為答對
        completedCount++;
        await QuestionService.updateUserAnswer(q.id, {
          isCorrect: true,
          isAnswered: true,
          selectedAnswer: 'ESSAY', // 標記為問答題
        });
      }
    }
    
    const uncompletedCount = questions.length - completedCount;
    
    // 將未答的題目標記為錯誤（排除問答題）
    for (const question of questions) {
      const answer = userAnswers[question.id];
      // 檢測是否為問答題
      const isEssay = isEssayQuestion(question);
      
      if (!answer || !answer.isAnswered) {
        if (isEssay) {
          // 問答題自動標記為答對
          await QuestionService.updateUserAnswer(question.id, {
            isCorrect: true,
            isAnswered: true,
            selectedAnswer: 'ESSAY', // 標記為問答題
          });
        } else {
          // 未答的題目標記為錯誤
          await QuestionService.updateUserAnswer(question.id, {
            isAnswered: true,
            isCorrect: false,
            isInWrongBook: true,
            selectedAnswer: undefined,
          });
        }
      }
    }
    
    // 重新計算分數
    const updatedAnswers = await QuestionService.getUserAnswers();
    let correctCount = 0;
    let wrongCount = 0;
    
    questions.forEach(q => {
      const answer = updatedAnswers[q.id];
      // 檢測是否為問答題
      const isEssay = isEssayQuestion(q);
      
      if (answer?.isAnswered) {
        if (answer.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      } else if (isEssay) {
        // 問答題如果未答過，自動當作答對處理
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / questions.length) * 100);
    
    // 保存分數
    await QuestionService.saveQuizScore(testName, subject || null, series_no, score);
    
    // 設置成績資料並顯示 Modal
    setScoreData({
      correctCount,
      wrongCount,
      totalCount: questions.length,
      score,
    });
    setShowScoreModal(true);
  };

  const handleConfirm = async () => {
    // 關閉成績 Modal
    setShowScoreModal(false);
    
    console.log('📋 [QuizScreen] handleConfirm: 開始處理確認，準備返回首頁');
    console.log('📋 [QuizScreen] handleConfirm: 測驗資訊', {
      testName,
      subject,
      series_no,
      directFileName,
      questionCount: questions.length,
    });
    
    // 確保所有答題記錄都已保存
    const userAnswers = await QuestionService.getUserAnswers();
    console.log('📋 [QuizScreen] handleConfirm: 當前答題記錄數量', Object.keys(userAnswers).length);
    
    // 檢查當前測驗的所有題目是否都已標記為已回答
    // 如果沒有，確保所有題目都被標記（包括問答題和未答題目）
    let answeredCount = 0;
    const unAnsweredQuestions: Question[] = [];
    
    questions.forEach(q => {
      const answer = userAnswers[q.id];
      if (answer?.isAnswered) {
        answeredCount++;
      } else {
        unAnsweredQuestions.push(q);
      }
    });
    
    console.log('📋 [QuizScreen] handleConfirm: 已回答題數', {
      answeredCount,
      totalQuestions: questions.length,
      unAnsweredCount: unAnsweredQuestions.length,
      allAnswered: answeredCount === questions.length,
    });
    
    // 如果有未答的題目，確保它們都被標記（類似 handleEndQuizConfirm 的邏輯）
    if (unAnsweredQuestions.length > 0) {
      console.log('📋 [QuizScreen] handleConfirm: 發現未答題目，開始標記');
      for (const question of unAnsweredQuestions) {
        // 檢測是否為問答題
        const isEssay = isEssayQuestion(question);
        
        if (isEssay) {
          // 問答題自動標記為答對
          await QuestionService.updateUserAnswer(question.id, {
            isCorrect: true,
            isAnswered: true,
            selectedAnswer: 'ESSAY',
          });
          console.log(`✅ [QuizScreen] handleConfirm: 問答題 ${question.id} 已標記為答對`);
        } else {
          // 未答的題目標記為錯誤
          await QuestionService.updateUserAnswer(question.id, {
            isAnswered: true,
            isCorrect: false,
            isInWrongBook: true,
            selectedAnswer: undefined,
          });
          console.log(`✅ [QuizScreen] handleConfirm: 未答題目 ${question.id} 已標記為錯誤`);
        }
      }
      console.log('✅ [QuizScreen] handleConfirm: 所有未答題目已標記完成');
    }
    
    await QuestionService.updateProgress();
    console.log('✅ [QuizScreen] handleConfirm: 進度已更新');
    
    // 保存當前測驗信息到 AsyncStorage，供首頁使用
    const quizInfo = {
      testName,
      subject: subject || null,
      series_no,
      directFileName: directFileName || null,
      questionIds: questions.map(q => q.id),
    };
    await AsyncStorage.setItem('@quiz:lastCompletedQuiz', JSON.stringify(quizInfo));
    console.log('✅ [QuizScreen] handleConfirm: 測驗資訊已保存到 AsyncStorage');
    
    // 最終確認：檢查所有題目是否都已標記
    const finalAnswers = await QuestionService.getUserAnswers();
    let finalAnsweredCount = 0;
    questions.forEach(q => {
      const answer = finalAnswers[q.id];
      if (answer?.isAnswered) {
        finalAnsweredCount++;
      }
    });
    console.log('📋 [QuizScreen] handleConfirm: 最終確認答題記錄', {
      finalAnsweredCount,
      totalQuestions: questions.length,
      allAnswered: finalAnsweredCount === questions.length,
      sampleAnswers: questions.slice(0, 3).map(q => ({
        questionId: q.id,
        isAnswered: finalAnswers[q.id]?.isAnswered,
        selectedAnswer: finalAnswers[q.id]?.selectedAnswer,
      })),
    });
    
    // 返回首頁
    console.log('🚀 [QuizScreen] handleConfirm: 準備返回首頁');
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'FileNameList' }],
      })
    );
    console.log('✅ [QuizScreen] handleConfirm: 已返回首頁');
  };

  const handleReviewQuiz = async () => {
    // 獲取所有題目的 ID
    const questionIds = questions.map(q => q.id);
    
    // 導航到檢視畫面
    navigation.navigate('ReviewQuiz', {
      questionId: questionIds[0],
      questionIds: questionIds,
    });
  };

  const handleNewStart = async () => {
    await QuestionService.updateProgress();
    
    // 結算分數後清除答題記錄，讓按鈕顯示「開始測驗」
    if (directFileName) {
      await QuestionService.clearFileAnswers(directFileName);
    } else {
      await QuestionService.clearSeriesAnswers(testName, subject || null, series_no);
      await QuestionService.clearQuizProgress(testName, subject || null, series_no);
    }
    await QuestionService.updateProgress();
    
    // 重置導航堆疊並返回首頁
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'FileNameList' }],
      })
    );
  };

  const handleEndQuiz = async () => {
    // 計算已完成和未完成的題數
    const userAnswers = await QuestionService.getUserAnswers();
    let completedCount = 0;
    
    questions.forEach(q => {
      const answer = userAnswers[q.id];
      if (answer?.isAnswered) {
        completedCount++;
      }
    });
    
    const uncompletedCount = questions.length - completedCount;
    
    // 顯示確認對話框
    const confirmMessage = `目前已完成${completedCount}題，尚有${uncompletedCount}題未完成，確定要交卷。`;
    
    if (typeof window !== 'undefined') {
      // Web 平台
      const confirmed = window.confirm(confirmMessage);
      if (confirmed) {
        await handleEndQuizConfirm();
      }
    } else {
      // 原生平台
      Alert.alert('確認交卷', confirmMessage, [
        { text: '取消', style: 'cancel' },
        {
          text: '確定',
          onPress: handleEndQuizConfirm,
        },
      ]);
    }
  };

  if (loading || questions.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const currentQuestion = questions[currentIndex];
  const progress = `${currentIndex + 1}/${questions.length}`;
  const displayInfo = getQuestionDisplay(currentQuestion, questions);
  const { background } = separateBackgroundAndQuestion(currentQuestion.content);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
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
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {(() => {
              // 如果是直接載入的檔案，從檔案路徑中提取測驗名稱
              if (directFileName) {
                // 移除 "questions/" 前綴和時間戳後綴，只保留測驗名稱
                let displayName = directFileName
                  .replace(/^questions\//, '') // 移除前綴
                  .replace(/\/\d+\.json$/, '') // 移除時間戳和 .json
                  .replace(/\.json$/, ''); // 如果還有 .json，也移除
                
                // 如果路徑中包含斜線，取最後一部分（測驗名稱）
                const parts = displayName.split('/');
                displayName = parts[parts.length - 1];
                
                return isReviewModeBool 
                  ? `檢視 - ${displayName}` 
                  : displayName;
              }
              
              // 一般模式：顯示 subject 和 series_no
              return isReviewModeBool 
                ? `檢視 - ${subject ? `${subject} ` : ''}${series_no}` 
                : `${subject ? `${subject} ` : ''}${series_no}`;
            })()}
          </Text>
        </View>
        <Text style={styles.progressText}>{progress}</Text>
      </View>

      <ScrollView 
        style={styles.content} 
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: Platform.OS === 'web' ? 100 : Math.max(insets.bottom + 80, 80) }
        ]}
      >
        {/* 背景區域 - 第一題自動顯示，後續題目可展開 */}
        {displayInfo.showBackground && displayInfo.background && (
          <View style={styles.backgroundContainer}>
            <View style={styles.backgroundContent}>
              <Text style={styles.backgroundLabel}>背景說明</Text>
              <RichTextWithImages
                text={displayInfo.background}
                textStyle={styles.backgroundText}
                imageStyle={styles.backgroundImage}
                contextText={displayInfo.background}
                testName={currentQuestion.testName}
                subject={currentQuestion.subject}
                series_no={currentQuestion.series_no}
              />
            </View>
            <View style={styles.backgroundDivider} />
          </View>
        )}

        {/* 如果是題組後續題目，提供顯示背景的按鈕 */}
        {displayInfo.isGroupQuestion && !displayInfo.showBackground && background && (
          <View style={styles.backgroundToggleContainer}>
            <TouchableOpacity
              style={styles.showBackgroundButton}
              onPress={() => setShowBackgroundForGroup(!showBackgroundForGroup)}
            >
              <Text style={styles.showBackgroundButtonText}>
                {showBackgroundForGroup ? '▼ 隱藏背景說明' : '▶ 顯示背景說明'}
              </Text>
            </TouchableOpacity>
            
            {showBackgroundForGroup && background && (
              <View style={styles.backgroundContainer}>
                <View style={styles.backgroundContent}>
                  <Text style={styles.backgroundLabel}>背景說明</Text>
                  <RichTextWithImages
                    text={background}
                    textStyle={styles.backgroundText}
                    imageStyle={styles.backgroundImage}
                    contextText={background}
                    testName={currentQuestion.testName}
                    subject={currentQuestion.subject}
                    series_no={currentQuestion.series_no}
                  />
                </View>
                <View style={styles.backgroundDivider} />
              </View>
            )}
          </View>
        )}


        {/* 顯示題號和題目內容 */}
        <View style={styles.questionContainer}>
          <Text style={styles.questionNumber}>
            {currentQuestion.questionNumber || (currentIndex + 1)}.
          </Text>
          <View style={styles.questionContent}>
            <RichTextWithImages
              text={displayInfo.questionText}
              textStyle={[
                styles.questionText,
                // 當顯示答案時，使用答案頁題目文字大小
                showResult && { fontSize: answerPageTextSizeValue },
              ]}
              imageStyle={styles.questionImage}
              contextText={displayInfo.questionText}
              testName={currentQuestion.testName}
              subject={currentQuestion.subject}
              series_no={currentQuestion.series_no}
              questionNumber={currentQuestion.questionNumber || (currentIndex + 1)}
              expandable={true}
              maxLength={150}
            />
          </View>
        </View>

        {(() => {
          // 檢測是否為問答題（所有選項都為空）
          // 檢測是否為問答題
          const isEssay = isEssayQuestion(currentQuestion);

          // 如果是問答題，顯示「顯示答案」按鈕
          if (isEssay) {
            // 按下按鈕後，橘色區域就不顯示了
            if (!showEssayAnswer) {
              return (
                <View style={styles.essayQuestionContainer}>
                  <Text style={styles.essayQuestionHint}>
                    此題為問答題，請參考答案與詳解
                  </Text>
                  <TouchableOpacity
                    style={styles.showAnswerButton}
                    onPress={async () => {
                      setShowEssayAnswer(true);
                      setSelectedAnswer('ESSAY'); // 設置答案，以便顯示結果文字
                      setShowResult(true); // 顯示結果，以便顯示詳解
                      setIsCorrect(true); // 問答題自動標記為答對
                      // 問答題自動標記為答對
                      await QuestionService.updateUserAnswer(currentQuestion.id, {
                        isCorrect: true,
                        isAnswered: true,
                        selectedAnswer: 'ESSAY', // 標記為問答題
                      });
                      // 保存當前進度
                      await QuestionService.saveQuizProgress(testName, subject || null, series_no, currentIndex);
                      // 重新載入用戶答案
                      await loadUserAnswer();
                    }}
                  >
                    <Text style={styles.showAnswerButtonText}>顯示答案</Text>
                  </TouchableOpacity>
                </View>
              );
            }
            // 按下按鈕後，不顯示橘色區域，直接返回 null（答案和詳解會在下方顯示）
            return null;
          }

          // 動態決定要顯示的選項
          const optionsToShow: Array<'A' | 'B' | 'C' | 'D' | 'E'> = [];
          
          // 檢查是否為是非題（C 和 D 都為空）
          const isTrueFalse = !currentQuestion.C && !currentQuestion.D;
          
          // 總是顯示 A 和 B
          if (currentQuestion.A) optionsToShow.push('A');
          if (currentQuestion.B) optionsToShow.push('B');
          
          // 如果不是是非題，顯示 C 和 D（如果有內容）
          if (!isTrueFalse) {
            if (currentQuestion.C) optionsToShow.push('C');
            if (currentQuestion.D) optionsToShow.push('D');
          }
          
          // 如果有 E 選項（存在且不為空字串），顯示 E（不論是否為是非題）
          // 檢查 E 選項：必須存在、不為 null、不為空字串
          const hasE = currentQuestion.E !== undefined && 
                      currentQuestion.E !== null && 
                      String(currentQuestion.E).trim() !== '';
          
          // 調試：檢查 E 選項的狀態
          if (currentIndex === 1) {
            console.log('🔍 [顯示選項] 第2題（複選題）E 選項檢查:', {
              E: currentQuestion.E,
              EType: typeof currentQuestion.E,
              EUndefined: currentQuestion.E === undefined,
              ENull: currentQuestion.E === null,
              ETrimmed: currentQuestion.E ? String(currentQuestion.E).trim() : 'N/A',
              hasE: hasE,
              optionsToShowBeforeE: [...optionsToShow]
            });
          }
          
          if (hasE) {
            optionsToShow.push('E');
            if (currentIndex === 1) {
              console.log('✅ [顯示選項] E 選項已加入，optionsToShow:', optionsToShow);
            }
          } else {
            if (currentIndex === 1) {
              console.log('❌ [顯示選項] E 選項未加入，原因:', {
                isUndefined: currentQuestion.E === undefined,
                isNull: currentQuestion.E === null,
                isEmpty: currentQuestion.E ? String(currentQuestion.E).trim() === '' : 'N/A'
              });
            }
          }
          
          return optionsToShow.map((option) => {
            const optionText = currentQuestion[option] || '';
            // 複選題使用 selectedAnswers，單選題使用 selectedAnswer
            const isSelected = isMultipleChoice
              ? selectedAnswers.includes(option)
              : Boolean(selectedAnswer === option);
            
            // 檢查是否為正確選項（支援複選和是非題）
            const correctAnswer = String(currentQuestion.Ans);
            let isCorrectOption = false;
            const isMultiple = isMultipleChoiceHelper(currentQuestion);
            if (isMultiple) {
              const correctOptions = correctAnswer.split(',').map(a => a.trim());
              isCorrectOption = correctOptions.includes(option);
            } else if (isTrueFalseQuestion(currentQuestion)) {
              // 是非題：使用等價比較
              isCorrectOption = isTrueFalseAnswerEquivalent(option, correctAnswer, currentQuestion);
            } else {
              isCorrectOption = option === correctAnswer;
            }
            
            const showCorrect = Boolean(showResult && isCorrectOption);
            const showWrong = Boolean(showResult && isSelected && !isCorrectOption);

            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.optionButton,
                  isSelected && styles.optionButtonSelected,
                  showCorrect && styles.optionButtonCorrect,
                  showWrong && styles.optionButtonWrong,
                ]}
                onPress={() => handleSelectAnswer(option)}
                disabled={Boolean(isReviewModeBool || showResult)}
              >
                <Text style={styles.optionLabel}>({option})</Text>
                <View style={styles.optionContent}>
                  <RichTextWithImages
                    text={optionText}
                    textStyle={styles.optionText}
                    imageStyle={styles.optionImage}
                    contextText={`${currentQuestion.content} ${optionText}`}
                    testName={currentQuestion.testName}
                    subject={currentQuestion.subject}
                    series_no={currentQuestion.series_no}
                    questionNumber={currentQuestion.questionNumber || (currentIndex + 1)}
                    optionLabel={option}
                    expandable={true}
                    maxLength={100}
                  />
                </View>
              </TouchableOpacity>
            );
          });
        })()}

        {/* 複選題提交按鈕 - 僅在複選題且未顯示結果時顯示 */}
        {isMultipleChoice && !showResult && !isReviewModeBool && selectedAnswers.length > 0 && (
          <View style={styles.submitButtonContainer}>
            <TouchableOpacity
              style={styles.submitButton}
              onPress={handleSubmitAnswer}
            >
              <Text style={styles.submitButtonText}>
                提交答案 ({selectedAnswers.length})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 新增功能按鈕區域 - 在選項 (D) 下方，檢視模式下隱藏 */}
        {!isReviewModeBool && (
          <View style={styles.bottomActionButtons}>
            <TouchableOpacity
              style={styles.bottomActionButton}
              onPress={handleSearchQuestion}
            >
              <Text style={styles.bottomActionButtonText}>查詢問題</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.bottomActionButton}
              onPress={handleReportProblem}
            >
              <Text style={styles.bottomActionButtonText}>問題回報</Text>
            </TouchableOpacity>
          </View>
        )}

        {showResult && (() => {
          // 檢測是否為問答題
          const isEssay = isEssayQuestion(currentQuestion);
          
          // 問答題和非問答題都顯示完整的結果和詳解（詳解放在選項下方，與選擇題相同位置）
          return (
            <View style={styles.resultContainer}>
              {selectedAnswer ? (
                <>
                  <Text style={[styles.resultText, isCorrect ? styles.resultTextCorrect : styles.resultTextWrong]}>
                    {isCorrect ? '✓ 答對了！' : '✗ 答錯了'}
                  </Text>
                  {!isCorrect && !isEssay && (
                    <Text style={styles.correctAnswerText}>
                      正確答案：{currentQuestion.Ans}
                    </Text>
                  )}
                </>
              ) : (
                // 檢視模式下，未答的題目顯示「未作答」
                isReviewModeBool && (
                  <Text style={[styles.resultText, { color: '#999999' }]}>
                    ⚪ 未作答
                  </Text>
                )
              )}
              <RichTextWithImages
                text={currentQuestion.exp}
                textStyle={styles.explanationText}
                imageStyle={styles.explanationImage}
                contextText={`${currentQuestion.content} ${currentQuestion.exp}`}
                testName={currentQuestion.testName}
                subject={currentQuestion.subject}
                series_no={currentQuestion.series_no}
                questionNumber={currentQuestion.questionNumber || (currentIndex + 1)}
              />
            </View>
          );
        })()}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonNav, currentIndex === 0 && styles.footerButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text style={styles.footerButtonText}>上一題</Text>
        </TouchableOpacity>
        {/* 檢視模式下也顯示「我的最愛」按鈕 */}
        <TouchableOpacity
          style={[
            styles.footerButton,
            styles.footerButtonYellow,
            styles.footerButtonFavorite,
          ]}
          onPress={handleToggleFavorite}
        >
          <Text style={styles.footerButtonText} numberOfLines={1}>
            <Text style={styles.footerButtonIconText}>
              {isFavorite ? '❤️' : '🤍'}
            </Text>
            {' 最愛'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonNav]}
          onPress={handleNext}
        >
          <Text style={styles.footerButtonText}>下一題</Text>
        </TouchableOpacity>
      </View>

      {/* 查詢問題 Modal */}
      {currentQuestion && (
        <SearchQuestionModal
          visible={showSearchModal}
          question={currentQuestion}
          onClose={() => setShowSearchModal(false)}
        />
      )}

      {/* 成績 Modal */}
      <Modal
        visible={showScoreModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowScoreModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>成績</Text>
            {scoreData && (
              <>
                <View style={styles.scoreInfo}>
                  <Text style={styles.scoreText}>
                    答對：{scoreData.correctCount}題
                  </Text>
                  <Text style={styles.scoreText}>
                    答錯：{scoreData.wrongCount}題
                  </Text>
                  <Text style={styles.scoreText}>
                    總題數：{scoreData.totalCount}題
                  </Text>
                  <Text style={styles.scoreNumber}>
                    分數：{scoreData.score}分
                  </Text>
                </View>
                <View style={styles.modalButtonContainer}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonConfirm]}
                    onPress={handleConfirm}
                  >
                    <Text style={styles.modalButtonText}>確定</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 8,
    minHeight: 44,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonImage: {
    width: 24,
    height: 24,
  },
  headerTitleContainer: {
    flex: 1,
    marginHorizontal: 16,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
  },
  backgroundContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  backgroundLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 12,
  },
  backgroundText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  backgroundImage: {
    marginTop: 8,
    marginBottom: 8,
  },
  backgroundDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginTop: 16,
  },
  backgroundContent: {
    // 背景內容容器
  },
  backgroundToggleContainer: {
    marginBottom: 16,
  },
  showBackgroundButton: {
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
    marginBottom: 8,
  },
  showBackgroundButtonText: {
    fontSize: 14,
    color: '#856404',
    fontWeight: '600',
    textAlign: 'center',
  },
  groupHint: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  groupHintText: {
    fontSize: 14,
    color: '#856404',
    lineHeight: 20,
  },
  questionNumberContainer: {
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  questionNumberText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  questionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginRight: 8,
    lineHeight: 26,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    lineHeight: 26,
  },
  questionImage: {
    marginTop: 8,
    marginBottom: 8,
  },
  optionContent: {
    flex: 1,
  },
  optionImage: {
    marginTop: 4,
    marginBottom: 4,
  },
  explanationImage: {
    marginTop: 8,
    marginBottom: 8,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 4,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionButtonSelected: {
    borderColor: '#007AFF',
    backgroundColor: '#E3F2FD',
  },
  optionButtonCorrect: {
    borderColor: '#4CAF50',
    backgroundColor: '#E8F5E9',
  },
  optionButtonWrong: {
    borderColor: '#F44336',
    backgroundColor: '#FFEBEE',
  },
  optionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000000',
    marginRight: 8,
    minWidth: 30,
  },
  optionText: {
    fontSize: 16,
    color: '#000000',
    flex: 1,
    lineHeight: 24,
  },
  resultContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  resultText: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  resultTextCorrect: {
    color: '#4CAF50',
  },
  resultTextWrong: {
    color: '#F44336',
  },
  correctAnswerText: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    color: '#333333',
    lineHeight: 22,
  },
  actionButtons: {
    marginTop: 24,
    alignItems: 'center',
  },
  actionButton: {
    padding: 12,
  },
  actionButtonText: {
    fontSize: 16,
    color: '#007AFF',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  footerButtonNav: {
    flex: 0.8,
  },
  footerButtonFavorite: {
    flex: 1.4,
  },
  footerButtonGray: {
    backgroundColor: '#999999',
  },
  footerButtonYellow: {
    backgroundColor: '#FFC107',
  },
  footerButtonRed: {
    backgroundColor: '#F44336',
  },
  footerButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  footerButtonIconText: {
    fontSize: 22,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 24,
    width: '80%',
    maxWidth: 400,
    alignItems: 'center',
    ...(Platform.OS !== 'web' ? {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.25,
      shadowRadius: 4,
      elevation: 5,
    } : {}),
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 20,
  },
  scoreInfo: {
    width: '100%',
    marginBottom: 24,
    alignItems: 'center',
  },
  scoreText: {
    fontSize: 16,
    color: '#333333',
    marginBottom: 8,
  },
  scoreNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#007AFF',
    marginTop: 8,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
    marginTop: 8,
    justifyContent: 'center',
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonConfirm: {
    backgroundColor: '#007AFF',
  },
  modalButtonSecondary: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  bottomActionButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 4,
    ...(Platform.OS === 'web' 
      ? { gap: 8 } 
      : { gap: 4 }
    ),
  },
  bottomActionButton: {
    ...(Platform.OS === 'web' 
      ? {
          width: '48%',
          flexShrink: 0,
          flexGrow: 0,
        }
      : {
          flex: 1,
        }
    ),
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
    minHeight: Platform.OS === 'web' ? 44 : undefined,
  },
  bottomActionButtonActive: {
    backgroundColor: '#FFEB3B',
    borderColor: '#FFC107',
  },
  bottomActionButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  bottomActionButtonTextActive: {
    color: '#333333',
    fontWeight: '600',
  },
  submitButtonContainer: {
    marginTop: 16,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  submitButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#45a049',
    minHeight: 48,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  essayQuestionContainer: {
    marginTop: 16,
    marginBottom: 16,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#FF9800',
  },
  essayQuestionHint: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 16,
    textAlign: 'left',
    fontStyle: 'italic',
  },
  showAnswerButton: {
    backgroundColor: '#FF9800',
    borderRadius: 8,
    paddingVertical: 14,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  showAnswerButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  essayAnswerContainer: {
    marginTop: 16,
  },
  essayAnswerSection: {
    marginBottom: 16,
  },
  essayAnswerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
  essayAnswerText: {
    fontSize: 16,
    color: '#333333',
    lineHeight: 24,
  },
  essayAnswerImage: {
    marginTop: 8,
    marginBottom: 8,
  },
  essayExplanationSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  essayExplanationLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 8,
  },
});

export default QuizScreen;
