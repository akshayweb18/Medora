/**
 * Firebase Firestore Cloud Sync Service
 * Multi-user isolated cloud synchronization.
 * Each user's data is isolated under their authenticated UID: `users/${uid}/[collectionName]/[docId]`.
 * Prevents data leaks between different accounts and guests.
 */
import { doc, setDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
import { firestore, auth } from './firebase';
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

function getUserDocRef(collectionName: string, docId: string, explicitUid?: string) {
  const uid = explicitUid || auth.currentUser?.uid;
  if (!uid) return null;
  return doc(firestore, 'users', uid, collectionName, docId);
}

function getUserCollectionRef(collectionName: string, explicitUid?: string) {
  const uid = explicitUid || auth.currentUser?.uid;
  if (!uid) return null;
  return collection(firestore, 'users', uid, collectionName);
}

// ─── Profiles ─────────────────────────────────────────────────────────────────
export async function syncProfileToCloud(profile: Profile, targetUserId?: string): Promise<void> {
  try {
    const ref = getUserDocRef('profiles', profile.id, targetUserId);
    if (!ref) return;
    await setDoc(ref, sanitize(profile), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync profile to Firebase:', err);
  }
}

export async function deleteProfileFromCloud(profileId: string): Promise<void> {
  try {
    const ref = getUserDocRef('profiles', profileId);
    if (!ref) return;
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete profile from Firebase:', err);
  }
}

// ─── Medicines ────────────────────────────────────────────────────────────────
export async function syncMedicineToCloud(medicine: Medicine): Promise<void> {
  try {
    const ref = getUserDocRef('medicines', medicine.id);
    if (!ref) return;
    await setDoc(ref, sanitize(medicine), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync medicine to Firebase:', err);
  }
}

export async function deleteMedicineFromCloud(medicineId: string): Promise<void> {
  try {
    const ref = getUserDocRef('medicines', medicineId);
    if (!ref) return;
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete medicine from Firebase:', err);
  }
}

// ─── Dose Logs ────────────────────────────────────────────────────────────────
export async function syncDoseLogToCloud(doseLog: DoseLog): Promise<void> {
  try {
    const ref = getUserDocRef('doseLogs', doseLog.id);
    if (!ref) return;
    await setDoc(ref, sanitize(doseLog), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync dose log to Firebase:', err);
  }
}

// ─── Health Measurements ──────────────────────────────────────────────────────
export async function syncMeasurementToCloud(measurement: HealthMeasurement): Promise<void> {
  try {
    const ref = getUserDocRef('healthMeasurements', measurement.id);
    if (!ref) return;
    await setDoc(ref, sanitize(measurement), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync measurement to Firebase:', err);
  }
}

export async function deleteMeasurementFromCloud(measurementId: string): Promise<void> {
  try {
    const ref = getUserDocRef('healthMeasurements', measurementId);
    if (!ref) return;
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete measurement from Firebase:', err);
  }
}

// ─── Medical Reports ──────────────────────────────────────────────────────────
export async function syncReportToCloud(report: MedicalReport): Promise<void> {
  try {
    const ref = getUserDocRef('medicalReports', report.id);
    if (!ref) return;
    await setDoc(ref, sanitize(report), { merge: true });
  } catch (err) {
    console.warn('[CloudSync] Failed to sync report to Firebase:', err);
  }
}

export async function deleteReportFromCloud(reportId: string): Promise<void> {
  try {
    const ref = getUserDocRef('medicalReports', reportId);
    if (!ref) return;
    await deleteDoc(ref);
  } catch (err) {
    console.warn('[CloudSync] Failed to delete report from Firebase:', err);
  }
}

// ─── Local DB Reset (For Logout / Account Switch) ──────────────────────────────
export async function clearAllLocalUserData(): Promise<void> {
  try {
    const db = await getDatabase();
    await db.execAsync(`
      DELETE FROM medical_reports;
      DELETE FROM dose_logs;
      DELETE FROM medicines;
      DELETE FROM health_measurements;
      DELETE FROM appointments;
      DELETE FROM profiles;
    `);
    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT INTO profiles (id, name, relationship, is_default, created_at, updated_at)
       VALUES (?, ?, ?, 1, ?, ?)`,
      ['default-profile', 'Me', 'self', now, now]
    );
  } catch (err) {
    console.warn('[CloudSync] Failed to clear local database:', err);
  }
}

// ─── Cloud -> Local Sync (Restore User's Private Data) ────────────────────────
export async function syncCloudDataToLocal(userId?: string): Promise<{ success: boolean; itemCount: number }> {
  const uid = userId || auth.currentUser?.uid;
  if (!uid) return { success: false, itemCount: 0 };

  try {
    const db = await getDatabase();

    // 1. Fetch profiles from user subcollection
    const profilesCol = getUserCollectionRef('profiles', uid);
    let profilesCount = 0;
    if (profilesCol) {
      const snap = await getDocs(profilesCol);
      if (!snap.empty) {
        await db.runAsync("DELETE FROM profiles WHERE id = 'default-profile'");
        for (const d of snap.docs) {
          const p = d.data() as Profile;
          await db.runAsync(
            `INSERT OR REPLACE INTO profiles
               (id, name, relationship, date_of_birth, gender, blood_group, avatar_uri, is_default, created_at, updated_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
              p.id, p.name, p.relationship, p.dateOfBirth ?? null,
              p.gender ?? null, p.bloodGroup ?? null, p.avatarUri ?? null,
              p.isDefault ? 1 : 0, p.createdAt, p.updatedAt
            ]
          );
          profilesCount++;
        }
      }
    }

    // 2. Fetch medicines
    const medsCol = getUserCollectionRef('medicines', uid);
    let medsCount = 0;
    if (medsCol) {
      const snap = await getDocs(medsCol);
      for (const d of snap.docs) {
        const m = d.data() as Medicine;
        await db.runAsync(
          `INSERT OR REPLACE INTO medicines
             (id, profile_id, name, strength, unit, dosage_instructions, frequency, scheduled_times, weekdays, start_date, end_date, prescribing_doctor, notes, is_archived, color, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            m.id, m.profileId, m.name, m.strength ?? null, m.unit,
            m.dosageInstructions ?? '', m.frequency, JSON.stringify(m.scheduledTimes || []),
            m.weekdays ? JSON.stringify(m.weekdays) : null, m.startDate, m.endDate ?? null,
            m.prescribingDoctor ?? null, m.notes ?? null, m.isArchived ? 1 : 0,
            m.color || '#2D9CDB', m.createdAt, m.updatedAt
          ]
        );
        medsCount++;
      }
    }

    // 3. Fetch dose logs
    const doseLogsCol = getUserCollectionRef('doseLogs', uid);
    if (doseLogsCol) {
      const snap = await getDocs(doseLogsCol);
      for (const d of snap.docs) {
        const dl = d.data() as DoseLog;
        await db.runAsync(
          `INSERT OR REPLACE INTO dose_logs
             (id, medicine_id, profile_id, scheduled_for, taken_at, status, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            dl.id, dl.medicineId, dl.profileId, dl.scheduledFor,
            dl.takenAt ?? null, dl.status, dl.notes ?? null, dl.createdAt
          ]
        );
      }
    }

    // 4. Fetch health measurements
    const hmCol = getUserCollectionRef('healthMeasurements', uid);
    if (hmCol) {
      const snap = await getDocs(hmCol);
      for (const d of snap.docs) {
        const hm = d.data() as HealthMeasurement;
        await db.runAsync(
          `INSERT OR REPLACE INTO health_measurements
             (id, profile_id, type, value, value2, unit, measured_at, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            hm.id, hm.profileId, hm.type, hm.value,
            hm.value2 ?? null, hm.unit, hm.measuredAt, hm.notes ?? null, hm.createdAt
          ]
        );
      }
    }

    // 5. Fetch medical reports (PDFs, images)
    const reportsCol = getUserCollectionRef('medicalReports', uid);
    let reportsCount = 0;
    if (reportsCol) {
      const snap = await getDocs(reportsCol);
      for (const d of snap.docs) {
        const r = d.data() as MedicalReport;
        await db.runAsync(
          `INSERT OR REPLACE INTO medical_reports
             (id, profile_id, title, category, document_date, doctor_hospital, notes, file_path, file_name, file_type, file_size_bytes, cloudinary_url, cloudinary_public_id, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            r.id, r.profileId, r.title, r.category, r.documentDate,
            r.doctorOrHospital ?? null, r.notes ?? null, r.filePath || r.cloudinaryUrl || '',
            r.fileName, r.fileType, r.fileSizeBytes || 0,
            r.cloudinaryUrl ?? null, r.cloudinaryPublicId ?? null,
            r.createdAt, r.updatedAt
          ]
        );
        reportsCount++;
      }
    }

    return { success: true, itemCount: profilesCount + medsCount + reportsCount };
  } catch (err) {
    console.warn('[CloudSync] Failed to sync cloud data to local:', err);
    return { success: false, itemCount: 0 };
  }
}

// ─── Local -> Cloud Sync (Push Local Data into User's Account) ─────────────────
export async function syncAllLocalDataToCloud(targetUserId?: string): Promise<void> {
  const uid = targetUserId || auth.currentUser?.uid;
  if (!uid) return;

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
      }, uid);
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
