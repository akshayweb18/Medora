/**
 * Reports Tab — medical report vault with search and category filter.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, TextInput, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows, REPORT_CATEGORIES } from '@/constants/theme';
import { Gradient } from '@/components/ui/Gradient';
import { useProfile } from '@/store/profileStore';
import { useAuth } from '@/store/authStore';
import { getReportsByProfile } from '@/db/reports';
import { MedicalReport } from '@/types';
import { ReportCard } from '@/components/reports/ReportCard';
import { EmptyState } from '@/components/ui/StateViews';
import { ReportsSkeleton } from '@/components/ui/Skeleton';

const FILTERS = [{ key: 'all', label: 'All', emoji: '📂' }, ...REPORT_CATEGORIES];

let _cachedReports: MedicalReport[] = [];
let _hasLoadedReports = false;

export default function ReportsScreen() {
  const { activeProfile, loading: profileLoading } = useProfile();
  const { syncVersion } = useAuth();
  const [reports, setReports] = useState<MedicalReport[]>(_cachedReports);
  const [loading, setLoading] = useState(!_hasLoadedReports);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');

  const loadReports = useCallback(async () => {
    if (!activeProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    try {
      const data = await getReportsByProfile(activeProfile.id, search, category);
      _cachedReports = data;
      _hasLoadedReports = true;
      setReports(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [activeProfile, profileLoading, search, category]);

  useEffect(() => {
    void Promise.resolve().then(loadReports);
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

      {/* AI Assistant Banner */}
      <TouchableOpacity
        style={styles.aiBanner}
        onPress={() => router.push('/ai')}
        activeOpacity={0.85}
      >
        <Gradient
          colors={['#1A1A2E', '#16213E', '#0F3460']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.aiBannerGradient}
        >
          <Text style={styles.aiBannerEmoji}>✨</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.aiBannerTitle}>Analyze Reports with Medora AI</Text>
            <Text style={styles.aiBannerSub}>Powered by Gemini 3.8 Flash • Instant plain-English insights</Text>
          </View>
          <View style={styles.aiBannerBtn}>
            <Text style={styles.aiBannerBtnText}>Try AI ›</Text>
          </View>
        </Gradient>
      </TouchableOpacity>

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

      {loading && reports.length === 0 ? (
        <ReportsSkeleton />
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

  // AI Banner
  aiBanner: {
    marginHorizontal: Spacing[4],
    marginBottom: Spacing[3],
    borderRadius: Radius.lg,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  aiBannerGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing[3] + 2,
    paddingVertical: Spacing[3],
    gap: Spacing[2],
  },
  aiBannerEmoji: { fontSize: 22 },
  aiBannerTitle: { color: '#FFFFFF', fontSize: Typography.sm, fontWeight: Typography.bold },
  aiBannerSub: { color: '#ffffffbb', fontSize: Typography.xs, marginTop: 1 },
  aiBannerBtn: {
    backgroundColor: '#ffffff25',
    paddingHorizontal: Spacing[2] + 2,
    paddingVertical: 3,
    borderRadius: Radius.full,
  },
  aiBannerBtnText: { color: '#FFD700', fontSize: Typography.xs, fontWeight: Typography.bold },

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
