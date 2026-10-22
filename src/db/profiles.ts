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
  const existing = await getProfileById(id);
  if (!existing) return;

  const now = nowISO();
  if (data.isDefault) {
    await db.runAsync('UPDATE profiles SET is_default = 0');
  }

  const name = data.name !== undefined ? data.name : existing.name;
  const relationship = data.relationship !== undefined ? data.relationship : existing.relationship;
  const dateOfBirth = data.dateOfBirth !== undefined ? data.dateOfBirth : (existing.dateOfBirth ?? null);
  const gender = data.gender !== undefined ? data.gender : (existing.gender ?? null);
  const bloodGroup = data.bloodGroup !== undefined ? data.bloodGroup : (existing.bloodGroup ?? null);
  const avatarUri = data.avatarUri !== undefined ? data.avatarUri : (existing.avatarUri ?? null);
  const isDefault = data.isDefault !== undefined ? (data.isDefault ? 1 : 0) : (existing.isDefault ? 1 : 0);

  await db.runAsync(
    `UPDATE profiles SET
       name = ?,
       relationship = ?,
       date_of_birth = ?,
       gender = ?,
       blood_group = ?,
       avatar_uri = ?,
       is_default = ?,
       updated_at = ?
     WHERE id = ?`,
    [name, relationship, dateOfBirth, gender, bloodGroup, avatarUri, isDefault, now, id]
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

export async function syncProfileWithAuthUser(user: {
  displayName?: string | null;
  photoURL?: string | null;
  email?: string | null;
}): Promise<Profile | null> {
  try {
    const defaultP = await ensureDefaultProfile();
    const updates: Partial<Omit<Profile, 'id' | 'createdAt'>> = {};

    if ((!defaultP.name || defaultP.name === 'Me') && (user.displayName || user.email)) {
      updates.name = user.displayName?.trim() || user.email?.split('@')[0] || defaultP.name;
    }

    if (user.photoURL && user.photoURL !== defaultP.avatarUri) {
      updates.avatarUri = user.photoURL;
    }

    if (Object.keys(updates).length > 0) {
      await updateProfile(defaultP.id, updates);
      return await getProfileById(defaultP.id);
    }
    return defaultP;
  } catch (err) {
    console.warn('[Profiles] Failed to sync profile with auth user:', err);
    return null;
  }
}

export async function resetProfileOnLogout(): Promise<void> {
  try {
    const defaultP = await getDefaultProfile();
    if (!defaultP) return;
    const db = await getDatabase();
    const now = nowISO();
    // Directly wipe avatar/name via SQL so NULL can be stored without type coercion issues
    await db.runAsync(
      'UPDATE profiles SET name = ?, avatar_uri = NULL, updated_at = ? WHERE id = ?',
      ['Me', now, defaultP.id]
    );
  } catch (err) {
    console.warn('[Profiles] Failed to reset profile on logout:', err);
  }
}


