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
import { useTheme } from '../contexts/ThemeContext';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ReviewQuizRouteProp = RNRouteProp<RootStackParamList, 'ReviewQuiz'>;

const ReviewQuizScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ReviewQuizRouteProp>();
  const insets = useSafeAreaInsets();
  const { questionId, questionIds, questions: providedQuestions } = route.params;
  const { answerPageTextSizeValue } = useTheme();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<'A' | 'B' | 'C' | 'D' | 'E' | string | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Array<'A' | 'B' | 'C' | 'D' | 'E'>>([]); // 複選題的多選答案
  const [isMultipleChoice, setIsMultipleChoice] = useState(false); // 是否為複選題
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [userAnswer, setUserAnswer] = useState<UserAnswer | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showBackgroundForGroup, setShowBackgroundForGroup] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showEssayAnswer, setShowEssayAnswer] = useState(false);

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
        const correctAnswer = String(currentQuestion.Ans);
        const isMultiple = correctAnswer.includes(',');
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
    console.log('📋 [ReviewQuizScreen] loadQuestions: 開始載入題目', {
      questionId,
      questionIdsCount: questionIds.length,
      hasProvidedQuestions: !!providedQuestions,
      providedQuestionsCount: providedQuestions?.length || 0,
    });
    
    try {
      let filteredQuestions: Question[] = [];
      
      // 如果提供了題目資料（直接載入的檔案），直接使用
      if (providedQuestions && providedQuestions.length > 0) {
        console.log('📋 [ReviewQuizScreen] loadQuestions: 使用提供的題目資料');
        filteredQuestions = providedQuestions;
      } else {
        // 否則從 getAllQuestions 中查找
        console.log('📋 [ReviewQuizScreen] loadQuestions: 從 getAllQuestions 中查找題目');
        const allQuestions = await QuestionService.getAllQuestions();
        console.log('📋 [ReviewQuizScreen] loadQuestions: getAllQuestions 返回', {
          totalQuestions: allQuestions.length,
          questionIdsToFind: questionIds.slice(0, 3),
        });
        
        // 去重 questionIds，確保每個題目只出現一次
        const uniqueQuestionIds = Array.from(new Set(questionIds));
        
        // 使用 Map 確保題目去重（基於 questionId）
        const questionsMap = new Map<string, Question>();
        allQuestions.forEach(q => {
          if (uniqueQuestionIds.includes(q.id) && !questionsMap.has(q.id)) {
            questionsMap.set(q.id, q);
          }
        });
        
        filteredQuestions = Array.from(questionsMap.values());
        console.log('📋 [ReviewQuizScreen] loadQuestions: 過濾後的題目數量', {
          filteredCount: filteredQuestions.length,
          expectedCount: uniqueQuestionIds.length,
        });
      }
      
      if (filteredQuestions.length === 0) {
        console.error('❌ [ReviewQuizScreen] loadQuestions: 沒有找到任何題目');
        console.error('❌ [ReviewQuizScreen] loadQuestions: 詳細資訊', {
          questionIds,
          hasProvidedQuestions: !!providedQuestions,
          providedQuestionsLength: providedQuestions?.length || 0,
        });
      }

      setQuestions(filteredQuestions);

      // 找到當前題目的索引
      const index = filteredQuestions.findIndex(q => q.id === questionId);
      if (index !== -1) {
        setCurrentIndex(index);
        console.log('✅ [ReviewQuizScreen] loadQuestions: 找到當前題目索引', index);
      } else {
        console.warn('⚠️ [ReviewQuizScreen] loadQuestions: 找不到當前題目索引', {
          questionId,
          availableIds: filteredQuestions.slice(0, 3).map(q => q.id),
        });
        // 如果找不到，設置為第一題
        setCurrentIndex(0);
      }

      setLoading(false);
      console.log('✅ [ReviewQuizScreen] loadQuestions: 載入完成');
    } catch (error) {
      console.error('❌ [ReviewQuizScreen] loadQuestions: 載入失敗', error);
      setLoading(false);
    }
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
      const savedAnswer = answer.selectedAnswer || null;
      setSelectedAnswer(savedAnswer);
      
      // 如果是複選題且答案包含逗號，解析為陣列
      const correctAnswer = String(currentQuestion.Ans);
      const isMultiple = correctAnswer.includes(',');
      if (isMultiple && savedAnswer && typeof savedAnswer === 'string' && savedAnswer.includes(',')) {
        setSelectedAnswers(savedAnswer.split(',').map(a => a.trim()) as Array<'A' | 'B' | 'C' | 'D' | 'E'>);
      } else if (isMultiple) {
        setSelectedAnswers([]);
      }
      
      setShowResult(true);
      setIsCorrect(Boolean(answer.isCorrect));
    } else {
      // 如果題目未答過，重置狀態
      setSelectedAnswer(null);
      setSelectedAnswers([]);
      setShowResult(false);
      setIsCorrect(false);
    }
  };

  const handleSelectAnswer = async (option: 'A' | 'B' | 'C' | 'D' | 'E') => {
    if (showResult) return;

    const currentQuestion = questions[currentIndex];
    const correctAnswer = String(currentQuestion.Ans);
    const isMultiple = correctAnswer.includes(',');

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
      // 單選題：立即顯示結果（保持原有邏輯）
      setSelectedAnswer(option);
      const correct = option === correctAnswer;
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
    // 直接更新進度並返回，不顯示成績對話框
    await QuestionService.updateProgress();
    navigation.goBack();
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

  const handleReportProblem = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;
    
    try {
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
            檢視頁面
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
            />
          </View>
        </View>

        {(() => {
          // 檢測是否為問答題（所有選項都為空）
          const isEssayQuestion = 
            (!currentQuestion.A || currentQuestion.A.trim() === '') &&
            (!currentQuestion.B || currentQuestion.B.trim() === '') &&
            (!currentQuestion.C || currentQuestion.C.trim() === '') &&
            (!currentQuestion.D || currentQuestion.D.trim() === '') &&
            (!currentQuestion.E || currentQuestion.E === undefined || currentQuestion.E.trim() === '');

          // 如果是問答題，顯示「顯示答案」按鈕
          if (isEssayQuestion) {
            return (
              <View style={styles.essayQuestionContainer}>
                <Text style={styles.essayQuestionHint}>
                  此題為問答題，請參考答案與詳解
                </Text>
                {!showEssayAnswer && (
                  <TouchableOpacity
                    style={styles.showAnswerButton}
                    onPress={() => {
                      setShowEssayAnswer(true);
                      setSelectedAnswer('ESSAY'); // 設置答案，以便顯示結果文字
                      setShowResult(true); // 顯示結果，以便顯示詳解
                      setIsCorrect(true); // 問答題自動標記為答對
                    }}
                  >
                    <Text style={styles.showAnswerButtonText}>顯示答案</Text>
                  </TouchableOpacity>
                )}
                {showEssayAnswer && (
                  <View style={styles.essayAnswerContainer}>
                    {currentQuestion.Ans && currentQuestion.Ans.trim() !== '' && (
                      <View style={styles.essayAnswerSection}>
                        <Text style={styles.essayAnswerLabel}>答案：</Text>
                        <RichTextWithImages
                          text={currentQuestion.Ans}
                          textStyle={styles.essayAnswerText}
                          imageStyle={styles.essayAnswerImage}
                          contextText={currentQuestion.Ans}
                          testName={currentQuestion.testName}
                          subject={currentQuestion.subject}
                          series_no={currentQuestion.series_no}
                          questionNumber={currentQuestion.questionNumber || (currentIndex + 1)}
                        />
                      </View>
                    )}
                  </View>
                )}
              </View>
            );
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
          if (currentQuestion.E !== undefined && currentQuestion.E !== null && String(currentQuestion.E).trim() !== '') {
            optionsToShow.push('E');
          }
          
          return optionsToShow.map((option) => {
            const optionText = currentQuestion[option] || '';
            // 複選題使用 selectedAnswers，單選題使用 selectedAnswer
            const isSelected = isMultipleChoice
              ? selectedAnswers.includes(option)
              : Boolean(selectedAnswer === option);
            
            // 檢查是否為正確選項（支援複選）
            const correctAnswer = String(currentQuestion.Ans);
            let isCorrectOption = false;
            if (correctAnswer.includes(',')) {
              const correctOptions = correctAnswer.split(',').map(a => a.trim());
              isCorrectOption = correctOptions.includes(option);
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
          });
        })()}

        {/* 複選題提交按鈕 - 僅在複選題且未顯示結果時顯示 */}
        {isMultipleChoice && !showResult && selectedAnswers.length > 0 && (
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

        {/* 功能按鈕區域 - 在選項 (D) 下方，只在顯示結果時顯示 */}
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

export default ReviewQuizScreen;

