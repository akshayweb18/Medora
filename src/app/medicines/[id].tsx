/**
 * Medicine Detail Screen — shows full info, dose history, and action buttons.
 */
import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { navigate } from '@/utils/navigation';

import { Colors, Typography, Spacing, Radius, Shadows, FREQUENCY_LABELS, DOSE_UNIT_LABELS, WEEKDAY_LABELS } from '@/constants/theme';
import { getMedicineById, archiveMedicine, deleteMedicine } from '@/db/medicines';
import { getDoseLogsByMedicine } from '@/db/doses';
import { cancelMedicineNotifications } from '@/services/notifications';
import { Medicine, DoseLog } from '@/types';
import { Badge } from '@/components/ui/Badge';
import { ErrorState } from '@/components/ui/StateViews';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { formatDate, formatTime, relativeDate } from '@/utils/date';
import { confirmAction } from '@/utils/confirm';
import { BackButton } from '@/components/ui/BackButton';

const STATUS_COLORS: Record<string, string> = {
  taken: Colors.success, skipped: Colors.gray400,
  missed: Colors.danger, upcoming: Colors.primary, snoozed: Colors.warning,
};

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [medicine, setMedicine] = useState<Medicine | null>(null);
  const [logs, setLogs] = useState<DoseLog[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([getMedicineById(id), getDoseLogsByMedicine(id)])
      .then(([med, l]) => { setMedicine(med); setLogs(l); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]));

  const handleArchive = () => {
    confirmAction({
      title: 'Archive Medicine',
      message: `Archive "${medicine?.name}"? It will be hidden from the active list but its history will be preserved.`,
      confirmText: 'Archive',
      destructive: true,
      onConfirm: async () => {
        if (!id) return;
        await archiveMedicine(id);
        await cancelMedicineNotifications(id);
        router.back();
      },
    });
  };

  const handleDelete = () => {
    confirmAction({
      title: 'Delete Medicine',
      message: `Permanently delete "${medicine?.name}" and all its dose history? This cannot be undone.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        if (!id) return;
        await deleteMedicine(id);
        await cancelMedicineNotifications(id);
        router.back();
      },
    });
  };

  if (loading) return <DetailSkeleton />;
  if (!medicine) return <ErrorState message="Medicine not found." />;

  const takenCount = logs.filter(l => l.status === 'taken').length;
  const totalLogged = logs.filter(l => l.status !== 'upcoming').length;
  const adherence = totalLogged > 0 ? Math.round((takenCount / totalLogged) * 100) : 0;

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/medicines');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: medicine.color }]}>
        <BackButton onPress={handleBack} />
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => navigate(`/medicines/edit/${id}`)}
          >
            <Text style={styles.editBtnText}>Edit</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Medicine Info Card */}
        <View style={[styles.infoCard, { borderTopColor: medicine.color }]}>
          <View style={styles.nameRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.medicineName}>{medicine.name}</Text>
              {medicine.strength && <Text style={styles.strength}>{medicine.strength}</Text>}
            </View>
            {medicine.isArchived && <Badge label="Archived" variant="neutral" size="md" />}
          </View>

          <Text style={styles.instructions}>{medicine.dosageInstructions}</Text>

          <View style={styles.detailGrid}>
            <DetailRow icon="🔄" label="Frequency" value={FREQUENCY_LABELS[medicine.frequency]} />
            <DetailRow icon="💊" label="Unit" value={DOSE_UNIT_LABELS[medicine.unit]} />
            <DetailRow icon="📅" label="Start date" value={formatDate(medicine.startDate)} />
            {medicine.endDate && <DetailRow icon="📅" label="End date" value={formatDate(medicine.endDate)} />}
            {medicine.prescribingDoctor && <DetailRow icon="👨‍⚕️" label="Doctor" value={medicine.prescribingDoctor} />}
            {medicine.notes && <DetailRow icon="📝" label="Notes" value={medicine.notes} />}
          </View>

          {/* Times */}
          {medicine.scheduledTimes.length > 0 && (
            <View style={styles.timesSection}>
              <Text style={styles.timesLabel}>Reminder Times</Text>
              <View style={styles.timesRow}>
                {medicine.scheduledTimes.map((t, i) => (
                  <View key={i} style={styles.timePill}>
                    <Text style={styles.timePillText}>{formatTime(t.hour, t.minute)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Weekdays */}
          {medicine.frequency === 'selected_weekdays' && medicine.weekdays && (
            <View style={styles.timesSection}>
              <Text style={styles.timesLabel}>Active Days</Text>
              <View style={styles.timesRow}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <View key={i} style={[styles.dayPill, medicine.weekdays!.includes(i) && styles.dayPillActive]}>
                    <Text style={[styles.dayPillText, medicine.weekdays!.includes(i) && styles.dayPillTextActive]}>
                      {label}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* Adherence card */}
        <View style={styles.adherenceCard}>
          <Text style={styles.adherenceTitle}>Adherence</Text>
          <Text style={styles.adherenceValue}>{adherence}%</Text>
          <Text style={styles.adherenceSubtitle}>
            {takenCount} of {totalLogged} logged doses taken
          </Text>
          <View style={styles.adherenceBar}>
            <View style={[styles.adherenceFill, { width: `${adherence}%`, backgroundColor: medicine.color }]} />
          </View>
        </View>

        {/* Dose History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dose History</Text>
          {logs.length === 0 ? (
            <Text style={styles.emptyText}>No dose history yet.</Text>
          ) : (
            logs.slice(0, 20).map(log => {
              const d = new Date(log.scheduledFor);
              const color = STATUS_COLORS[log.status] ?? Colors.gray400;
              return (
                <View key={log.id} style={styles.logItem}>
                  <View style={[styles.logDot, { backgroundColor: color }]} />
                  <View style={styles.logInfo}>
                    <Text style={styles.logDate}>
                      {relativeDate(log.scheduledFor.slice(0, 10))} at {formatTime(d.getHours(), d.getMinutes())}
                    </Text>
                    {log.notes && <Text style={styles.logNotes}>{log.notes}</Text>}
                  </View>
                  <Text style={[styles.logStatus, { color }]}>
                    {log.status.charAt(0).toUpperCase() + log.status.slice(1)}
                  </Text>
                </View>
              );
            })
          )}
        </View>

        {/* Danger zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>
          {!medicine.isArchived && (
            <TouchableOpacity style={styles.dangerBtn} onPress={handleArchive}>
              <Text style={styles.dangerBtnText}>📦 Archive Medicine</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity style={[styles.dangerBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Text style={[styles.dangerBtnText, { color: Colors.danger }]}>🗑 Delete Medicine</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <View style={detailStyles.row}>
      <Text style={detailStyles.icon}>{icon}</Text>
      <Text style={detailStyles.label}>{label}</Text>
      <Text style={detailStyles.value}>{value}</Text>
    </View>
  );
}

const detailStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2], paddingVertical: Spacing[1] },
  icon: { fontSize: 16, width: 24 },
  label: { width: 90, fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  value: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[4], borderBottomWidth: 3, backgroundColor: Colors.surface },
  backBtn: { padding: 4 },
  backText: { color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.medium },
  headerActions: { flexDirection: 'row', gap: Spacing[2] },
  editBtn: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], backgroundColor: Colors.primaryLight, borderRadius: Radius.md },
  editBtnText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },

  infoCard: { backgroundColor: Colors.surface, margin: Spacing[4], borderRadius: Radius.xl, borderTopWidth: 4, padding: Spacing[4], gap: Spacing[3], ...Shadows.md, borderWidth: 1, borderColor: Colors.border },
  nameRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[3] },
  medicineName: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary },
  strength: { fontSize: Typography.base, color: Colors.textSecondary, marginTop: 2 },
  instructions: { fontSize: Typography.base, color: Colors.textSecondary, lineHeight: 22 },
  detailGrid: { gap: 4 },
  timesSection: { gap: Spacing[2] },
  timesLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase', letterSpacing: 0.5 },
  timesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  timePill: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: Spacing[3], paddingVertical: 5 },
  timePillText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },
  dayPill: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.gray100 },
  dayPillActive: { backgroundColor: Colors.primary },
  dayPillText: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.textSecondary },
  dayPillTextActive: { color: Colors.white },

  adherenceCard: { backgroundColor: Colors.surface, marginHorizontal: Spacing[4], marginBottom: Spacing[4], borderRadius: Radius.xl, padding: Spacing[4], alignItems: 'center', ...Shadows.sm, borderWidth: 1, borderColor: Colors.border },
  adherenceTitle: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium, textTransform: 'uppercase' },
  adherenceValue: { fontSize: Typography['3xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary, marginTop: Spacing[1] },
  adherenceSubtitle: { fontSize: Typography.sm, color: Colors.textSecondary },
  adherenceBar: { width: '100%', height: 8, backgroundColor: Colors.gray100, borderRadius: Radius.full, overflow: 'hidden', marginTop: Spacing[3] },
  adherenceFill: { height: '100%', borderRadius: Radius.full },

  section: { paddingHorizontal: Spacing[4], marginBottom: Spacing[4] },
  sectionTitle: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary, marginBottom: Spacing[3] },
  emptyText: { fontSize: Typography.sm, color: Colors.textSecondary },

  logItem: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3], paddingVertical: Spacing[2], borderBottomWidth: 1, borderBottomColor: Colors.border },
  logDot: { width: 10, height: 10, borderRadius: 5 },
  logInfo: { flex: 1 },
  logDate: { fontSize: Typography.sm, color: Colors.textPrimary },
  logNotes: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  logStatus: { fontSize: Typography.xs, fontWeight: Typography.semibold },

  dangerBtn: { padding: Spacing[4], backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, marginBottom: Spacing[2], alignItems: 'center' },
  deleteBtn: { borderColor: Colors.dangerLight, backgroundColor: Colors.dangerLight },
  dangerBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
});
