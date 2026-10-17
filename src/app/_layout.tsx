/**
 * Root layout — initialises DB, notifications channel, and provides
 * the ProfileContext to the entire app.
 */
import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { LogBox, StyleSheet } from 'react-native';

// Suppress the known Expo Go limitation warning for expo-notifications.
// The actual message in expo-notifications/build/index.js starts with a backtick:
//   `expo-notifications` functionality is not fully supported in Expo Go
// The module degrades gracefully — this is purely informational noise.
LogBox.ignoreLogs([
  '`expo-notifications` functionality is not fully supported in Expo Go',
]);

import { AuthProvider } from '@/store/authStore';
import { ProfileProvider } from '@/store/profileStore';
import { getDatabase } from '@/db/client';
import { setupNotificationChannel } from '@/services/notifications';
import { syncAllLocalDataToCloud } from '@/services/cloudSync';
import { Colors } from '@/constants/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  useEffect(() => {
    async function init() {
      const splashTimeout = setTimeout(() => {
        SplashScreen.hideAsync().catch(() => {});
      }, 2000);

      try {
        await Promise.race([
          Promise.all([getDatabase(), setupNotificationChannel()]),
          new Promise(resolve => setTimeout(resolve, 2500)),
        ]);
        // Background sync to Firebase Firestore without blocking UI
        syncAllLocalDataToCloud().catch(() => {});
      } catch (e) {
        console.error('App init error:', e);
      } finally {
        clearTimeout(splashTimeout);
        await SplashScreen.hideAsync().catch(() => {});
      }
    }
    init();
  }, []);

  return (
    <GestureHandlerRootView style={styles.root}>
      <AuthProvider>
        <ProfileProvider>
          <StatusBar style="dark" />
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="medicines/add" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="medicines/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="medicines/edit/[id]" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="reports/add" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="reports/[id]" options={{ headerShown: false }} />
            <Stack.Screen name="health/add" options={{ presentation: 'modal', headerShown: false }} />
            <Stack.Screen name="health/index" options={{ headerShown: false }} />
            <Stack.Screen name="history/index" options={{ headerShown: false }} />
            <Stack.Screen name="settings/index" options={{ headerShown: false }} />
            <Stack.Screen name="family/index" options={{ headerShown: false }} />
            <Stack.Screen name="family/add" options={{ presentation: 'modal', headerShown: false }} />
          </Stack>
        </ProfileProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
