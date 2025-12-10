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
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TestName } from '../types';
import QuestionService from '../services/QuestionService';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TestNameListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [testNames, setTestNames] = useState<TestName[]>([]);
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
    await QuestionService.initializeData();
    const testNamesData = await QuestionService.getTestNames();
    setTestNames(testNamesData);
    setLoading(false);
  };

  const renderTestNameItem = ({ item }: { item: TestName }) => (
    <TouchableOpacity
      style={styles.testNameItem}
      onPress={() => {
        navigation.navigate('SubjectList', {
          testName: item.name,
        });
      }}
    >
      <View style={styles.testNameContent}>
        <View style={styles.testNameContainer}>
          <Text style={styles.testNameText}>{item.name}</Text>
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
        <View style={styles.headerLeft}>
          <Text style={styles.headerIcon}>⚙️</Text>
          <Text style={styles.headerIcon}>⭐</Text>
        </View>
        <Text style={styles.headerTitle}>單一級檢定題庫</Text>
        <View style={styles.headerRight}>
          <Text style={styles.headerIcon}>🔍</Text>
          <Text style={styles.headerIcon}>📚</Text>
        </View>
      </View>

      <FlatList
        data={testNames}
        renderItem={renderTestNameItem}
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
    backgroundColor: '#4A90E2',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    color: '#FFFFFF',
    fontSize: 18,
  },
  listContent: {
    padding: 16,
  },
  testNameItem: {
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
  testNameContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  testNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  testNameText: {
    fontSize: 18,
    fontWeight: '600',
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
    backgroundColor: '#4A90E2',
    borderRadius: 2,
  },
});

export default TestNameListScreen;

