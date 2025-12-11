import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Series } from '../types';
import QuestionService from '../services/QuestionService';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SeriesListRouteProp = RouteProp<RootStackParamList, 'SeriesList'>;

const SeriesListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SeriesListRouteProp>();
  const { testName, subject } = route.params;
  const [series, setSeries] = useState<Series[]>([]);
  const [wrongBookCount, setWrongBookCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [isWrongBookHovered, setIsWrongBookHovered] = useState(false);
  const [wrongBookButtonText, setWrongBookButtonText] = useState('開始測驗');
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

  const loadData = async () => {
    setLoading(true);
    // 更新進度以獲取最新的正確題數和分數
    await QuestionService.updateProgress();
    const seriesData = await QuestionService.getSeriesByTestNameAndSubject(testName, subject);
    // 只計算當前科目的錯題數量
    const wrongBookQuestions = await QuestionService.getWrongBookQuestions({ subject });
    setSeries(seriesData);
    setWrongBookCount(wrongBookQuestions.length);
    
    // 複習錯題固定顯示"開始測驗"
    setWrongBookButtonText('開始測驗');
    
    setLoading(false);
  };

  const renderSeriesItem = ({ item, index }: { item: Series; index: number }) => {
    const isHovered = hoveredIndex === index;
    const isCompleted = item.completedQuestions === item.totalQuestions && item.totalQuestions > 0;
    const isInProgress = item.completedQuestions > 0 && item.completedQuestions < item.totalQuestions;
    const isNotStarted = item.completedQuestions === 0;
    
    const getButtonText = () => {
      if (isCompleted) return '重新測驗';
      if (isInProgress) return '繼續測驗';
      return '開始測驗';
    };
    
    const getSeriesText = () => {
      if (isCompleted) {
        return `${item.name}(總題數 ${item.totalQuestions}題，正確 ${item.correctCount ?? 0}題，得分 ${item.score ?? 0}分)`;
      } else if (isInProgress) {
        return `${item.name}(總題數 ${item.totalQuestions}題，完成 ${item.completedQuestions}題)`;
      } else {
        return `${item.name}(總題數 ${item.totalQuestions}題)`;
      }
    };
    
    const handleViewPress = async () => {
      // 檢視：導航到答題頁面查看所有題目和答案（檢視模式）
      navigation.navigate('Quiz', {
        testName,
        subject,
        series_no: item.name,
        isReviewMode: true,
      });
    };
    
    const handleButtonPress = async () => {
      // 如果是重新測驗，先清空該期數的所有答題記錄
      if (isCompleted) {
        await QuestionService.clearSeriesAnswers(testName, subject, item.name);
        // 重新載入資料以更新顯示
        await loadData();
      }
      
      navigation.navigate('Quiz', {
        testName: testName,
        subject: subject,
        series_no: item.name,
      });
    };
    
    return (
      <View
        style={[
          styles.seriesItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
          isHovered && {
            backgroundColor: '#FFF9C4',
            borderColor: '#FFD700',
            borderWidth: 2,
          },
        ]}
        {...({
          onMouseEnter: () => setHoveredIndex(index),
          onMouseLeave: () => setHoveredIndex(null),
        } as any)}
      >
        <View style={styles.seriesContent}>
          <View style={styles.seriesContainer}>
            <Text
              style={[
                styles.seriesText,
                {
                  color: colors.text,
                  fontSize: textSizeValue,
                },
              ]}
            >
              {getSeriesText()}
            </Text>
          </View>
          <View style={styles.buttonContainer}>
            {isCompleted && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: colors.background,
                    borderColor: colors.primary,
                  },
                ]}
                onPress={handleViewPress}
              >
                <Text
                  style={[
                    styles.actionButtonText,
                    {
                      color: colors.primary,
                      fontSize: textSizeValue - 2,
                    },
                  ]}
                >
                  檢視
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: colors.background,
                  borderColor: colors.primary,
                },
              ]}
              onPress={handleButtonPress}
            >
              <Text
                style={[
                  styles.actionButtonText,
                  {
                    color: colors.primary,
                    fontSize: textSizeValue - 2,
                  },
                ]}
              >
                {getButtonText()}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  const renderWrongBookItem = () => {
    const handlePress = async () => {
      if (wrongBookCount === 0) {
        // 如果沒有錯題，顯示提示
        if (typeof window !== 'undefined') {
          window.alert('目前沒有錯題或收藏的題目');
        } else {
          Alert.alert('提示', '目前沒有錯題或收藏的題目');
        }
        return;
      }

      // 獲取錯題本題目列表（只顯示當前科目的錯題）
      const wrongBookQuestions = await QuestionService.getWrongBookQuestions({ subject });
      if (wrongBookQuestions.length === 0) {
        if (typeof window !== 'undefined') {
          window.alert('目前沒有錯題或收藏的題目');
        } else {
          Alert.alert('提示', '目前沒有錯題或收藏的題目');
        }
        return;
      }

      // 清空這些題目的答題記錄（但保留錯題本標記）
      const userAnswers = await QuestionService.getUserAnswers();
      for (const question of wrongBookQuestions) {
        const answer = userAnswers[question.id];
        if (answer) {
          // 保留錯題本和收藏狀態，但清空答題記錄
          await QuestionService.updateUserAnswer(question.id, {
            isAnswered: false,
            isCorrect: false,
            selectedAnswer: undefined,
            isInWrongBook: answer.isInWrongBook || false, // 保留錯題本狀態
            isFavorite: answer.isFavorite || false, // 保留收藏狀態
            isUncertain: false,
            wrongCount: answer.wrongCount || 0, // 保留錯誤次數
          });
        }
      }

      // 去重題目 ID，確保每個題目只出現一次
      const uniqueQuestionIds = Array.from(new Set(wrongBookQuestions.map(q => q.id)));
      
      // 直接導航到答題頁，使用第一題作為起始題目
      navigation.navigate('ReviewQuiz', {
        questionId: uniqueQuestionIds[0],
        questionIds: uniqueQuestionIds,
      });
    };


    return (
      <View
        style={[
          styles.wrongBookItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            shadowColor: colors.text,
          },
          isWrongBookHovered && {
            backgroundColor: '#FFF9C4',
            borderColor: '#FFD700',
            borderWidth: 2,
          },
        ]}
        {...({
          onMouseEnter: () => setIsWrongBookHovered(true),
          onMouseLeave: () => setIsWrongBookHovered(false),
        } as any)}
      >
        <TouchableOpacity
          style={styles.wrongBookContent}
          onPress={handlePress}
        >
          <Text
            style={[
              styles.wrongBookText,
              {
                color: colors.text,
                fontSize: textSizeValue,
              },
            ]}
          >
            複習錯題 {wrongBookCount > 0 && `(${wrongBookCount}題)`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.wrongBookActionButton,
            {
              backgroundColor: colors.background,
              borderColor: colors.primary,
            },
          ]}
          onPress={handlePress}
        >
          <Text
            style={[
              styles.actionButtonText,
              {
                color: colors.primary,
                fontSize: textSizeValue - 2,
              },
            ]}
          >
            {wrongBookButtonText}
          </Text>
        </TouchableOpacity>
      </View>
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
            {
              color: colors.headerText,
              fontSize: titleTextSizeValue,
            },
          ]}
        >
          {subject}
        </Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={series}
        renderItem={({ item, index }) => renderSeriesItem({ item, index })}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={renderWrongBookItem}
      />
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
  headerTitle: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
  },
  headerRight: {
    width: 40,
  },
  listContent: {
    padding: 16,
  },
  seriesItem: {
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  seriesContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  seriesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  seriesText: {
    flex: 1,
    fontWeight: '500',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 8,
    flexShrink: 0,
  },
  actionButton: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexShrink: 0,
  },
  actionButtonText: {
    fontWeight: '500',
  },
  questionCountText: {
    fontSize: 14,
    color: '#666666',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
  },
  progressText: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'right',
  },
  wrongBookItem: {
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  wrongBookContent: {
    flex: 1,
    padding: 16,
  },
  wrongBookText: {
    textAlign: 'left',
    fontWeight: '500',
  },
  wrongBookActionButton: {
    marginRight: 16,
  },
});

export default SeriesListScreen;

