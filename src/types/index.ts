// ─── Profile ──────────────────────────────────────────────────────────────────
export interface Profile {
  id: string;
  name: string;
  relationship: 'self' | 'spouse' | 'child' | 'parent' | 'sibling' | 'other';
  dateOfBirth?: string; // ISO date string
  gender?: 'male' | 'female' | 'other' | 'prefer_not_to_say';
  bloodGroup?: string;
  avatarUri?: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Medicine ─────────────────────────────────────────────────────────────────
export type FrequencyType =
  | 'once_daily'
  | 'twice_daily'
  | 'three_times_daily'
  | 'four_times_daily'
  | 'custom_times'
  | 'selected_weekdays'
  | 'as_needed';

export type DoseUnit =
  | 'tablet'
  | 'capsule'
  | 'ml'
  | 'mg'
  | 'drops'
  | 'puff'
  | 'patch'
  | 'injection'
  | 'other';

export interface ScheduledTime {
  hour: number;   // 0–23
  minute: number; // 0–59
}

export interface Medicine {
  id: string;
  profileId: string;
  name: string;
  strength?: string;         // e.g. "500mg", "10mg/5ml"
  unit: DoseUnit;
  dosageInstructions: string; // as-prescribed free text
  frequency: FrequencyType;
  scheduledTimes: ScheduledTime[];  // serialized to JSON in DB
  weekdays?: number[];              // 0=Sun … 6=Sat (for selected_weekdays)
  startDate: string;   // ISO date
  endDate?: string;    // ISO date, null = ongoing
  prescribingDoctor?: string;
  notes?: string;
  isArchived: boolean;
  color: string;       // hex for card accent
  createdAt: string;
  updatedAt: string;
}

// ─── Dose Log ─────────────────────────────────────────────────────────────────
export type DoseStatus = 'taken' | 'skipped' | 'missed' | 'snoozed' | 'upcoming';

export interface DoseLog {
  id: string;
  medicineId: string;
  profileId: string;
  scheduledFor: string;  // ISO datetime (scheduled date+time)
  takenAt?: string;      // ISO datetime (actual time taken)
  status: DoseStatus;
  notes?: string;
  createdAt: string;
}

// ─── Medical Report ───────────────────────────────────────────────────────────
export type ReportCategory =
  | 'blood_test'
  | 'prescription'
  | 'xray'
  | 'mri_ct'
  | 'discharge_summary'
  | 'allergy'
  | 'vaccination'
  | 'other';

export interface MedicalReport {
  id: string;
  profileId: string;
  title: string;
  category: ReportCategory;
  documentDate: string;   // ISO date
  doctorOrHospital?: string;
  notes?: string;
  filePath: string;       // local file URI
  fileName: string;
  fileType: 'pdf' | 'image';
  fileSizeBytes: number;
  cloudinaryUrl?: string;
  cloudinaryPublicId?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Health Measurement ───────────────────────────────────────────────────────
export type MeasurementType =
  | 'blood_pressure'
  | 'weight'
  | 'blood_glucose'
  | 'temperature'
  | 'pulse'
  | 'spo2'
  | 'height';

export interface HealthMeasurement {
  id: string;
  profileId: string;
  type: MeasurementType;
  value: number;
  value2?: number;   // for blood_pressure: diastolic
  unit: string;
  measuredAt: string;  // ISO datetime
  notes?: string;
  createdAt: string;
}

// ─── Appointment ─────────────────────────────────────────────────────────────
export interface Appointment {
  id: string;
  profileId: string;
  doctorName: string;
  specialty?: string;
  location?: string;
  scheduledAt: string;  // ISO datetime
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── UI Helpers ───────────────────────────────────────────────────────────────
export interface QuickStat {
  label: string;
  value: number;
  color: string;
}

export interface TodayMedicineSummary {
  taken: number;
  upcoming: number;
  missed: number;
  total: number;
}
