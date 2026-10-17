/**
 * Add Family Profile Modal Screen
 */
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { Colors, Typography, Spacing, Radius, Shadows } from '@/constants/theme';
import { useProfile } from '@/store/profileStore';
import { createProfile } from '@/db/profiles';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Profile } from '@/types';

type Relationship = Profile['relationship'];
type Gender = Profile['gender'];

const RELATIONSHIPS: { key: Relationship; label: string; emoji: string }[] = [
  { key: 'self',    label: 'Myself',  emoji: '👤' },
  { key: 'spouse',  label: 'Spouse',  emoji: '💑' },
  { key: 'child',   label: 'Child',   emoji: '👶' },
  { key: 'parent',  label: 'Parent',  emoji: '👴' },
  { key: 'sibling', label: 'Sibling', emoji: '👫' },
  { key: 'other',   label: 'Other',   emoji: '👥' },
];

const BLOOD_GROUPS = ['A+', 'A−', 'B+', 'B−', 'AB+', 'AB−', 'O+', 'O−'];
const GENDERS: { key: Gender; label: string }[] = [
  { key: 'male',              label: 'Male'            },
  { key: 'female',            label: 'Female'          },
  { key: 'other',             label: 'Other'           },
  { key: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export default function AddFamilyScreen() {
  const { refreshProfiles } = useProfile();
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState<Relationship>('spouse');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [gender, setGender] = useState<Gender>('prefer_not_to_say');
  const [bloodGroup, setBloodGroup] = useState('');
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = 'Name is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await createProfile({
        name: name.trim(),
        relationship,
        dateOfBirth: dateOfBirth || undefined,
        gender,
        bloodGroup: bloodGroup || undefined,
        isDefault: false,
      });
      await refreshProfiles();
      router.back();
    } catch (e) {
      console.error('Add profile error:', e);
      Alert.alert('Error', 'Could not save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/family');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleCancel} style={styles.cancelBtn}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Add Family Member</Text>
        <View style={{ width: 64 }} />
      </View>

      <ScrollView contentContainerStyle={styles.form} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionLabel}>Basic Information</Text>
        <View style={styles.card}>
          <Input label="Name *" value={name} onChangeText={setName} placeholder="Full name" error={errors.name} />
          <Input label="Date of Birth" value={dateOfBirth} onChangeText={setDateOfBirth} placeholder="YYYY-MM-DD" />
        </View>

        <Text style={styles.sectionLabel}>Relationship</Text>
        <View style={styles.card}>
          <View style={styles.grid}>
            {RELATIONSHIPS.map(r => (
              <TouchableOpacity
                key={r.key}
                style={[styles.chip, relationship === r.key && styles.chipActive]}
                onPress={() => setRelationship(r.key)}
              >
                <Text style={styles.chipEmoji}>{r.emoji}</Text>
                <Text style={[styles.chipLabel, relationship === r.key && styles.chipLabelActive]}>{r.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Gender</Text>
        <View style={styles.card}>
          <View style={styles.genderRow}>
            {GENDERS.map(g => (
              <TouchableOpacity
                key={g.key}
                style={[styles.genderChip, gender === g.key && styles.chipActive]}
                onPress={() => setGender(g.key)}
              >
                <Text style={[styles.chipLabel, gender === g.key && styles.chipLabelActive]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Text style={styles.sectionLabel}>Blood Group</Text>
        <View style={styles.card}>
          <View style={styles.bloodRow}>
            {BLOOD_GROUPS.map(bg => (
              <TouchableOpacity
                key={bg}
                style={[styles.bloodChip, bloodGroup === bg && styles.chipActive]}
                onPress={() => setBloodGroup(bloodGroup === bg ? '' : bg)}
              >
                <Text style={[styles.chipLabel, bloodGroup === bg && styles.chipLabelActive]}>{bg}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <Button label={saving ? 'Saving…' : 'Add Profile'} onPress={handleSave} loading={saving} style={styles.saveBtn} size="lg" />
        <View style={{ height: Spacing[8] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    padding: Spacing[4], borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  cancelBtn: { width: 64 },
  cancelText: { color: Colors.primary, fontSize: Typography.base },
  title: { fontSize: Typography.lg, fontWeight: Typography.bold, color: Colors.textPrimary },
  form: { padding: Spacing[4], gap: Spacing[2] },
  sectionLabel: {
    fontSize: Typography.xs, fontWeight: Typography.semibold, color: Colors.textSecondary,
    marginTop: Spacing[3], marginBottom: Spacing[1],
    textTransform: 'uppercase', letterSpacing: 0.8,
  },
  card: {
    backgroundColor: Colors.surface, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.border,
    padding: Spacing[4], gap: Spacing[3], ...Shadows.sm,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  chipActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  chipEmoji: { fontSize: 18 },
  chipLabel: { fontSize: Typography.sm, color: Colors.textSecondary, fontWeight: Typography.medium },
  chipLabelActive: { color: Colors.primary, fontWeight: Typography.semibold },
  genderRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  genderChip: {
    paddingHorizontal: Spacing[3], paddingVertical: Spacing[2],
    borderRadius: Radius.full, borderWidth: 1.5, borderColor: Colors.border,
  },
  bloodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing[2] },
  bloodChip: {
    width: 56, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: Radius.md, borderWidth: 1.5, borderColor: Colors.border,
  },
  saveBtn: { marginTop: Spacing[4] },
});
