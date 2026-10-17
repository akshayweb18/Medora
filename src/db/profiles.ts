import { Profile } from '@/types';
import { getDatabase } from './client';
import { generateId, nowISO } from '@/utils/date';
import { syncProfileToCloud, deleteProfileFromCloud } from '@/services/cloudSync';

function rowToProfile(row: Record<string, unknown>): Profile {
  const r = row as Record<string, unknown>;
  return {
    id: r.id as string,
    name: r.name as string,
    relationship: r.relationship as Profile['relationship'],
    dateOfBirth: r.date_of_birth as string | undefined,
    gender: r.gender as Profile['gender'],
    bloodGroup: r.blood_group as string | undefined,
    avatarUri: r.avatar_uri as string | undefined,
    isDefault: Boolean(r.is_default),
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function getAllProfiles(): Promise<Profile[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    'SELECT * FROM profiles ORDER BY is_default DESC, name ASC'
  );
  return rows.map(rowToProfile);
}

export async function getDefaultProfile(): Promise<Profile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM profiles WHERE is_default = 1 LIMIT 1'
  );
  if (row) return rowToProfile(row);
  const first = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM profiles ORDER BY created_at ASC LIMIT 1'
  );
  return first ? rowToProfile(first) : null;
}

export async function getProfileById(id: string): Promise<Profile | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM profiles WHERE id = ?', [id]
  );
  return row ? rowToProfile(row) : null;
}

export async function createProfile(
  data: Omit<Profile, 'id' | 'createdAt' | 'updatedAt'>
): Promise<Profile> {
  const db = await getDatabase();
  const id = generateId();
  const now = nowISO();
  if (data.isDefault) {
    await db.runAsync('UPDATE profiles SET is_default = 0');
  }
  await db.runAsync(
    `INSERT INTO profiles
       (id, name, relationship, date_of_birth, gender, blood_group, avatar_uri, is_default, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, data.name, data.relationship, data.dateOfBirth ?? null,
      data.gender ?? null, data.bloodGroup ?? null,
      data.avatarUri ?? null, data.isDefault ? 1 : 0, now, now,
    ]
  );
  const created: Profile = { ...data, id, createdAt: now, updatedAt: now };
  syncProfileToCloud(created).catch(() => {});
  return created;
}

export async function updateProfile(
  id: string,
  data: Partial<Omit<Profile, 'id' | 'createdAt'>>
): Promise<void> {
  const db = await getDatabase();
  const now = nowISO();
  if (data.isDefault) {
    await db.runAsync('UPDATE profiles SET is_default = 0');
  }
  await db.runAsync(
    `UPDATE profiles SET
       name = COALESCE(?, name),
       relationship = COALESCE(?, relationship),
       date_of_birth = ?,
       gender = ?,
       blood_group = ?,
       avatar_uri = ?,
       is_default = COALESCE(?, is_default),
       updated_at = ?
     WHERE id = ?`,
    [
      data.name ?? null, data.relationship ?? null,
      data.dateOfBirth ?? null, data.gender ?? null,
      data.bloodGroup ?? null, data.avatarUri ?? null,
      data.isDefault != null ? (data.isDefault ? 1 : 0) : null,
      now, id,
    ]
  );
  getProfileById(id).then((p) => {
    if (p) syncProfileToCloud(p).catch(() => {});
  });
}

export async function deleteProfile(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM profiles WHERE id = ?', [id]);
  deleteProfileFromCloud(id).catch(() => {});
}

export async function ensureDefaultProfile(): Promise<Profile> {
  const existing = await getDefaultProfile();
  if (existing) return existing;
  return createProfile({
    name: 'Me',
    relationship: 'self',
    isDefault: true,
  });
}
