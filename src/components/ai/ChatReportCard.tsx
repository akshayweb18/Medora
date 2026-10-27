/**
 * ChatReportCard — High-polish document preview card rendered inside AI Chat
 * Shows PDF / Image badge, report title, date, clinic, and direct action buttons:
 * 1. "View Document" (opens PDF or full detail page)
 * 2. "AI Analysis" (opens AI Report Analysis modal)
 */
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Colors, Radius, Shadows, Spacing, Typography, REPORT_CATEGORIES } from '@/constants/theme';
import { MedicalReport } from '@/types';
import { formatDate, formatFileSize } from '@/utils/date';

interface Props {
  report: MedicalReport;
  onView: (report: MedicalReport) => void;
  onAnalyze: (report: MedicalReport) => void;
}

export function ChatReportCard({ report, onView, onAnalyze }: Props) {
  const isPdf = report.fileType === 'pdf';
  const cat = REPORT_CATEGORIES.find(c => c.key === report.category);

  return (
    <View style={styles.card}>
      {/* Top Header Row */}
      <View style={styles.topRow}>
        <View style={[styles.typeBadge, isPdf ? styles.pdfBadge : styles.imgBadge]}>
          <Text style={styles.typeBadgeText}>
            {isPdf ? '📄 PDF' : '🖼️ IMAGE'}
          </Text>
        </View>
        <View style={styles.categoryPill}>
          <Text style={styles.categoryPillText}>
            {cat?.emoji ?? '📋'} {cat?.label ?? report.category}
          </Text>
        </View>
        <Text style={styles.sizeText}>{formatFileSize(report.fileSizeBytes)}</Text>
      </View>

      {/* Main Info */}
      <Text style={styles.title} numberOfLines={2}>
        {report.title}
      </Text>

      <View style={styles.metaRow}>
        <Text style={styles.metaItem}>📅 {formatDate(report.documentDate)}</Text>
        {report.doctorOrHospital && (
          <Text style={styles.metaItem} numberOfLines={1}>
            🏥 {report.doctorOrHospital}
          </Text>
        )}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.viewBtn}
          onPress={() => onView(report)}
          activeOpacity={0.8}
        >
          <Text style={styles.viewBtnText}>
            {isPdf ? '📄 Open PDF' : '👁️ View Document'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.analyzeBtn}
          onPress={() => onAnalyze(report)}
          activeOpacity={0.8}
        >
          <Text style={styles.analyzeBtnText}>✨ AI Insights</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    padding: Spacing[3],
    marginVertical: Spacing[2],
    ...Shadows.sm,
    gap: Spacing[2],
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
  },
  typeBadge: {
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.sm,
  },
  pdfBadge: {
    backgroundColor: '#E53E3E',
  },
  imgBadge: {
    backgroundColor: '#3182CE',
  },
  typeBadgeText: {
    color: '#FFFFFF',
    fontSize: Typography.xs - 1,
    fontWeight: Typography.bold,
    letterSpacing: 0.5,
  },
  categoryPill: {
    backgroundColor: Colors.gray100,
    paddingHorizontal: Spacing[2],
    paddingVertical: 2,
    borderRadius: Radius.full,
    flex: 1,
  },
  categoryPillText: {
    fontSize: Typography.xs - 1,
    color: Colors.textSecondary,
    fontWeight: Typography.medium,
  },
  sizeText: {
    fontSize: Typography.xs - 1,
    color: Colors.textDisabled,
  },
  title: {
    fontSize: Typography.sm + 1,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing[2],
    alignItems: 'center',
  },
  metaItem: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: Spacing[2],
    marginTop: 2,
    paddingTop: Spacing[2],
    borderTopWidth: 1,
    borderTopColor: '#EDF2F7',
  },
  viewBtn: {
    flex: 1,
    backgroundColor: Colors.gray100,
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.semibold,
    color: Colors.textPrimary,
  },
  analyzeBtn: {
    flex: 1,
    backgroundColor: '#1A1A2E',
    paddingVertical: Spacing[2],
    paddingHorizontal: Spacing[3],
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#0F3460',
  },
  analyzeBtnText: {
    fontSize: Typography.xs,
    fontWeight: Typography.bold,
    color: '#FFD700',
  },
});
