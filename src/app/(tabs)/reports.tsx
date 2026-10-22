/**
 * Reports Tab — medical report vault with search and category filter.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows, REPORT_CATEGORIES } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { useAuth } from '@/store/authStore';
import { getReportsByProfile } from '@/db/reports';
import { MedicalReport } from '@/types';
import { ReportCard } from '@/components/reports/ReportCard';
import { EmptyState, LoadingState } from '@/components/ui/StateViews';

const FILTERS = [{ key: 'all', label: 'All', emoji: '📂' }, ...REPORT_CATEGORIES];

export default function ReportsScreen() {
  const { activeProfile, loading: profileLoading } = useProfile();
  const { syncVersion } = useAuth();
  const [reports, setReports] = useState<MedicalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const loadReports = useCallback(() => {
    if (!activeProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    setLoading(true);
    getReportsByProfile(activeProfile.id, search, category)
      .then(setReports)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProfile, profileLoading, search, category]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadReports();
  }, [loadReports, syncVersion]);

  useFocusEffect(useCallback(() => {
    loadReports();
  }, [loadReports]));

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Reports</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/reports/add')}>
          <Text style={styles.addBtnText}>+ Upload</Text>
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.search}
          placeholder="Search reports…"
          placeholderTextColor={Colors.textDisabled}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Category filter chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            onPress={() => setCategory(f.key)}
            style={[styles.filterChip, category === f.key && styles.filterChipActive]}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text style={[styles.filterLabel, category === f.key && styles.filterLabelActive]}>
              {f.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? (
        <LoadingState />
      ) : (
        <FlatList
          data={reports}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <ReportCard report={item} onPress={() => navigate(`/reports/${item.id}`)} />
          )}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <EmptyState
              icon="📋"
              title={search || category !== 'all' ? 'No results' : 'No reports yet'}
              subtitle="Upload PDFs or images from your medical visits to build your health vault."
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
  addBtn: { backgroundColor: Colors.secondary, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full },
  addBtnText: { color: Colors.white, fontWeight: Typography.semibold, fontSize: Typography.base },
  searchRow: { paddingHorizontal: Spacing[4], marginBottom: Spacing[2] },
  search: {
    backgroundColor: Colors.surface, borderRadius: Radius.md,
    borderWidth: 1.5, borderColor: Colors.border,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[3],
    fontSize: Typography.base, color: Colors.textPrimary,
    ...Shadows.sm,
  },
  filterScroll: { maxHeight: 52 },
  filterContent: { paddingHorizontal: Spacing[4], gap: Spacing[2], paddingBottom: Spacing[2] },
  filterChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: Typography.xs, fontWeight: Typography.medium, color: Colors.textSecondary },
  filterLabelActive: { color: Colors.primary, fontWeight: Typography.semibold },
  list: { padding: Spacing[4], paddingTop: Spacing[2], flexGrow: 1 },
});
