/**
 * Medora Authentication Screen
 * Supports Google Sign-In, Email/Password Signup & Sign In, and Guest Mode.
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import Svg, { Path } from 'react-native-svg';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/store/authStore';

function GoogleIcon() {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <Path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <Path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
      />
      <Path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
      />
    </Svg>
  );
}

export default function AuthScreen() {
  const { user, login, signup, loginWithGoogle, continueAsGuest } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // If already logged in, redirect to home
  useEffect(() => {
    if (user) {
      router.replace('/(tabs)');
    }
  }, [user]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    try {
      const res = await loginWithGoogle();
      if (!res.success) {
        setError(res.error || 'Google sign-in failed.');
      } else {
        router.replace('/(tabs)');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async () => {
    setError(null);
    if (!email.trim() || !password) {
      setError('Please enter both email and password.');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signup') {
        const res = await signup(email, password, name);
        if (!res.success) {
          setError(res.error || 'Failed to create account.');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        const res = await login(email, password);
        if (!res.success) {
          setError(res.error || 'Failed to sign in.');
        } else {
          router.replace('/(tabs)');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = () => {
    continueAsGuest();
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Brand Header */}
          <View style={styles.brandContainer}>
            <View style={styles.logoBadge}>
              <Text style={styles.logoEmoji}>💊</Text>
            </View>
            <Text style={styles.brandTitle}>Medora</Text>
            <Text style={styles.brandSubtitle}>
              Your Personal Health & Medicine Vault
            </Text>
          </View>

          {/* Auth Card */}
          <View style={styles.card}>
            {/* Google One-Click Sign In */}
            <TouchableOpacity
              style={styles.googleBtn}
              onPress={handleGoogleSignIn}
              disabled={loading || googleLoading}
              activeOpacity={0.8}
            >
              {googleLoading ? (
                <ActivityIndicator color={Colors.primary} size="small" />
              ) : (
                <>
                  <GoogleIcon />
                  <Text style={styles.googleBtnText}>Continue with Google</Text>
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR WITH EMAIL</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Tab Switcher */}
            <View style={styles.tabContainer}>
              <TouchableOpacity
                style={[styles.tab, mode === 'signin' && styles.tabActive]}
                onPress={() => {
                  setMode('signin');
                  setError(null);
                }}
              >
                <Text style={[styles.tabText, mode === 'signin' && styles.tabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tab, mode === 'signup' && styles.tabActive]}
                onPress={() => {
                  setMode('signup');
                  setError(null);
                }}
              >
                <Text style={[styles.tabText, mode === 'signup' && styles.tabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {error ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorIcon}>⚠️</Text>
                <Text style={styles.errorText}>{error}</Text>
              </View>
            ) : null}

            {/* Fields */}
            {mode === 'signup' && (
              <Input
                label="Full Name"
                placeholder="e.g. John Doe"
                value={name}
                onChangeText={setName}
                autoCapitalize="words"
                style={styles.inputSpacing}
              />
            )}

            <Input
              label="Email Address"
              placeholder="e.g. user@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              style={styles.inputSpacing}
            />

            <Input
              label="Password"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              style={styles.inputSpacing}
            />

            <Button
              label={loading ? 'Processing...' : mode === 'signin' ? 'Sign In' : 'Create My Account'}
              onPress={handleSubmit}
              loading={loading}
              style={styles.submitBtn}
            />

            {/* Bottom Divider */}
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>OR</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest / Skip Option */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuest}
              activeOpacity={0.7}
            >
              <Text style={styles.guestBtnText}>Continue as Guest</Text>
              <Text style={styles.guestSubtext}>
                Use offline anytime — sync to cloud later
              </Text>
            </TouchableOpacity>
          </View>

          {/* Privacy Note */}
          <Text style={styles.footerNote}>
            🔒 Your health records are encrypted and synced to your secure Firebase database.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing[5],
    paddingVertical: Spacing[6],
  },
  brandContainer: {
    alignItems: 'center',
    marginBottom: Spacing[6],
  },
  logoBadge: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing[3],
    ...Shadows.sm,
  },
  logoEmoji: {
    fontSize: 32,
  },
  brandTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.gray900,
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: Typography.sm,
    color: Colors.gray500,
    marginTop: 4,
    textAlign: 'center',
  },
  card: {
    backgroundColor: Colors.white,
    borderRadius: Radius['2xl'],
    padding: Spacing[5],
    ...Shadows.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  googleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: Radius.xl,
    paddingVertical: Spacing[3],
    paddingHorizontal: Spacing[4],
    gap: Spacing[3],
    ...Shadows.sm,
  },
  googleBtnText: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.gray800,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.gray100,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing[4],
  },
  tab: {
    flex: 1,
    paddingVertical: Spacing[2],
    alignItems: 'center',
    borderRadius: Radius.md,
  },
  tabActive: {
    backgroundColor: Colors.white,
    ...Shadows.sm,
  },
  tabText: {
    fontSize: Typography.sm,
    fontWeight: '600',
    color: Colors.gray500,
  },
  tabTextActive: {
    color: Colors.primary,
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dangerLight,
    borderRadius: Radius.md,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: '#FED7D7',
  },
  errorIcon: {
    marginRight: Spacing[2],
    fontSize: 16,
  },
  errorText: {
    flex: 1,
    color: Colors.danger,
    fontSize: Typography.sm,
    fontWeight: '500',
  },
  inputSpacing: {
    marginBottom: Spacing[3],
  },
  submitBtn: {
    marginTop: Spacing[2],
    borderRadius: Radius.xl,
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing[4],
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.gray200,
  },
  dividerText: {
    marginHorizontal: Spacing[3],
    fontSize: Typography.xs,
    color: Colors.gray400,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  guestBtn: {
    alignItems: 'center',
    paddingVertical: Spacing[2],
  },
  guestBtnText: {
    fontSize: Typography.md,
    fontWeight: '700',
    color: Colors.secondary,
  },
  guestSubtext: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    marginTop: 2,
    textAlign: 'center',
  },
  footerNote: {
    fontSize: Typography.xs,
    color: Colors.gray400,
    textAlign: 'center',
    marginTop: Spacing[6],
    paddingHorizontal: Spacing[4],
  },
});
