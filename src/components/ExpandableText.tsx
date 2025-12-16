import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ExpandableTextProps {
  text: string;
  maxLength?: number;
  textStyle?: any;
  expandButtonStyle?: any;
  collapsedText?: string;
  expandedText?: string;
}

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
  
  // 如果文本長度小於 maxLength，直接顯示全部
  if (!text || text.length <= maxLength) {
    return <Text style={textStyle}>{text}</Text>;
  }
  
  const displayText = isExpanded ? text : text.substring(0, maxLength);
  const hasMore = text.length > maxLength;
  
  return (
    <View style={styles.container}>
      <Text style={textStyle}>
        {displayText}
        {!isExpanded && hasMore && '...'}
      </Text>
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
});

export default ExpandableText;



