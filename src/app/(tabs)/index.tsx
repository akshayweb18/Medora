/**
 * Home Dashboard Screen
 */
import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows, MEASUREMENT_TYPES } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { getMedicinesByProfile } from '@/db/medicines';
import { getDoseLogsByDate, getTodaySummary, upsertDoseLog } from '@/db/doses';
import { getRecentReports } from '@/db/reports';
import { getLatestByType } from '@/db/measurements';
import { Medicine, DoseLog, MedicalReport, HealthMeasurement, ScheduledTime } from '@/types';
import { todayStr, formatTodayFull, scheduledDateTime, isMedicineActiveOnDate, formatTime, nowISO } from '@/utils/date';
import { DoseItem } from '@/components/medicine/MedicineCard';
import { ReportCard } from '@/components/reports/ReportCard';
import { LoadingState } from '@/components/ui/StateViews';

interface TodayDose { medicine: Medicine; time: ScheduledTime; scheduledFor: string; log?: DoseLog }

export default function HomeScreen() {
  const { activeProfile, loading: profileLoading } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [todayDoses, setTodayDoses] = useState<TodayDose[]>([]);
  const [summary, setSummary] = useState({ taken: 0, upcoming: 0, missed: 0, total: 0 });
  const [recentReports, setRecentReports] = useState<MedicalReport[]>([]);
  const [latestMetrics, setLatestMetrics] = useState<Record<string, HealthMeasurement>>({});
  const [dataLoading, setDataLoading] = useState(true);

  const loadData = useCallback(async () => {
    if (!activeProfile) {
      if (!profileLoading) setDataLoading(false);
      return;
    }
    try {
      const today = todayStr();
      const [medicines, logs, reports, metrics, sum] = await Promise.all([
        getMedicinesByProfile(activeProfile.id),
        getDoseLogsByDate(activeProfile.id, today),
        getRecentReports(activeProfile.id, 3),
        getLatestByType(activeProfile.id),
        getTodaySummary(activeProfile.id, today),
      ]);

      // Build today's dose schedule
      const doses: TodayDose[] = [];
      for (const med of medicines) {
        if (!isMedicineActiveOnDate(med.startDate, med.endDate, today)) continue;
        if (med.frequency === 'selected_weekdays' && med.weekdays) {
          if (!med.weekdays.includes(new Date().getDay())) continue;
        }
        for (const time of med.scheduledTimes) {
          const sf = scheduledDateTime(today, time);
          const log = logs.find(l => l.medicineId === med.id && l.scheduledFor === sf);
          doses.push({ medicine: med, time, scheduledFor: sf, log });
        }
      }
      doses.sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor));

      setTodayDoses(doses);
      setSummary(sum);
      setRecentReports(reports);
      setLatestMetrics(metrics);
    } catch (e) {
      console.error('Home load error:', e);
    } finally {
      setDataLoading(false);
    }
  }, [activeProfile, profileLoading]);

  useEffect(() => {
    if (activeProfile) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData();
    } else if (!profileLoading) {
      setDataLoading(false);
    }
  }, [activeProfile, profileLoading, loadData]);

  useFocusEffect(useCallback(() => {
    if (activeProfile) {
      loadData();
    }
  }, [activeProfile, loadData]));

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handleTake = useCallback(async (dose: TodayDose) => {
    if (!activeProfile) return;
    await upsertDoseLog(dose.medicine.id, activeProfile.id, dose.scheduledFor, 'taken', nowISO());
    loadData();
  }, [activeProfile, loadData]);

  const handleSkip = useCallback(async (dose: TodayDose) => {
    if (!activeProfile) return;
    await upsertDoseLog(dose.medicine.id, activeProfile.id, dose.scheduledFor, 'skipped');
    loadData();
  }, [activeProfile, loadData]);

  if (profileLoading || dataLoading) return <LoadingState />;

  const upcomingDoses = todayDoses.filter(d => !d.log || d.log.status === 'upcoming' || d.log.status === 'snoozed');
  const nextDose = upcomingDoses.find(d => new Date(d.scheduledFor) > new Date());

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} colors={[Colors.primary]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Hello, {activeProfile?.name ?? 'there'} 👋</Text>
            <Text style={styles.date}>{formatTodayFull()}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileAvatar}
            onPress={() => navigate('/family')}
          >
            <Text style={styles.avatarText}>
              {(activeProfile?.name ?? 'M')[0].toUpperCase()}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          {[
            { label: 'Taken',    value: summary.taken,    color: Colors.success },
            { label: 'Upcoming', value: summary.upcoming,  color: Colors.primary },
            { label: 'Missed',   value: summary.missed,   color: Colors.danger  },
          ].map(s => (
            <View key={s.label} style={[styles.statCard, { borderTopColor: s.color }]}>
              <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Next Dose Banner */}
        {nextDose && (
          <View style={styles.nextDoseBanner}>
            <Text style={styles.nextDoseLabel}>⏰ Next Dose</Text>
            <Text style={styles.nextDoseName}>{nextDose.medicine.name}</Text>
            <Text style={styles.nextDoseTime}>
              {formatTime(nextDose.time.hour, nextDose.time.minute)}
            </Text>
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: Colors.primaryLight }]} onPress={() => router.push('/medicines/add')}>
            <Text style={styles.qaEmoji}>💊</Text>
            <Text style={[styles.qaLabel, { color: Colors.primary }]}>Add Medicine</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: Colors.secondaryLight }]} onPress={() => router.push('/reports/add')}>
            <Text style={styles.qaEmoji}>📄</Text>
            <Text style={[styles.qaLabel, { color: Colors.secondary }]}>Upload Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.qaBtn, { backgroundColor: Colors.accentLight }]} onPress={() => router.push('/health/add')}>
            <Text style={styles.qaEmoji}>📊</Text>
            <Text style={[styles.qaLabel, { color: Colors.accent }]}>Log Vitals</Text>
          </TouchableOpacity>
        </View>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{"Today's Schedule"}</Text>
            <TouchableOpacity onPress={() => router.push('/medicines')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {todayDoses.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>🎉 No medicines scheduled for today</Text>
            </View>
          ) : (
            todayDoses.slice(0, 5).map(dose => (
              <DoseItem
                key={`${dose.medicine.id}-${dose.scheduledFor}`}
                medicine={dose.medicine}
                doseLog={dose.log}
                scheduledFor={dose.scheduledFor}
                onTake={() => handleTake(dose)}
                onSkip={() => handleSkip(dose)}
              />
            ))
          )}
        </View>

        {/* Health Metrics Strip */}
        {Object.keys(latestMetrics).length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Health Vitals</Text>
              <TouchableOpacity onPress={() => navigate('/health')}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.metricsRow}>
              {MEASUREMENT_TYPES.filter(mt => latestMetrics[mt.key]).map(mt => {
                const m = latestMetrics[mt.key];
                const display = mt.hasTwo && m.value2
                  ? `${m.value}/${m.value2}`
                  : `${m.value}`;
                return (
                  <TouchableOpacity
                    key={mt.key}
                    style={[styles.metricCard, { borderTopColor: mt.color }]}
                    onPress={() => navigate('/health')}
                  >
                    <Text style={styles.metricEmoji}>{mt.icon}</Text>
                    <Text style={[styles.metricValue, { color: mt.color }]}>{display}</Text>
                    <Text style={styles.metricUnit}>{mt.unit}</Text>
                    <Text style={styles.metricLabel}>{mt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Recent Reports */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Reports</Text>
            <TouchableOpacity onPress={() => router.push('/reports')}>
              <Text style={styles.seeAll}>See all →</Text>
            </TouchableOpacity>
          </View>
          {recentReports.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>📂 No reports yet — upload your first one</Text>
            </View>
          ) : (
            recentReports.map(r => (
              <ReportCard
                key={r.id}
                report={r}
                onPress={() => navigate(`/reports/${r.id}`)}
              />
            ))
          )}
        </View>

        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flex: 1 },
  content: { padding: Spacing[4] },

  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing[5] },
  greeting: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary },
  date: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 2 },
  profileAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { color: Colors.white, fontSize: Typography.lg, fontWeight: Typography.bold },

  statsRow: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[4] },
  statCard: {
    flex: 1, backgroundColor: Colors.surface,
    borderRadius: Radius.lg, borderTopWidth: 3,
    padding: Spacing[3], alignItems: 'center',
    ...Shadows.sm,
  },
  statValue: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold },
  statLabel: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },

  nextDoseBanner: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    padding: Spacing[4],
    marginBottom: Spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  nextDoseLabel: { fontSize: Typography.sm, color: 'rgba(255,255,255,0.8)' },
  nextDoseName: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.white, flex: 1, marginHorizontal: Spacing[2] },
  nextDoseTime: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.white },

  quickActions: { flexDirection: 'row', gap: Spacing[3], marginBottom: Spacing[5] },
  qaBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing[3], borderRadius: Radius.lg, gap: 4,
  },
  qaEmoji: { fontSize: 26 },
  qaLabel: { fontSize: 11, fontWeight: Typography.semibold, textAlign: 'center' },

  section: { marginBottom: Spacing[5] },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing[3] },
  sectionTitle: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  seeAll: { fontSize: Typography.sm, color: Colors.primary, fontWeight: Typography.medium },

  emptyCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    borderStyle: 'dashed',
    padding: Spacing[5],
    alignItems: 'center',
  },
  emptyText: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },

  metricsRow: { marginHorizontal: -Spacing[4], paddingHorizontal: Spacing[4] },
  metricCard: {
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderTopWidth: 3,
    padding: Spacing[3],
    marginRight: Spacing[3],
    alignItems: 'center',
    minWidth: 90,
    ...Shadows.sm,
  },
  metricEmoji: { fontSize: 22 },
  metricValue: { fontSize: Typography.xl, fontWeight: Typography.bold, marginTop: 2 },
  metricUnit: { fontSize: Typography.xs, color: Colors.textSecondary },
  metricLabel: { fontSize: Typography.xs, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
});
