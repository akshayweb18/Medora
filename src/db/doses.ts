import { DoseLog, DoseStatus } from '@/types';
import { getDatabase } from './client';
import { generateId, nowISO } from '@/utils/date';
import { syncDoseLogToCloud } from '@/services/cloudSync';

function rowToDoseLog(r: Record<string, unknown>): DoseLog {
  return {
    id: r.id as string,
    medicineId: r.medicine_id as string,
    profileId: r.profile_id as string,
    scheduledFor: r.scheduled_for as string,
    takenAt: r.taken_at as string | undefined,
    status: r.status as DoseStatus,
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
  };
}

/** Get all dose logs for a profile on a specific date (YYYY-MM-DD). */
export async function getDoseLogsByDate(
  profileId: string,
  dateStr: string // YYYY-MM-DD
): Promise<DoseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM dose_logs
     WHERE profile_id = ? AND scheduled_for LIKE ?
     ORDER BY scheduled_for ASC`,
    [profileId, `${dateStr}%`]
  );
  return rows.map(rowToDoseLog);
}

export async function getDoseLogsByMedicine(medicineId: string): Promise<DoseLog[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM dose_logs
     WHERE medicine_id = ?
     ORDER BY scheduled_for DESC
     LIMIT 60`,
    [medicineId]
  );
  return rows.map(rowToDoseLog);
}

export async function getDoseLogBySchedule(
  medicineId: string,
  scheduledFor: string
): Promise<DoseLog | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM dose_logs WHERE medicine_id = ? AND scheduled_for = ?',
    [medicineId, scheduledFor]
  );
  return row ? rowToDoseLog(row) : null;
}

export async function upsertDoseLog(
  medicineId: string,
  profileId: string,
  scheduledFor: string,
  status: DoseStatus,
  takenAt?: string,
  notes?: string
): Promise<DoseLog> {
  const db = await getDatabase();
  const existing = await getDoseLogBySchedule(medicineId, scheduledFor);
  const now = nowISO();
  if (existing) {
    await db.runAsync(
      `UPDATE dose_logs SET status = ?, taken_at = ?, notes = ? WHERE id = ?`,
      [status, takenAt ?? null, notes ?? null, existing.id]
    );
    const updated: DoseLog = { ...existing, status, takenAt, notes };
    syncDoseLogToCloud(updated).catch(() => {});
    return updated;
  } else {
    const id = generateId();
    await db.runAsync(
      `INSERT INTO dose_logs
         (id, medicine_id, profile_id, scheduled_for, taken_at, status, notes, created_at)
       VALUES (?,?,?,?,?,?,?,?)`,
      [id, medicineId, profileId, scheduledFor, takenAt ?? null, status, notes ?? null, now]
    );
    const created: DoseLog = { id, medicineId, profileId, scheduledFor, takenAt, status, notes, createdAt: now };
    syncDoseLogToCloud(created).catch(() => {});
    return created;
  }
}

/** Today's summary counts. */
export async function getTodaySummary(
  profileId: string,
  dateStr: string
): Promise<{ taken: number; upcoming: number; missed: number; total: number }> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT status, COUNT(*) as cnt FROM dose_logs
     WHERE profile_id = ? AND scheduled_for LIKE ?
     GROUP BY status`,
    [profileId, `${dateStr}%`]
  );
  let taken = 0, upcoming = 0, missed = 0;
  for (const r of rows) {
    const cnt = r.cnt as number;
    if (r.status === 'taken') taken = cnt;
    else if (r.status === 'upcoming') upcoming = cnt;
    else if (r.status === 'missed') missed = cnt;
  }
  return { taken, upcoming, missed, total: taken + upcoming + missed };
}
