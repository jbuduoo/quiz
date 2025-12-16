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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Question, UserAnswer } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';
import RichTextWithImages from '../components/RichTextWithImages';
import SearchQuestionModal from '../components/SearchQuestionModal';
import { getQuestionDisplay, separateBackgroundAndQuestion } from '../utils/questionGroupParser';
import { getTestNameDisplay, getSubjectDisplay } from '../utils/nameMapper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewQuizRouteProp = RNRouteProp<RootStackParamList, 'ReviewQuiz'>;

const ReviewQuizScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewQuizRouteProp>();
  const insets = useSafeAreaInsets();
  const { questionId, questionIds } = route.params;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState<UserAnswer | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBackgroundForGroup, setShowBackgroundForGroup] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);

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
    setIsFavorite(Boolean(answer?.isFavorite));
    
    // 如果題目已經答過，恢復之前的狀態
    if (answer?.isAnswered) {
      setSelectedAnswer(answer.selectedAnswer || null);
      setShowResult(true);
      setIsCorrect(Boolean(answer.isCorrect));
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

    // 重新載入用戶答案
    await loadUserAnswer();
  };

  const handleSearchQuestion = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // 開啟搜尋 Modal（會顯示 Google 搜尋結果，包含 AI 摘要）
    setShowSearchModal(true);
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

  // 生成完整的實例編號用於問題回報（純英文數字格式）
  const getQuestionInstanceId = (question: Question, index: number): string => {
    const questionNum = question.questionNumber || (index + 1);
    // 使用題目中的原始欄位值（不經過 nameMapper）
    const qTestName = question.testName || 'UNKNOWN';
    const qSubject = question.subject || 'UNKNOWN';
    const qSeriesNo = question.series_no || 'UNKNOWN';
    // 格式：IPAS_02-L2111409-1（測驗名稱-科目期數-題號）
    return `${qTestName}-${qSubject}${qSeriesNo}-${questionNum}`;
  };

  const handleReportProblem = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    // 生成完整的實例編號
    const instanceId = getQuestionInstanceId(currentQuestion, currentIndex);
    
    // 開啟 Google 表單，並將題目編號作為 URL 參數傳遞（自動填入表單）
    const googleFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfnfLFKCPYCRXbY12_xv5abVfvon_FTULBc0FYd4d7xD2A7ZQ/viewform?usp=pp_url&entry.654895695=${encodeURIComponent(instanceId)}`;
    
    // 直接開啟 Google 表單（不顯示確認對話框）
    if (typeof window !== 'undefined') {
      // Web 平台
      window.open(googleFormUrl, '_blank');
    } else {
      // 原生平台
      Linking.openURL(googleFormUrl).catch(err => {
        console.error('無法開啟 Google 表單:', err);
        Alert.alert('錯誤', '無法開啟 Google 表單，請手動複製題目編號：\n\n' + instanceId);
      });
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
  const statusLabel = isFavorite ? '我的最愛' : '';
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
            複習錯題
          </Text>
        </View>
        <Text style={styles.progressText}>{progress}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={[styles.contentContainer, { paddingBottom: Math.max(insets.bottom, 0) }]}>
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

        {/* 如果是題組後續題目但沒有背景資料，顯示提示 */}
        {displayInfo.isGroupQuestion && !displayInfo.showBackground && !background && displayInfo.groupStartNumber && (
          <View style={styles.groupHint}>
            <Text style={styles.groupHintText}>
              📖 背景說明請參閱第{displayInfo.groupStartNumber}題
            </Text>
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
              textStyle={styles.questionText}
              imageStyle={styles.questionImage}
              contextText={displayInfo.questionText}
              testName={currentQuestion.testName}
              subject={currentQuestion.subject}
              series_no={currentQuestion.series_no}
              questionNumber={currentQuestion.questionNumber || (currentIndex + 1)}
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
              disabled={Boolean(showResult)}
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
                />
              </View>
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
                  正確答案：{currentQuestion.Ans}
                </Text>
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
          </>
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
        <TouchableOpacity
          style={[styles.footerButton, styles.footerButtonYellow, styles.footerButtonFavorite]}
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
  backgroundContainer: {
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  backgroundContent: {
    justifyContent: 'center',
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
    marginLeft: 20,
    marginRight: 20,
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
});

export default ReviewQuizScreen;

