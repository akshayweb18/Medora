/**
 * Medical History Screen — chronological view of all health events.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows, REPORT_CATEGORIES, MEASUREMENT_TYPES } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { useAuth } from '@/store/authStore';
import { getMedicinesByProfile } from '@/db/medicines';
import { getReportsByProfile } from '@/db/reports';
import { getAllMeasurements } from '@/db/measurements';
import { LoadingState } from '@/components/ui/StateViews';
import { formatDate } from '@/utils/date';
import { BackButton } from '@/components/ui/BackButton';

interface HistoryItem {
  id: string;
  date: string;
  type: 'medicine' | 'report' | 'measurement';
  title: string;
  subtitle: string;
  icon: string;
  color: string;
  route?: string;
}

export default function HistoryScreen() {
  const { activeProfile, loading: profileLoading } = useProfile();
  const { syncVersion } = useAuth();
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'medicine' | 'report' | 'measurement'>('all');

  const loadData = useCallback((isInitial = false) => {
    if (!activeProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    Promise.all([
      getMedicinesByProfile(activeProfile.id, true),
      getReportsByProfile(activeProfile.id),
      getAllMeasurements(activeProfile.id, 50),
    ]).then(([meds, reports, measurements]) => {
      const all: HistoryItem[] = [
        ...meds.map(m => ({
          id: m.id, date: m.createdAt, type: 'medicine' as const,
          title: m.name, subtitle: `${m.dosageInstructions} • ${m.frequency.replace(/_/g, ' ')}`,
          icon: '💊', color: m.color, route: `/medicines/${m.id}`,
        })),
        ...reports.map(r => {
          const cat = REPORT_CATEGORIES.find(c => c.key === r.category);
          return {
            id: r.id, date: r.documentDate, type: 'report' as const,
            title: r.title, subtitle: cat?.label ?? r.category,
            icon: cat?.emoji ?? '📄', color: cat?.color ?? Colors.gray500, route: `/reports/${r.id}`,
          };
        }),
        ...measurements.map(m => {
          const mt = MEASUREMENT_TYPES.find(t => t.key === m.type);
          const display = mt?.hasTwo && m.value2 ? `${m.value}/${m.value2} ${m.unit}` : `${m.value} ${m.unit}`;
          return {
            id: m.id, date: m.measuredAt, type: 'measurement' as const,
            title: mt?.label ?? m.type, subtitle: display,
            icon: mt?.icon ?? '📊', color: mt?.color ?? Colors.primary,
          };
        }),
      ];
      all.sort((a, b) => b.date.localeCompare(a.date));
      setItems(all);
    }).catch(console.error).finally(() => setLoading(false));
  }, [activeProfile, profileLoading]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(true);
  }, [loadData, syncVersion]);

  useFocusEffect(useCallback(() => {
    loadData(false);
  }, [loadData]));

  const filtered = filter === 'all' ? items : items.filter(i => i.type === filter);

  const FILTERS = [
    { key: 'all', label: 'All', emoji: '📜' },
    { key: 'medicine', label: 'Medicines', emoji: '💊' },
    { key: 'report', label: 'Reports', emoji: '📋' },
    { key: 'measurement', label: 'Vitals', emoji: '📊' },
  ] as const;

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
        <BackButton onPress={handleBack} />
        <Text style={styles.title}>Medical History</Text>
        <View style={{ width: 36 }} />
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map(f => (
          <TouchableOpacity
            key={f.key}
            style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
            onPress={() => setFilter(f.key as typeof filter)}
          >
            <Text style={styles.filterEmoji}>{f.emoji}</Text>
            <Text style={[styles.filterLabel, filter === f.key && styles.filterLabelActive]}>{f.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? <LoadingState /> : (
        <FlatList
          data={filtered}
          keyExtractor={item => `${item.type}-${item.id}`}
          contentContainerStyle={styles.list}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Text style={styles.emptyText}>No history yet</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.item, { borderLeftColor: item.color }]}
              onPress={() => item.route ? navigate(item.route) : undefined}
              disabled={!item.route}
              activeOpacity={item.route ? 0.75 : 1}
            >
              <Text style={styles.itemIcon}>{item.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{item.title}</Text>
                <Text style={styles.itemSub} numberOfLines={1}>{item.subtitle}</Text>
              </View>
              <Text style={styles.itemDate}>{formatDate(item.date.slice(0, 10))}</Text>
            </TouchableOpacity>
          )}
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
  filterRow: { flexDirection: 'row', gap: Spacing[2], padding: Spacing[4], paddingTop: Spacing[3] },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  filterChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  filterEmoji: { fontSize: 14 },
  filterLabel: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  filterLabelActive: { color: Colors.primary, fontWeight: Typography.semibold },
  list: { padding: Spacing[4], paddingTop: 0, flexGrow: 1 },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60 },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary },
  item: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], backgroundColor: Colors.surface, borderRadius: Radius.lg, borderLeftWidth: 4, padding: Spacing[3], marginBottom: Spacing[2], ...Shadows.sm },
  itemIcon: { fontSize: 24, width: 36, textAlign: 'center' },
  itemTitle: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  itemSub: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  itemDate: { fontSize: Typography.xs, color: Colors.textDisabled },
});
