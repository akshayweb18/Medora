import { Medicine, ScheduledTime } from '@/types';
import { getDatabase } from './client';
import { generateId, nowISO } from '@/utils/date';
import { syncMedicineToCloud, deleteMedicineFromCloud } from '@/services/cloudSync';

function rowToMedicine(r: Record<string, unknown>): Medicine {
  return {
    id: r.id as string,
    profileId: r.profile_id as string,
    name: r.name as string,
    strength: r.strength as string | undefined,
    unit: r.unit as Medicine['unit'],
    dosageInstructions: r.dosage_instructions as string,
    frequency: r.frequency as Medicine['frequency'],
    scheduledTimes: JSON.parse((r.scheduled_times as string) || '[]') as ScheduledTime[],
    weekdays: r.weekdays ? JSON.parse(r.weekdays as string) : undefined,
    startDate: r.start_date as string,
    endDate: r.end_date as string | undefined,
    prescribingDoctor: r.prescribing_doctor as string | undefined,
    notes: r.notes as string | undefined,
    isArchived: Boolean(r.is_archived),
    color: r.color as string,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function getMedicinesByProfile(
  profileId: string,
  includeArchived = false
): Promise<Medicine[]> {
  const db = await getDatabase();
  const query = includeArchived
    ? 'SELECT * FROM medicines WHERE profile_id = ? ORDER BY name ASC'
    : 'SELECT * FROM medicines WHERE profile_id = ? AND is_archived = 0 ORDER BY name ASC';
  const rows = await db.getAllAsync<Record<string, unknown>>(query, [profileId]);
  return rows.map(rowToMedicine);
}

export async function getMedicineById(id: string): Promise<Medicine | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM medicines WHERE id = ?', [id]
  );
  return row ? rowToMedicine(row) : null;
}

export type CreateMedicineInput = Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>;

export async function createMedicine(data: CreateMedicineInput): Promise<Medicine> {
  const db = await getDatabase();
  const id = generateId();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO medicines
       (id, profile_id, name, strength, unit, dosage_instructions, frequency,
        scheduled_times, weekdays, start_date, end_date, prescribing_doctor,
        notes, is_archived, color, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, data.profileId, data.name, data.strength ?? null, data.unit,
      data.dosageInstructions, data.frequency,
      JSON.stringify(data.scheduledTimes),
      data.weekdays ? JSON.stringify(data.weekdays) : null,
      data.startDate, data.endDate ?? null,
      data.prescribingDoctor ?? null, data.notes ?? null,
      data.isArchived ? 1 : 0, data.color, now, now,
    ]
  );
  const created: Medicine = { ...data, id, createdAt: now, updatedAt: now };
  syncMedicineToCloud(created).catch(() => {});
  return created;
}

export async function updateMedicine(
  id: string,
  data: Partial<CreateMedicineInput>
): Promise<void> {
  const db = await getDatabase();
  const now = nowISO();
  await db.runAsync(
    `UPDATE medicines SET
       name                = COALESCE(?, name),
       strength            = ?,
       unit                = COALESCE(?, unit),
       dosage_instructions = COALESCE(?, dosage_instructions),
       frequency           = COALESCE(?, frequency),
       scheduled_times     = COALESCE(?, scheduled_times),
       weekdays            = ?,
       start_date          = COALESCE(?, start_date),
       end_date            = ?,
       prescribing_doctor  = ?,
       notes               = ?,
       is_archived         = COALESCE(?, is_archived),
       color               = COALESCE(?, color),
       updated_at          = ?
     WHERE id = ?`,
    [
      data.name ?? null, data.strength ?? null,
      data.unit ?? null, data.dosageInstructions ?? null,
      data.frequency ?? null,
      data.scheduledTimes ? JSON.stringify(data.scheduledTimes) : null,
      data.weekdays ? JSON.stringify(data.weekdays) : null,
      data.startDate ?? null, data.endDate ?? null,
      data.prescribingDoctor ?? null, data.notes ?? null,
      data.isArchived != null ? (data.isArchived ? 1 : 0) : null,
      data.color ?? null, now, id,
    ]
  );
  getMedicineById(id).then((m) => {
    if (m) syncMedicineToCloud(m).catch(() => {});
  });
}

export async function archiveMedicine(id: string): Promise<void> {
  await updateMedicine(id, { isArchived: true });
}

export async function deleteMedicine(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM medicines WHERE id = ?', [id]);
  deleteMedicineFromCloud(id).catch(() => {});
}
