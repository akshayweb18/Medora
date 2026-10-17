import { Text, type TextProps, StyleSheet } from 'react-native';
import { Colors, Typography } from '@/constants/theme';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'defaultSemiBold' | 'subtitle' | 'link';
};

export function ThemedText({ style, type = 'default', ...rest }: ThemedTextProps) {
  return (
    <Text
      style={[
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'defaultSemiBold' && styles.defaultSemiBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: { fontSize: Typography.base, color: Colors.textPrimary },
  defaultSemiBold: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  title: { fontSize: Typography['3xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  subtitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textSecondary },
  link: { fontSize: Typography.base, color: Colors.primary },
});
