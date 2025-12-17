import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet, Platform, Text } from 'react-native';
import QuestionService from './src/services/QuestionService';
import { ThemeProvider } from './src/contexts/ThemeContext';
import TestNameListScreen from './src/screens/TestNameListScreen';
import SubjectListScreen from './src/screens/SubjectListScreen';
import SeriesListScreen from './src/screens/SeriesListScreen';
import QuizScreen from './src/screens/QuizScreen';
import WrongBookScreen from './src/screens/WrongBookScreen';
import ReviewQuizScreen from './src/screens/ReviewQuizScreen';
import ImportWebViewScreen from './src/screens/ImportWebViewScreen';
import ImportConfigScreen from './src/screens/ImportConfigScreen';
import { ImportedQuestionData } from './src/services/ImportService';

export type RootStackParamList = {
  TestNameList: undefined;
  SubjectList: { testName?: string };
  SeriesList: { testName: string; subject: string };
  Quiz: { testName: string; subject: string; series_no: string; isReviewMode?: boolean };
  WrongBook: undefined;
  ReviewQuiz: { questionId: string; questionIds: string[] };
  ImportWebView: { url?: string };
  ImportConfig: { questionData: ImportedQuestionData; downloadUrl: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const navigationRef = useRef<NavigationContainerRef<RootStackParamList>>(null);
  const touchStartRef = useRef<boolean>(false);

  useEffect(() => {
    // 使用 try-catch 包裹整個初始化過程，確保不會因為未捕獲的錯誤而崩潰
    try {
      initializeApp();
    } catch (error) {
      console.error('❌ [App] useEffect: 初始化過程發生未捕獲的錯誤:', error);
      setHasError(true);
      setIsLoading(false);
    }
  }, []);

  const initializeApp = async () => {
    console.log('🚀 [App] initializeApp: 開始初始化應用程式');
    console.log('🚀 [App] initializeApp: 平台:', Platform.OS);
    
    // 設定一個絕對超時，確保無論如何都會停止載入動畫
    const absoluteTimeout = setTimeout(() => {
      console.warn('⚠️ [App] initializeApp: 絕對超時觸發，強制停止載入動畫');
      setIsLoading(false);
    }, Platform.OS === 'android' ? 20000 : 15000); // Android 20秒，其他平台 15秒
    
    try {
      // 初始化資料（設定超時，避免無限等待）
      // QuestionService 會優先使用本地打包的 JSON 檔案，不需要網路連線
      const initPromise = QuestionService.initializeData();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('初始化超時')), Platform.OS === 'android' ? 15000 : 10000)
      );
      
      console.log(`🔄 [App] initializeApp: 等待初始化完成（最多 ${Platform.OS === 'android' ? 15 : 10} 秒）`);
      await Promise.race([initPromise, timeoutPromise]);
      console.log('✅ [App] initializeApp: 初始化完成');
    } catch (error) {
      console.error('❌ [App] initializeApp: 初始化應用程式失敗:', error);
      if (error instanceof Error) {
        console.error('❌ [App] initializeApp: 錯誤詳情:', error.message);
        console.error('❌ [App] initializeApp: 錯誤堆疊:', error.stack);
      }
      // 即使初始化失敗，也讓應用程式繼續運行
      // 用戶可能仍可以從 AsyncStorage 讀取已儲存的資料
      setHasError(true);
    } finally {
      // 清除絕對超時
      clearTimeout(absoluteTimeout);
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

  // 如果發生錯誤，仍然嘗試顯示應用程式（可能可以從 AsyncStorage 恢復資料）
  // 但使用 try-catch 包裹整個渲染過程
  try {
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
                <Stack.Screen name="ImportWebView" component={ImportWebViewScreen} />
                <Stack.Screen name="ImportConfig" component={ImportConfigScreen} />
              </Stack.Navigator>
            </NavigationContainer>
          </View>
        </ThemeProvider>
      </SafeAreaProvider>
    );
  } catch (error) {
    console.error('❌ [App] 渲染應用程式時發生錯誤:', error);
    // 返回一個簡單的錯誤畫面，而不是讓應用程式崩潰
    return (
      <SafeAreaProvider>
        <View style={styles.loadingContainer}>
          <Text style={{ color: '#FF0000', fontSize: 16, marginBottom: 10 }}>
            應用程式載入時發生錯誤
          </Text>
          <Text style={{ color: '#666666', fontSize: 14 }}>
            請檢查控制台日誌以獲取詳細資訊
          </Text>
        </View>
      </SafeAreaProvider>
    );
  }
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
