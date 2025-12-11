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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Chapter } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const ChapterListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [chapters, setChapters] = useState<Chapter[]>([]);
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
    await QuestionService.initializeData();
    const chaptersData = await QuestionService.getChapters();
    const stats = await QuestionService.getWrongBookStats();
    setChapters(chaptersData);
    setWrongBookCount(stats.total);
    setLoading(false);
  };

  const renderChapterItem = ({ item, index }: { item: Chapter; index: number }) => {
    const isHovered = hoveredIndex === index;
    
    return (
      <TouchableOpacity
        style={[
          styles.chapterItem,
          isHovered && styles.chapterItemHighlighted,
        ]}
        onPress={() => {
          // 導航邏輯需要根據實際路由調整
          // 暫時保留原邏輯，但可能需要修復
        }}
        {...({
          onMouseEnter: () => setHoveredIndex(index),
          onMouseLeave: () => setHoveredIndex(null),
        } as any)}
      >
        <View style={styles.chapterContent}>
          <View style={styles.chapterNameContainer}>
            <Text style={styles.chapterName}>{item.name}</Text>
            <View style={styles.questionCountBadge}>
              <Text style={styles.questionCountText}>({item.totalQuestions})</Text>
            </View>
          </View>
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>{item.completionPercentage}%</Text>
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

      // 獲取錯題本題目列表
      const wrongBookQuestions = await QuestionService.getWrongBookQuestions({});
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
          複習錯題 {wrongBookCount > 0 && `(${wrongBookCount}題)`}
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
        <Text style={styles.headerTitle}>相關考題</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerIcon}>📌</Text>
          <Text style={styles.headerIcon}>⋯</Text>
        </View>
      </View>

      <FlatList
        data={chapters}
        renderItem={({ item, index }) => renderChapterItem({ item, index })}
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
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  headerIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  listContent: {
    padding: 16,
  },
  chapterItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  chapterItemHighlighted: {
    backgroundColor: '#FFF9C4',
    borderColor: '#FFD700',
    borderWidth: 2,
  },
  chapterContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  chapterNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  chapterName: {
    fontSize: 16,
    color: '#000000',
  },
  questionCountBadge: {
    backgroundColor: '#FFEB3B',
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 4,
  },
  questionCountText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
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
    textAlign: 'left',
  },
});

export default ChapterListScreen;

