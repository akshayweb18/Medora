import React, { useState } from 'react';
import { View, TextInput, Text, StyleSheet, ViewStyle, TouchableOpacity, Platform } from 'react-native';
import { Colors, Typography, Radius, Spacing } from '@/constants/theme';

interface InputProps {
  label?: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  hint?: string;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'numeric' | 'email-address' | 'decimal-pad' | 'phone-pad';
  multiline?: boolean;
  numberOfLines?: number;
  maxLength?: number;
  editable?: boolean;
  style?: ViewStyle;
  rightIcon?: React.ReactNode;
  leftIcon?: React.ReactNode;
  onRightIconPress?: () => void;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}

export function Input({
  label, value, onChangeText, placeholder, error, hint,
  secureTextEntry, keyboardType = 'default', multiline,
  numberOfLines, maxLength, editable = true, style,
  rightIcon, leftIcon, onRightIconPress, autoCapitalize = 'sentences',
}: InputProps) {
  const [focused, setFocused] = useState(false);

  const borderColor = error
    ? Colors.danger
    : focused
    ? Colors.primary
    : Colors.border;

  const borderWidth = focused ? 2 : 1.5;

  return (
    <View style={[styles.wrapper, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={[styles.inputRow, { borderColor, borderWidth }]}>
        {leftIcon && <View style={styles.leftIcon}>{leftIcon}</View>}
        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.textDisabled}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          multiline={multiline}
          numberOfLines={numberOfLines}
          maxLength={maxLength}
          editable={editable}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={[
            styles.input,
            leftIcon ? { paddingLeft: 0 } : null,
            rightIcon ? { paddingRight: 0 } : null,
            multiline ? styles.multiline : null,
            !editable ? styles.disabled : null,
            // Suppress native browser/Android black border & focus outline
            Platform.OS === 'web'
              ? ({
                  outline: 'none',
                  outlineWidth: 0,
                  outlineStyle: 'none',
                  borderWidth: 0,
                  borderColor: 'transparent',
                  boxShadow: 'none',
                } as any)
              : null,
          ]}
        />
        {rightIcon && (
          <TouchableOpacity onPress={onRightIconPress} style={styles.rightIcon}>
            {rightIcon}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.error}>{error}</Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: 6 },
  label: {
    fontSize: Typography.sm,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.lg,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3],
  },
  input: {
    flex: 1,
    fontSize: Typography.md,
    color: Colors.textPrimary,
    paddingVertical: Spacing[3],
    minHeight: 48,
    borderWidth: 0,
    backgroundColor: 'transparent',
    ...Platform.select({
      web: {
        outlineStyle: 'none',
        outlineWidth: 0,
        boxShadow: 'none',
      } as any,
    }),
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  disabled: { color: Colors.textDisabled, backgroundColor: Colors.gray50 },
  leftIcon: { marginRight: Spacing[2] },
  rightIcon: { marginLeft: Spacing[2], padding: 4 },
  error: { fontSize: Typography.xs, color: Colors.danger },
  hint: { fontSize: Typography.xs, color: Colors.textSecondary },
});
