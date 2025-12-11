import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Switch,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Question, WrongBookFilter } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const WrongBookScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filter, setFilter] = useState<WrongBookFilter>({});
  const [stats, setStats] = useState({ total: 0, wrongCount: 0, favoriteCount: 0 });
  const [loading, setLoading] = useState(true);
  const [subjects, setSubjects] = useState<string[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>('全部');
  const [userAnswers, setUserAnswers] = useState<Record<string, any>>({});

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

  const loadData = async () => {
    setLoading(true);
    const statsData = await QuestionService.getWrongBookStats();
    setStats(statsData);

    // 取得所有科目
    const allQuestions = await QuestionService.getAllQuestions();
    const uniqueSubjects = Array.from(new Set(allQuestions.map(q => q.subject)));
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
    const answers = await QuestionService.getUserAnswers();
    setQuestions(questionsData);
    setUserAnswers(answers);
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

  const renderQuestionItem = ({ item }: { item: Question }) => {
    const answerInfo = userAnswers[item.id];
    const questionPreview = item.content.length > 50
      ? item.content.substring(0, 50) + '...'
      : item.content;

    const isWrong = answerInfo?.isInWrongBook || false;
    const isFavorite = answerInfo?.isFavorite || false;
    const wrongCount = answerInfo?.wrongCount || 0;
    const isAnswered = answerInfo?.isAnswered || false;
    const isCorrect = answerInfo?.isCorrect || false;
    
    // 判斷按鈕文字
    const getButtonText = () => {
      if (!isAnswered) {
        return '開始測驗';
      } else if (isAnswered && !isCorrect) {
        return '繼續測驗';
      } else {
        return '重新測驗';
      }
    };
    
    const handleButtonPress = () => {
      // 去重題目 ID，確保每個題目只出現一次
      const uniqueQuestionIds = Array.from(new Set(questions.map(q => q.id)));
      navigation.navigate('ReviewQuiz', {
        questionId: item.id,
        questionIds: uniqueQuestionIds,
      });
    };

    return (
      <View style={styles.questionItem}>
        <TouchableOpacity
          style={styles.questionContentContainer}
          onPress={handleButtonPress}
        >
          <View style={styles.questionContent}>
            <Text style={styles.questionPreview}>{questionPreview}</Text>
            <View style={styles.questionMeta}>
              {isWrong && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>錯誤 {wrongCount} 次</Text>
                </View>
              )}
              {/* 錯題本只顯示收藏的題目，所以所有題目都顯示收藏圖標 */}
              {isFavorite && (
                <Text style={styles.favoriteIcon}>❤️</Text>
              )}
              <Text style={styles.subjectTag}>{item.subject}</Text>
            </View>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleButtonPress}
        >
          <Text style={styles.actionButtonText}>{getButtonText()}</Text>
        </TouchableOpacity>
      </View>
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
        <Text style={styles.headerTitle}>錯題與收藏本</Text>
        <View style={styles.headerRight} />
      </View>

      <View style={styles.statsContainer}>
        <Text style={styles.statsText}>
          共 {stats.total} 題 | 錯題 {stats.wrongCount} 題 | 收藏 {stats.favoriteCount} 題
        </Text>
      </View>

      <View style={styles.filterContainer}>
        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>依科目篩選：</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectScroll}>
            {subjects.map((subject) => (
              <TouchableOpacity
                key={subject}
                style={[
                  styles.subjectButton,
                  selectedSubject === subject && styles.subjectButtonActive,
                ]}
                onPress={() => handleSubjectChange(subject)}
              >
                <Text
                  style={[
                    styles.subjectButtonText,
                    selectedSubject === subject && styles.subjectButtonTextActive,
                  ]}
                >
                  {subject}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>僅複習錯題</Text>
          <Switch
            value={filter.onlyWrong || false}
            onValueChange={handleToggleOnlyWrong}
            trackColor={{ false: '#CCCCCC', true: '#007AFF' }}
            thumbColor="#FFFFFF"
          />
        </View>

        <View style={styles.filterRow}>
          <Text style={styles.filterLabel}>僅複習收藏題</Text>
          <Switch
            value={filter.onlyFavorite || false}
            onValueChange={handleToggleOnlyFavorite}
            trackColor={{ false: '#CCCCCC', true: '#007AFF' }}
            thumbColor="#FFFFFF"
          />
        </View>
      </View>

      <FlatList
        data={questions}
        renderItem={renderQuestionItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>目前沒有錯題或收藏題</Text>
          </View>
        }
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
  },
  headerRight: {
    width: 40,
  },
  statsContainer: {
    padding: 16,
    backgroundColor: '#F5F5F5',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  statsText: {
    fontSize: 14,
    color: '#666666',
    textAlign: 'center',
  },
  filterContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  filterLabel: {
    fontSize: 14,
    color: '#000000',
  },
  subjectScroll: {
    flex: 1,
  },
  subjectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
    marginRight: 8,
  },
  subjectButtonActive: {
    backgroundColor: '#007AFF',
  },
  subjectButtonText: {
    fontSize: 12,
    color: '#666666',
  },
  subjectButtonTextActive: {
    color: '#FFFFFF',
  },
  listContent: {
    padding: 16,
  },
  questionItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    flexDirection: 'row',
    alignItems: 'center',
  },
  questionContentContainer: {
    flex: 1,
  },
  questionContent: {
    padding: 16,
  },
  actionButton: {
    backgroundColor: '#E3F2FD',
    borderWidth: 1,
    borderColor: '#007AFF',
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 12,
    flexShrink: 0,
  },
  actionButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  questionPreview: {
    fontSize: 14,
    color: '#000000',
    marginBottom: 8,
    lineHeight: 20,
  },
  questionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  badge: {
    backgroundColor: '#FFEBEE',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 12,
    color: '#F44336',
  },
  favoriteIcon: {
    fontSize: 16,
  },
  subjectTag: {
    fontSize: 12,
    color: '#666666',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
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

