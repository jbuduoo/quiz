import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  textStyle?: any;
  expandButtonStyle?: any;
  collapsedText?: string;
  expandedText?: string;
}

/**
 * 解析文字中的程式碼區塊 ``` 文字 ```
 */
const parseCodeBlocks = (text: string): Array<{ type: 'normal' | 'code'; content: string }> => {
  const parts: Array<{ type: 'normal' | 'code'; content: string }> = [];
  const codeRegex = /```\s*([\s\S]*?)\s*```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeRegex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      const normalText = text.substring(lastIndex, match.index);
      if (normalText) {
        parts.push({ type: 'normal', content: normalText });
      }
    }
    parts.push({ type: 'code', content: match[1].trim() });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: 'normal', content: remainingText });
    }
  }

  if (parts.length === 0) {
    parts.push({ type: 'normal', content: text });
  }

  return parts;
};

/**
 * 解析文字中的粗體標記 **文字** 和內聯程式碼 `文字`
 */
const parseBoldAndInlineCode = (text: string): Array<{ type: 'normal' | 'bold' | 'inlineCode'; content: string }> => {
  const parts: Array<{ type: 'normal' | 'bold' | 'inlineCode'; content: string }> = [];
  
  // 先找出所有粗體和內聯程式碼標記
  const boldRegex = /\*\*([^*]+)\*\*/g;
  const inlineCodeRegex = /`([^`]+)`/g;
  
  const markers: Array<{ index: number; endIndex: number; type: 'bold' | 'inlineCode'; content: string }> = [];
  let match;

  // 找出所有粗體標記
  while ((match = boldRegex.exec(text)) !== null) {
    markers.push({
      index: match.index,
      endIndex: match.index + match[0].length,
      type: 'bold',
      content: match[1],
    });
  }

  // 找出所有內聯程式碼標記（排除在粗體標記內的）
  while ((match = inlineCodeRegex.exec(text)) !== null) {
    const isInBold = markers.some(m => 
      m.type === 'bold' && match.index >= m.index && match.index < m.endIndex
    );
    if (!isInBold) {
      markers.push({
        index: match.index,
        endIndex: match.index + match[0].length,
        type: 'inlineCode',
        content: match[1],
      });
    }
  }

  // 按位置排序
  markers.sort((a, b) => a.index - b.index);

  // 處理每個標記
  let lastIndex = 0;
  markers.forEach(marker => {
    // 添加標記前的普通文字
    if (marker.index > lastIndex) {
      const normalText = text.substring(lastIndex, marker.index);
      if (normalText) {
        parts.push({ type: 'normal', content: normalText });
      }
    }
    // 添加標記內容
    parts.push({ type: marker.type, content: marker.content });
    lastIndex = marker.endIndex;
  });

  // 添加剩餘的普通文字
  if (lastIndex < text.length) {
    const remainingText = text.substring(lastIndex);
    if (remainingText) {
      parts.push({ type: 'normal', content: remainingText });
    }
  }

  // 如果沒有找到任何標記，返回整個文字作為普通文字
  if (parts.length === 0) {
    parts.push({ type: 'normal', content: text });
  }

  return parts;
};

/**
 * 可展開/收起的文本組件
 * 當文本長度超過 maxLength 時，顯示「展開」按鈕
 */
const ExpandableText: React.FC<ExpandableTextProps> = ({
  text,
  maxLength = 200,
  textStyle,
  expandButtonStyle,
  collapsedText = '展開',
  expandedText = '收起',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  
  // 解析文字，分離程式碼區塊和普通文字
  const parseTextWithCode = (textToRender: string) => {
    const codeParts = parseCodeBlocks(textToRender);
    const textElements: Array<React.ReactElement> = [];
    const codeElements: Array<React.ReactElement> = [];
    
    codeParts.forEach((codePart, codeIndex) => {
      if (codePart.type === 'code') {
        // 程式碼區塊
        codeElements.push(
          <View key={`code-${codeIndex}`} style={styles.codeContainer}>
            <Text style={[textStyle, styles.codeText]}>
              {codePart.content}
            </Text>
          </View>
        );
      } else {
        // 處理粗體和內聯程式碼
        const textParts = parseBoldAndInlineCode(codePart.content);
        textParts.forEach((textPart, textPartIndex) => {
          if (textPart.type === 'bold') {
            textElements.push(
              <Text key={`text-${codeIndex}-${textPartIndex}`} style={[textStyle, { fontWeight: 'bold' }]}>
                {textPart.content}
              </Text>
            );
          } else if (textPart.type === 'inlineCode') {
            textElements.push(
              <Text key={`text-${codeIndex}-${textPartIndex}`} style={[textStyle, styles.inlineCodeText]}>
                {textPart.content}
              </Text>
            );
          } else {
            textElements.push(
              <Text key={`text-${codeIndex}-${textPartIndex}`} style={textStyle}>
                {textPart.content}
              </Text>
            );
          }
        });
      }
    });
    
    return { textElements, codeElements };
  };

  // 如果文本長度小於 maxLength，直接顯示全部
  if (!text || text.length <= maxLength) {
    const { textElements, codeElements } = parseTextWithCode(text);
    
    if (codeElements.length > 0) {
      // 有程式碼區塊，使用 View 容器
      return (
        <View style={styles.container}>
          {textElements.length > 0 && (
            <Text style={textStyle}>
              {textElements}
            </Text>
          )}
          {codeElements}
        </View>
      );
    } else {
      // 只有文字，使用 Text 容器
      return (
        <Text style={textStyle}>
          {textElements}
        </Text>
      );
    }
  }
  
  const displayText = isExpanded ? text : text.substring(0, maxLength);
  const hasMore = text.length > maxLength;
  const { textElements, codeElements } = parseTextWithCode(displayText);
  
  return (
    <View style={styles.container}>
      {codeElements.length > 0 ? (
        <View>
          {textElements.length > 0 && (
            <Text style={textStyle}>
              {textElements}
              {!isExpanded && hasMore && '...'}
            </Text>
          )}
          {codeElements}
        </View>
      ) : (
        <Text style={textStyle}>
          {textElements}
          {!isExpanded && hasMore && '...'}
        </Text>
      )}
      {hasMore && (
        <TouchableOpacity
          onPress={() => setIsExpanded(!isExpanded)}
          style={styles.buttonContainer}
        >
          <Text style={[styles.expandButton, expandButtonStyle]}>
            {isExpanded ? expandedText : collapsedText}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
  },
  buttonContainer: {
    marginTop: 4,
  },
  expandButton: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '500',
  },
  codeContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 12,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    ...(Platform.OS === 'web' ? {
      fontFamily: 'monospace, "Courier New", Courier, monospace',
    } : {}),
  },
  codeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : Platform.OS === 'android' ? 'monospace' : 'monospace',
    fontSize: 14,
    color: '#333333',
    lineHeight: 20,
  },
  inlineCodeText: {
    fontFamily: Platform.OS === 'ios' ? 'Courier' : Platform.OS === 'android' ? 'monospace' : 'monospace',
    fontSize: 14,
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    color: '#D63384',
  },
});

export default ExpandableText;



