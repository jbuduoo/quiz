import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  StyleSheet,
  TouchableOpacity,
  Text,
  ActivityIndicator,
  Platform,
  Linking,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { Question } from '../types';

interface SearchQuestionModalProps {
  visible: boolean;
  question: Question;
  onClose: () => void;
}

const SearchQuestionModal: React.FC<SearchQuestionModalProps> = ({
  visible,
  question,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const webViewRef = useRef<WebView>(null);
  
  // 組合題目和選項 A、B、C、D
  const combinedQuery = `${question.content} A. ${question.A} B. ${question.B} C. ${question.C} D. ${question.D}`;
  const searchQuery = encodeURIComponent(combinedQuery);
  // 使用 Google 搜尋 URL，會自動顯示 AI 摘要（如果有的話）
  const googleSearchUrl = `https://www.google.com/search?q=${searchQuery}`;

  // 當 Modal 開啟時，Web 平台直接開啟瀏覽器
  useEffect(() => {
    if (visible) {
      if (Platform.OS === 'web') {
        // Web 平台：直接開啟 Google 搜尋
        if (typeof window !== 'undefined') {
          window.open(googleSearchUrl, '_blank');
        }
        // 關閉 Modal
        onClose();
      } else {
        // iOS/Android 平台：使用 WebView
        setLoading(true);
        setError(null);
        
        // 設定 15 秒超時（增加超時時間，因為 Google 搜尋可能需要較長時間）
        timeoutRef.current = setTimeout(() => {
          setError('載入超時，請點擊「在瀏覽器中開啟」或「重新載入」');
          setLoading(false);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
        }, 15000);
      }
    } else {
      // Modal 關閉時清除超時
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setLoading(false);
      setError(null);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, googleSearchUrl, onClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* 頂部功能列 */}
        <View style={[styles.header, { paddingTop: Platform.OS === 'android' ? insets.top : 0 }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Text style={styles.closeButtonText}>關閉</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle} numberOfLines={1}>
            查詢問題
          </Text>
          <TouchableOpacity
            onPress={() => {
              Linking.openURL(googleSearchUrl).catch(err => {
                console.error('無法開啟瀏覽器:', err);
                Alert.alert('錯誤', '無法開啟外部瀏覽器');
              });
            }}
            style={styles.openBrowserHeaderButton}
          >
            <Text style={styles.openBrowserHeaderButtonText}>瀏覽器</Text>
          </TouchableOpacity>
        </View>

        {/* WebView 顯示 Google 搜尋結果（包含 AI 摘要） */}
        {/* Web 平台會在 useEffect 中直接開啟瀏覽器，不會顯示這個內容 */}
        {Platform.OS !== 'web' && !error && (
            // iOS 和 Android 使用 WebView
            <WebView
              ref={webViewRef}
              source={{ uri: googleSearchUrl }}
              style={styles.webview}
              startInLoadingState={true}
              onLoadStart={() => {
                setLoading(true);
                setError(null);
              }}
              onLoadEnd={() => {
                console.log('✅ [SearchQuestionModal] WebView 載入完成');
                setLoading(false);
                if (timeoutRef.current) {
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = null;
                }
              }}
              onLoadProgress={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                // 如果載入進度超過 50%，清除超時（表示正在載入）
                if (nativeEvent.progress > 0.5 && timeoutRef.current) {
                  // 延長超時時間
                  clearTimeout(timeoutRef.current);
                  timeoutRef.current = setTimeout(() => {
                    setError('載入超時，請點擊「在瀏覽器中開啟」或「重新載入」');
                    setLoading(false);
                    timeoutRef.current = null;
                  }, 10000);
                }
              }}
              onError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView 錯誤:', nativeEvent);
                setError('無法載入頁面，請檢查網路連線');
                setLoading(false);
              }}
              onHttpError={(syntheticEvent) => {
                const { nativeEvent } = syntheticEvent;
                console.error('WebView HTTP 錯誤:', nativeEvent);
                // HTTP 錯誤不一定代表失敗，Google 可能會返回 403 等，但頁面仍可顯示
                if (nativeEvent.statusCode >= 500) {
                  setError('伺服器錯誤，請稍後再試');
                  setLoading(false);
                }
              }}
              // 允許 JavaScript 執行（Google 搜尋需要）
              javaScriptEnabled={true}
              // 允許 DOM 儲存
              domStorageEnabled={true}
              // 允許第三方 Cookie（Google 搜尋需要）
              thirdPartyCookiesEnabled={true}
              // 允許混合內容
              mixedContentMode="always"
              // 允許內聯 JavaScript
              allowsInlineMediaPlayback={true}
              // 媒體播放需要用戶互動
              mediaPlaybackRequiresUserAction={false}
              // 設定 User Agent（讓 Google 知道這是行動裝置）
              userAgent={
                Platform.OS === 'ios'
                  ? 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
                  : 'Mozilla/5.0 (Linux; Android 13; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36'
              }
              // 允許導航
              allowsBackForwardNavigationGestures={true}
              // 設定快取模式
              cacheEnabled={true}
            />
        )}

        {/* 錯誤顯示（僅 iOS/Android） */}
        {Platform.OS !== 'web' && error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <View style={styles.errorButtons}>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={() => {
                  setError(null);
                  setLoading(true);
                  webViewRef.current?.reload();
                }}
              >
                <Text style={styles.retryButtonText}>重新載入</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.openBrowserButton}
                onPress={() => {
                  Linking.openURL(googleSearchUrl).catch(err => {
                    console.error('無法開啟瀏覽器:', err);
                    Alert.alert('錯誤', '無法開啟外部瀏覽器');
                  });
                }}
              >
                <Text style={styles.openBrowserButtonText}>在瀏覽器中開啟</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* 載入指示器 */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#007AFF" />
            <Text style={styles.loadingText}>載入中...</Text>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
    backgroundColor: '#FFFFFF',
    minHeight: 56,
  },
  closeButton: {
    padding: 8,
    minWidth: 60,
  },
  closeButtonText: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '500',
  },
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginHorizontal: 16,
    color: '#000000',
  },
  placeholder: {
    width: 60,
  },
  openBrowserHeaderButton: {
    padding: 8,
    minWidth: 60,
  },
  openBrowserHeaderButtonText: {
    fontSize: 14,
    color: '#007AFF',
    fontWeight: '500',
  },
  webview: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#FFFFFF',
  },
  errorText: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  openBrowserButton: {
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  openBrowserButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default SearchQuestionModal;

