import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { TestName } from '../types';
import QuestionService from '../services/QuestionService';
import SettingsService from '../services/SettingsService';
import { useTheme } from '../contexts/ThemeContext';
import { RootStackParamList } from '../../App';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

const TestNameListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const [testNames, setTestNames] = useState<TestName[]>([]);
  const [loading, setLoading] = useState(true);
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
    await QuestionService.initializeData();
    const testNamesData = await QuestionService.getTestNames();
    setTestNames(testNamesData);
    setLoading(false);
  };

  const renderTestNameItem = ({ item }: { item: TestName }) => (
    <TouchableOpacity
      style={[
        styles.testNameItem,
        {
          backgroundColor: colors.surface,
          ...(Platform.OS === 'web' ? {} : { shadowColor: colors.text }),
        },
      ]}
      onPress={async () => {
        // 儲存選擇的證照
        await SettingsService.setSelectedTestName(item.name);
        navigation.navigate('SubjectList', {
          testName: item.name,
        });
      }}
    >
      <View style={styles.testNameContent}>
        <View style={styles.testNameContainer}>
          <Text
            style={[
              styles.testNameText,
              {
                color: colors.text,
                fontSize: textSizeValue + 2,
              },
            ]}
          >
            {item.name}
          </Text>
          <View
            style={[
              styles.questionCountBadge,
              { backgroundColor: '#FFEB3B' },
            ]}
          >
            <Text
              style={[
                styles.questionCountText,
                {
                  fontSize: textSizeValue,
                },
              ]}
            >
              ({item.totalQuestions})
            </Text>
          </View>
        </View>
        <View style={styles.progressContainer}>
          <Text
            style={[
              styles.progressText,
              {
                color: colors.textSecondary,
                fontSize: textSizeValue,
              },
            ]}
          >
            {item.completionPercentage}%
          </Text>
        </View>
      </View>
      {item.totalQuestions > 0 && (
        <View
          style={[
            styles.progressBarContainer,
            { backgroundColor: colors.border },
          ]}
        >
          <View
            style={[
              styles.progressBar,
              {
                width: `${item.completionPercentage}%`,
                backgroundColor: colors.primary,
              },
            ]}
          />
        </View>
      )}
    </TouchableOpacity>
  );

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
        <View style={styles.headerLeft}>
          <Text
            style={[
              styles.headerIcon,
              {
                color: colors.headerText,
                fontSize: titleTextSizeValue,
              },
            ]}
          >
            ⚙️
          </Text>
          <Text
            style={[
              styles.headerIcon,
              {
                color: colors.headerText,
                fontSize: titleTextSizeValue,
              },
            ]}
          >
            ⭐
          </Text>
        </View>
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.headerText,
              fontSize: titleTextSizeValue,
            },
          ]}
        >
          單一級檢定題庫
        </Text>
        <View style={styles.headerRight}>
          <Text
            style={[
              styles.headerIcon,
              {
                color: colors.headerText,
                fontSize: titleTextSizeValue,
              },
            ]}
          >
            🔍
          </Text>
          <Text
            style={[
              styles.headerIcon,
              {
                color: colors.headerText,
                fontSize: titleTextSizeValue,
              },
            ]}
          >
            📚
          </Text>
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
  headerLeft: {
    flexDirection: 'row',
    gap: 12,
  },
  headerTitle: {
    fontWeight: '600',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 12,
  },
  headerIcon: {
    fontSize: 18,
  },
  listContent: {
    padding: 16,
  },
  testNameItem: {
    borderRadius: 8,
    marginBottom: 12,
    padding: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
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
    fontWeight: '600',
  },
  questionCountBadge: {
    backgroundColor: '#FFEB3B',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
  },
  questionCountText: {
    color: '#000000',
    fontWeight: '600',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressText: {
    fontWeight: '500',
  },
  progressBarContainer: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 2,
  },
});

export default TestNameListScreen;


