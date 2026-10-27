/**
 * Health Tracker Screen — shows latest vitals and history list.
 */
import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows, MEASUREMENT_TYPES } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { useAuth } from '@/store/authStore';
import { getAllMeasurements, getLatestByType } from '@/db/measurements';
import { HealthMeasurement } from '@/types';
import { LoadingState } from '@/components/ui/StateViews';
import { formatDate } from '@/utils/date';
import { BackButton } from '@/components/ui/BackButton';

export default function HealthScreen() {
  const { activeProfile, loading: profileLoading } = useProfile();
  const { syncVersion } = useAuth();
  const [latest, setLatest] = useState<Record<string, HealthMeasurement>>({});
  const [history, setHistory] = useState<HealthMeasurement[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback((isInitial = false) => {
    if (!activeProfile) {
      if (!profileLoading) setLoading(false);
      return;
    }
    if (isInitial) setLoading(true);
    Promise.all([
      getLatestByType(activeProfile.id),
      getAllMeasurements(activeProfile.id, 30),
    ]).then(([l, h]) => { setLatest(l); setHistory(h); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activeProfile, profileLoading]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(true);
  }, [loadData, syncVersion]);

  useFocusEffect(useCallback(() => {
    loadData(false);
  }, [loadData]));

  if (loading) return <LoadingState />;

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
        <Text style={styles.title}>Health Tracker</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => router.push('/health/add')}>
          <Text style={styles.addBtnText}>+ Log</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
        {/* Latest metrics grid */}
        <Text style={styles.sectionTitle}>Current Vitals</Text>
        <View style={styles.metricGrid}>
          {MEASUREMENT_TYPES.map(mt => {
            const m = latest[mt.key];
            const display = m
              ? mt.hasTwo && m.value2 ? `${m.value}/${m.value2}` : `${m.value}`
              : '—';
            return (
              <TouchableOpacity
                key={mt.key}
                style={[styles.metricCard, { borderTopColor: mt.color }]}
                onPress={() => router.push('/health/add')}
                activeOpacity={0.8}
              >
                <Text style={styles.metricEmoji}>{mt.icon}</Text>
                <Text style={[styles.metricValue, m ? { color: mt.color } : { color: Colors.textDisabled }]}>
                  {display}
                </Text>
                <Text style={styles.metricUnit}>{mt.unit}</Text>
                <Text style={styles.metricLabel}>{mt.label}</Text>
                {m && (
                  <Text style={styles.metricDate}>{formatDate(m.measuredAt.slice(0, 10))}</Text>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* History */}
        <Text style={styles.sectionTitle}>Recent History</Text>
        {history.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>📊 No measurements recorded yet</Text>
            <TouchableOpacity style={styles.logFirstBtn} onPress={() => router.push('/health/add')}>
              <Text style={styles.logFirstBtnText}>Log first measurement</Text>
            </TouchableOpacity>
          </View>
        ) : (
          history.map(m => {
            const mt = MEASUREMENT_TYPES.find(t => t.key === m.type);
            const display = mt?.hasTwo && m.value2 ? `${m.value}/${m.value2} ${m.unit}` : `${m.value} ${m.unit}`;
            return (
              <View key={m.id} style={styles.histItem}>
                <Text style={styles.histEmoji}>{mt?.icon ?? '📊'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.histType}>{mt?.label ?? m.type}</Text>
                  <Text style={styles.histDate}>{formatDate(m.measuredAt.slice(0, 10))}</Text>
                  {m.notes && <Text style={styles.histNotes}>{m.notes}</Text>}
                </View>
                <Text style={[styles.histValue, { color: mt?.color ?? Colors.primary }]}>{display}</Text>
              </View>
            );
          })
        )}
        <View style={{ height: 40 }} />
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
  addBtn: { backgroundColor: Colors.primary, paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full },
  addBtnText: { color: Colors.white, fontWeight: Typography.semibold, fontSize: Typography.sm },
  content: { padding: Spacing[4] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[3], marginTop: Spacing[2] },

  metricGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3], marginBottom: Spacing[5] },
  metricCard: {
    width: '47%', backgroundColor: Colors.surface, borderRadius: Radius.lg,
    borderTopWidth: 3, padding: Spacing[3], alignItems: 'center',
    ...Shadows.sm, borderWidth: 1, borderColor: Colors.border,
  },
  metricEmoji: { fontSize: 28 },
  metricValue: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, marginTop: 4 },
  metricUnit: { fontSize: Typography.xs, color: Colors.textSecondary },
  metricLabel: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium, textAlign: 'center', marginTop: 2 },
  metricDate: { fontSize: Typography.xs, color: Colors.textDisabled, marginTop: 2 },

  emptyCard: { backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, borderStyle: 'dashed', padding: Spacing[6], alignItems: 'center', gap: Spacing[3] },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary },
  logFirstBtn: { backgroundColor: Colors.primaryLight, paddingHorizontal: Spacing[4], paddingVertical: Spacing[2], borderRadius: Radius.full },
  logFirstBtnText: { color: Colors.primary, fontWeight: Typography.semibold },

  histItem: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3], backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1, borderColor: Colors.border, padding: Spacing[3], marginBottom: Spacing[2], ...Shadows.sm },
  histEmoji: { fontSize: 24, width: 36, textAlign: 'center' },
  histType: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  histDate: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  histNotes: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  histValue: { fontSize: Typography.lg, fontWeight: Typography.bold },
});
