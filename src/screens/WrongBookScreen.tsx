import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Switch,
  ScrollView,
  Alert,
  Platform,
  Image,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Question, WrongBookFilter, UserAnswer } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';
import { getSubjectDisplay } from '../utils/nameMapper';
import { getQuestionDisplay, separateBackgroundAndQuestion } from '../utils/questionGroupParser';
import RichTextWithImages from '../components/RichTextWithImages';
import { useTheme } from '../contexts/ThemeContext';
import SearchQuestionModal from '../components/SearchQuestionModal';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WrongBookScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const insets = useSafeAreaInsets();
  const { colors, textSizeValue, titleTextSizeValue, answerPageTextSizeValue } = useTheme();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<WrongBookFilter>({});
  const [stats, setStats] = useState({ total: 0, wrongCount: 0, favoriteCount: 0 });
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');
  
  // 答題相關狀態
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState<UserAnswer | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [showBackgroundForGroup, setShowBackgroundForGroup] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadData();
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    loadQuestions();
  }, [filter]);

  useEffect(() => {
    if (questions.length > 0 && currentIndex < questions.length) {
      loadUserAnswer();
    }
  }, [questions, currentIndex]);

  // 當題目改變時，重置背景展開狀態
  useEffect(() => {
    setShowBackgroundForGroup(false);
  }, [currentIndex]);

  const loadData = async () => {
    setLoading(true);
    const statsData = await QuestionService.getWrongBookStats();
    setStats(statsData);

    // 取得所有科目
    const allQuestions = await QuestionService.getAllQuestions();
    const uniqueSubjects = Array.from(new Set(
      allQuestions
        .map(q => q.subject)
        .filter((subject): subject is string => !!subject)
    ));
    setSubjects(['全部', ...uniqueSubjects]);

    await loadQuestions();
    setLoading(false);
  };

  const loadQuestions = async () => {
    const filterData: WrongBookFilter = {
      ...filter,
      subject: selectedSubject === '全部' ? undefined : selectedSubject,
    };
    const questionsData = await QuestionService.getWrongBookQuestions(filterData);
    setQuestions(questionsData);
    
    // 重置到第一題
    if (questionsData.length > 0) {
      setCurrentIndex(0);
    }
  };

  const loadUserAnswer = async () => {
    if (questions.length === 0 || currentIndex >= questions.length) return;
    
    const currentQuestion = questions[currentIndex];
    const answers = await QuestionService.getUserAnswers();
    let answer = answers[currentQuestion.id];
    
    // 如果題目在複習錯題列表中但沒有答案記錄，自動創建並設置為已收藏
    if (!answer) {
      await QuestionService.updateUserAnswer(currentQuestion.id, {
        isFavorite: true,
        isInWrongBook: true,
        isCorrect: false,
        isAnswered: false,
      });
      // 重新載入答案
      const updatedAnswers = await QuestionService.getUserAnswers();
      answer = updatedAnswers[currentQuestion.id];
    }
    // 注意：不再自動將未收藏的題目設置為已收藏
    // 因為用戶可能已經點擊最愛按鈕取消了收藏，我們應該尊重用戶的選擇
    
    if (answer) {
      setUserAnswer(answer);
      setSelectedAnswer(answer.selectedAnswer || null);
      setShowResult(Boolean(answer.isAnswered));
      setIsCorrect(Boolean(answer.isCorrect));
      setIsFavorite(Boolean(answer.isFavorite));
    } else {
      // 如果還是沒有答案記錄，設置預設值（理論上不應該發生）
      setUserAnswer(null);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsCorrect(false);
      setIsFavorite(true); // 複習錯題頁面預設為已收藏
    }
  };

  const handleSubjectChange = (subject: string) => {
    setSelectedSubject(subject);
    const newFilter: WrongBookFilter = {
      ...filter,
      subject: subject === '全部' ? undefined : subject,
    };
    setFilter(newFilter);
  };

  const handleToggleOnlyWrong = (value: boolean) => {
    const newFilter: WrongBookFilter = {
      ...filter,
      onlyWrong: value,
    };
    setFilter(newFilter);
  };

  const handleToggleOnlyFavorite = (value: boolean) => {
    const newFilter: WrongBookFilter = {
      ...filter,
      onlyFavorite: value,
    };
    setFilter(newFilter);
  };

  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D') => {
    if (showResult) return;

    setSelectedAnswer(option);
    const currentQuestion = questions[currentIndex];
    const correct = option === currentQuestion.Ans;

    setIsCorrect(correct);
    setShowResult(true);

    // 更新答題記錄
    await QuestionService.updateUserAnswer(currentQuestion.id, {
      isCorrect: correct,
      isAnswered: true,
      selectedAnswer: option,
    });

    // 重新載入用戶答案
    await loadUserAnswer();
    
    // 重新載入統計資料
    const statsData = await QuestionService.getWrongBookStats();
    setStats(statsData);
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = async () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // 已經是最後一題，檢查是否已答題
      const currentQuestion = questions[currentIndex];
      if (currentQuestion) {
        const answers = await QuestionService.getUserAnswers();
        const answer = answers[currentQuestion.id];
        
        // 如果最後一題已答題，直接顯示成績
        if (answer?.isAnswered) {
          await handleShowScore();
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
      // 結算分數後清除錯題本的答題記錄，讓按鈕顯示「開始測驗」
      await QuestionService.clearWrongBookAnswers();
      await QuestionService.updateProgress();
      navigation.goBack();
    } else {
      // 原生平台
      Alert.alert('成績', scoreMessage, [
        {
          text: '確定',
          onPress: async () => {
            await QuestionService.updateProgress();
            // 結算分數後清除錯題本的答題記錄，讓按鈕顯示「開始測驗」
            await QuestionService.clearWrongBookAnswers();
            await QuestionService.updateProgress();
            navigation.goBack();
          },
        },
      ]);
    }
  };

  const handleToggleFavorite = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    // 直接切換收藏狀態，不需要確認對話框
    await performToggleFavorite();
  };

  const performToggleFavorite = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    // 保存當前題目 ID，用於判斷是否被移除
    const currentQuestionId = currentQuestion.id;
    const savedCurrentIndex = currentIndex;
    
    // 切換收藏狀態
    const newFavoriteStatus = await QuestionService.toggleFavorite(currentQuestion.id);
    setIsFavorite(newFavoriteStatus);
    
    // 如果取消收藏，重新載入題目列表（因為該題目應該從列表中移除）
    if (!newFavoriteStatus) {
      const filterData: WrongBookFilter = {
        ...filter,
        subject: selectedSubject === '全部' ? undefined : selectedSubject,
      };
      const questionsData = await QuestionService.getWrongBookQuestions(filterData);
      
      // 重新載入統計資料
      const statsData = await QuestionService.getWrongBookStats();
      setStats(statsData);
      
      // 如果還有其他題目
      if (questionsData.length > 0) {
        // 檢查當前題目是否還在列表中
        const currentQuestionStillExists = questionsData.some(q => q.id === currentQuestionId);
        
        let newIndex: number;
        if (!currentQuestionStillExists) {
          // 當前題目已被移除，跳轉到下一題或上一題
          if (savedCurrentIndex < questionsData.length) {
            // 如果當前索引還在範圍內，保持在相同索引位置（會顯示下一題）
            newIndex = savedCurrentIndex;
          } else {
            // 如果當前索引超出範圍，跳轉到最後一題
            newIndex = questionsData.length - 1;
          }
        } else {
          // 當前題目還在列表中，找到當前題目在新列表中的位置
          const foundIndex = questionsData.findIndex(q => q.id === currentQuestionId);
          if (foundIndex !== -1) {
            newIndex = foundIndex;
          } else {
            // 如果找不到（理論上不應該發生），跳轉到第一題
            newIndex = 0;
          }
        }
        
        // 先更新題目列表
        setQuestions(questionsData);
        
        // 然後更新索引（useEffect 會自動觸發 loadUserAnswer）
        setCurrentIndex(newIndex);
      } else {
        // 沒有其他題目了，返回上一頁
        setQuestions([]);
        navigation.goBack();
      }
    } else {
      // 重新載入統計資料和用戶答案
      const statsData = await QuestionService.getWrongBookStats();
      setStats(statsData);
      await loadUserAnswer();
    }
  };

  const handleSearchQuestion = () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    setShowSearchModal(true);
  };

  const handleReportProblem = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    try {
      const questionNum = currentQuestion.questionNumber || (currentIndex + 1);
      const qTestName = currentQuestion.testName || 'UNKNOWN';
      const qSubject = currentQuestion.subject || 'UNKNOWN';
      const qSeriesNo = currentQuestion.series_no || 'UNKNOWN';
      const instanceId = `${qTestName}-${qSubject}${qSeriesNo}-${questionNum}`;
      
      const googleFormUrl = `https://docs.google.com/forms/d/e/1FAIpQLSfnfLFKCPYCRXbY12_xv5abVfvon_FTULBc0FYd4d7xD2A7ZQ/viewform?usp=pp_url&entry.654895695=${encodeURIComponent(instanceId)}`;
      
      if (Platform.OS === 'web') {
        if (typeof window !== 'undefined') {
          window.open(googleFormUrl, '_blank');
        }
      } else {
        const { Linking } = require('react-native');
        const canOpen = await Linking.canOpenURL(googleFormUrl);
        if (canOpen) {
          await Linking.openURL(googleFormUrl);
        } else {
          Alert.alert('錯誤', `無法開啟表單，請手動複製題目編號：\n\n${instanceId}`);
        }
      }
    } catch (error) {
      console.error('問題回報失敗:', error);
      Alert.alert('錯誤', '處理問題回報時發生錯誤');
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (questions.length === 0) {
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
          <Text style={styles.headerTitle}>複習錯題</Text>
          <View style={styles.headerRight} />
        </View>

        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>沒有錯題</Text>
        </View>
      </SafeAreaView>
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
            複習錯題
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
        {/* 背景區域 */}
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

        {/* 題組後續題目的背景顯示按鈕 */}
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
                showResult && { fontSize: answerPageTextSizeValue },
              ]}
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

        {/* 功能按鈕區域 */}
        {showResult && (
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

        {/* 答題結果 */}
        {showResult && (
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
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  progressText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 60,
    textAlign: 'right',
  },
  headerRight: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
  },
  backgroundContainer: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#007AFF',
  },
  backgroundContent: {
    marginBottom: 12,
  },
  backgroundLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#007AFF',
    marginBottom: 8,
  },
  backgroundText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333333',
  },
  backgroundImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 8,
  },
  backgroundDivider: {
    height: 1,
    backgroundColor: '#E5E5E5',
    marginTop: 12,
  },
  backgroundToggleContainer: {
    marginBottom: 16,
  },
  showBackgroundButton: {
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    alignItems: 'center',
  },
  showBackgroundButtonText: {
    fontSize: 14,
    color: '#007AFF',
  },
  questionContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: '#007AFF',
    marginRight: 8,
    minWidth: 30,
  },
  questionContent: {
    flex: 1,
  },
  questionText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#000000',
  },
  questionImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 8,
  },
  optionButton: {
    flexDirection: 'row',
    padding: 12,
    marginBottom: 12,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
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
    color: '#007AFF',
    marginRight: 8,
    minWidth: 30,
  },
  optionContent: {
    flex: 1,
  },
  optionText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#000000',
  },
  optionImage: {
    width: '100%',
    height: 150,
    resizeMode: 'contain',
    marginVertical: 8,
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
  resultContainer: {
    marginTop: 16,
    padding: 16,
    borderRadius: 8,
    backgroundColor: '#F9F9F9',
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
    color: '#4CAF50',
    fontWeight: '600',
    marginBottom: 12,
  },
  explanationText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666666',
  },
  explanationImage: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
    marginVertical: 8,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 4,
  },
  footerButtonNav: {
    backgroundColor: '#007AFF',
  },
  footerButtonYellow: {
    backgroundColor: '#FFC107',
  },
  footerButtonFavorite: {
    flex: 0.8,
  },
  footerButtonDisabled: {
    backgroundColor: '#CCCCCC',
    opacity: 0.5,
  },
  footerButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  footerButtonIconText: {
    fontSize: 16,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#999999',
  },
});

export default WrongBookScreen;
