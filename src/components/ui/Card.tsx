/**
 * Reusable Card component with optional shadow and press feedback.
 */
import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Colors, Radius, Shadows, Spacing } from '@/constants/theme';

interface CardProps {
  children: React.ReactNode;
  style?: ViewStyle;
  onPress?: () => void;
  padding?: number;
  shadow?: 'sm' | 'md' | 'lg' | 'none';
}

export function Card({ children, style, onPress, padding = Spacing[4], shadow = 'sm' }: CardProps) {
  const shadowStyle = shadow !== 'none' ? Shadows[shadow] : {};
  const containerStyle = [styles.card, shadowStyle, { padding }, style];

  if (onPress) {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={containerStyle}
      >
        {children}
      </TouchableOpacity>
    );
  }
  return <View style={containerStyle}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
  },
});
