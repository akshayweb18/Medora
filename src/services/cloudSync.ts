/**
 * Firebase Firestore Cloud Sync Service
 * Seamlessly syncs local SQLite health data with Firebase in the background.
 */
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { firestore } from './firebase';
import { Profile, Medicine, DoseLog, HealthMeasurement, MedicalReport } from '@/types';
import { getDatabase } from '@/db/client';

/**
 * Remove undefined values from object before sending to Firestore
 */
function sanitize<T extends Record<string, any>>(obj: T): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
export async function syncProfileToCloud(profile: Profile): Promise<void> {
  try {
    const ref = doc(firestore, 'profiles', profile.id);
    await setDoc(ref, sanitize(profile), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync profile to Firebase:', err);
  }
}

export async function deleteProfileFromCloud(profileId: string): Promise<void> {
  try {
    const ref = doc(firestore, 'profiles', profileId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete profile from Firebase:', err);
  }
}

// ─── Medicines ────────────────────────────────────────────────────────────────
export async function syncMedicineToCloud(medicine: Medicine): Promise<void> {
  try {
    const ref = doc(firestore, 'medicines', medicine.id);
    await setDoc(ref, sanitize(medicine), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync medicine to Firebase:', err);
  }
}

export async function deleteMedicineFromCloud(medicineId: string): Promise<void> {
  try {
    const ref = doc(firestore, 'medicines', medicineId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete medicine from Firebase:', err);
  }
}

// ─── Dose Logs ────────────────────────────────────────────────────────────────
export async function syncDoseLogToCloud(doseLog: DoseLog): Promise<void> {
  try {
    const ref = doc(firestore, 'doseLogs', doseLog.id);
    await setDoc(ref, sanitize(doseLog), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync dose log to Firebase:', err);
  }
}

// ─── Health Measurements ──────────────────────────────────────────────────────
export async function syncMeasurementToCloud(measurement: HealthMeasurement): Promise<void> {
  try {
    const ref = doc(firestore, 'healthMeasurements', measurement.id);
    await setDoc(ref, sanitize(measurement), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync measurement to Firebase:', err);
  }
}

export async function deleteMeasurementFromCloud(measurementId: string): Promise<void> {
  try {
    const ref = doc(firestore, 'healthMeasurements', measurementId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete measurement from Firebase:', err);
  }
}

// ─── Medical Reports ──────────────────────────────────────────────────────────
export async function syncReportToCloud(report: MedicalReport): Promise<void> {
  try {
    const ref = doc(firestore, 'medicalReports', report.id);
    await setDoc(ref, sanitize(report), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync report to Firebase:', err);
  }
}

export async function deleteReportFromCloud(reportId: string): Promise<void> {
  try {
    const ref = doc(firestore, 'medicalReports', reportId);
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete report from Firebase:', err);
  }
}

// ─── Full Sync (Local SQLite -> Cloud) ────────────────────────────────────────
export async function syncAllLocalDataToCloud(): Promise<void> {
  try {
    const db = await getDatabase();

    // Sync profiles
    const profiles = await db.getAllAsync<any>('SELECT * FROM profiles');
    for (const p of profiles) {
      await syncProfileToCloud({
        id: p.id,
        name: p.name,
        relationship: p.relationship,
        dateOfBirth: p.date_of_birth,
        gender: p.gender,
        bloodGroup: p.blood_group,
        avatarUri: p.avatar_uri,
        isDefault: Boolean(p.is_default),
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      });
    }

    // Sync medicines
    const medicines = await db.getAllAsync<any>('SELECT * FROM medicines');
    for (const m of medicines) {
      await syncMedicineToCloud({
        id: m.id,
        profileId: m.profile_id,
        name: m.name,
        strength: m.strength,
        unit: m.unit,
        dosageInstructions: m.dosage_instructions,
        frequency: m.frequency,
        scheduledTimes: JSON.parse(m.scheduled_times || '[]'),
        weekdays: m.weekdays ? JSON.parse(m.weekdays) : undefined,
        startDate: m.start_date,
        endDate: m.end_date,
        prescribingDoctor: m.prescribing_doctor,
        notes: m.notes,
        isArchived: Boolean(m.is_archived),
        color: m.color,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      });
    }

    // Sync dose logs
    const doseLogs = await db.getAllAsync<any>('SELECT * FROM dose_logs');
    for (const d of doseLogs) {
      await syncDoseLogToCloud({
        id: d.id,
        medicineId: d.medicine_id,
        profileId: d.profile_id,
        scheduledFor: d.scheduled_for,
        takenAt: d.taken_at,
        status: d.status,
        notes: d.notes,
        createdAt: d.created_at,
      });
    }

    // Sync measurements
    const measurements = await db.getAllAsync<any>('SELECT * FROM health_measurements');
    for (const hm of measurements) {
      await syncMeasurementToCloud({
        id: hm.id,
        profileId: hm.profile_id,
        type: hm.type,
        value: hm.value,
        value2: hm.value2,
        unit: hm.unit,
        measuredAt: hm.measured_at,
        notes: hm.notes,
        createdAt: hm.created_at,
      });
    }

    // Sync reports
    const reports = await db.getAllAsync<any>('SELECT * FROM medical_reports');
    for (const r of reports) {
      await syncReportToCloud({
        id: r.id,
        profileId: r.profile_id,
        title: r.title,
        category: r.category,
        documentDate: r.document_date,
        doctorOrHospital: r.doctor_hospital,
        notes: r.notes,
        filePath: r.file_path,
        fileName: r.file_name,
        fileType: r.file_type,
        fileSizeBytes: r.file_size_bytes,
        cloudinaryUrl: r.cloudinary_url,
        cloudinaryPublicId: r.cloudinary_public_id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      });
    }
  } catch (err) {
    console.warn('[CloudSync] Full sync error:', err);
  }
}
