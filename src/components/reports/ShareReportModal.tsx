import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  Platform,
  ScrollView,
  Share as NativeShare,
  Linking,
} from 'react-native';
import * as Sharing from 'expo-sharing';

import { Colors, Typography, Spacing, Radius, Shadows, REPORT_CATEGORIES } from '@/constants/theme';
import { MedicalReport } from '@/types';
import { formatDate, formatFileSize } from '@/utils/date';

interface ShareReportModalProps {
  visible: boolean;
  onClose: () => void;
  report: MedicalReport;
  fileAvailable?: boolean;
}

export function ShareReportModal({ visible, onClose, report, fileAvailable = true }: ShareReportModalProps) {
  const [copied, setCopied] = useState(false);
  const cat = REPORT_CATEGORIES.find(c => c.key === report.category);

  const formattedSummary = [
    `📋 *Medical Report: ${report.title}*`,
    `📂 Category: ${cat?.label ?? report.category}`,
    `📅 Date: ${formatDate(report.documentDate)}`,
    report.doctorOrHospital ? `🏥 Doctor / Lab: ${report.doctorOrHospital}` : null,
    report.notes ? `📝 Notes: ${report.notes}` : null,
    `📁 File: ${report.fileName} (${formatFileSize(report.fileSizeBytes)})`,
    `\nShared securely via MediVault`,
  ]
    .filter(Boolean)
    .join('\n');

  // 1. WhatsApp Share
  const handleWhatsAppShare = () => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(formattedSummary)}`;
    if (Platform.OS === 'web') {
      window.open(url, '_blank');
    } else {
      Linking.openURL(url).catch(() => {
        if (typeof window !== 'undefined' && window.open) {
          window.open(url, '_blank');
        }
      });
    }
  };

  // 2. Email Share
  const handleEmailShare = () => {
    const subject = `Medical Report: ${report.title}`;
    const url = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(formattedSummary)}`;
    if (Platform.OS === 'web') {
      window.location.href = url;
    } else {
      Linking.openURL(url).catch(console.warn);
    }
  };

  // 3. Copy Details to Clipboard
  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(formattedSummary);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  // 4. Download / Save File
  const handleDownload = async () => {
    if (Platform.OS === 'web') {
      try {
        const a = document.createElement('a');
        a.href = report.filePath;
        a.download = report.fileName || `${report.title}.${report.fileType === 'pdf' ? 'pdf' : 'jpg'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch {
        window.open(report.filePath, '_blank');
      }
    } else {
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          const isImage = report.fileType === 'image';
          await Sharing.shareAsync(report.filePath, {
            mimeType: isImage ? 'image/jpeg' : 'application/pdf',
            dialogTitle: `Save ${report.fileName}`,
          });
        }
      } catch (err) {
        console.warn('Download / Save failed:', err);
      }
    }
  };

  // 5. System Share / More Options
  const handleSystemShare = async () => {
    if (Platform.OS === 'web') {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        try {
          await (navigator as any).share({
            title: report.title,
            text: formattedSummary,
          });
          return;
        } catch {
          // User cancelled or share not allowed
        }
      }
      // Web fallback: open file
      window.open(report.filePath, '_blank');
    } else {
      try {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(report.filePath, {
            mimeType: report.fileType === 'image' ? 'image/jpeg' : 'application/pdf',
            dialogTitle: `Share ${report.title}`,
          });
        } else {
          await NativeShare.share({
            title: report.title,
            message: formattedSummary,
          });
        }
      } catch (err) {
        console.warn('Native share failed:', err);
      }
    }
  };

  const shareOptions = [
    {
      id: 'whatsapp',
      title: 'WhatsApp',
      subtitle: 'Send report details to Doctor or Family',
      emoji: '💬',
      bgColor: '#E8F5E9',
      borderColor: '#A5D6A7',
      onPress: handleWhatsAppShare,
      enabled: true,
    },
    {
      id: 'email',
      title: 'Email',
      subtitle: 'Mail report summary directly',
      emoji: '✉️',
      bgColor: '#E3F2FD',
      borderColor: '#90CAF9',
      onPress: handleEmailShare,
      enabled: true,
    },
    {
      id: 'copy',
      title: copied ? 'Copied to Clipboard! ✓' : 'Copy Details',
      subtitle: 'Copy report text & prescription info',
      emoji: copied ? '✅' : '📋',
      bgColor: copied ? '#E8F5E9' : '#FFF3E0',
      borderColor: copied ? '#81C784' : '#FFE0B2',
      onPress: handleCopy,
      enabled: true,
    },
    {
      id: 'download',
      title: 'Download File',
      subtitle: fileAvailable
        ? `Save ${report.fileType.toUpperCase()} file to your device`
        : 'File not available on this device',
      emoji: '📥',
      bgColor: fileAvailable ? '#EDE7F6' : '#F5F5F5',
      borderColor: fileAvailable ? '#D1C4E9' : '#E0E0E0',
      onPress: handleDownload,
      enabled: fileAvailable,
    },
    {
      id: 'system',
      title: 'More Apps & AirDrop',
      subtitle: fileAvailable
        ? 'Use system share sheet for other apps'
        : 'File not available — text share only',
      emoji: '📤',
      bgColor: '#F5F5F5',
      borderColor: '#E0E0E0',
      onPress: handleSystemShare,
      enabled: true,
    },
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalCard}>
              {/* Header */}
              <View style={styles.header}>
                <View style={styles.headerTitleRow}>
                  <Text style={styles.headerIcon}>📤</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Share Report</Text>
                    <Text style={styles.headerSub}>Choose how you want to share this record</Text>
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                  <Text style={styles.closeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>

              {/* Report Preview Snippet */}
              <View style={styles.reportSnippet}>
                <View style={[styles.snippetEmoji, { backgroundColor: cat?.color ? `${cat.color}20` : '#E2E8F0' }]}>
                  <Text style={{ fontSize: 24 }}>{cat?.emoji ?? '📄'}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.snippetTitle} numberOfLines={1}>{report.title}</Text>
                  <Text style={styles.snippetMeta}>
                    {cat?.label ?? report.category} • {formatDate(report.documentDate)}
                  </Text>
                  {report.doctorOrHospital && (
                    <Text style={styles.snippetDoctor} numberOfLines={1}>
                      🏥 {report.doctorOrHospital}
                    </Text>
                  )}
                </View>
              </View>

              {/* Share Options List */}
              <ScrollView style={styles.optionsList} showsVerticalScrollIndicator={false}>
                {shareOptions.map(opt => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optionRow,
                      { backgroundColor: opt.bgColor, borderColor: opt.borderColor },
                      !opt.enabled && styles.optionRowDisabled,
                    ]}
                    onPress={opt.enabled ? opt.onPress : undefined}
                    activeOpacity={opt.enabled ? 0.7 : 1}
                  >
                    <View style={styles.optionEmojiBox}>
                      <Text style={styles.optionEmoji}>{opt.emoji}</Text>
                    </View>
                    <View style={styles.optionInfo}>
                      <Text style={[styles.optionTitle, !opt.enabled && { color: Colors.textDisabled }]}>{opt.title}</Text>
                      <Text style={styles.optionSub}>{opt.subtitle}</Text>
                    </View>
                    {opt.enabled && <Text style={styles.optionArrow}>›</Text>}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Cancel Button */}
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: Spacing[3],
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: Colors.surface,
    borderRadius: Radius['2xl'],
    padding: Spacing[4],
    maxHeight: '85%',
    ...Shadows.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing[3],
    paddingBottom: Spacing[3],
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing[2],
    flex: 1,
  },
  headerIcon: {
    fontSize: 26,
  },
  headerTitle: {
    fontSize: Typography.lg,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  headerSub: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: Spacing[2],
  },
  closeBtnText: {
    fontSize: 14,
    color: Colors.gray600,
    fontWeight: 'bold',
  },
  reportSnippet: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    padding: Spacing[3],
    gap: Spacing[3],
    marginBottom: Spacing[3],
    borderWidth: 1,
    borderColor: Colors.border,
  },
  snippetEmoji: {
    width: 44,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  snippetTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  snippetMeta: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  snippetDoctor: {
    fontSize: Typography.xs,
    color: Colors.primary,
    marginTop: 2,
  },
  optionsList: {
    maxHeight: 320,
    marginBottom: Spacing[3],
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing[3],
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginBottom: Spacing[2],
    gap: Spacing[3],
  },
  optionRowDisabled: {
    opacity: 0.5,
  },
  optionEmojiBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.white,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.sm,
  },
  optionEmoji: {
    fontSize: 20,
  },
  optionInfo: {
    flex: 1,
  },
  optionTitle: {
    fontSize: Typography.sm,
    fontWeight: Typography.bold,
    color: Colors.textPrimary,
  },
  optionSub: {
    fontSize: Typography.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  optionArrow: {
    fontSize: 22,
    color: Colors.gray400,
    fontWeight: '300',
  },
  cancelBtn: {
    backgroundColor: Colors.primary,
    paddingVertical: Spacing[3],
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    color: Colors.white,
    fontWeight: Typography.semibold,
    fontSize: Typography.base,
  },
});
