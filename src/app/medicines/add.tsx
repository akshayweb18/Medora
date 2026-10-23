/**
 * Add / Edit Medicine Modal Screen
 */
import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows, WEEKDAY_LABELS, DOSE_UNIT_LABELS } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { createMedicine, updateMedicine, getMedicineById } from '@/db/medicines';
import { scheduleMedicineNotifications } from '@/services/notifications';
import { Medicine, FrequencyType, DoseUnit, ScheduledTime } from '@/types';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { todayStr, defaultTimesForFrequency, formatTime } from '@/utils/date';
import { BackButton } from '@/components/ui/BackButton';

const FREQUENCIES: { key: FrequencyType; label: string }[] = [
  { key: 'once_daily',        label: 'Once daily'      },
  { key: 'twice_daily',       label: 'Twice daily'     },
  { key: 'three_times_daily', label: '3× daily'        },
  { key: 'four_times_daily',  label: '4× daily'        },
  { key: 'custom_times',      label: 'Custom times'    },
  { key: 'selected_weekdays', label: 'Selected weekdays'},
  { key: 'as_needed',         label: 'As needed'       },
];

const UNITS: DoseUnit[] = ['tablet','capsule','ml','mg','drops','puff','patch','injection','other'];

const ACCENT_COLORS = [
  '#27AE60','#27AE8F','#9B51E0','#F2994A',
  '#EB5757','#219653','#34C77E','#BB6BD9',
];

export default function AddMedicineScreen() {
  const { activeProfile } = useProfile();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isEdit = Boolean(id);

  const [name, setName] = useState('');
  const [strength, setStrength] = useState('');
  const [unit, setUnit] = useState<DoseUnit>('tablet');
  const [dosageInstructions, setDosageInstructions] = useState('');
  const [frequency, setFrequency] = useState<FrequencyType>('once_daily');
  const [scheduledTimes, setScheduledTimes] = useState<ScheduledTime[]>([{ hour: 8, minute: 0 }]);
  const [weekdays, setWeekdays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [startDate, setStartDate] = useState(todayStr());
  const [endDate, setEndDate] = useState('');
  const [hasEndDate, setHasEndDate] = useState(false);
  const [prescribingDoctor, setPrescribingDoctor] = useState('');
  const [notes, setNotes] = useState('');
  const [color, setColor] = useState(ACCENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load existing medicine for editing
  React.useEffect(() => {
    if (id) {
      getMedicineById(id).then(med => {
        if (!med) return;
        setName(med.name);
        setStrength(med.strength ?? '');
        setUnit(med.unit);
        setDosageInstructions(med.dosageInstructions);
        setFrequency(med.frequency);
        setScheduledTimes(med.scheduledTimes);
        setWeekdays(med.weekdays ?? []);
        setStartDate(med.startDate);
        setEndDate(med.endDate ?? '');
        setHasEndDate(Boolean(med.endDate));
        setPrescribingDoctor(med.prescribingDoctor ?? '');
        setNotes(med.notes ?? '');
        setColor(med.color);
      });
    }
  }, [id]);

  const handleFrequencyChange = useCallback((freq: FrequencyType) => {
    setFrequency(freq);
    if (freq !== 'custom_times' && freq !== 'as_needed') {
      setScheduledTimes(defaultTimesForFrequency(freq));
    }
  }, []);

  const toggleWeekday = useCallback((day: number) => {
    setWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  }, []);

  const addCustomTime = useCallback(() => {
    setScheduledTimes(prev => [...prev, { hour: 12, minute: 0 }]);
  }, []);

  const removeCustomTime = useCallback((index: number) => {
    setScheduledTimes(prev => prev.filter((_, i) => i !== index));
  }, []);

  const adjustHour = useCallback((index: number, delta: number) => {
    setScheduledTimes(prev => {
      const next = [...prev];
      let newHour = (next[index].hour + delta) % 24;
      if (newHour < 0) newHour += 24;
      next[index] = { ...next[index], hour: newHour };
      return next;
    });
  }, []);

  const adjustMinute = useCallback((index: number, delta: number) => {
    setScheduledTimes(prev => {
      const next = [...prev];
      let newMin = (next[index].minute + delta) % 60;
      if (newMin < 0) newMin += 60;
      next[index] = { ...next[index], minute: newMin };
      return next;
    });
  }, []);

  const toggleAmPm = useCallback((index: number) => {
    setScheduledTimes(prev => {
      const next = [...prev];
      const cur = next[index].hour;
      const newHour = cur >= 12 ? cur - 12 : cur + 12;
      next[index] = { ...next[index], hour: newHour };
      return next;
    });
  }, []);

  const setPreset = useCallback((index: number, hour: number, minute: number) => {
    setScheduledTimes(prev => {
      const next = [...prev];
      next[index] = { hour, minute };
      return next;
    });
  }, []);

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Medicine name is required';
    if (!dosageInstructions.trim()) errs.dosageInstructions = 'Dosage instructions are required';
    if (!startDate) errs.startDate = 'Start date is required';
    if (hasEndDate && endDate && endDate < startDate) errs.endDate = 'End date must be after start date';
    if (frequency === 'selected_weekdays' && weekdays.length === 0) errs.weekdays = 'Select at least one weekday';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!activeProfile) return;
    if (!validate()) return;
    setSaving(true);
    try {
      const data = {
        profileId: activeProfile.id,
        name: name.trim(),
        strength: strength.trim() || undefined,
        unit,
        dosageInstructions: dosageInstructions.trim(),
        frequency,
        scheduledTimes: frequency === 'as_needed' ? [] : scheduledTimes,
        weekdays: frequency === 'selected_weekdays' ? weekdays : undefined,
        startDate,
        endDate: hasEndDate && endDate ? endDate : undefined,
        prescribingDoctor: prescribingDoctor.trim() || undefined,
        notes: notes.trim() || undefined,
        isArchived: false,
        color,
      };

      let medicine: Medicine;
      if (isEdit && id) {
        await updateMedicine(id, data);
        medicine = { ...data, id, createdAt: '', updatedAt: '' };
      } else {
        medicine = await createMedicine(data);
      }

      // Schedule notifications
      await scheduleMedicineNotifications(medicine);
      router.back();
    } catch (e) {
      console.error('Save medicine error:', e);
      Alert.alert('Error', 'Could not save medicine. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/medicines');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <BackButton onPress={handleCancel} />
        <Text style={styles.title}>{isEdit ? 'Edit Medicine' : 'Add Medicine'}</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        {/* Basic Info */}
        <Text style={styles.sectionLabel}>Basic Information</Text>
        <View style={styles.card}>
          <Input label="Medicine Name *" value={name} onChangeText={setName} placeholder="e.g. Paracetamol" error={errors.name} />
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input label="Strength (optional)" value={strength} onChangeText={setStrength} placeholder="e.g. 500mg" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Unit</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.unitScroll}
                contentContainerStyle={styles.unitRow}
              >
                {UNITS.map(u => (
                  <TouchableOpacity
                    key={u}
                    style={[styles.unitChip, unit === u && styles.unitChipActive]}
                    onPress={() => setUnit(u)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.unitChipText, unit === u && styles.unitChipTextActive]}>
                      {DOSE_UNIT_LABELS[u]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
          <Input
            label="Dosage Instructions *"
            value={dosageInstructions}
            onChangeText={setDosageInstructions}
            placeholder="e.g. 1 tablet after meals"
            error={errors.dosageInstructions}
          />
        </View>

        {/* Frequency */}
        <Text style={styles.sectionLabel}>Schedule</Text>
        <View style={styles.card}>
          <Text style={styles.fieldLabel}>Frequency</Text>
          <View style={styles.freqGrid}>
            {FREQUENCIES.map(f => (
              <TouchableOpacity
                key={f.key}
                style={[styles.freqChip, frequency === f.key && styles.freqChipActive]}
                onPress={() => handleFrequencyChange(f.key)}
              >
                <Text style={[styles.freqChipText, frequency === f.key && styles.freqChipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weekday selector */}
          {frequency === 'selected_weekdays' && (
            <>
              <Text style={styles.fieldLabel}>Days</Text>
              {errors.weekdays && <Text style={styles.errorText}>{errors.weekdays}</Text>}
              <View style={styles.weekdayRow}>
                {WEEKDAY_LABELS.map((label, i) => (
                  <TouchableOpacity
                    key={i}
                    style={[styles.dayChip, weekdays.includes(i) && styles.dayChipActive]}
                    onPress={() => toggleWeekday(i)}
                  >
                    <Text style={[styles.dayChipText, weekdays.includes(i) && styles.dayChipTextActive]}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}

          {/* Times */}
          {frequency !== 'as_needed' && (
            <>
              <Text style={styles.fieldLabel}>Reminder Times</Text>
              {scheduledTimes.map((t, idx) => (
                <View key={idx} style={styles.timeCard}>
                  <View style={styles.timeTopRow}>
                    <View style={styles.timeDisplayPill}>
                      <Text style={styles.timeDisplayEmoji}>⏰</Text>
                      <Text style={styles.timeDisplayText}>{formatTime(t.hour, t.minute)}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.ampmToggle}
                      onPress={() => toggleAmPm(idx)}
                    >
                      <Text style={styles.ampmText}>{t.hour >= 12 ? 'PM' : 'AM'}</Text>
                    </TouchableOpacity>
                    {frequency === 'custom_times' && scheduledTimes.length > 1 && (
                      <TouchableOpacity onPress={() => removeCustomTime(idx)} style={styles.removeTimeBtn}>
                        <Text style={styles.removeTimeBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Stepper adjustments */}
                  <View style={styles.stepperRow}>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHour(idx, -1)}>
                      <Text style={styles.stepBtnText}>-1 hr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustHour(idx, 1)}>
                      <Text style={styles.stepBtnText}>+1 hr</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustMinute(idx, -15)}>
                      <Text style={styles.stepBtnText}>-15m</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.stepBtn} onPress={() => adjustMinute(idx, 15)}>
                      <Text style={styles.stepBtnText}>+15m</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Presets */}
                  <View style={styles.presetRow}>
                    {[
                      { label: '8 AM', h: 8, m: 0 },
                      { label: '1 PM', h: 13, m: 0 },
                      { label: '6 PM', h: 18, m: 0 },
                      { label: '9 PM', h: 21, m: 0 },
                    ].map(p => {
                      const isSel = t.hour === p.h && t.minute === p.m;
                      return (
                        <TouchableOpacity
                          key={p.label}
                          style={[styles.presetChip, isSel && styles.presetChipActive]}
                          onPress={() => setPreset(idx, p.h, p.m)}
                        >
                          <Text style={[styles.presetChipText, isSel && styles.presetChipTextActive]}>
                            {p.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
              {frequency === 'custom_times' && (
                <TouchableOpacity style={styles.addTimeBtn} onPress={addCustomTime}>
                  <Text style={styles.addTimeBtnText}>+ Add another time</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Dates */}
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Input
                label="Start Date *"
                value={startDate}
                onChangeText={setStartDate}
                placeholder="YYYY-MM-DD"
                error={errors.startDate}
              />
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.endDateToggle}>
                <Text style={styles.fieldLabel}>End Date</Text>
                <Switch
                  value={hasEndDate}
                  onValueChange={setHasEndDate}
                  trackColor={{ true: Colors.primary }}
                  thumbColor={Colors.white}
                />
              </View>
              {hasEndDate && (
                <Input
                  value={endDate}
                  onChangeText={setEndDate}
                  placeholder="YYYY-MM-DD"
                  error={errors.endDate}
                />
              )}
            </View>
          </View>
        </View>

        {/* Optional Details */}
        <Text style={styles.sectionLabel}>Additional Details</Text>
        <View style={styles.card}>
          <Input label="Prescribing Doctor" value={prescribingDoctor} onChangeText={setPrescribingDoctor} placeholder="Dr. Name" />
          <Input label="Notes" value={notes} onChangeText={setNotes} placeholder="Any additional notes…" multiline numberOfLines={3} />
        </View>

        {/* Color picker */}
        <Text style={styles.sectionLabel}>Card Colour</Text>
        <View style={[styles.card, styles.colorRow]}>
          {ACCENT_COLORS.map(c => (
            <TouchableOpacity
              key={c}
              style={[styles.colorDot, { backgroundColor: c }, color === c && styles.colorDotActive]}
              onPress={() => setColor(c)}
            />
          ))}
        </View>

        <Button label={saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Medicine'} onPress={handleSave} loading={saving} style={styles.saveBtn} size="lg" />
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
  sectionLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary, marginTop: Spacing[3], marginBottom: Spacing[1], textTransform: 'uppercase', letterSpacing: 0.8 },
  card: { backgroundColor: Colors.surface, borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, padding: Spacing[4], gap: Spacing[4], ...Shadows.sm },
  row: { flexDirection: 'row', gap: Spacing[3], alignItems: 'flex-start' },
  fieldLabel: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textPrimary, marginBottom: 6 },
  errorText: { fontSize: Typography.xs, color: Colors.danger },

  unitScroll: { height: 48 },
  unitRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing[2], height: 48 },
  unitChip: {
    paddingHorizontal: Spacing[3],
    paddingVertical: 7,
    borderRadius: Radius.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unitChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  unitChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  unitChipTextActive: { color: Colors.primary, fontWeight: Typography.semibold },

  freqGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  freqChip: { paddingHorizontal: Spacing[3], paddingVertical: Spacing[2], borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  freqChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  freqChipText: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  freqChipTextActive: { color: Colors.primary, fontWeight: Typography.semibold },

  weekdayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.border, backgroundColor: Colors.surface },
  dayChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primary },
  dayChipText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary },
  dayChipTextActive: { color: Colors.white },

  timeCard: {
    backgroundColor: Colors.gray50,
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing[3],
    gap: Spacing[3],
    marginBottom: Spacing[2],
  },
  timeTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing[2] },
  timeDisplayPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    flex: 1,
  },
  timeDisplayEmoji: { fontSize: 18 },
  timeDisplayText: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  ampmToggle: {
    paddingHorizontal: Spacing[3],
    paddingVertical: Spacing[2],
    backgroundColor: Colors.primaryLight,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  ampmText: { fontSize: Typography.sm, fontWeight: Typography.bold, color: Colors.primary },
  removeTimeBtn: { padding: Spacing[2] },
  removeTimeBtnText: { fontSize: Typography.base, color: Colors.danger, fontWeight: Typography.bold },

  stepperRow: { flexDirection: 'row', gap: Spacing[2] },
  stepBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    backgroundColor: Colors.surface,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  stepBtnText: { fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textPrimary },

  presetRow: { flexDirection: 'row', gap: Spacing[2] },
  presetChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  presetChipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  presetChipText: { fontSize: Typography.xs, color: Colors.textSecondary, fontWeight: Typography.medium },
  presetChipTextActive: { color: Colors.primary, fontWeight: Typography.bold },

  addTimeBtn: { alignSelf: 'flex-start', paddingVertical: Spacing[2] },
  addTimeBtnText: { color: Colors.primary, fontSize: Typography.sm, fontWeight: Typography.semibold },

  endDateToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },

  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[3] },
  colorDot: { width: 36, height: 36, borderRadius: 18 },
  colorDotActive: { borderWidth: 3, borderColor: Colors.textPrimary },

  saveBtn: { marginTop: Spacing[4] },
});
