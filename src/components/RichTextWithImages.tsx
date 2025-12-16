import React, { useState } from 'react';
import { View, Text, Image, StyleSheet, ActivityIndicator, TouchableOpacity, Linking, Alert, Platform } from 'react-native';
import { Asset } from 'expo-asset';
import { getImageSource } from '../services/imageFileMap';
import ExpandableText from './ExpandableText';

interface RichTextWithImagesProps {
  text: string;
  textStyle?: any;
  imageStyle?: any;
  contextText?: string; // 上下文文字，用於搜尋圖片
  testName?: string; // 測驗名稱，用於構建圖片路徑
  subject?: string; // 科目，用於構建圖片路徑
  series_no?: string; // 期數，用於構建圖片路徑
  questionNumber?: number; // 題號，用於構建圖片路徑
  optionLabel?: string; // 選項標籤（A/B/C/D），用於構建選項圖片路徑
  expandable?: boolean; // 是否啟用展開/收起功能
  maxLength?: number; // 展開/收起的最大長度（預設 200）
}

/**
 * 解析文字中的圖片標記並渲染
 * 格式：
 * - @@圖片URL@@ - 直接顯示圖片
 * - @@ - 佔位符，點擊後可搜尋圖片
 * 例如：考慮擲出骰子並採用 Monte Carlo方法估算條件機率,參考附圖程式碼. @@事件 A：擲出偶數
 */
const RichTextWithImages: React.FC<RichTextWithImagesProps> = ({
  text,
  textStyle,
  imageStyle,
  contextText,
  testName,
  subject,
  series_no,
  questionNumber,
  optionLabel,
  expandable = false,
  maxLength = 200,
}) => {
  // 構建本地圖片路徑
  const getLocalImagePath = (imageFileName: string): string | null => {
    if (!testName || !subject || !series_no) {
      console.log(`❌ [RichTextWithImages] 無法構建圖片路徑：缺少必要資訊`, { testName, subject, series_no, imageFileName });
      return null;
    }
    
    // 格式：assets/images/{testName}/{subject}/{series_no}/{imageFileName}
    // 例如：assets/images/IPAS_01/L11/11401/3Q1.png
    const imagePath = `assets/images/${testName}/${subject}/${series_no}/${imageFileName}`;
    console.log(`🖼️ [RichTextWithImages] 構建圖片路徑:`, { imageFileName, imagePath, testName, subject, series_no });
    return imagePath;
  };

  // 根據題號、選項和序號推斷圖片檔名
  // imageIndex: 圖片在文字中的順序（從 1 開始）
  const inferImageFileName = (imageIndex: number): string | null => {
    if (!questionNumber) {
      console.log(`❌ [RichTextWithImages] 無法推斷圖片檔名：缺少題號`, { imageIndex, optionLabel });
      return null;
    }
    
    // 如果有選項標籤，推斷為選項圖片（例如：45A1.png, 45A2.png）
    if (optionLabel) {
      const fileName = `${questionNumber}${optionLabel}${imageIndex}.png`;
      console.log(`🖼️ [RichTextWithImages] 推斷選項圖片檔名:`, { questionNumber, optionLabel, imageIndex, fileName });
      return fileName;
    }
    
    // 否則推斷為題目圖片（例如：45Q1.png, 45Q2.png）
    const fileName = `${questionNumber}Q${imageIndex}.png`;
    console.log(`🖼️ [RichTextWithImages] 推斷題目圖片檔名:`, { questionNumber, imageIndex, fileName });
    return fileName;
  };

  // 解析文字，找出所有 @@ 標記和 ## ## 標記
  const parseText = (inputText: string): Array<{ type: 'text' | 'image' | 'placeholder' | 'context'; content: string; imagePath?: string | null }> => {
    const parts: Array<{ type: 'text' | 'image' | 'placeholder' | 'context'; content: string; imagePath?: string | null }> = [];
    
    // 先找出所有 @@URL@@ 格式的圖片標記
    const urlRegex = /@@([^@]+)@@/g;
    const urlMatches: Array<{ index: number; endIndex: number; url: string; imagePath?: string | null; imageIndex: number }> = [];
    let match;
    let imageCounter = 0; // 用於計算圖片序號（從 1 開始）

    while ((match = urlRegex.exec(inputText)) !== null) {
      const url = match[1].trim();
      imageCounter++; // 每遇到一個圖片標記，序號加 1
      
      // 如果 URL 看起來像是一個有效的 URL（包含 http 或 https），才當作圖片 URL
      if (url.startsWith('http://') || url.startsWith('https://')) {
        urlMatches.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          url: url,
          imageIndex: imageCounter,
        });
      } else if (url.match(/\.(png|jpg|jpeg)$/i)) {
        // 本地圖片檔名（例如：41Q1.png, 45A1.png）
        const imagePath = getLocalImagePath(url);
        urlMatches.push({
          index: match.index,
          endIndex: match.index + match[0].length,
          url: url,
          imagePath: imagePath,
          imageIndex: imageCounter,
        });
      }
    }

    // 找出所有單獨的 @@ 標記（不在 URL 標記內）
    const placeholderRegex = /@@/g;
    const placeholderMatches: Array<{ index: number; imageIndex: number }> = [];
    let placeholderMatch;

    while ((placeholderMatch = placeholderRegex.exec(inputText)) !== null) {
      const matchIndex = placeholderMatch.index;
      // 檢查這個 @@ 是否在某個 URL 標記內
      const isInUrlMatch = urlMatches.some(um => matchIndex >= um.index && matchIndex < um.endIndex);
      if (!isInUrlMatch) {
        imageCounter++; // 每遇到一個佔位符，序號加 1
        placeholderMatches.push({ index: matchIndex, imageIndex: imageCounter });
      }
    }

    // 找出所有 ## ## 標記（前情提要）
    const contextRegex = /##\s*([\s\S]*?)\s*##/g;
    const contextMatches: Array<{ index: number; endIndex: number; content: string }> = [];
    let contextMatch;

    while ((contextMatch = contextRegex.exec(inputText)) !== null) {
      contextMatches.push({
        index: contextMatch.index,
        endIndex: contextMatch.index + contextMatch[0].length,
        content: contextMatch[1].trim(),
      });
    }

    // 過濾掉在前情提要內的圖片標記，避免重複解析
    const filteredUrlMatches = urlMatches.filter(um => {
      return !contextMatches.some(cm => um.index >= cm.index && um.index < cm.endIndex);
    });
    
    const filteredPlaceholderMatches = placeholderMatches.filter(pm => {
      return !contextMatches.some(cm => pm.index >= cm.index && pm.index < cm.endIndex);
    });

    // 合併並排序所有標記位置
    const allMarkers: Array<{ index: number; type: 'url' | 'placeholder' | 'context'; url?: string; endIndex?: number; imagePath?: string | null; imageIndex?: number; content?: string }> = [];
    
    filteredUrlMatches.forEach(um => {
      allMarkers.push({ 
        index: um.index, 
        type: 'url', 
        url: um.url, 
        endIndex: um.endIndex,
        imagePath: um.imagePath,
        imageIndex: um.imageIndex,
      });
    });
    
    filteredPlaceholderMatches.forEach(pm => {
      allMarkers.push({ 
        index: pm.index, 
        type: 'placeholder',
        imageIndex: pm.imageIndex,
      });
    });

    contextMatches.forEach(cm => {
      allMarkers.push({
        index: cm.index,
        type: 'context',
        endIndex: cm.endIndex,
        content: cm.content,
      });
    });

    // 按位置排序
    allMarkers.sort((a, b) => a.index - b.index);

    // 處理每個標記
    let currentIndex = 0;
    allMarkers.forEach(marker => {
      // 添加標記前的文字
      if (marker.index > currentIndex) {
        const textPart = inputText.substring(currentIndex, marker.index);
        if (textPart) {
          parts.push({ type: 'text', content: textPart });
        }
      }

      if (marker.type === 'url' && marker.url) {
        // URL 標記 - 顯示圖片
        // 如果有 imagePath，表示是本地圖片；否則為網路 URL
        const urlMatch = filteredUrlMatches.find(um => um.index === marker.index);
        if (urlMatch && urlMatch.imagePath) {
          parts.push({ type: 'image', content: marker.url, imagePath: urlMatch.imagePath });
        } else {
          parts.push({ type: 'image', content: marker.url });
        }
        currentIndex = marker.endIndex || marker.index + 2;
      } else if (marker.type === 'placeholder') {
        // 單獨的 @@ 佔位符
        // 根據圖片序號推斷本地圖片路徑
        const imageIndex = marker.imageIndex || 1; // 預設為 1
        console.log(`🔍 [RichTextWithImages] 處理 @@ 佔位符:`, { imageIndex, questionNumber, optionLabel, testName, subject, series_no });
        const inferredFileName = inferImageFileName(imageIndex);
        
        if (inferredFileName) {
          const imagePath = getLocalImagePath(inferredFileName);
          if (imagePath) {
            // 推斷為本地圖片
            console.log(`✅ [RichTextWithImages] 成功推斷圖片路徑:`, { inferredFileName, imagePath });
            parts.push({ type: 'image', content: inferredFileName, imagePath: imagePath });
          } else {
            // 無法構建路徑，顯示為佔位符
            console.log(`❌ [RichTextWithImages] 無法構建圖片路徑，顯示為佔位符:`, { inferredFileName });
            parts.push({ type: 'placeholder', content: '@@' });
          }
        } else {
          // 沒有題目資訊，顯示為可點擊的搜尋按鈕
          console.log(`❌ [RichTextWithImages] 無法推斷圖片檔名，顯示為搜尋按鈕`);
          parts.push({ type: 'placeholder', content: '@@' });
        }
        currentIndex = marker.index + 2;
      } else if (marker.type === 'context' && marker.content) {
        // ## ## 標記 - 前情提要
        parts.push({ type: 'context', content: marker.content });
        currentIndex = marker.endIndex || marker.index + 2;
      }
    });

    // 添加剩餘的文字
    if (currentIndex < inputText.length) {
      const remainingText = inputText.substring(currentIndex);
      if (remainingText) {
        parts.push({ type: 'text', content: remainingText });
      }
    }

    // 如果沒有找到任何標記，返回整個文字
    if (parts.length === 0) {
      parts.push({ type: 'text', content: inputText });
    }

    return parts;
  };

  const handleSearchImage = () => {
    // 使用上下文文字或問題文字來搜尋圖片
    // 提取問題的關鍵字（去除常見的停用詞）
    const searchText = contextText || text || '圖片';
    // 限制搜尋文字長度，避免 URL 過長
    const query = encodeURIComponent(searchText.substring(0, 100));
    const googleImageSearchUrl = `https://www.google.com/search?tbm=isch&q=${query}`;
    
    Linking.openURL(googleImageSearchUrl).catch(err => {
      console.error('無法開啟 Google 圖片搜尋:', err);
      Alert.alert('錯誤', '無法開啟 Google 圖片搜尋');
    });
  };

  const parts = parseText(text);

  return (
    <View style={[styles.container, { margin: 0, padding: 0 }]}>
      {parts.map((part, index) => {
        if (part.type === 'text') {
          // Web 平台禁用展開/收起功能，直接顯示完整文本
          if (expandable && Platform.OS !== 'web') {
            return (
              <ExpandableText
                key={index}
                text={part.content}
                maxLength={maxLength}
                textStyle={textStyle}
              />
            );
          }
          // 直接顯示文本
          return (
            <Text key={index} style={textStyle}>
              {part.content}
            </Text>
          );
        } else if (part.type === 'image') {
          // 圖片部分 - 圖片會換行顯示
          // 如果是本地圖片路徑，構建正確的路徑；否則使用 URI
          let imageSource: any;
          
          if (part.imagePath) {
            // 本地圖片：構建正確的路徑
            // Web 平台：使用相對路徑（從根目錄開始）
            // 原生平台：使用圖片映射表載入資源
            if (Platform.OS === 'web') {
              // Web 平台：嘗試使用圖片映射表，如果沒有則使用相對路徑
              // 在 Web 上，也可以使用 require() 載入的圖片資源
              try {
                const imageResource = getImageSource(part.imagePath);
                if (imageResource) {
                  // 使用映射表中的圖片資源（Web 也支援 require）
                  imageSource = imageResource;
                  console.log(`✅ [RichTextWithImages] Web 平台從映射表載入圖片:`, { imagePath: part.imagePath });
                } else {
                  // 如果映射表中沒有，嘗試使用相對路徑
                  // 路徑格式：/assets/images/IPAS_02_L23_11411/45A1.png
                  imageSource = { uri: `/${part.imagePath}` };
                  console.log(`🌐 [RichTextWithImages] Web 平台使用相對路徑:`, { imagePath: part.imagePath, uri: imageSource.uri });
                }
              } catch (error) {
                // 如果映射表載入失敗，使用相對路徑
                console.warn(`⚠️ [RichTextWithImages] Web 平台映射表載入失敗，使用相對路徑:`, { imagePath: part.imagePath, error });
                imageSource = { uri: `/${part.imagePath}` };
              }
            } else {
              // 原生平台（iOS/Android）：使用 expo-asset 載入本地資源
              // 對於動態圖片路徑，在 Android 上需要使用正確的路徑格式
              // 路徑格式：assets/images/IPAS_02_L23_11411/45A1.png
              // 在 Android 上，如果圖片在 assetBundlePatterns 中配置，可以直接使用相對路徑
              // 但需要確保路徑格式正確（可能需要使用 require 或正確的 URI 格式）
              
              // 原生平台（iOS/Android）：使用圖片映射表載入本地資源
              // 在 Android 上，必須使用 require() 來載入本地圖片，無法使用動態 URI
              // 因此我們使用 imageFileMap 來映射圖片路徑到 require() 資源
              try {
                const imageResource = getImageSource(part.imagePath);
                if (imageResource) {
                  // 使用映射表中的圖片資源
                  imageSource = imageResource;
                  console.log(`✅ [RichTextWithImages] 從映射表載入圖片:`, { 
                    imagePath: part.imagePath,
                    platform: Platform.OS
                  });
                } else {
                  // 如果映射表中沒有，嘗試使用原始路徑（可能會失敗）
                  console.warn(`⚠️ [RichTextWithImages] 映射表中找不到圖片，使用原始路徑:`, { imagePath: part.imagePath });
                  imageSource = { uri: part.imagePath };
                }
              } catch (error) {
                console.error(`❌ [RichTextWithImages] 載入圖片失敗:`, { imagePath: part.imagePath, error });
                // 失敗時嘗試使用原始路徑
                imageSource = { uri: part.imagePath };
              }
            }
          } else {
            // 網路圖片 URL（http/https）
            imageSource = { uri: part.content };
            console.log(`🌍 [RichTextWithImages] 網路圖片 URL:`, { uri: imageSource.uri });
          }
          
          return (
            <ImageWithLoading
              key={index}
              source={imageSource}
              imagePath={part.imagePath || part.content}
              style={[styles.image, imageStyle]}
            />
          );
        } else if (part.type === 'context') {
          // 前情提要部分 - 顯示為可展開/收起的內容
          return (
            <ContextExpandable
              key={index}
              content={part.content}
              textStyle={textStyle}
              imageStyle={imageStyle}
              contextText={contextText}
              testName={testName}
              subject={subject}
              series_no={series_no}
              questionNumber={questionNumber}
              optionLabel={optionLabel}
            />
          );
        } else {
          // 佔位符部分 - 顯示為可點擊的提示
          return (
            <TouchableOpacity
              key={index}
              style={styles.placeholderWrapper}
              onPress={handleSearchImage}
            >
              <View style={styles.placeholderContainer}>
                <Text style={styles.placeholderText}>📷 點擊搜尋圖片</Text>
                <Text style={styles.placeholderHint}>（將開啟 Google 圖片搜尋）</Text>
              </View>
            </TouchableOpacity>
          );
        }
      })}
    </View>
  );
};

// 前情提要可展開/收起組件
const ContextExpandable: React.FC<{ 
  content: string; 
  textStyle?: any;
  imageStyle?: any;
  contextText?: string;
  testName?: string;
  subject?: string;
  series_no?: string;
  questionNumber?: number;
  optionLabel?: string;
}> = ({ 
  content, 
  textStyle,
  imageStyle,
  contextText,
  testName,
  subject,
  series_no,
  questionNumber,
  optionLabel,
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // 預設為收起狀態

  // 所有平台都顯示展開/收起功能
  return (
    <View style={styles.contextContainer}>
      <TouchableOpacity
        onPress={() => setIsExpanded(!isExpanded)}
        style={styles.contextButton}
      >
        <Text style={styles.contextButtonText}>
          {isExpanded ? '▼ 前情提要' : '▶ 前情提要'}
        </Text>
      </TouchableOpacity>
      {isExpanded && (
        <View style={styles.contextContent}>
          <RichTextWithImages
            text={content}
            textStyle={textStyle}
            imageStyle={imageStyle}
            contextText={contextText}
            testName={testName}
            subject={subject}
            series_no={series_no}
            questionNumber={questionNumber}
            optionLabel={optionLabel}
          />
        </View>
      )}
    </View>
  );
};

// 帶載入狀態的圖片組件
const ImageWithLoading: React.FC<{ source: any; imagePath?: string; style: any }> = ({
  source,
  imagePath,
  style,
}) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(false);

  React.useEffect(() => {
    console.log(`🖼️ [ImageWithLoading] 開始載入圖片:`, { imagePath, source });
  }, [imagePath, source]);

  return (
    <View style={styles.imageWrapper}>
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color="#999999" />
        </View>
      )}
      {error ? (
        <View style={[style, styles.errorContainer]}>
          <Text style={styles.errorText}>圖片載入失敗</Text>
        </View>
      ) : (
        <Image
          source={source}
          style={[{ width: '100%', height: undefined }, style]}
          onLoadStart={() => {
            console.log(`⏳ [ImageWithLoading] 圖片開始載入:`, { imagePath, source });
            setLoading(true);
          }}
          onLoadEnd={() => {
            console.log(`✅ [ImageWithLoading] 圖片載入成功:`, { imagePath, source });
            setLoading(false);
          }}
          onError={(error) => {
            console.error(`❌ [ImageWithLoading] 圖片載入失敗:`, { imagePath, source, error });
            setLoading(false);
            setError(true);
          }}
          resizeMode="contain"
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    margin: 0,
    padding: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  imageWrapper: {
    width: '100%',
    margin: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    alignItems: 'center', // 水平置中
    justifyContent: 'center', // 垂直置中
    // 確保所有平台都沒有多餘間距
    ...(Platform.OS === 'web' ? {
      margin: 0,
      padding: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    } : {}),
    ...(Platform.OS === 'android' ? {
      margin: 0,
      padding: 0,
      alignItems: 'center',
      justifyContent: 'center',
    } : {}),
    ...(Platform.OS === 'ios' ? {
      margin: 0,
      padding: 0,
      alignItems: 'center',
      justifyContent: 'center',
    } : {}),
  },
  imageContainer: {
    position: 'relative',
    width: '100%',
    alignItems: 'flex-start', // 確保靠左對齊
    margin: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    // 確保所有平台都沒有多餘間距
    ...(Platform.OS === 'web' ? {
      margin: 0,
      padding: 0,
      marginTop: 0,
      marginBottom: 0,
      marginLeft: 0,
      marginRight: 0,
    } : {}),
    ...(Platform.OS === 'android' ? {
      margin: 0,
      padding: 0,
    } : {}),
    ...(Platform.OS === 'ios' ? {
      margin: 0,
      padding: 0,
    } : {}),
  },
  image: {
    width: '100%',
    height: undefined, // 讓高度根據寬度和圖片比例自動調整
    minHeight: 150,
    // 移除 maxHeight，讓圖片根據寬度自動調整高度
    borderRadius: 0, // 移除圓角，讓圖片更大
    alignSelf: 'center', // 置中對齊
    margin: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    padding: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    margin: 0,
    padding: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  errorContainer: {
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 100,
    borderRadius: 4,
    margin: 0,
    padding: 0,
    marginVertical: 0,
    marginHorizontal: 0,
    marginTop: 0,
    marginBottom: 0,
    marginLeft: 0,
    marginRight: 0,
    paddingVertical: 0,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
  },
  errorText: {
    color: '#999999',
    fontSize: 12,
  },
  placeholderWrapper: {
    width: '100%',
    marginVertical: 8,
  },
  placeholderContainer: {
    backgroundColor: '#E3F2FD',
    borderWidth: 2,
    borderColor: '#2196F3',
    borderStyle: 'dashed',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderText: {
    color: '#1976D2',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  placeholderHint: {
    color: '#64B5F6',
    fontSize: 12,
  },
  contextContainer: {
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    borderRadius: 4,
    backgroundColor: 'transparent', // 移除背景色
  },
  contextButton: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent', // 移除按鈕背景色
  },
  contextButtonText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
  contextContent: {
    padding: 12,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    backgroundColor: 'transparent', // 移除內容區域背景色
  },
});

export default RichTextWithImages;

