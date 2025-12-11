import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
  Linking,
  Image,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Question, UserAnswer } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type QuizRouteProp = RouteProp<RootStackParamList, 'Quiz'>;

const QuizScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<QuizRouteProp>();
  const { testName, subject, series_no, isReviewMode = false } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswers, setUserAnswers] = useState<Record<string, UserAnswer>>({});
  const [isUncertain, setIsUncertain] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (questions.length > 0) {
      loadUserAnswer();
    }
  }, [questions, currentIndex]);

  const loadQuestions = async () => {
    setLoading(true);
    const questionsData = await QuestionService.getQuestionsByTestNameSubjectSeries(
      testName,
      subject,
      series_no
    );
    setQuestions(questionsData);
    
    // 載入上次的進度，如果有的話
    const savedIndex = await QuestionService.getQuizProgressByKey(testName, subject, series_no);
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
      setIsCorrect(answer.isCorrect || false);
      setIsUncertain(answer?.isUncertain || false);
      setIsFavorite(answer?.isFavorite || false);
    } else {
      // 如果題目在當前測驗中未答過
      setSelectedAnswer(null);
      setIsCorrect(false);
      setIsUncertain(false);
      setIsFavorite(answer?.isFavorite || false);
      
      // 檢視模式下，未答的題目也顯示結果（標示為未作答）
      if (isReviewMode) {
        setShowResult(true);
      } else {
        setShowResult(false);
      }
    }
  };

  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    // 檢視模式下不允許選擇答案
    if (isReviewMode || showResult) return;

    setSelectedAnswer(option);
    const currentQuestion = questions[currentIndex];
    const correct = option === currentQuestion.correctAnswer;

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
    await QuestionService.saveQuizProgress(testName, subject, series_no, currentIndex);

    // 重新載入用戶答案
    await loadUserAnswer();
  };

  const handleSearchQuestion = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // 將題目加入錯題本
    await QuestionService.updateUserAnswer(currentQuestion.id, {
      isInWrongBook: true,
    });
    await loadUserAnswer();
    
    // 使用題目內容查詢 Google
    const searchQuery = encodeURIComponent(currentQuestion.content);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
    
    Linking.openURL(googleSearchUrl).catch(err => {
      console.error('無法開啟 Google 搜尋:', err);
      Alert.alert('錯誤', '無法開啟 Google 搜尋');
    });
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

  // 生成完整的實例編號用於問題回報
  const getQuestionInstanceId = (question: Question, index: number): string => {
    const questionNum = question.questionNumber || (index + 1);
    return `${question.testName}-${question.subject}-${question.series_no}-第${questionNum}題`;
  };

  const handleReportProblem = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // 將題目加入錯題本
    await QuestionService.updateUserAnswer(currentQuestion.id, {
      isInWrongBook: true,
    });
    await loadUserAnswer();
    
    // 生成完整的實例編號
    const instanceId = getQuestionInstanceId(currentQuestion, currentIndex);
    
    // TODO: 連到 Google 表單
    // 預留 Google 表單連結，包含題目編號
    Alert.alert(
      '問題回報',
      `題目編號：${instanceId}\n\n此功能尚未完成，請稍後再試。`,
      [{ text: '確定' }]
    );
    
    // 未來實作時使用：
    // const googleFormUrl = `https://forms.google.com/your-form-id?entry.xxx=${encodeURIComponent(instanceId)}`;
    // Linking.openURL(googleFormUrl).catch(err => {
    //   console.error('無法開啟 Google 表單:', err);
    //   Alert.alert('錯誤', '無法開啟 Google 表單');
    // });
  };

  const handlePrevious = async () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      // 保存進度
      await QuestionService.saveQuizProgress(testName, subject, series_no, newIndex);
      // 不重置狀態，讓 loadUserAnswer 來恢復狀態
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      // 保存進度
      await QuestionService.saveQuizProgress(testName, subject, series_no, newIndex);
      // 不重置狀態，讓 loadUserAnswer 來恢復狀態
    } else {
      // 已經是最後一題，詢問是否結束測驗
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
      await QuestionService.saveQuizScore(testName, subject, series_no, score);
      await QuestionService.updateProgress();
      await QuestionService.clearQuizProgress(testName, subject, series_no);
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

  return (
    <SafeAreaView style={styles.container}>
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
            {isReviewMode ? `檢視 - ${subject} ${series_no}` : `${subject} ${series_no}`}
          </Text>
        </View>
        <Text style={styles.progressText}>{progress}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        {/* 顯示題號和題目內容 */}
        <Text style={styles.questionText}>
          {currentQuestion.questionNumber || (currentIndex + 1)}. {currentQuestion.content}
        </Text>

        {(['A', 'B', 'C', 'D'] as const).map((option) => {
          const optionText = currentQuestion.options[option];
          const isSelected = selectedAnswer === option;
          const isCorrectOption = option === currentQuestion.correctAnswer;
          const showCorrect = showResult && isCorrectOption;
          const showWrong = showResult && isSelected && !isCorrectOption;

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
              disabled={isReviewMode || showResult}
            >
              <Text style={styles.optionLabel}>({option})</Text>
              <Text style={styles.optionText}>{optionText}</Text>
            </TouchableOpacity>
          );
        })}

        {/* 新增功能按鈕區域 - 檢視模式下隱藏 */}
        {!isReviewMode && (
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
                    正確答案：{currentQuestion.correctAnswer}
                  </Text>
                )}
              </>
            ) : (
              // 檢視模式下，未答的題目顯示「未作答」
              isReviewMode && (
                <Text style={[styles.resultText, { color: '#999999' }]}>
                  ⚪ 未作答
                </Text>
              )
            )}
            <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerButton, currentIndex === 0 && styles.footerButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <Text style={styles.footerButtonText}>上一題</Text>
        </TouchableOpacity>
        {/* 檢視模式下隱藏「我的最愛」按鈕 */}
        {!isReviewMode && (
          <TouchableOpacity
            style={[
              styles.footerButton,
              styles.footerButtonYellow,
            ]}
            onPress={handleToggleFavorite}
          >
            <Text style={styles.footerButtonText}>
              <Text style={styles.footerButtonIconText}>
                {isFavorite ? '❤️' : '🤍'}
              </Text>
              {' 我的最愛'}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.footerButton}
          onPress={handleNext}
        >
          <Text style={styles.footerButtonText}>下一題</Text>
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    height: 60,
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
  questionText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000000',
    marginBottom: 16,
    lineHeight: 26,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 6,
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
    justifyContent: 'space-between',
    marginTop: 8,
    paddingHorizontal: 4,
    gap: 4,
  },
  bottomActionButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingVertical: 4,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5E5',
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
