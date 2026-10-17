import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

type BadgeVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
  size?: 'sm' | 'md';
}

const variantColors: Record<BadgeVariant, { bg: string; text: string }> = {
  primary: { bg: Colors.primaryLight, text: Colors.primary },
  success: { bg: Colors.successLight, text: Colors.success },
  warning: { bg: Colors.warningLight, text: Colors.warning },
  danger:  { bg: Colors.dangerLight,  text: Colors.danger  },
  info:    { bg: Colors.infoLight,    text: Colors.info    },
  neutral: { bg: Colors.gray100,      text: Colors.gray600 },
};

export function Badge({ label, variant = 'primary', size = 'sm' }: BadgeProps) {
  const { bg, text } = variantColors[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }, size === 'md' && styles.md]}>
      <Text style={[styles.text, { color: text }, size === 'md' && styles.mdText]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing[2],
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  md: { paddingHorizontal: Spacing[3], paddingVertical: 5 },
  text: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  mdText: { fontSize: Typography.sm },
});
