import React, { useState } from 'react';
import { Animated, Pressable, Text, StyleSheet, ViewStyle, TextStyle, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  icon?: React.ReactNode;
}

export function Button({
  label, onPress, variant = 'primary', size = 'md',
  disabled, loading, style, textStyle, icon,
}: ButtonProps) {
  const [scale] = useState(() => new Animated.Value(1));
  const bg = disabled ? Colors.gray200 : variantBg[variant];
  const textColor = disabled ? Colors.gray400 : variantText[variant];
  const borderColor = variant === 'outline' ? Colors.primary : 'transparent';
  const padV = size === 'sm' ? Spacing[2] : size === 'lg' ? Spacing[4] : Spacing[3];
  const padH = size === 'sm' ? Spacing[3] : size === 'lg' ? Spacing[6] : Spacing[4];
  const fontSize = size === 'sm' ? Typography.sm : size === 'lg' ? Typography.lg : Typography.md;

  const handlePressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 45,
      bounciness: 4,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 25,
      bounciness: 8,
    }).start();
  };

  const handlePress = () => {
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress();
  };

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled || loading}
        android_ripple={{ color: '#ffffff25', borderless: false }}
        style={[
          styles.base,
          { backgroundColor: bg, borderColor, paddingVertical: padV, paddingHorizontal: padH },
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} size="small" />
        ) : (
          <>
            {icon}
            <Text style={[styles.text, { color: textColor, fontSize }, textStyle]}>{label}</Text>
          </>
        )}
      </Pressable>
    </Animated.View>
  );
}

const variantBg: Record<Variant, string> = {
  primary: Colors.primary,
  secondary: Colors.secondary,
  outline: 'transparent',
  ghost: 'transparent',
  danger: Colors.danger,
};
const variantText: Record<Variant, string> = {
  primary: Colors.white,
  secondary: Colors.white,
  outline: Colors.primary,
  ghost: Colors.primary,
  danger: Colors.white,
};

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    gap: Spacing[2],
  },
  text: { fontWeight: Typography.semibold, letterSpacing: 0.2 },
});
