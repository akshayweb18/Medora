/**
 * Settings Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { cancelAllMedicineNotifications } from '@/services/notifications';
import { useAuth } from '@/store/authStore';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const [notifEnabled, setNotifEnabled] = useState(true);

  const handleClearAllNotifs = () => {
    Alert.alert('Clear Notifications', 'Cancel all scheduled medicine reminders?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear', style: 'destructive',
        onPress: async () => {
          await cancelAllMedicineNotifications();
          Alert.alert('Done', 'All scheduled reminders have been cancelled.');
        },
      },
    ]);
  };

  const settings = [
    {
      section: 'Account & Cloud Sync',
      items: user
        ? [
            {
              label: `Connected: ${user.email ?? 'Firebase Account'}`,
              type: 'info' as const,
              value: 'Your health records and reports are backed up to Firebase Firestore.',
            },
            {
              label: 'Sign Out',
              type: 'button' as const,
              onPress: async () => {
                Alert.alert('Sign Out', 'Sign out of your Firebase account?', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Sign Out', style: 'destructive', onPress: logout },
                ]);
              },
              destructive: true,
            },
          ]
        : [
            {
              label: 'Sign In / Register',
              type: 'link' as const,
              route: '/auth/login',
            },
          ],
    },
    {
      section: 'Notifications',
      items: [
        {
          label: 'Medicine Reminders',
          type: 'toggle' as const,
          value: notifEnabled,
          onChange: setNotifEnabled,
        },
        {
          label: 'Cancel All Reminders',
          type: 'button' as const,
          onPress: handleClearAllNotifs,
          destructive: true,
        },
      ],
    },
    {
      section: 'Data',
      items: [
        { label: 'Medical History', type: 'link' as const, route: '/history' },
        { label: 'Family Profiles', type: 'link' as const, route: '/family' },
      ],
    },
    {
      section: 'Privacy',
      items: [
        {
          label: 'About MediVault',
          type: 'info' as const,
          value: 'MediVault stores all your health data locally on your device. No data is uploaded to external servers unless you explicitly enable cloud sync. We do not collect or sell your personal or health data.',
        },
      ],
    },
  ];

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/profile');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Settings</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {settings.map(section => (
          <View key={section.section} style={styles.section}>
            <Text style={styles.sectionLabel}>{section.section}</Text>
            <View style={styles.card}>
              {section.items.map((item, idx) => (
                <React.Fragment key={item.label}>
                  {item.type === 'toggle' && (
                    <View style={styles.row}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Switch
                        value={item.value}
                        onValueChange={item.onChange}
                        trackColor={{ true: Colors.primary }}
                        thumbColor={Colors.white}
                      />
                    </View>
                  )}
                  {item.type === 'button' && (
                    <TouchableOpacity style={styles.row} onPress={item.onPress}>
                      <Text style={[styles.itemLabel, item.destructive && { color: Colors.danger }]}>
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {item.type === 'link' && (
                    <TouchableOpacity style={styles.row} onPress={() => router.push((item as any).route)}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.arrow}>›</Text>
                    </TouchableOpacity>
                  )}
                  {item.type === 'info' && (
                    <View style={styles.infoBox}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={styles.infoText}>{(item as any).value}</Text>
                    </View>
                  )}
                  {idx < section.items.length - 1 && <View style={styles.divider} />}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <Text style={styles.version}>MediVault v1.0.0</Text>
        <Text style={styles.disclaimer}>
          This app is a personal health organiser only. It does not provide medical advice,
          diagnosis, or treatment. Always consult a qualified healthcare professional.
        </Text>
        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 60 },
  backText: { color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.medium },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  content: { padding: Spacing[4] },
  section: { marginBottom: Spacing[5] },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: Spacing[2] },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadows.sm },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[4] },
  itemLabel: { fontSize: Typography.base, color: Colors.textPrimary, fontWeight: Typography.medium },
  arrow: { fontSize: Typography.xl, color: Colors.gray400 },
  divider: { height: 1, backgroundColor: Colors.border },
  infoBox: { padding: Spacing[4], gap: Spacing[2] },
  infoText: { fontSize: Typography.sm, color: Colors.textSecondary, lineHeight: 20 },
  version: { textAlign: 'center', fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  disclaimer: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textDisabled, lineHeight: 18 },
});
