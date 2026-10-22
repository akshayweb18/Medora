/**
 * Family Profiles Screen
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { getAllProfiles, deleteProfile } from '@/db/profiles';
import { Profile } from '@/types';
import { LoadingState } from '@/components/ui/StateViews';
import { confirmAction } from '@/utils/confirm';

const RELATION_COLORS: Record<string, string> = {
  self: Colors.primary, spouse: Colors.secondary, child: Colors.accent,
  parent: Colors.warning, sibling: '#9B51E0', other: Colors.gray400,
};

export default function FamilyScreen() {
  const { activeProfile, setActiveProfile, refreshProfiles } = useProfile();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    setLoading(true);
    getAllProfiles().then(setProfiles).catch(console.error).finally(() => setLoading(false));
  }, []));

  const handleDelete = (profile: Profile) => {
    if (profile.isDefault) {
      Alert.alert('Cannot delete', 'You cannot delete your default profile.');
      return;
    }
    confirmAction({
      title: 'Delete Profile',
      message: `Delete "${profile.name}"? All their records will be permanently removed.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteProfile(profile.id);
        await refreshProfiles();
        const updated = await getAllProfiles();
        setProfiles(updated);
      },
    });
  };

  const handleSwitch = (p: Profile) => {
    setActiveProfile(p);
    Alert.alert('Switched', `Now viewing ${p.name}'s records.`);
  };

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
        <Text style={styles.title}>Family Profiles</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/family/add')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {loading ? <LoadingState /> : (
        <FlatList
          data={profiles}
          keyExtractor={p => p.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => {
            const isActive = item.id === activeProfile?.id;
            const color = RELATION_COLORS[item.relationship] ?? Colors.gray400;
            return (
              <TouchableOpacity
                style={[styles.profileCard, isActive && styles.profileCardActive]}
                onPress={() => handleSwitch(item)}
                activeOpacity={0.8}
              >
                <View style={[styles.avatar, { backgroundColor: color }]}>
                  {item.avatarUri ? (
                    <Image source={{ uri: item.avatarUri }} style={styles.avatarImage} resizeMode="cover" />
                  ) : (
                    <Text style={styles.avatarText}>{item.name[0].toUpperCase()}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.nameRow}>
                    <Text style={styles.profileName}>{item.name}</Text>
                    {item.isDefault && (
                      <View style={styles.defaultBadge}>
                        <Text style={styles.defaultBadgeText}>Default</Text>
                      </View>
                    )}
                    {isActive && (
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>Active</Text>
                      </View>
                    )}
                  </View>
                  <Text style={styles.relation}>{item.relationship.charAt(0).toUpperCase() + item.relationship.slice(1)}</Text>
                  {item.bloodGroup && <Text style={styles.meta}>🩸 {item.bloodGroup}</Text>}
                </View>
                {!item.isDefault && (
                  <TouchableOpacity onPress={() => handleDelete(item)} style={styles.deleteBtn}>
                    <Text style={styles.deleteBtnText}>🗑</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>👨‍👩‍👧‍👦 No profiles yet</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { width: 60 },
  backText: { color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.medium },
  title: { fontSize: Typography.xl, fontWeight: Typography.bold, color: Colors.textPrimary },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full },
  addBtnText: { color: Colors.white, fontWeight: Typography.semibold, fontSize: Typography.sm },
  list: { padding: Spacing[4], flexGrow: 1 },
  profileCard: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1.5, borderColor: Colors.border, padding: Spacing[4], marginBottom: Spacing[3], ...Shadows.sm },
  profileCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarImage: { width: 52, height: 52, borderRadius: 26 },
  avatarText: { color: Colors.white, fontSize: Typography.xl, fontWeight: Typography.bold },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], flexWrap: 'wrap' },
  profileName: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  defaultBadge: { backgroundColor: Colors.secondaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  defaultBadgeText: { fontSize: Typography.xs, color: Colors.secondary, fontWeight: Typography.semibold },
  activeBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: Radius.full },
  activeBadgeText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.semibold },
  relation: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  meta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  deleteBtn: { padding: Spacing[2] },
  deleteBtnText: { fontSize: 20 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary },
});
