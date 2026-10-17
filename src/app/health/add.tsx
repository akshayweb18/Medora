/**
 * Log Health Measurement Modal Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows, MEASUREMENT_TYPES } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { createMeasurement } from '@/db/measurements';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { nowISO } from '@/utils/date';
import { HealthMeasurement } from '@/types';

type MeasurementType = HealthMeasurement['type'];

// Validation ranges (for safety guidance only — never diagnostic)
const RANGES: Record<string, { min: number; max: number; min2?: number; max2?: number }> = {
  blood_pressure: { min: 40, max: 300, min2: 20, max2: 200 },
  weight:         { min: 0.5, max: 500 },
  blood_glucose:  { min: 10, max: 1000 },
  temperature:    { min: 30, max: 45 },
  pulse:          { min: 20, max: 300 },
  spo2:           { min: 50, max: 100 },
  height:         { min: 20, max: 300 },
};

export default function AddMeasurementScreen() {
  const { activeProfile } = useProfile();
  const [type, setType] = useState<MeasurementType>('blood_pressure');
  const [value, setValue] = useState('');
  const [value2, setValue2] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const selectedType = MEASUREMENT_TYPES.find(t => t.key === type)!;

  const validate = () => {
    const errs: Record<string, string> = {};
    const num = parseFloat(value);
    const range = RANGES[type];
    if (!value || isNaN(num)) { errs.value = 'Enter a valid number'; }
    else if (range && (num < range.min || num > range.max)) {
      errs.value = `Value seems outside normal range (${range.min}–${range.max})`;
    }
    if (selectedType.hasTwo) {
      const num2 = parseFloat(value2);
      if (!value2 || isNaN(num2)) { errs.value2 = 'Enter diastolic value'; }
      else if (range?.min2 != null && (num2 < range.min2! || num2 > range.max2!)) {
        errs.value2 = `Value seems outside normal range`;
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!activeProfile) return;
    if (!validate()) return;
    setSaving(true);
    try {
      await createMeasurement({
        profileId: activeProfile.id,
        type,
        value: parseFloat(value),
        value2: selectedType.hasTwo ? parseFloat(value2) : undefined,
        unit: selectedType.unit,
        measuredAt: nowISO(),
        notes: notes.trim() || undefined,
      });
      router.back();
    } catch (e) {
      console.error('Save measurement error:', e);
      Alert.alert('Error', 'Could not save measurement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/health');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Log Vital</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {/* Type selector */}
        <Text style={styles.sectionLabel}>Measurement Type</Text>
        <View style={styles.card}>
          <View style={styles.typeGrid}>
            {MEASUREMENT_TYPES.map(mt => (
              <TouchableOpacity
                key={mt.key}
                style={[styles.typeChip, type === mt.key && styles.typeChipActive, type === mt.key && { borderColor: mt.color, backgroundColor: `${mt.color}18` }]}
                onPress={() => { setType(mt.key as MeasurementType); setValue(''); setValue2(''); setErrors({}); }}
              >
                <Text style={styles.typeEmoji}>{mt.icon}</Text>
                <Text style={[styles.typeLabel, type === mt.key && { color: mt.color, fontWeight: Typography.semibold }]}>
                  {mt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Value inputs */}
        <Text style={styles.sectionLabel}>Value</Text>
        <View style={styles.card}>
          {selectedType.hasTwo ? (
            <View>
              <Text style={styles.fieldLabel}>Blood Pressure (mmHg)</Text>
              <View style={styles.bpRow}>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Systolic"
                    value={value}
                    onChangeText={setValue}
                    keyboardType="numeric"
                    placeholder="e.g. 120"
                    error={errors.value}
                  />
                </View>
                <Text style={styles.bpSlash}>/</Text>
                <View style={{ flex: 1 }}>
                  <Input
                    label="Diastolic"
                    value={value2}
                    onChangeText={setValue2}
                    keyboardType="numeric"
                    placeholder="e.g. 80"
                    error={errors.value2}
                  />
                </View>
              </View>
            </View>
          ) : (
            <Input
              label={`${selectedType.label} (${selectedType.unit})`}
              value={value}
              onChangeText={setValue}
              keyboardType="decimal-pad"
              placeholder={`Enter value in ${selectedType.unit}`}
              error={errors.value}
            />
          )}
          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="e.g. Measured after rest"
            multiline
            numberOfLines={2}
          />
          <View style={styles.disclaimer}>
            <Text style={styles.disclaimerText}>
              ⓘ These measurements are for personal tracking only and are not a substitute for professional medical advice.
            </Text>
          </View>
        </View>

        <Button label={saving ? 'Saving…' : 'Save Measurement'} onPress={handleSave} loading={saving} style={styles.saveBtn} size="lg" />
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
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: 6 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  typeChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  typeChipActive: {},
  typeEmoji: { fontSize: 16 },
  typeLabel: { fontSize: Typography.sm, color: Colors.textSecondary },

  bpRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[3] },
  bpSlash: { fontSize: Typography['2xl'], fontWeight: Typography.bold, color: Colors.textPrimary, marginTop: 16 },

  disclaimer: { backgroundColor: Colors.gray50, borderRadius: Radius.md, padding: Spacing[3] },
  disclaimerText: { fontSize: Typography.xs, color: Colors.textSecondary, lineHeight: 18 },

  saveBtn: { marginTop: Spacing[4] },
});
