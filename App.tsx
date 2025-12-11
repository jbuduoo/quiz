import React, { useEffect, useState, useRef } from 'react';
import { NavigationContainer, NavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
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

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      // 初始化資料
      await QuestionService.initializeData();
    } catch (error) {
      console.error('初始化應用程式失敗:', error);
    } finally {
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
        <NavigationContainer ref={navigationRef}>
          <Stack.Navigator
            initialRouteName="SubjectList"
            screenOptions={{
              headerShown: false,
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
