import React from 'react';
import { View, Text, StyleSheet, TextStyle, StyleProp } from 'react-native';
import { Colors, Typography, Spacing } from '@/constants/theme';

interface Props {
  text: string;
  style?: StyleProp<TextStyle>;
  isUser?: boolean;
}

/**
 * Renders AI response text with proper bold styling, bullet points,
 * and clean line spacing without raw markdown asterisks (* or **).
 */
export function FormattedAiText({ text, style, isUser }: Props) {
  if (isUser) {
    return <Text style={style}>{text}</Text>;
  }

  // Split into lines
  const lines = text.split('\n');

  return (
    <View style={styles.container}>
      {lines.map((rawLine, lineIdx) => {
        const line = rawLine.trim();

        // Empty line -> spacing
        if (!line) {
          return <View key={lineIdx} style={styles.lineBreak} />;
        }

        // Check if line is a bullet item (starts with *, -, or •)
        const isBullet = /^([*•-]\s+|\d+\.\s+)/.test(line);
        const bulletPrefix = /^(\d+\.\s+)/.test(line)
          ? line.match(/^(\d+\.\s+)/)![0]
          : '• ';
        const content = isBullet
          ? line.replace(/^([*•-]\s+|\d+\.\s+)/, '')
          : line;

        // Strip headers (###, ##, #)
        const cleanContent = content.replace(/^#{1,4}\s+/, '');

        // Parse inline bold (**bold**) or italic (*italic*)
        const tokens = parseMarkdownInline(cleanContent);

        return (
          <View
            key={lineIdx}
            style={[styles.row, isBullet ? styles.bulletRow : styles.paragraphRow]}
          >
            {isBullet && <Text style={[styles.bulletSymbol, style]}>{bulletPrefix}</Text>}
            <Text style={[styles.baseText, style]}>
              {tokens.map((token, tIdx) => (
                <Text
                  key={tIdx}
                  style={token.isBold ? styles.boldText : undefined}
                >
                  {token.text}
                </Text>
              ))}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

interface InlineToken {
  text: string;
  isBold: boolean;
}

function parseMarkdownInline(line: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  // Regex to match **bold** or *italic* or plain text
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    // Add text before match
    if (match.index > lastIndex) {
      tokens.push({
        text: line.substring(lastIndex, match.index),
        isBold: false,
      });
    }

    // Check if bold (**...**) or italic (*...*)
    if (match[2]) {
      // Bold
      tokens.push({ text: match[2], isBold: true });
    } else if (match[3]) {
      // Single asterisk: treat as bold or emphasis for readability
      tokens.push({ text: match[3], isBold: true });
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text
  if (lastIndex < line.length) {
    tokens.push({
      text: line.substring(lastIndex),
      isBold: false,
    });
  }

  return tokens.length > 0 ? tokens : [{ text: line, isBold: false }];
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  lineBreak: {
    height: Spacing[2],
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 2,
  },
  bulletRow: {
    paddingLeft: Spacing[1],
  },
  paragraphRow: {},
  bulletSymbol: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    marginRight: 6,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  baseText: {
    flex: 1,
    fontSize: Typography.sm,
    lineHeight: 20,
    color: Colors.textPrimary,
  },
  boldText: {
    fontWeight: Typography.bold,
  },
});

export default FormattedAiText;
