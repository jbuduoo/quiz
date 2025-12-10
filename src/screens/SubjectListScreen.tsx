import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Subject } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SubjectListRouteProp = RNRouteProp<RootStackParamList, 'SubjectList'>;

const SubjectListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubjectListRouteProp>();
  const { testName } = route.params;
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

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
    try {
      await QuestionService.initializeData();
      // 使用 testName 篩選科目
      const subjectsData = await QuestionService.getSubjectsByTestName(testName);
      console.log(`載入科目列表: testName=${testName}, 找到 ${subjectsData.length} 個科目`);
      console.log('科目列表:', subjectsData.map(s => `${s.name} (${s.totalQuestions})`));
      setSubjects(subjectsData);
    } catch (error) {
      console.error('載入科目列表失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderSubjectItem = ({ item }: { item: Subject }) => (
    <TouchableOpacity
      style={styles.subjectItem}
      onPress={() => {
        navigation.navigate('SeriesList', {
          testName: testName,
          subject: item.name,
        });
      }}
    >
      <View style={styles.subjectContent}>
        <View style={styles.subjectContainer}>
          <Text style={styles.subjectText}>{item.name}</Text>
          <View style={styles.questionCountBadge}>
            <Text style={styles.questionCountText}>({item.totalQuestions})</Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <Text style={styles.progressText}>{item.completionPercentage}%</Text>
        </View>
      </View>
      {item.totalQuestions > 0 && (
        <View style={styles.progressBarContainer}>
          <View
            style={[
              styles.progressBar,
              { width: `${item.completionPercentage}%` },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );

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
        <Text style={styles.headerTitle}>{testName}</Text>
        <View style={styles.headerRight} />
      </View>

      <FlatList
        data={subjects}
        renderItem={renderSubjectItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
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
  subjectItem: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  subjectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  subjectText: {
    fontSize: 16,
    color: '#000000',
  },
  questionCountBadge: {
    backgroundColor: '#FFEB3B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  questionCountText: {
    fontSize: 14,
    color: '#000000',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 14,
    color: '#666666',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#E5E5E5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#007AFF',
    borderRadius: 2,
  },
});

export default SubjectListScreen;

