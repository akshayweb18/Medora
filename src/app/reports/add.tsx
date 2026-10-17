/**
 * Add Medical Report Modal Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows, REPORT_CATEGORIES } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { createReport } from '@/db/reports';
import { pickPdfDocument, pickImage, saveReportFile } from '@/services/fileStorage';
import { uploadToCloudinary } from '@/services/cloudinary';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { todayStr, formatFileSize } from '@/utils/date';
import { MedicalReport } from '@/types';

type ReportCategory = MedicalReport['category'];

export default function AddReportScreen() {
  const { activeProfile } = useProfile();
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<ReportCategory>('other');
  const [documentDate, setDocumentDate] = useState(todayStr());
  const [doctorOrHospital, setDoctorOrHospital] = useState('');
  const [notes, setNotes] = useState('');
  const [pickedFile, setPickedFile] = useState<{ uri: string; name: string; type: 'pdf' | 'image'; size: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handlePickPdf = async () => {
    try {
      const file = await pickPdfDocument();
      if (file) {
        setPickedFile({ uri: file.uri, name: file.name, type: 'pdf', size: file.sizeBytes });
        if (!title) setTitle(file.name.replace(/\.pdf$/i, ''));
      }
    } catch {
      Alert.alert('Error', 'Could not open document picker. Please try again.');
    }
  };

  const handlePickImage = async () => {
    try {
      const file = await pickImage();
      if (file) {
        setPickedFile({ uri: file.uri, name: file.name, type: 'image', size: file.sizeBytes });
        if (!title) setTitle(file.name.replace(/\.[^.]+$/, ''));
      }
    } catch (e: any) {
      Alert.alert('Permission Required', e.message ?? 'Media library permission was denied.');
    }
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!title.trim()) errs.title = 'Title is required';
    if (!documentDate) errs.documentDate = 'Document date is required';
    if (!pickedFile) errs.file = 'Please select a file to upload';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!activeProfile || !pickedFile) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const localPath = await saveReportFile(pickedFile.uri, pickedFile.name);

      let cldUrl: string | undefined;
      let cldPublicId: string | undefined;

      try {
        const cldRes = await uploadToCloudinary(pickedFile.uri, {
          fileName: pickedFile.name,
          fileType: pickedFile.type,
          folder: 'medora/reports',
        });
        cldUrl = cldRes.secureUrl;
        cldPublicId = cldRes.publicId;
      } catch (cldErr) {
        console.warn('Cloudinary upload warning (report saved locally):', cldErr);
      }

      await createReport({
        profileId: activeProfile.id,
        title: title.trim(),
        category,
        documentDate,
        doctorOrHospital: doctorOrHospital.trim() || undefined,
        notes: notes.trim() || undefined,
        filePath: localPath,
        fileName: pickedFile.name,
        fileType: pickedFile.type,
        fileSizeBytes: pickedFile.size,
        cloudinaryUrl: cldUrl,
        cloudinaryPublicId: cldPublicId,
      });
      router.back();
    } catch (e) {
      console.error('Save report error:', e);
      Alert.alert('Error', 'Could not save the report. Please check storage permissions and try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/reports');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Upload Report</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {/* File picker */}
        <Text style={styles.sectionLabel}>Select File</Text>
        <View style={styles.card}>
          {pickedFile ? (
            <View style={styles.filePreview}>
              <Text style={styles.fileEmoji}>{pickedFile.type === 'pdf' ? '📄' : '🖼️'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.fileName} numberOfLines={2}>{pickedFile.name}</Text>
                <Text style={styles.fileSize}>{formatFileSize(pickedFile.size)}</Text>
              </View>
              <TouchableOpacity onPress={() => setPickedFile(null)} style={styles.removeFile}>
                <Text style={styles.removeFileText}>✕</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.pickerButtons}>
              <TouchableOpacity style={styles.pickerBtn} onPress={handlePickPdf}>
                <Text style={styles.pickerBtnEmoji}>📄</Text>
                <Text style={styles.pickerBtnLabel}>Import PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.pickerBtn} onPress={handlePickImage}>
                <Text style={styles.pickerBtnEmoji}>🖼️</Text>
                <Text style={styles.pickerBtnLabel}>Import Image</Text>
              </TouchableOpacity>
            </View>
          )}
          {errors.file && <Text style={styles.errorText}>{errors.file}</Text>}
        </View>

        {/* Details */}
        <Text style={styles.sectionLabel}>Report Details</Text>
        <View style={styles.card}>
          <Input label="Title *" value={title} onChangeText={setTitle} placeholder="e.g. Blood Test – October 2024" error={errors.title} />
          <Input label="Document Date *" value={documentDate} onChangeText={setDocumentDate} placeholder="YYYY-MM-DD" error={errors.documentDate} />
          <Input label="Doctor / Hospital" value={doctorOrHospital} onChangeText={setDoctorOrHospital} placeholder="e.g. City General Hospital" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Any additional notes…" multiline numberOfLines={3} />
        </View>

        {/* Category */}
        <Text style={styles.sectionLabel}>Category</Text>
        <View style={styles.card}>
          <View style={styles.catGrid}>
            {REPORT_CATEGORIES.map(cat => {
              const isSelected = category === cat.key;
              return (
                <TouchableOpacity
                  key={cat.key}
                  style={[
                    styles.catChip,
                    isSelected && { borderColor: cat.color, backgroundColor: `${cat.color}18` },
                  ]}
                  onPress={() => setCategory(cat.key as ReportCategory)}
                >
                  <Text style={styles.catEmoji}>{cat.emoji}</Text>
                  <Text style={[styles.catLabel, isSelected && { color: cat.color, fontWeight: Typography.semibold }]}>
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <Button label={saving ? 'Saving…' : 'Save Report'} onPress={handleSave} loading={saving} style={styles.saveBtn} size="lg" />
        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border, backgroundColor: Colors.surface },
  cancelBtn: { width: 64 },
  cancelText: { color: Colors.primary, fontSize: Typography.base },
  title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  form: { padding: Spacing[4], gap: Spacing[2] },
  sectionLabel: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary, marginTop: Spacing[3], marginBottom: Spacing[1], textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing[4], gap: Spacing[4], ...Shadows.sm },
  errorText: { fontSize: Typography.xs, color: Colors.danger },

  pickerButtons: { flexDirection: 'row', gap: Spacing[3] },
  pickerBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center', gap: Spacing[2],
    padding: Spacing[5], borderRadius: Radius.lg,
    borderWidth: 2, borderColor: Colors.border, borderStyle: 'dashed',
  },
  pickerBtnEmoji: { fontSize: 32 },
  pickerBtnLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },

  filePreview: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  fileEmoji: { fontSize: 36 },
  fileName: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary },
  fileSize: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 2 },
  removeFile: { padding: Spacing[2] },
  removeFileText: { fontSize: Typography.base, color: Colors.danger },

  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  catChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  catChipActive: {},
  catEmoji: { fontSize: 16 },
  catLabel: { fontSize: Typography.sm, color: Colors.textSecondary },

  saveBtn: { marginTop: Spacing[4] },
});
