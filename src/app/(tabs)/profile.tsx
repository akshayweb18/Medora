/**
 * Profile Tab — user info, family profiles, quick links to settings.
 */
import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { useAuth } from '@/store/authStore';
import { getAllProfiles } from '@/db/profiles';
import { Profile } from '@/types';
import { confirmAction } from '@/utils/confirm';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { activeProfile, setActiveProfile } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);

  const isDefaultProfile = !activeProfile || activeProfile.isDefault || activeProfile.relationship === 'self';

  const avatarUri = isDefaultProfile
    ? (user ? (user.photoURL || activeProfile?.avatarUri) : undefined)
    : activeProfile?.avatarUri;

  const profileName = isDefaultProfile
    ? (user ? (user.displayName || (activeProfile?.name !== 'Me' ? activeProfile?.name : undefined) || 'Me') : 'Guest Profile')
    : (activeProfile?.name ?? 'Profile');

  const avatarInitial = (user ? (profileName || user.email || 'M') : 'G')[0].toUpperCase();

  const profileSubtitle = isDefaultProfile
    ? (user ? (user.email ?? 'Primary Account') : 'Local Storage • Not Signed In')
    : (activeProfile?.relationship ? (activeProfile.relationship.charAt(0).toUpperCase() + activeProfile.relationship.slice(1)) : 'Family Member');

  useFocusEffect(useCallback(() => {
    getAllProfiles().then(setProfiles).catch((err) => {
      console.warn('Profiles load warning:', err);
    });
  }, []));

  const handleSwitchProfile = (p: Profile) => {
    setActiveProfile(p);
    Alert.alert('Profile switched', `Now viewing ${p.name}'s records.`);
  };

  const handleLogout = () => {
    confirmAction({
      title: 'Sign Out',
      message: 'Are you sure you want to sign out from your account?',
      confirmText: 'Sign Out',
      destructive: true,
      onConfirm: async () => {
        try {
          await logout();
        } catch (e) {
          console.error('Logout error:', e);
        }
      },
    });
  };

  const menuItems = [
    { icon: '👨‍👩‍👧‍👦', label: 'Family Profiles', route: '/family' },
    { icon: '📊', label: 'Health Tracker', route: '/health' },
    { icon: '📜', label: 'Medical History', route: '/history' },
    { icon: '⚙️', label: 'Settings', route: '/settings' },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>Profile</Text>

        {/* Firebase Account & Cloud Sync Banner */}
        <View style={styles.accountCard}>
          <View style={styles.accountHeader}>
            <View style={styles.accountIconWrap}>
              <Text style={{ fontSize: 22 }}>{user ? '☁️' : '👤'}</Text>
            </View>
            <View style={styles.accountInfo}>
              <View style={styles.accountRow}>
                <Text style={styles.accountStatus}>
                  {user ? 'Firebase Cloud Sync' : 'Guest Account'}
                </Text>
                <View style={[styles.statusDot, { backgroundColor: user ? Colors.success : Colors.warning }]} />
              </View>
              <Text style={styles.accountEmail} numberOfLines={1}>
                {user ? (user.email ?? user.displayName ?? 'Signed In') : 'Local only • Not backed up'}
              </Text>
            </View>
            {user ? (
              <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                <Text style={styles.logoutBtnText}>Sign Out</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.loginBtn} onPress={() => navigate('/auth/login')}>
                <Text style={styles.loginBtnText}>Sign In</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Active profile card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.cardAvatarImage} resizeMode="cover" />
            ) : (
              <Text style={styles.avatarText}>
                {avatarInitial}
              </Text>
            )}
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{profileName}</Text>
            <Text style={styles.profileRelation}>{profileSubtitle}</Text>
            {activeProfile?.bloodGroup && (
              <Text style={styles.profileMeta}>🩸 {activeProfile.bloodGroup}</Text>
            )}
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigate('/settings')}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Family profiles strip */}
        {profiles.length > 1 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Switch Profile</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profilesRow}>
              {profiles.map(p => {
                const isActive = p.id === activeProfile?.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.profileChip, isActive && styles.profileChipActive]}
                    onPress={() => handleSwitchProfile(p)}
                  >
                    <View style={[styles.chipAvatar, { backgroundColor: isActive ? Colors.primary : Colors.gray200 }]}>
                      {p.avatarUri ? (
                        <Image source={{ uri: p.avatarUri }} style={styles.chipAvatarImage} resizeMode="cover" />
                      ) : (
                        <Text style={styles.chipAvatarText}>{p.name[0].toUpperCase()}</Text>
                      )}
                    </View>
                    <Text style={[styles.chipName, isActive && styles.chipNameActive]}>
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Menu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Access</Text>
          <View style={styles.menuCard}>
            {menuItems.map((item, index) => (
              <React.Fragment key={item.route}>
                <TouchableOpacity
                  style={styles.menuItem}
                  onPress={() => navigate(item.route)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuArrow}>›</Text>
                </TouchableOpacity>
                {index < menuItems.length - 1 && <View style={styles.divider} />}
              </React.Fragment>
            ))}
          </View>
        </View>

        {/* App info */}
        <Text style={styles.appInfo}>MediVault • v1.0.0</Text>
        <Text style={styles.disclaimer}>
          MediVault is a personal health organiser. It does not provide medical advice,
          diagnosis, or treatment. Always consult a qualified healthcare professional.
        </Text>

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  content: { padding: Spacing[4] },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[4] },

  accountCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    borderWidth: 1,
    borderColor: Colors.border,
    ...Shadows.sm,
  },
  accountHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[3],
  },
  accountIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.gray100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  accountInfo: {
    flex: 1,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accountStatus: {
    fontSize: Typography.sm,
    fontWeight: '700',
    color: Colors.textPrimary,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  accountEmail: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  loginBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.primary,
    borderRadius: Radius.md,
  },
  loginBtnText: {
    color: Colors.white,
    fontSize: Typography.xs,
    fontWeight: '700',
  },
  logoutBtn: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.gray100,
    borderRadius: Radius.md,
  },
  logoutBtnText: {
    color: Colors.gray700,
    fontSize: Typography.xs,
    fontWeight: '600',
  },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: Spacing[3],
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    padding: Spacing[4], marginBottom: Spacing[5], ...Shadows.md,
    borderWidth: 1, borderColor: Colors.border,
  },
  avatar: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  cardAvatarImage: { width: 64, height: 64, borderRadius: 32 },
  avatarText: { color: Colors.white, fontSize: Typography['2xl'], fontWeight: Typography.bold },
  profileInfo: { flex: 1 },
  profileName: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  profileRelation: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  profileMeta: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  editBtn: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.md, backgroundColor: Colors.primaryLight },
  editBtnText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },

  section: { marginBottom: Spacing[5] },
  sectionTitle: { fontSize: Typography.md, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: Spacing[3] },

  profilesRow: { marginHorizontal: -Spacing[4], paddingHorizontal: Spacing[4] },
  profileChip: { alignItems: 'center', gap: Spacing[1], marginRight: Spacing[3] },
  profileChipActive: {},
  chipAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  chipAvatarImage: { width: 48, height: 48, borderRadius: 24 },
  chipAvatarText: { color: Colors.white, fontWeight: Typography.bold, fontSize: Typography.lg },
  chipName: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  chipNameActive: { color: Colors.primary, fontWeight: Typography.bold },

  menuCard: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden', ...Shadows.sm },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing[4], gap: Spacing[3] },
  menuIcon: { fontSize: 22, width: 32 },
  menuLabel: { flex: 1, fontSize: Typography.base, fontWeight: Typography.medium, color: Colors.textPrimary },
  menuArrow: { fontSize: Typography.xl, color: Colors.gray400 },
  divider: { height: 1, backgroundColor: Colors.border, marginLeft: Spacing[4] + 32 + Spacing[3] },

  appInfo: { textAlign: 'center', fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  disclaimer: { textAlign: 'center', fontSize: Typography.xs, color: Colors.textDisabled, lineHeight: 18 },
});
