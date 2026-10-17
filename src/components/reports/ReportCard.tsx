import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Colors, Typography, Radius, Spacing, Shadows , REPORT_CATEGORIES } from '@/constants/theme';
import { MedicalReport } from '@/types';
import { formatDate, formatFileSize } from '@/utils/date';

interface ReportCardProps {
  report: MedicalReport;
  onPress: () => void;
}

export function ReportCard({ report, onPress }: ReportCardProps) {
  const cat = REPORT_CATEGORIES.find(c => c.key === report.category);
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.78}>
      <View style={[styles.iconBox, { backgroundColor: cat?.color ? `${cat.color}18` : Colors.gray100 }]}>
        <Text style={styles.catEmoji}>{cat?.emoji ?? '📄'}</Text>
      </View>
      <View style={styles.info}>
        <Text style={styles.title} numberOfLines={1}>{report.title}</Text>
        <Text style={styles.meta} numberOfLines={1}>
          {cat?.label ?? report.category} • {formatDate(report.documentDate)}
        </Text>
        {report.doctorOrHospital && (
          <Text style={styles.doctor} numberOfLines={1}>🏥 {report.doctorOrHospital}</Text>
        )}
      </View>
      <View style={styles.right}>
        <Text style={styles.fileType}>{report.fileType.toUpperCase()}</Text>
        <Text style={styles.fileSize}>{formatFileSize(report.fileSizeBytes)}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    marginBottom: Spacing[3],
    gap: Spacing[3],
    ...Shadows.sm,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  catEmoji: { fontSize: 24 },
  info: { flex: 1 },
  title: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },
  meta: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  doctor: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  right: { alignItems: 'flex-end', gap: 4 },
  fileType: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: Colors.white,
    backgroundColor: Colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  fileSize: { fontSize: Typography.xs, color: Colors.textSecondary },
});
