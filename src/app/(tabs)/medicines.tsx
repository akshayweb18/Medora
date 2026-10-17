/**
 * Medicines Tab — list of all active medicines for the current profile.
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { getMedicinesByProfile } from '@/db/medicines';
import { Medicine } from '@/types';
import { MedicineCard } from '@/components/medicine/MedicineCard';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';

export default function MedicinesScreen() {
  const { activeProfile, loading: profileLoading } = useProfile();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const loadMedicines = useCallback(() => {
    if (!activeProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    setLoading(true);
    getMedicinesByProfile(activeProfile.id, showArchived)
      .then(setMedicines)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProfile, profileLoading, showArchived]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadMedicines();
  }, [loadMedicines]);

  useFocusEffect(useCallback(() => {
    loadMedicines();
  }, [loadMedicines]));

  const filtered = medicines.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Medicines</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/medicines/add')}>
          <Text style={styles.addBtnText}>+ Add</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search medicines…"
          placeholderTextColor={Colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
        <TouchableOpacity
          style={[styles.archivedToggle, showArchived && styles.archivedToggleActive]}
          onPress={() => setShowArchived(v => !v)}
        >
          <Text style={[styles.archivedToggleText, showArchived && { color: Colors.primary }]}>
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MedicineCard
              medicine={item}
              onPress={() => navigate(`/medicines/${item.id}`)}
            />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="💊"
              title={search ? 'No results' : 'No medicines yet'}
              subtitle={search ? `No medicines matching "${search}"` : 'Add your first medicine to get started with reminders.'}
            />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing[4], paddingVertical: Spacing[4] },
  title: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full },
  addBtnText: { color: Colors.white, fontWeight: Typography.semibold, fontSize: Typography.base },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], paddingHorizontal: Spacing[4], marginBottom: Spacing[3] },
  search: {
    flex: 1, backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[3],
    fontSize: Typography.base, color: Colors.textPrimary,
    ...Shadows.sm,
  },
  archivedToggle: {
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  archivedToggleActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  archivedToggleText: { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  list: { padding: Spacing[4], paddingTop: 0, flexGrow: 1 },
});
