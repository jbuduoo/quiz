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
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Question, UserAnswer } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewQuizRouteProp = RNRouteProp<RootStackParamList, 'ReviewQuiz'>;

const ReviewQuizScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewQuizRouteProp>();
  const { questionId, questionIds } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState<UserAnswer | null>(null);
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
    const allQuestions = await QuestionService.getAllQuestions();
    
    // 去重 questionIds，確保每個題目只出現一次
    const uniqueQuestionIds = Array.from(new Set(questionIds));
    
    // 使用 Map 確保題目去重（基於 questionId）
    const questionsMap = new Map<string, Question>();
    allQuestions.forEach(q => {
      if (uniqueQuestionIds.includes(q.id) && !questionsMap.has(q.id)) {
        questionsMap.set(q.id, q);
      }
    });
    
    const filteredQuestions = Array.from(questionsMap.values());

    setQuestions(filteredQuestions);

    // 找到當前題目的索引
    const index = filteredQuestions.findIndex(q => q.id === questionId);
    if (index !== -1) {
      setCurrentIndex(index);
    }

    setLoading(false);
  };

  const loadUserAnswer = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const answers = await QuestionService.getUserAnswers();
    const answer = answers[currentQuestion.id];
    setUserAnswer(answer || null);
    setIsFavorite(answer?.isFavorite || false);
    
    // 如果題目已經答過，恢復之前的狀態
    if (answer?.isAnswered) {
      setSelectedAnswer(answer.selectedAnswer || null);
      setShowResult(true);
      setIsCorrect(answer.isCorrect || false);
    } else {
      // 如果題目未答過，重置狀態
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (showResult) return;

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

    // 重新載入用戶答案
    await loadUserAnswer();
  };

  const handleSearchQuestion = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // 使用題目內容查詢 Google
    const searchQuery = encodeURIComponent(currentQuestion.content);
    const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;
    
    Linking.openURL(googleSearchUrl).catch(err => {
      console.error('無法開啟 Google 搜尋:', err);
      Alert.alert('錯誤', '無法開啟 Google 搜尋');
    });
  };

  const handleRemoveFromWrongBook = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) {
      console.error('無法取得當前題目');
      return;
    }

    console.log('點擊從錯題本移除，題目ID:', currentQuestion.id);

    // 在 Web 平台使用 confirm，在原生平台使用 Alert
    if (typeof window !== 'undefined') {
      // Web 平台
      const confirmed = window.confirm('確定要將此題從錯題本移除嗎？移除後將清除所有相關記錄（錯題、不確定等）。');
      if (confirmed) {
        handleRemoveConfirm();
      }
    } else {
      // 原生平台
      Alert.alert(
        '從錯題本移除',
        '確定要將此題從錯題本移除嗎？移除後將清除所有相關記錄（錯題、不確定等）。',
        [
          { text: '取消', style: 'cancel' },
          {
            text: '確定',
            onPress: handleRemoveConfirm,
          },
        ]
      );
    }
  };

  const handleRemoveConfirm = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    try {
      console.log('開始移除題目:', currentQuestion.id);
      await QuestionService.removeFromWrongBook(currentQuestion.id);
      console.log('移除成功，重新載入資料');
      
      // 重新載入用戶答案以更新狀態
      await loadUserAnswer();
      setIsFavorite(false);
      
      // 直接執行後續操作，不顯示成功訊息
      // 如果還有其他題目，繼續下一題；否則返回錯題本頁
      if (questions.length > 1) {
        handleNext();
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('移除失敗:', error);
      if (typeof window !== 'undefined') {
        window.alert('移除失敗，請稍後再試');
      } else {
        Alert.alert('錯誤', '移除失敗，請稍後再試');
      }
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      // 不重置狀態，讓 loadUserAnswer 來恢復狀態
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      // 不重置狀態，讓 loadUserAnswer 來恢復狀態
    } else {
      // 已經是最後一題，詢問是否結束複習
      if (typeof window !== 'undefined') {
        // Web 平台
        const confirmed = window.confirm('是否結束複習？');
        if (confirmed) {
          await handleEndReviewConfirm();
        }
      } else {
        // 原生平台
        Alert.alert('確認', '是否結束複習？', [
          { text: '否', style: 'cancel' },
          {
            text: '是',
            onPress: async () => {
              await handleEndReviewConfirm();
            },
          },
        ]);
      }
    }
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

  const handleEndReviewConfirm = async () => {
    // 計算已完成和未完成的題數
    const userAnswers = await QuestionService.getUserAnswers();
    let completedCount = 0;
    
    questions.forEach(q => {
      const answer = userAnswers[q.id];
      if (answer?.isAnswered) {
        completedCount++;
      }
    });
    
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
      await QuestionService.updateProgress();
      navigation.goBack();
    } else {
      // 原生平台
      Alert.alert('成績', scoreMessage, [
        {
          text: '確定',
          onPress: async () => {
            await QuestionService.updateProgress();
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const handleEndReview = () => {
    Alert.alert('結束複習', '確定要結束複習嗎？', [
      { text: '取消', style: 'cancel' },
      {
        text: '確定',
        onPress: async () => {
          await handleEndReviewConfirm();
        },
      },
    ]);
  };

  // 生成完整的實例編號用於問題回報
  const getQuestionInstanceId = (question: Question, index: number): string => {
    const questionNum = question.questionNumber || (index + 1);
    return `${question.testName}-${question.subject}-${question.series_no}-第${questionNum}題`;
  };

  const handleReportProblem = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
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
    // const googleFormUrl = 'https://forms.google.com/your-form-id';
    // Linking.openURL(googleFormUrl).catch(err => {
    //   console.error('無法開啟 Google 表單:', err);
    //   Alert.alert('錯誤', '無法開啟 Google 表單');
    // });
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
  const statusLabel = isFavorite ? '我的最愛' : '';

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
            複習錯題
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
              disabled={showResult}
            >
              <Text style={styles.optionLabel}>({option})</Text>
              <Text style={styles.optionText}>{optionText}</Text>
            </TouchableOpacity>
          );
        })}

        {showResult && (
          <>
            {/* 功能按鈕區域 - 在詳解上方 */}
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

            <View style={styles.resultContainer}>
              <Text style={[styles.resultText, isCorrect ? styles.resultTextCorrect : styles.resultTextWrong]}>
                {isCorrect ? '✓ 答對了！' : '✗ 答錯了'}
              </Text>
              {!isCorrect && (
                <Text style={styles.correctAnswerText}>
                  正確答案：{currentQuestion.correctAnswer}
                </Text>
              )}
              <Text style={styles.explanationText}>{currentQuestion.explanation}</Text>
            </View>
          </>
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
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonYellow]}
          onPress={handleToggleFavorite}
        >
          <Text style={styles.footerButtonText}>
            {isFavorite ? '❤️ 我的最愛' : '🤍 我的最愛'}
          </Text>
        </TouchableOpacity>
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
    alignItems: 'flex-start',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  statusLabel: {
    color: '#FFFFFF',
    fontSize: 12,
    marginTop: 2,
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
    marginBottom: 8,
  },
  suggestionText: {
    fontSize: 12,
    color: '#007AFF',
    fontStyle: 'italic',
    marginTop: 8,
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
  bottomActionButtonText: {
    fontSize: 13,
    color: '#666666',
    fontWeight: '500',
  },
  removeActionButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#F44336',
  },
  removeActionButtonText: {
    color: '#F44336',
    fontWeight: '600',
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
});

export default ReviewQuizScreen;

