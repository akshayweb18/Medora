import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Spacing, Shadows, FREQUENCY_LABELS } from '@/constants/theme';
import { Medicine, DoseLog, DoseStatus } from '@/types';
import { formatTime } from '@/utils/date';
import { Badge } from '@/components/ui/Badge';

// ─── Medicine List Card ────────────────────────────────────────────────────────
interface MedicineCardProps {
  medicine: Medicine;
  onPress: () => void;
  nextDose?: string; // ISO datetime
}

export function MedicineCard({ medicine, onPress, nextDose }: MedicineCardProps) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.colorBar, { backgroundColor: medicine.color }]} />
      <View style={styles.cardContent}>
        <View style={styles.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={styles.medicineName} numberOfLines={1}>{medicine.name}</Text>
            {medicine.strength && (
              <Text style={styles.medicineStrength}>{medicine.strength}</Text>
            )}
          </View>
          {medicine.isArchived && <Badge label="Archived" variant="neutral" />}
        </View>
        <Text style={styles.medicineInstructions} numberOfLines={2}>
          {medicine.dosageInstructions}
        </Text>
        <View style={styles.cardFooter}>
          <View style={styles.footerPill}>
            <Text style={styles.footerPillText}>{FREQUENCY_LABELS[medicine.frequency] ?? medicine.frequency}</Text>
          </View>
          {nextDose && (
            <Text style={styles.nextDoseText}>
              Next: {formatISOTimeShort(nextDose)}
            </Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function formatISOTimeShort(iso: string) {
  const d = new Date(iso);
  return formatTime(d.getHours(), d.getMinutes());
}

// ─── Dose Item (for today's schedule) ─────────────────────────────────────────
interface DoseItemProps {
  medicine: Medicine;
  doseLog?: DoseLog;
  scheduledFor: string;
  onTake: () => void;
  onSkip: () => void;
}

const statusConfig: Record<DoseStatus, { label: string; color: string; bg: string }> = {
  taken:    { label: 'Taken',    color: Colors.success, bg: Colors.successLight },
  skipped:  { label: 'Skipped', color: Colors.gray500,  bg: Colors.gray100      },
  missed:   { label: 'Missed',  color: Colors.danger,   bg: Colors.dangerLight  },
  snoozed:  { label: 'Snoozed', color: Colors.warning,  bg: Colors.warningLight },
  upcoming: { label: 'Due',     color: Colors.primary,  bg: Colors.primaryLight },
};

export function DoseItem({ medicine, doseLog, scheduledFor, onTake, onSkip }: DoseItemProps) {
  const d = new Date(scheduledFor);
  const timeStr = formatTime(d.getHours(), d.getMinutes());
  const status: DoseStatus = doseLog?.status ?? 'upcoming';
  const { label, color, bg } = statusConfig[status];
  const isDone = status === 'taken' || status === 'skipped';

  return (
    <View style={[styles.doseItem, { borderLeftColor: medicine.color }]}>
      <View style={styles.doseTime}>
        <Text style={styles.doseTimeText}>{timeStr}</Text>
      </View>
      <View style={styles.doseInfo}>
        <Text style={styles.doseName}>{medicine.name}</Text>
        <Text style={styles.doseInstructions} numberOfLines={1}>
          {medicine.dosageInstructions}
        </Text>
      </View>
      <View style={styles.doseActions}>
        <View style={[styles.statusPill, { backgroundColor: bg }]}>
          <Text style={[styles.statusText, { color }]}>{label}</Text>
        </View>
        {!isDone && (
          <View style={styles.actionButtons}>
            <TouchableOpacity style={[styles.actionBtn, styles.takeBtn]} onPress={onTake}>
              <Text style={styles.takeBtnText}>✓</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.actionBtn, styles.skipBtn]} onPress={onSkip}>
              <Text style={styles.skipBtnText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  // MedicineCard
  card: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
    ...Shadows.sm,
    marginBottom: Spacing[3],
  },
  colorBar: { width: 5 },
  cardContent: { flex: 1, padding: Spacing[4] },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2], marginBottom: 4 },
  medicineName: { fontSize: Typography.md, fontWeight: Typography.bold, color: Colors.textPrimary },
  medicineStrength: { fontSize: Typography.sm, color: Colors.textSecondary, marginTop: 1 },
  medicineInstructions: { fontSize: Typography.sm, color: Colors.textSecondary, marginBottom: Spacing[2] },
  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  footerPill: { backgroundColor: Colors.primaryLight, borderRadius: Radius.full, paddingHorizontal: Spacing[2], paddingVertical: 3 },
  footerPillText: { fontSize: Typography.xs, color: Colors.primary, fontWeight: Typography.medium },
  nextDoseText: { fontSize: Typography.xs, color: Colors.textSecondary },

  // DoseItem
  doseItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderLeftWidth: 4,
    padding: Spacing[3],
    marginBottom: Spacing[2],
    gap: Spacing[3],
    ...Shadows.sm,
  },
  doseTime: { width: 52, alignItems: 'center' },
  doseTimeText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.textPrimary },
  doseInfo: { flex: 1 },
  doseName: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  doseInstructions: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  doseActions: { alignItems: 'flex-end', gap: 6 },
  statusPill: { borderRadius: Radius.full, paddingHorizontal: Spacing[2], paddingVertical: 2 },
  statusText: { fontSize: Typography.xs, fontWeight: Typography.semibold },
  actionButtons: { flexDirection: 'row', gap: 6 },
  actionBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  takeBtn: { backgroundColor: Colors.successLight },
  takeBtnText: { fontSize: 14, color: Colors.success, fontWeight: Typography.bold },
  skipBtn: { backgroundColor: Colors.gray100 },
  skipBtnText: { fontSize: 14, color: Colors.gray500, fontWeight: Typography.bold },
});
