/**
 * Report Detail Screen — shows metadata, file preview/share options, and AI analysis.
 */
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gradient } from '@/components/ui/Gradient';

import { ErrorState } from '@/components/ui/StateViews';
import { DetailSkeleton } from '@/components/ui/Skeleton';
import { Colors, Radius, REPORT_CATEGORIES, Shadows, Spacing, Typography } from '@/constants/theme';
import { deleteReport, getReportById } from '@/db/reports';
import { deleteReportFile, fileExists } from '@/services/fileStorage';
import { MedicalReport } from '@/types';
import { formatDate, formatFileSize } from '@/utils/date';
import { confirmAction } from '@/utils/confirm';
import { ShareReportModal } from '@/components/reports/ShareReportModal';
import { BackButton } from '@/components/ui/BackButton';
import { AiReportAnalysisModal } from '@/components/reports/AiReportAnalysisModal';

export default function ReportDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [report, setReport] = useState<MedicalReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [fileAvailable, setFileAvailable] = useState(true);
  const [shareModalVisible, setShareModalVisible] = useState(false);
  const [aiModalVisible, setAiModalVisible] = useState(false);

  useFocusEffect(useCallback(() => {
    if (!id) return;
    setLoading(true);
    getReportById(id).then(async r => {
      setReport(r);
      if (r) setFileAvailable(await fileExists(r.filePath));
    }).catch(console.error).finally(() => setLoading(false));
  }, [id]));

  const handleShare = () => {
    if (!report) return;
    setShareModalVisible(true);
  };

  const handleDelete = () => {
    if (!report) return;
    confirmAction({
      title: 'Delete Report',
      message: `Permanently delete "${report.title}"? The file will also be removed from this device.`,
      confirmText: 'Delete',
      destructive: true,
      onConfirm: async () => {
        await deleteReport(report.id);
        await deleteReportFile(report.filePath);
        router.back();
      },
    });
  };

  if (loading) return <DetailSkeleton />;
  if (!report) return <ErrorState message="Report not found." />;

  const cat = REPORT_CATEGORIES.find(c => c.key === report.category);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/reports');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <BackButton onPress={handleBack} />
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Text style={styles.shareBtnText}>Share</Text>
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* File preview area */}
        <View style={styles.previewArea}>
          {report.fileType === 'image' && fileAvailable ? (
            <Image
              source={{ uri: report.filePath }}
              style={styles.imagePreview}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.pdfPlaceholder}>
              <Text style={styles.pdfEmoji}>{cat?.emoji ?? '📄'}</Text>
              <Text style={styles.pdfLabel}>
                {fileAvailable
                  ? `${report.fileType.toUpperCase()} • ${formatFileSize(report.fileSizeBytes)}`
                  : '⚠️ File not found on this device'}
              </Text>
            </View>
          )}
        </View>

        {/* Info */}
        <View style={styles.infoCard}>
          <View style={styles.categoryRow}>
            <View style={[styles.catBadge, { backgroundColor: `${cat?.color ?? '#000'}18` }]}>
              <Text style={[styles.catBadgeText, { color: cat?.color ?? Colors.textSecondary }]}>
                {cat?.emoji} {cat?.label ?? report.category}
              </Text>
            </View>
          </View>

          <Text style={styles.reportTitle}>{report.title}</Text>

          <View style={styles.metaGrid}>
            {[
              { icon: '📅', label: 'Date', value: formatDate(report.documentDate) },
              ...(report.doctorOrHospital ? [{ icon: '🏥', label: 'Source', value: report.doctorOrHospital }] : []),
              { icon: '📁', label: 'File', value: `${report.fileName} (${formatFileSize(report.fileSizeBytes)})` },
              { icon: '🗓', label: 'Added', value: formatDate(report.createdAt.slice(0, 10)) },
            ].map(m => (
              <View key={m.label} style={styles.metaRow}>
                <Text style={styles.metaIcon}>{m.icon}</Text>
                <Text style={styles.metaLabel}>{m.label}</Text>
                <Text style={styles.metaValue} numberOfLines={2}>{m.value}</Text>
              </View>
            ))}
          </View>

          {report.notes && (
            <View style={styles.notesBox}>
              <Text style={styles.notesLabel}>Notes</Text>
              <Text style={styles.notesText}>{report.notes}</Text>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          {/* AI Analyze Button */}
          <TouchableOpacity
            style={styles.aiBtn}
            onPress={() => setAiModalVisible(true)}
            activeOpacity={0.85}
          >
            <Gradient
              colors={['#1A1A2E', '#0F3460', '#16213E']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.aiBtnGradient}
            >
              <Text style={styles.aiBtnEmoji}>✨</Text>
              <View style={styles.aiBtnTextGroup}>
                <Text style={styles.aiBtnTitle}>Analyze with Medora AI</Text>
                <Text style={styles.aiBtnSub}>Gemini 3.8 Flash • Instant insights</Text>
              </View>
              <Text style={styles.aiBtnArrow}>›</Text>
            </Gradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleShare}
          >
            <Text style={styles.actionBtnText}>📤 Share Report</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.actionBtn, styles.deleteBtn]} onPress={handleDelete}>
            <Text style={[styles.actionBtnText, { color: Colors.danger }]}>🗑 Delete Report</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {report && (
        <ShareReportModal
          visible={shareModalVisible}
          onClose={() => setShareModalVisible(false)}
          report={report}
          fileAvailable={fileAvailable}
        />
      )}
      {report && (
        <AiReportAnalysisModal
          visible={aiModalVisible}
          onClose={() => setAiModalVisible(false)}
          report={report}
          fileAvailable={fileAvailable}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: Spacing[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  backBtn: { padding: 4 },
  backText: { color: Colors.primary, fontSize: Typography.base, fontWeight: Typography.medium },
  shareBtn: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], backgroundColor: Colors.secondaryLight, borderRadius: Radius.md },
  shareBtnText: { color: Colors.secondary, fontSize: Typography.sm, fontWeight: Typography.semibold },

  previewArea: { margin: Spacing[4], borderRadius: Radius.xl, overflow: 'hidden', backgroundColor: Colors.gray100, minHeight: 200, alignItems: 'center', justifyContent: 'center' },
  imagePreview: { width: '100%', height: 300 },
  pdfPlaceholder: { padding: Spacing[8], alignItems: 'center', gap: Spacing[3] },
  pdfEmoji: { fontSize: 64 },
  pdfLabel: { fontSize: Typography.base, color: Colors.textSecondary, textAlign: 'center' },

  infoCard: { marginHorizontal: Spacing[4], backgroundColor: Colors.surface, borderRadius: Radius.xl, padding: Spacing[4], gap: Spacing[4], ...Shadows.sm, borderWidth: 1, borderColor: Colors.border, marginBottom: Spacing[4] },
  categoryRow: { flexDirection: 'row' },
  catBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: Spacing[3], paddingVertical: Spacing[1], borderRadius: Radius.full },
  catBadgeText: { fontSize: Typography.sm, fontWeight: Typography.semibold },
  reportTitle: { fontSize: Typography['2xl'], fontWeight: Typography.extrabold, color: Colors.textPrimary },
  metaGrid: { gap: Spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing[2] },
  metaIcon: { fontSize: 16, width: 24 },
  metaLabel: { width: 56, fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  metaValue: { flex: 1, fontSize: Typography.sm, color: Colors.textPrimary },
  notesBox: { backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: Spacing[3], gap: Spacing[1] },
  notesLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, textTransform: 'uppercase' },
  notesText: { fontSize: Typography.sm, color: Colors.textPrimary, lineHeight: 20 },

  actions: { paddingHorizontal: Spacing[4], gap: Spacing[3] },
  actionBtn: { padding: Spacing[4], backgroundColor: Colors.surface, borderRadius: Radius.lg, borderWidth: 1.5, borderColor: Colors.border, alignItems: 'center' },
  actionBtnDisabled: { opacity: 0.5 },
  deleteBtn: { borderColor: Colors.dangerLight, backgroundColor: Colors.dangerLight },
  actionBtnText: { fontSize: Typography.base, fontWeight: Typography.semibold, color: Colors.textPrimary },

  // AI Button
  aiBtn: { borderRadius: Radius.xl, overflow: 'hidden', ...Shadows.lg },
  aiBtnGradient: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing[4], paddingVertical: Spacing[4], gap: Spacing[3] },
  aiBtnEmoji: { fontSize: 28 },
  aiBtnTextGroup: { flex: 1 },
  aiBtnTitle: { color: '#fff', fontSize: Typography.md, fontWeight: Typography.bold },
  aiBtnSub: { color: '#ffffff88', fontSize: Typography.xs, marginTop: 2 },
  aiBtnArrow: { color: '#ffffff66', fontSize: 28, fontWeight: Typography.regular },
});
