import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform } from 'react-native';
import QuestionService from './src/services/QuestionService';
import SettingsService from './src/services/SettingsService';
import { ThemeProvider } from './src/contexts/ThemeContext';
import TestNameListScreen from './src/screens/TestNameListScreen';
import SubjectListScreen from './src/screens/SubjectListScreen';
import SeriesListScreen from './src/screens/SeriesListScreen';
import QuizScreen from './src/screens/QuizScreen';
import WrongBookScreen from './src/screens/WrongBookScreen';
import ReviewQuizScreen from './src/screens/ReviewQuizScreen';

export type RootStackParamList = {
  TestNameList: undefined;
  SubjectList: { testName?: string };
  SeriesList: { testName: string; subject: string };
  Quiz: { testName: string; subject: string; series_no: string; isReviewMode?: boolean };
  WrongBook: undefined;
  ReviewQuiz: { questionId: string; questionIds: string[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const touchStartRef = useRef<boolean>(false);

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    console.log('🚀 [App] initializeApp: 開始初始化應用程式');
    try {
      // 初始化資料（設定超時，避免無限等待）
      const initPromise = QuestionService.initializeData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('初始化超時')), 10000)
      );
      
      console.log('🔄 [App] initializeApp: 等待初始化完成（最多 10 秒）');
      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ [App] initializeApp: 初始化完成');
    } catch (error) {
      console.error('❌ [App] initializeApp: 初始化應用程式失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [App] initializeApp: 錯誤詳情:', error.message);
      }
      // 即使初始化失敗，也讓應用程式繼續運行
      // 用戶可能仍可以從 AsyncStorage 讀取已儲存的資料
    } finally {
      // 無論成功或失敗，都停止載入動畫
      console.log('✅ [App] initializeApp: 設定 isLoading=false，顯示應用程式');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <View
          style={{ flex: 1 }}
          {...(Platform.OS === 'web' ? {} : {
            onTouchStart: () => {
              touchStartRef.current = true;
            },
            onTouchEnd: () => {
              if (touchStartRef.current) {
                touchStartRef.current = false;
              }
            },
          })}
        >
          <NavigationContainer ref={navigationRef}>
            <Stack.Navigator
              initialRouteName="SubjectList"
              screenOptions={{
                headerShown: false as boolean,
              }}
            >
              <Stack.Screen name="TestNameList" component={TestNameListScreen} />
              <Stack.Screen name="SubjectList" component={SubjectListScreen} />
              <Stack.Screen name="SeriesList" component={SeriesListScreen} />
              <Stack.Screen name="Quiz" component={QuizScreen} />
              <Stack.Screen name="WrongBook" component={WrongBookScreen} />
              <Stack.Screen name="ReviewQuiz" component={ReviewQuizScreen} />
            </Stack.Navigator>
          </NavigationContainer>
        </View>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
