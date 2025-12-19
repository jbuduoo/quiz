import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp as RNRouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { WebView } from 'react-native-webview';
import { RootStackParamList } from '../../App';
import { useTheme } from '../contexts/ThemeContext';
import { downloadQuestionFile, ImportedQuestionData } from '../services/ImportService';
import {
  getEffectiveServerUrl,
  saveServerUrl,
  checkServerAvailable,
} from '../services/QuizServerService';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;
type ImportWebViewRouteProp = RNRouteProp<RootStackParamList, 'ImportWebView'>;

const ImportWebViewScreen = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute<ImportWebViewRouteProp>();
  const webViewRef = useRef<WebView>(null);
  const [loading, setLoading] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);
  const [serverUrl, setServerUrl] = useState<string>('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [detectingIP, setDetectingIP] = useState(false);
  const urlInputRef = useRef<TextInput>(null);
  const { colors, textSizeValue, titleTextSizeValue } = useTheme();

  // 初始化伺服器 URL
  useEffect(() => {
    initializeServerUrl();
  }, []);

  const initializeServerUrl = async () => {
    // 優先使用路由參數中的 URL
    if (route.params?.url) {
      setServerUrl(route.params.url);
      return;
    }

    // 嘗試取得儲存的 URL 或預設 URL
    const effectiveUrl = await getEffectiveServerUrl();
    if (effectiveUrl) {
      setServerUrl(effectiveUrl);
    } else {
      // 如果沒有預設 URL，顯示輸入對話框
      setShowUrlInput(true);
    }
  };

  // 自動設定預設伺服器 URL
  const handleAutoDetectIP = async () => {
    // 所有平台都使用預設的題庫網站
    const url = 'https://jbuduoo.github.io/ExamBank/';
    setServerUrl(url);
    setUrlInput(url);
    await saveServerUrl(url);
    setShowUrlInput(false);
    Alert.alert('成功', '已設定預設題庫網站');
  };

  // 手動設定伺服器 URL
  const handleSetServerUrl = async () => {
    if (!urlInput.trim()) {
      Alert.alert('錯誤', '請輸入伺服器網址');
      return;
    }

    // 驗證 URL 格式
    let url = urlInput.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `http://${url}`;
    }

    // 檢查伺服器是否可用
    setDetectingIP(true);
    try {
      const available = await checkServerAvailable(url);
      if (available) {
        setServerUrl(url);
        await saveServerUrl(url);
        setShowUrlInput(false);
        Alert.alert('成功', '伺服器連接成功');
      } else {
        Alert.alert(
          '無法連接',
          `無法連接到伺服器：${url}\n\n請確認：\n1. 伺服器已啟動\n2. 網址正確\n3. 網路連接正常`
        );
      }
    } catch (error) {
      Alert.alert('錯誤', '檢查伺服器時發生錯誤');
    } finally {
      setDetectingIP(false);
    }
  };

  const handleNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    // 只在原生平台更新 loading 狀態（WebView 載入狀態）
    if (Platform.OS !== 'web') {
      setLoading(navState.loading);
    }
  };

  // 攔截下載連結
  const handleShouldStartLoadWithRequest = (request: any): boolean => {
    const url = request.url;

    // 檢查是否為 JSON 檔案下載
    if (url.endsWith('.json') || url.includes('download') || url.includes('export')) {
      // 攔截下載，嘗試下載 JSON 檔案
      handleDownload(url);
      return false; // 阻止 WebView 載入
    }

    return true; // 允許正常導航
  };

  // 處理下載
  const handleDownload = async (url: string) => {
    try {
      console.log(`📋 [ImportWebViewScreen] handleDownload: 開始下載 ${url}`);
      setLoading(true);

      const data = await downloadQuestionFile(url, 30000); // 30 秒超時
      
      console.log(`✅ [ImportWebViewScreen] handleDownload: 下載成功`);
      
      // 導航到匯入設定畫面
      navigation.navigate('ImportConfig', {
        questionData: data,
        downloadUrl: url,
      });
    } catch (error) {
      console.error('❌ [ImportWebViewScreen] handleDownload: 下載失敗:', error);
      const errorMessage = error instanceof Error 
        ? error.message 
        : '無法下載題庫檔案';
      
      Alert.alert(
        '下載失敗',
        `${errorMessage}\n\n請確認：\n1. 網路連線正常\n2. URL 正確\n3. 檔案格式正確`,
        [{ text: '確定' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Web 平台：處理檔案選擇（當用戶從瀏覽器下載檔案後）
  // 使用與本地匯入相同的邏輯
  const handleFileSelect = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json,application/json';
      input.onchange = async (e: any) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
          setLoading(true);
          const text = await file.text();
          let data = JSON.parse(text);
          
          // 處理兩種格式：
          // 1. 數組格式：[{...}, {...}] -> 轉換為 ImportedQuestionData 格式
          // 2. 對象格式：{importDate, source, questions: [...]}
          if (Array.isArray(data)) {
            data = {
              source: file.name,
              importDate: new Date().toISOString().split('T')[0],
              questions: data,
            } as ImportedQuestionData;
          } else if (!data.questions) {
            // 如果沒有 questions 欄位，假設整個物件就是題目數組
            data = {
              source: file.name,
              importDate: new Date().toISOString().split('T')[0],
              questions: Array.isArray(data) ? data : [],
            } as ImportedQuestionData;
          }
          
          // 確保有 source
          if (!data.source) {
            data.source = file.name;
          }
          
          navigation.navigate('ImportConfig', {
            questionData: data as ImportedQuestionData,
            downloadUrl: file.name,
          });
        } catch (error) {
          console.error('讀取檔案失敗:', error);
          Alert.alert('錯誤', '無法讀取檔案，請確認檔案格式正確');
        } finally {
          setLoading(false);
        }
      };
      input.click();
    } else {
      // React Native 平台：這個按鈕不應該在 React Native 平台顯示
      // 如果用戶看到這個提示，說明按鈕顯示邏輯有問題
      console.warn('⚠️ [ImportWebViewScreen] handleFileSelect 在 React Native 平台被調用，這不應該發生');
      // 提供替代方案：引導用戶使用 WebView 中的下載功能
      Alert.alert(
        '提示',
        '請在題庫網站中點擊「📥 下載題庫」按鈕來下載檔案。\n\n下載的檔案會自動匯入。',
        [{ text: '確定' }]
      );
    }
  };

  // 注入 JavaScript 來攔截下載連結點擊
  const injectedJavaScript = `
    (function() {
      // 攔截所有連結點擊
      document.addEventListener('click', function(e) {
        const target = e.target.closest('a');
        if (target && target.href) {
          const url = target.href;
          // 檢查是否為 JSON 檔案或下載連結
          if (url.endsWith('.json') || url.includes('download') || url.includes('export')) {
            e.preventDefault();
            e.stopPropagation();
            // 發送訊息給 React Native
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'download',
              url: url
            }));
            return false;
          }
        }
      }, true);

      // 攔截右鍵選單下載
      document.addEventListener('contextmenu', function(e) {
        const target = e.target.closest('a');
        if (target && target.href) {
          const url = target.href;
          if (url.endsWith('.json') || url.includes('download') || url.includes('export')) {
            e.preventDefault();
            window.ReactNativeWebView.postMessage(JSON.stringify({
              type: 'download',
              url: url
            }));
            return false;
          }
        }
      }, true);
    })();
    true; // 必須返回 true
  `;

  // 處理 WebView 訊息
  const handleMessage = (event: any) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message.type === 'download') {
        handleDownload(message.url);
      }
    } catch (error) {
      console.error('解析 WebView 訊息失敗:', error);
    }
  };

  return (
    <SafeAreaView 
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={['top', 'bottom']}
    >
      <View style={[styles.header, { backgroundColor: colors.headerBackground }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Image
            source={require('../../assets/back.png')}
            style={styles.backButtonImage}
            resizeMode="contain"
          />
        </TouchableOpacity>
        <Text
          style={[
            styles.headerTitle,
            { color: colors.headerText, fontSize: titleTextSizeValue },
          ]}
        >
          題庫網站
        </Text>
        <View style={styles.headerRight} />
      </View>

      {serverUrl ? (
        Platform.OS === 'web' ? (
          // Web 平台：顯示提示和在新分頁打開的按鈕
          <View style={styles.webContainer}>
            <View style={styles.webInstructions}>
              <Text style={[styles.webInstructionsTitle, { color: colors.text, fontSize: textSizeValue }]}>
                匯入方法
              </Text>
              <Text style={[styles.webInstructionsText, { color: colors.textSecondary, fontSize: textSizeValue - 2 }]}>
                方法一：{'\n'}
                1. 點擊「在新分頁打開」按鈕{'\n'}
                2. 在新分頁中選擇要下載的題庫{'\n'}
                3. 點擊「📥 下載題庫」按鈕下載 JSON 檔案{'\n'}
                4. 下載完成後，點擊「📁 選擇已下載的檔案」選擇檔案匯入{'\n\n'}
                方法二：{'\n'}
                如果您已經下載了題庫 JSON 檔案，可以直接點擊「📁 選擇已下載的檔案」選擇檔案匯入
              </Text>
            </View>
            
            <View style={styles.webButtons}>
              <TouchableOpacity
                style={[styles.webButton, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.open(serverUrl, '_blank');
                  }
                }}
              >
                <Text style={[styles.webButtonText, { fontSize: textSizeValue }]}>
                  🌐 在新分頁打開
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.webButton, { backgroundColor: colors.border }]}
                onPress={handleFileSelect}
              >
                <Text style={[styles.webButtonText, { color: colors.text, fontSize: textSizeValue }]}>
                  📁 選擇已下載的檔案
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          // 原生平台：使用 WebView
          <WebView
            ref={webViewRef}
            source={{ uri: serverUrl }}
            style={styles.webview}
            onNavigationStateChange={handleNavigationStateChange}
            onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
            injectedJavaScript={injectedJavaScript}
            onMessage={handleMessage}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            scalesPageToFit={true}
          />
        )
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: colors.text, fontSize: textSizeValue }]}>
            請設定伺服器網址
          </Text>
          <TouchableOpacity
            style={[styles.setupButton, { backgroundColor: colors.primary }]}
            onPress={() => setShowUrlInput(true)}
          >
            <Text style={[styles.setupButtonText, { fontSize: textSizeValue }]}>
              設定伺服器
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 伺服器 URL 設定對話框 */}
      <Modal
        visible={showUrlInput}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUrlInput(false)}
        accessibilityViewIsModal={true}
        {...(Platform.OS === 'web' ? {
          // Web 平台特定屬性，避免 aria-hidden 警告
          accessibilityLabel: '設定伺服器網址對話框',
        } : {})}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.modalOverlay}
          onPress={() => setShowUrlInput(false)}
          {...(Platform.OS === 'web' ? {
            // Web 平台：防止背景層獲得焦點
            // 移除 aria-hidden，改用 inert 屬性（如果支援）或僅使用 accessibilityRole
            accessibilityRole: 'none',
            // 注意：不要在有焦點元素的祖先上使用 aria-hidden
            // 改用 CSS pointer-events 和適當的無障礙屬性
          } : {})}
        >
          <TouchableOpacity
            activeOpacity={1}
            style={[styles.modalContent, { backgroundColor: colors.surface }]}
            onPress={(e) => e.stopPropagation()}
            {...(Platform.OS === 'web' ? {
              role: 'dialog',
              'aria-modal': 'true',
              'aria-labelledby': 'modal-title',
            } : {})}
          >
            <Text 
              style={[styles.modalTitle, { color: colors.text, fontSize: titleTextSizeValue }]}
              {...(Platform.OS === 'web' ? {
                id: 'modal-title',
              } : {})}
            >
              設定伺服器網址
            </Text>
            
            <Text style={[styles.modalHint, { color: colors.textSecondary, fontSize: textSizeValue }]}>
              輸入題庫網站網址（例如：https://jbuduoo.github.io/ExamBank/）
            </Text>
            
            <TextInput
              ref={urlInputRef}
              style={[
                styles.urlInput,
                {
                  backgroundColor: colors.background,
                  color: colors.text,
                  borderColor: colors.border,
                  fontSize: textSizeValue,
                },
              ]}
              value={urlInput}
              onChangeText={setUrlInput}
              placeholder="https://jbuduoo.github.io/ExamBank/"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              {...(Platform.OS === 'web' ? {
                // Web 平台：不自動聚焦，避免 aria-hidden 警告
                // 用戶可以手動點擊輸入框來聚焦
                autoFocus: false,
                'aria-label': '伺服器網址輸入框',
              } : {
                // 原生平台：保持自動聚焦
                autoFocus: true,
              })}
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.border }]}
                onPress={() => setShowUrlInput(false)}
              >
                <Text style={[styles.modalButtonText, { color: colors.text, fontSize: textSizeValue }]}>
                  取消
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: '#4CAF50' }]}
                onPress={handleAutoDetectIP}
                disabled={detectingIP}
              >
                {detectingIP ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { fontSize: textSizeValue }]}>
                    自動檢測
                  </Text>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: colors.primary }]}
                onPress={handleSetServerUrl}
                disabled={detectingIP}
              >
                {detectingIP ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={[styles.modalButtonText, { fontSize: textSizeValue }]}>
                    確定
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {canGoBack && (
        <View style={[styles.footer, { backgroundColor: colors.surface }]}>
          <TouchableOpacity
            style={[styles.footerButton, { backgroundColor: colors.primary }]}
            onPress={() => webViewRef.current?.goBack()}
          >
            <Text style={[styles.footerButtonText, { fontSize: textSizeValue }]}>上一頁</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 下載載入指示器 */}
      {loading && (
        <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.text, fontSize: textSizeValue }]}>
            正在下載題庫檔案...
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    height: 60,
  },
  backButton: {
    padding: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonImage: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
    fontWeight: '600',
  },
  headerRight: {
    width: 60,
  },
  settingsButton: {
    padding: 8,
  },
  settingsButtonText: {
    fontSize: 20,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    marginBottom: 24,
    textAlign: 'center',
  },
  setupButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  setupButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 24,
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 4px 20px rgba(0, 0, 0, 0.3)',
    } : {
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    }),
  },
  modalTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  modalHint: {
    marginBottom: 16,
    lineHeight: 20,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  loadingContainer: {
    position: 'absolute',
    top: 60,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    zIndex: 1000,
  },
  loadingText: {
    marginTop: 12,
  },
  webview: {
    flex: 1,
  },
  webContainer: {
    flex: 1,
    padding: 24,
  },
  webInfoContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  webInfoTitle: {
    fontWeight: '600',
    marginBottom: 12,
  },
  webInfoText: {
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  webInfoUrl: {
    fontWeight: '500',
    marginTop: 8,
    textAlign: 'center',
  },
  webButtons: {
    gap: 12,
  },
  webButton: {
    paddingVertical: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...(Platform.OS === 'web' ? {
      boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.15)',
    } : {
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    }),
  },
  webButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  webInstructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginBottom: 32,
  },
  webInstructionsTitle: {
    fontWeight: '600',
    marginBottom: 8,
  },
  webInstructionsText: {
    lineHeight: 20,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  footerButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  footerButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});

export default ImportWebViewScreen;

