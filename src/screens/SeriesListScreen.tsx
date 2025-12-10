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
} from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { Series } from '../types';
import QuestionService from '../services/QuestionService';
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
    setLoading(false);
  };

  const renderSeriesItem = ({ item, index }: { item: Series; index: number }) => {
    const isHovered = hoveredIndex === index;
    
    return (
      <TouchableOpacity
        style={[
          styles.seriesItem,
          isHovered && styles.seriesItemHighlighted,
        ]}
        onPress={() => {
          navigation.navigate('Quiz', {
            testName: testName,
            subject: subject,
            series_no: item.name,
          });
        }}
        {...({
          onMouseEnter: () => setHoveredIndex(index),
          onMouseLeave: () => setHoveredIndex(null),
        } as any)}
      >
        <View style={styles.seriesContent}>
          <View style={styles.seriesContainer}>
            {item.completedQuestions === item.totalQuestions && item.totalQuestions > 0 ? (
              <Text style={styles.seriesText}>
                {item.name}(總題數 {item.totalQuestions}題，正確 {item.correctCount ?? 0}題，得分 {item.score ?? 0}分)
              </Text>
            ) : (
              <Text style={styles.seriesText}>
                {item.name}(總題數 {item.totalQuestions}題)
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
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

      // 去重題目 ID，確保每個題目只出現一次
      const uniqueQuestionIds = Array.from(new Set(wrongBookQuestions.map(q => q.id)));
      
      // 直接導航到答題頁，使用第一題作為起始題目
      navigation.navigate('ReviewQuiz', {
        questionId: uniqueQuestionIds[0],
        questionIds: uniqueQuestionIds,
      });
    };

    return (
      <TouchableOpacity
        style={[
          styles.wrongBookItem,
          isWrongBookHovered && styles.wrongBookItemHighlighted,
        ]}
        onPress={handlePress}
        {...({
          onMouseEnter: () => setIsWrongBookHovered(true),
          onMouseLeave: () => setIsWrongBookHovered(false),
        } as any)}
      >
        <Text style={styles.wrongBookText}>
          ❤️ 錯題與收藏本 {wrongBookCount > 0 && `(${wrongBookCount})`}
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.backButtonText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{subject}</Text>
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
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  seriesItemHighlighted: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FFD700',
    borderWidth: 2,
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
    fontSize: 16,
    color: '#000000',
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
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
  },
  wrongBookItemHighlighted: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  wrongBookText: {
    fontSize: 16,
    color: '#000000',
    textAlign: 'center',
  },
});

export default SeriesListScreen;

