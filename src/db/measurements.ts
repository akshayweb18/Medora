import { HealthMeasurement } from '@/types';
import { getDatabase } from './client';
import { generateId, nowISO } from '@/utils/date';
import { syncMeasurementToCloud, deleteMeasurementFromCloud } from '@/services/cloudSync';

function rowToMeasurement(r: Record<string, unknown>): HealthMeasurement {
  return {
    id: r.id as string,
    profileId: r.profile_id as string,
    type: r.type as HealthMeasurement['type'],
    value: r.value as number,
    value2: r.value2 as number | undefined,
    unit: r.unit as string,
    measuredAt: r.measured_at as string,
    notes: r.notes as string | undefined,
    createdAt: r.created_at as string,
  };
}

export async function getMeasurementsByType(
  profileId: string,
  type: HealthMeasurement['type'],
  limit = 30
): Promise<HealthMeasurement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM health_measurements
     WHERE profile_id = ? AND type = ?
     ORDER BY measured_at DESC LIMIT ?`,
    [profileId, type, limit]
  );
  return rows.map(rowToMeasurement);
}

export async function getAllMeasurements(
  profileId: string,
  limit = 50
): Promise<HealthMeasurement[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM health_measurements
     WHERE profile_id = ?
     ORDER BY measured_at DESC LIMIT ?`,
    [profileId, limit]
  );
  return rows.map(rowToMeasurement);
}

export async function getLatestByType(
  profileId: string
): Promise<Record<string, HealthMeasurement>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM health_measurements h
     WHERE profile_id = ?
       AND id = (
         SELECT id FROM health_measurements
         WHERE profile_id = ? AND type = h.type
         ORDER BY measured_at DESC LIMIT 1
       )`,
    [profileId, profileId]
  );
  const result: Record<string, HealthMeasurement> = {};
  for (const r of rows) {
    result[r.type as string] = rowToMeasurement(r);
  }
  return result;
}

export type CreateMeasurementInput = Omit<HealthMeasurement, 'id' | 'createdAt'>;

export async function createMeasurement(data: CreateMeasurementInput): Promise<HealthMeasurement> {
  const db = await getDatabase();
  const id = generateId();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO health_measurements
       (id, profile_id, type, value, value2, unit, measured_at, notes, created_at)
     VALUES (?,?,?,?,?,?,?,?,?)`,
    [
      id, data.profileId, data.type, data.value,
      data.value2 ?? null, data.unit, data.measuredAt,
      data.notes ?? null, now,
    ]
  );
  const created: HealthMeasurement = { ...data, id, createdAt: now };
  syncMeasurementToCloud(created).catch(() => {});
  return created;
}

export async function deleteMeasurement(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM health_measurements WHERE id = ?', [id]);
  deleteMeasurementFromCloud(id).catch(() => {});
}
