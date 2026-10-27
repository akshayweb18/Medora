import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Stack, router } from 'expo-router';
import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found', headerShown: false }} />
      <View style={styles.container}>
        <View style={styles.content}>
          <Text style={styles.emoji}>🔍</Text>
          <Text style={styles.title}>Page Not Found</Text>
          <Text style={styles.subtitle}>
            The screen or page you are looking for doesn&apos;t exist or may have been moved.
          </Text>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.8}
            onPress={() => router.replace('/(tabs)')}
          >
            <Text style={styles.buttonText}>Go back to Home</Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing[6],
  },
  content: {
    alignItems: 'center',
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[6],
    paddingVertical: Spacing[8],
    borderRadius: Radius['2xl'],
    borderWidth: 1,
    borderColor: Colors.border,
    maxWidth: 420,
    width: '100%',
    ...Shadows.md,
  },
  emoji: {
    fontSize: 56,
    marginBottom: Spacing[4],
  },
  title: {
    fontSize: Typography['2xl'],
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing[2],
    textAlign: 'center',
  },
  subtitle: {
    fontSize: Typography.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing[6],
  },
  button: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[6],
    borderRadius: Radius.lg,
    ...Shadows.sm,
  },
  buttonText: {
    color: Colors.white,
    fontSize: Typography.base,
    fontWeight: Typography.semibold,
  },
});
