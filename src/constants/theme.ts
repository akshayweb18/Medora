/**
 * MediVault Design System — colors, spacing, typography, and shadows.
 * Light-mode first; dark mode tokens provided as `dark` variants.
 */

export const Colors = {
  // Brand palette
  primary: '#2D9CDB',       // vivid blue
  primaryLight: '#E8F4FD',  // very light blue background
  primaryDark: '#1A7AB5',   // darker blue for pressed states
  secondary: '#27AE8F',     // teal / mint
  secondaryLight: '#E6F7F3',
  accent: '#F2994A',        // warm amber for warnings/alerts
  accentLight: '#FEF3EA',

  // Status colours
  success: '#27AE60',
  successLight: '#E9F7EF',
  warning: '#F2994A',
  warningLight: '#FEF3EA',
  danger: '#EB5757',
  dangerLight: '#FEF0F0',
  info: '#2D9CDB',
  infoLight: '#E8F4FD',

  // Dose status
  taken: '#27AE60',
  upcoming: '#2D9CDB',
  missed: '#EB5757',
  skipped: '#9B9B9B',
  snoozed: '#F2994A',

  // Neutrals
  white: '#FFFFFF',
  black: '#1A1A2E',
  gray50: '#F8FAFC',
  gray100: '#F1F5F9',
  gray200: '#E2E8F0',
  gray300: '#CBD5E1',
  gray400: '#94A3B8',
  gray500: '#64748B',
  gray600: '#475569',
  gray700: '#334155',
  gray800: '#1E293B',
  gray900: '#0F172A',

  // Backgrounds
  background: '#F8FAFF',
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  border: '#E2E8F0',
  borderFocus: '#2D9CDB',

  // Text
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  textDisabled: '#94A3B8',
  textInverse: '#FFFFFF',

  // Medicine accent palette (for card colours)
  medicineColors: [
    '#2D9CDB', '#27AE8F', '#9B51E0', '#F2994A',
    '#EB5757', '#219653', '#2F80ED', '#BB6BD9',
  ],
} as const;

export const Typography = {
  // Font sizes
  xs: 11,
  sm: 12,
  base: 14,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,

  // Line heights
  tight: 1.2,
  normal: 1.5,
  relaxed: 1.7,

  // Font weights (as strings for RN)
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
} as const;

export const Spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const Radius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 18,
  '2xl': 24,
  full: 9999,
} as const;

export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
} as const;

export const REPORT_CATEGORIES = [
  { key: 'blood_test',         label: 'Blood Test',         emoji: '🩸', color: '#EB5757' },
  { key: 'prescription',       label: 'Prescription',       emoji: '💊', color: '#2D9CDB' },
  { key: 'xray',               label: 'X-Ray',              emoji: '🦴', color: '#9B51E0' },
  { key: 'mri_ct',             label: 'MRI / CT',           emoji: '🧠', color: '#F2994A' },
  { key: 'discharge_summary',  label: 'Discharge Summary',  emoji: '🏥', color: '#27AE8F' },
  { key: 'allergy',            label: 'Allergy',            emoji: '⚠️', color: '#F2994A' },
  { key: 'vaccination',        label: 'Vaccination',        emoji: '💉', color: '#219653' },
  { key: 'other',              label: 'Other',              emoji: '📄', color: '#64748B' },
] as const;

export const MEASUREMENT_TYPES = [
  { key: 'blood_pressure', label: 'Blood Pressure', unit: 'mmHg', icon: '❤️', color: '#EB5757', hasTwo: true },
  { key: 'weight',         label: 'Weight',          unit: 'kg',   icon: '⚖️', color: '#9B51E0', hasTwo: false },
  { key: 'blood_glucose',  label: 'Blood Glucose',   unit: 'mg/dL',icon: '🩸', color: '#F2994A', hasTwo: false },
  { key: 'temperature',    label: 'Temperature',     unit: '°C',   icon: '🌡️', color: '#2D9CDB', hasTwo: false },
  { key: 'pulse',          label: 'Pulse',            unit: 'bpm',  icon: '💓', color: '#27AE8F', hasTwo: false },
  { key: 'spo2',           label: 'SpO₂',             unit: '%',    icon: '🫁', color: '#2F80ED', hasTwo: false },
  { key: 'height',         label: 'Height',           unit: 'cm',   icon: '📏', color: '#64748B', hasTwo: false },
] as const;

export const FREQUENCY_LABELS: Record<string, string> = {
  once_daily:        'Once daily',
  twice_daily:       'Twice daily',
  three_times_daily: '3× daily',
  four_times_daily:  '4× daily',
  custom_times:      'Custom times',
  selected_weekdays: 'Selected weekdays',
  as_needed:         'As needed',
};

export const WEEKDAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const DOSE_UNIT_LABELS: Record<string, string> = {
  tablet:    'Tablet(s)',
  capsule:   'Capsule(s)',
  ml:        'ml',
  mg:        'mg',
  drops:     'Drops',
  puff:      'Puff(s)',
  patch:     'Patch',
  injection: 'Injection',
  other:     'Other',
};
