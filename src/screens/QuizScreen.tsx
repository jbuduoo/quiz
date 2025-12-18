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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
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
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [isUncertain, setIsUncertain] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showBackgroundForGroup, setShowBackgroundForGroup] = useState(false);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      loadUserAnswer();
    }
  }, [questions, currentIndex]);

  // 當題目改變時，重置背景展開狀態
  useEffect(() => {
    setShowBackgroundForGroup(false);
  }, [currentIndex]);

  const loadQuestions = async () => {
    setLoading(true);
    
    let questionsData: Question[] = [];
    
    // 如果是直接載入的檔案，從 AsyncStorage 讀取
    if (directFileName && testName === 'DIRECT_FILE') {
      try {
        const storedData = await AsyncStorage.getItem('@quiz:directQuestions');
        if (storedData) {
          questionsData = JSON.parse(storedData);
        } else {
          // 如果 AsyncStorage 沒有，直接載入檔案
          // 所有平台都使用 require，讓 Metro bundler 打包檔案
          let fileData: any;
          
          console.log(`📋 [QuizScreen] loadQuestions: 嘗試載入本地檔案: ${directFileName}`);
          if (directFileName === 'example.json') {
            console.log(`📋 [QuizScreen] loadQuestions: require example.json`);
            try {
              fileData = require('../../assets/data/questions/example.json');
              console.log(`✅ [QuizScreen] loadQuestions: example.json 載入成功`);
            } catch (requireError) {
              console.error(`❌ [QuizScreen] loadQuestions: require example.json 失敗:`, requireError);
            }
          } else {
            console.warn(`⚠️ [QuizScreen] loadQuestions: 不支援的檔案: ${directFileName}`);
          }
          
          // 處理兩種格式：
          // 1. 數組格式：[{...}, {...}]
          // 2. 對象格式：{importDate, source, questions: [...]}
          if (fileData) {
            console.log(`📋 [QuizScreen] loadQuestions: 解析檔案資料`);
            const isArray = Array.isArray(fileData);
            const questionsArray = isArray ? fileData : (fileData.questions || []);
            console.log(`📋 [QuizScreen] loadQuestions: isArray: ${isArray}, 題數: ${questionsArray.length}`);
            
            if (questionsArray.length > 0) {
              questionsData = questionsArray.map((q: any, index: number) => ({
                id: `${directFileName}_${index + 1}`,
                content: String(q.Q || q.content || ''),
                A: String(q.A || q.options?.A || ''),
                B: String(q.B || q.options?.B || ''),
                C: String(q.C || q.options?.C || ''),
                D: String(q.D || q.options?.D || ''),
                Ans: (q.Ans || q.correctAnswer || 'A') as 'A' | 'B' | 'C' | 'D',
                exp: String(q.Exp || q.exp || q.explanation || ''),
                questionNumber: index + 1,
              }));
              console.log(`✅ [QuizScreen] loadQuestions: 標準化完成，題數: ${questionsData.length}`);
            }
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
      setSelectedAnswer(answer.selectedAnswer || null);
      setShowResult(true);
      setIsCorrect(Boolean(answer.isCorrect));
      setIsUncertain(Boolean(answer?.isUncertain));
      setIsFavorite(Boolean(answer?.isFavorite));
    } else {
      // 如果題目在當前測驗中未答過
      setSelectedAnswer(null);
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

  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    // 檢視模式下不允許選擇答案
    if (isReviewModeBool || showResult) return;

    setSelectedAnswer(option);
    const currentQuestion = questions[currentIndex];
    const correct = option === currentQuestion.Ans;

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

    const newFavoriteStatus = await QuestionService.toggleFavorite(currentQuestion.id);
    setIsFavorite(newFavoriteStatus);
    
    // 重新載入用戶答案以更新狀態
    await loadUserAnswer();
  };

  // 生成完整的實例編號用於問題回報（純英文數字格式）
  const getQuestionInstanceId = (question: Question, index: number): string => {
    const questionNum = question.questionNumber || (index + 1);
    // 使用題目中的原始欄位值（不經過 nameMapper），如果沒有則使用 route.params 的值
    const qTestName = question.testName || testName || 'UNKNOWN';
    const qSubject = question.subject || subject || 'UNKNOWN';
    const qSeriesNo = question.series_no || series_no || 'UNKNOWN';
    // 格式：IPAS_02-L2111409-1（測驗名稱-科目期數-題號）
    return `${qTestName}-${qSubject}${qSeriesNo}-${questionNum}`;
  };

  const handleReportProblem = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    try {
      // 問題回報不會主動加入錯題本
      await loadUserAnswer();
      
      // 生成完整的實例編號
      const instanceId = getQuestionInstanceId(currentQuestion, currentIndex);
      
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
      if (answer?.isAnswered) {
        if (answer.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });
    
    const totalAnswered = correctCount + wrongCount;
    const score = totalAnswered > 0 ? Math.round((correctCount / totalAnswered) * 100) : 0;
    
    // 顯示成績對話框
    const scoreMessage = `成績\n\n答對：${correctCount}題\n答錯：${wrongCount}題\n總題數：${questions.length}題\n\n分數：${score}分`;
    
    if (typeof window !== 'undefined') {
      // Web 平台
      window.alert(scoreMessage);
      await QuestionService.updateProgress();
      // 結算分數後清除答題記錄，讓按鈕顯示「開始測驗」
      if (directFileName) {
        await QuestionService.clearFileAnswers(directFileName);
      } else {
        await QuestionService.clearSeriesAnswers(testName, subject || null, series_no);
      }
      await QuestionService.updateProgress();
      navigation.goBack();
    } else {
      // 原生平台
      Alert.alert('成績', scoreMessage, [
        {
          text: '確定',
          onPress: async () => {
            await QuestionService.updateProgress();
            // 結算分數後清除答題記錄，讓按鈕顯示「開始測驗」
            if (directFileName) {
              await QuestionService.clearFileAnswers(directFileName);
            } else {
              await QuestionService.clearSeriesAnswers(testName, subject || null, series_no);
            }
            await QuestionService.updateProgress();
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const handleEndQuizConfirm = async () => {
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
    
    // 將未答的題目標記為錯誤
    for (const question of questions) {
      const answer = userAnswers[question.id];
      if (!answer || !answer.isAnswered) {
        // 未答的題目標記為錯誤
        await QuestionService.updateUserAnswer(question.id, {
          isAnswered: true,
          isCorrect: false,
          isInWrongBook: true,
          selectedAnswer: undefined,
        });
      }
    }
    
    // 重新計算分數
    const updatedAnswers = await QuestionService.getUserAnswers();
    let correctCount = 0;
    let wrongCount = 0;
    
    questions.forEach(q => {
      const answer = updatedAnswers[q.id];
      if (answer?.isAnswered) {
        if (answer.isCorrect) {
          correctCount++;
        } else {
          wrongCount++;
        }
      }
    });
    
    const score = Math.round((correctCount / questions.length) * 100);
    
    // 顯示成績對話框
    const scoreMessage = `成績\n\n錯題：${wrongCount}題/總題數：${questions.length}題\n\n分數：${score}分`;
    
    if (typeof window !== 'undefined') {
      // Web 平台
      window.alert(scoreMessage);
      await QuestionService.saveQuizScore(testName, subject || null, series_no, score);
      await QuestionService.updateProgress();
      await QuestionService.clearQuizProgress(testName, subject || null, series_no);
      // 結算分數後清除答題記錄，讓按鈕顯示「開始測驗」
      if (directFileName) {
        await QuestionService.clearFileAnswers(directFileName);
      } else {
        await QuestionService.clearSeriesAnswers(testName, subject || null, series_no);
      }
      await QuestionService.updateProgress();
      navigation.goBack();
    } else {
      // 原生平台
      Alert.alert('成績', scoreMessage, [
        {
          text: '確定',
          onPress: async () => {
            await QuestionService.saveQuizScore(testName, subject, series_no, score);
            await QuestionService.updateProgress();
            await QuestionService.clearQuizProgress(testName, subject, series_no);
            // 結算分數後清除答題記錄，讓按鈕顯示「開始測驗」
            if (directFileName) {
              await QuestionService.clearFileAnswers(directFileName);
            } else {
              await QuestionService.clearSeriesAnswers(testName, subject || null, series_no);
            }
            await QuestionService.updateProgress();
            navigation.goBack();
          },
        },
      ]);
    }
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
            {isReviewModeBool 
              ? `檢視 - ${subject ? `${subject} ` : ''}${series_no}` 
              : `${subject ? `${subject} ` : ''}${series_no}`}
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

        {(['A', 'B', 'C', 'D'] as const).map((option) => {
          const optionText = currentQuestion[option];
          const isSelected = Boolean(selectedAnswer === option);
          const isCorrectOption = Boolean(option === currentQuestion.Ans);
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
        })}

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

        {showResult && (
          <View style={styles.resultContainer}>
            {selectedAnswer ? (
              <>
                <Text style={[styles.resultText, isCorrect ? styles.resultTextCorrect : styles.resultTextWrong]}>
                  {isCorrect ? '✓ 答對了！' : '✗ 答錯了'}
                </Text>
                {!isCorrect && (
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
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Platform.OS === 'web' ? 12 : Math.max(insets.bottom, 8) }]}>
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonNav, currentIndex === 0 && styles.footerButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text style={styles.footerButtonText}>上一題</Text>
        </TouchableOpacity>
        {/* 檢視模式下隱藏「我的最愛」按鈕 */}
        {!isReviewModeBool && (
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
        )}
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
});

export default QuizScreen;
