import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import QuestionService from './src/services/QuestionService';
import TestNameListScreen from './src/screens/TestNameListScreen';
import SubjectListScreen from './src/screens/SubjectListScreen';
import SeriesListScreen from './src/screens/SeriesListScreen';
import QuizScreen from './src/screens/QuizScreen';
import WrongBookScreen from './src/screens/WrongBookScreen';
import ReviewQuizScreen from './src/screens/ReviewQuizScreen';

export type RootStackParamList = {
  TestNameList: undefined;
  SubjectList: { testName: string };
  SeriesList: { testName: string; subject: string };
  Quiz: { testName: string; subject: string; series_no: string };
  WrongBook: undefined;
  ReviewQuiz: { questionId: string; questionIds: string[] };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  useEffect(() => {
    // 初始化資料
    QuestionService.initializeData();
  }, []);

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="TestNameList"
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
    </SafeAreaProvider>
  );
}
