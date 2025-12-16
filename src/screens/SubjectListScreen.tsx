import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Subject } from '../types';
import QuestionService from '../services/QuestionService';
import SettingsService from '../services/SettingsService';
import { useTheme } from '../contexts/ThemeContext';
import TestNameSelectorModal from '../components/TestNameSelectorModal';
import SettingsModal from '../components/SettingsModal';
import { RootStackParamList } from '../../App';
import { getTestNameDisplay, getSubjectDisplay } from '../utils/nameMapper';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type SubjectListRouteProp = RNRouteProp<RootStackParamList, 'SubjectList'>;

const SubjectListScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<SubjectListRouteProp>();
  const { testName: initialTestName } = route.params || {};
  const [testName, setTestName] = useState<string | undefined>(initialTestName);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showTestNameSelector, setShowTestNameSelector] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // 首次載入時，檢查是否有儲存的證照選擇
    checkInitialTestName();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      // 當頁面重新獲得焦點時，檢查 testName
      if (!testName) {
        checkInitialTestName();
      } else {
        loadData();
      }
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    // 當 testName 改變時，重新載入資料
    if (testName) {
      loadData();
    }
  }, [testName]);

  const checkInitialTestName = async () => {
    try {
      console.log('🔄 [SubjectListScreen] checkInitialTestName: 開始檢查');
      // 如果路由參數沒有 testName，嘗試從儲存中讀取
      if (!testName) {
        const savedTestName = await SettingsService.getSelectedTestName();
        if (savedTestName) {
          console.log(`✅ [SubjectListScreen] checkInitialTestName: 找到儲存的 testName: ${savedTestName}`);
          setTestName(savedTestName);
          // 更新路由參數
          navigation.setParams({ testName: savedTestName });
        } else {
          // 如果沒有儲存的證照，預設使用「初級」（IPAS_01）
          console.log('⚠️ [SubjectListScreen] checkInitialTestName: 沒有儲存的 testName，使用預設值 IPAS_01');
          const defaultTestName = 'IPAS_01';
          setTestName(defaultTestName);
          // 更新路由參數
          navigation.setParams({ testName: defaultTestName });
          // 儲存預設選擇
          await SettingsService.setSelectedTestName(defaultTestName);
          console.log(`✅ [SubjectListScreen] checkInitialTestName: 已設定預設 testName: ${defaultTestName}`);
        }
      } else {
        console.log(`✅ [SubjectListScreen] checkInitialTestName: 已有 testName: ${testName}`);
        loadData();
      }
    } catch (error) {
      console.error('❌ [SubjectListScreen] checkInitialTestName: 檢查初始證照失敗:', error);
      // 發生錯誤時，使用預設值 IPAS_01
      const defaultTestName = 'IPAS_01';
      console.log(`⚠️ [SubjectListScreen] checkInitialTestName: 發生錯誤，使用預設值: ${defaultTestName}`);
      setTestName(defaultTestName);
      navigation.setParams({ testName: defaultTestName });
      try {
        await SettingsService.setSelectedTestName(defaultTestName);
      } catch (saveError) {
        console.error('❌ [SubjectListScreen] checkInitialTestName: 儲存預設值失敗:', saveError);
      }
    }
  };

  const loadData = async () => {
    if (!testName) {
      console.log('⚠️ [SubjectListScreen] loadData: 沒有 testName，跳過載入');
      setLoading(false);
      return;
    }
    
    console.log(`🔄 [SubjectListScreen] loadData: 開始載入資料，testName=${testName}`);
    setLoading(true);
    try {
      console.log('🔄 [SubjectListScreen] loadData: 呼叫 initializeData');
      await QuestionService.initializeData();
      console.log('✅ [SubjectListScreen] loadData: initializeData 完成');
      
      // 使用 testName 篩選科目
      console.log('🔄 [SubjectListScreen] loadData: 取得科目列表');
      const subjectsData = await QuestionService.getSubjectsByTestName(testName);
      console.log(`✅ [SubjectListScreen] loadData: 找到 ${subjectsData.length} 個科目`);
      console.log('科目列表:', subjectsData.map(s => `${s.name} (${s.totalQuestions})`));
      setSubjects(subjectsData);
      console.log('✅ [SubjectListScreen] loadData: 資料載入完成');
    } catch (error) {
      console.error('❌ [SubjectListScreen] loadData: 載入科目列表失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [SubjectListScreen] loadData: 錯誤詳情:', error.message);
        console.error('❌ [SubjectListScreen] loadData: 錯誤堆疊:', error.stack);
      }
    } finally {
      console.log('✅ [SubjectListScreen] loadData: 設定 loading=false');
      setLoading(false);
    }
  };

  const handleTestNameSelect = (newTestName: string) => {
    setTestName(newTestName);
    setIsFirstLoad(false);
    // 更新路由參數
    navigation.setParams({ testName: newTestName });
  };

  const handleCloseModal = () => {
    // 如果是首次載入且沒有選擇證照，不允許關閉 Modal
    if (isFirstLoad && !testName) {
      return;
    }
    setShowTestNameSelector(false);
  };

  const renderSubjectItem = ({ item, index }: { item: Subject; index: number }) => {
    const isHovered = hoveredIndex === index;
    
    return (
      <View
        style={[
          styles.subjectItem,
          {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            ...(Platform.OS === 'web' ? {} : { shadowColor: colors.text }),
          },
          isHovered && {
            backgroundColor: '#FFF9C4',
            borderColor: '#FFD700',
            borderWidth: 2,
            marginBottom: 5, // 補償 borderWidth 增加 1px 造成的視覺差異
          },
        ]}
        {...({
          onMouseEnter: () => setHoveredIndex(index),
          onMouseLeave: () => setHoveredIndex(null),
        } as any)}
      >
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('SeriesList', {
              testName: testName,
              subject: item.name,
            });
          }}
          style={{ flex: 1 }}
        >
          <View style={styles.subjectContent}>
            <View style={styles.subjectContainer}>
              <Text
                style={[
                  styles.subjectText,
                  {
                    color: colors.text,
                    fontSize: textSizeValue,
                  },
                ]}
              >
                {getSubjectDisplay(item.name)}
              </Text>
              <Text
                style={[
                  styles.questionCountText,
                  {
                    color: colors.text,
                    fontSize: textSizeValue - 2,
                  },
                ]}
              >
                (總題數{item.totalQuestions})
              </Text>
            </View>
            <View style={styles.progressContainer}>
              <Text
                style={[
                  styles.progressText,
                  {
                    color: colors.textSecondary,
                    fontSize: textSizeValue - 2,
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
      </View>
    );
  };

  if (loading && !testName) {
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
      edges={['top', 'bottom']}
    >
      <View
        style={[
          styles.header,
          { 
            backgroundColor: colors.headerBackground,
          },
        ]}
      >
        <Text
          style={[
            styles.headerTitle,
            {
              color: colors.headerText,
              fontSize: titleTextSizeValue,
            },
          ]}
        >
          {testName ? getTestNameDisplay(testName) : '請選擇證照'}
        </Text>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowTestNameSelector(true)}
          >
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
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.headerIconButton}
            onPress={() => setShowSettings(true)}
          >
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
          </TouchableOpacity>
        </View>
      </View>

      {testName ? (
        <FlatList
          data={subjects}
          renderItem={({ item, index }) => renderSubjectItem({ item, index })}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(insets.bottom, 0) },
          ]}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text
            style={[
              styles.emptyText,
              {
                color: colors.textSecondary,
                fontSize: textSizeValue,
              },
            ]}
          >
            請點擊右上角的書櫃圖示 📚 選擇要練習的證照
          </Text>
        </View>
      )}

      <TestNameSelectorModal
        visible={showTestNameSelector}
        onClose={handleCloseModal}
        onSelect={handleTestNameSelect}
        currentTestName={testName || ''}
        canClose={!isFirstLoad || !!testName}
      />

      <SettingsModal
        visible={showSettings}
        onClose={() => setShowSettings(false)}
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
    paddingVertical: 8,
    minHeight: 44,
  },
  headerTitle: {
    fontWeight: '600',
    flex: 1,
    textAlign: 'left', // 文字靠左對齊
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4, // 縮小間距，讓書櫃和設定更靠近
  },
  headerIconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerIcon: {
    fontSize: 20,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    textAlign: 'center',
    lineHeight: 24,
  },
  subjectItem: {
    borderRadius: 8,
    marginBottom: 6,
    marginHorizontal: 0,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 1px 2px rgba(0, 0, 0, 0.1)',
    } : {
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    }),
  },
  subjectContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  subjectContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexWrap: 'wrap',
  },
  subjectText: {
    fontWeight: '500',
  },
  questionCountText: {
    fontWeight: '500',
    marginLeft: 8,
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

export default SubjectListScreen;

