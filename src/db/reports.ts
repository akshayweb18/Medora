import { deleteReportFromCloud, syncReportToCloud } from '@/services/cloudSync';
import { MedicalReport } from '@/types';
import { generateId, nowISO } from '@/utils/date';
import { getDatabase } from './client';

function rowToReport(r: Record<string, unknown>): MedicalReport {
  return {
    id: r.id as string,
    profileId: r.profile_id as string,
    title: r.title as string,
    category: r.category as MedicalReport['category'],
    documentDate: r.document_date as string,
    doctorOrHospital: r.doctor_hospital as string | undefined,
    notes: r.notes as string | undefined,
    filePath: r.file_path as string,
    fileName: r.file_name as string,
    fileType: r.file_type as 'pdf' | 'image',
    fileSizeBytes: r.file_size_bytes as number,
    cloudinaryUrl: r.cloudinary_url as string | undefined,
    cloudinaryPublicId: r.cloudinary_public_id as string | undefined,
    createdAt: r.created_at as string,
    updatedAt: r.updated_at as string,
  };
}

export async function getReportsByProfile(
  profileId: string,
  search?: string,
  category?: string
): Promise<MedicalReport[]> {
  const db = await getDatabase();
  let query = 'SELECT * FROM medical_reports WHERE profile_id = ?';
  const params: (string | number)[] = [profileId];
  if (category && category !== 'all') {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (title LIKE ? OR doctor_hospital LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  query += ' ORDER BY document_date DESC, created_at DESC';
  const rows = await db.getAllAsync<Record<string, unknown>>(query, params);
  return rows.map(rowToReport);
}

export async function getReportById(id: string): Promise<MedicalReport | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<Record<string, unknown>>(
    'SELECT * FROM medical_reports WHERE id = ?', [id]
  );
  return row ? rowToReport(row) : null;
}

export async function getRecentReports(profileId: string, limit = 3): Promise<MedicalReport[]> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<Record<string, unknown>>(
    `SELECT * FROM medical_reports WHERE profile_id = ?
     ORDER BY created_at DESC LIMIT ?`,
    [profileId, limit]
  );
  return rows.map(rowToReport);
}

export type CreateReportInput = Omit<MedicalReport, 'id' | 'createdAt' | 'updatedAt'>;

export async function createReport(data: CreateReportInput): Promise<MedicalReport> {
  const db = await getDatabase();
  const id = generateId();
  const now = nowISO();
  await db.runAsync(
    `INSERT INTO medical_reports
       (id, profile_id, title, category, document_date, doctor_hospital,
        notes, file_path, file_name, file_type, file_size_bytes, cloudinary_url, cloudinary_public_id, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id, data.profileId, data.title, data.category, data.documentDate,
      data.doctorOrHospital ?? null, data.notes ?? null,
      data.filePath, data.fileName, data.fileType, data.fileSizeBytes,
      data.cloudinaryUrl ?? null, data.cloudinaryPublicId ?? null, now, now,
    ]
  );
  const created: MedicalReport = { ...data, id, createdAt: now, updatedAt: now };
  syncReportToCloud(created).catch(() => { });
  return created;
}

export async function updateReport(
  id: string,
  data: Partial<Omit<MedicalReport, 'id' | 'createdAt' | 'profileId'>>
): Promise<void> {
  const db = await getDatabase();
  const now = nowISO();
  await db.runAsync(
    `UPDATE medical_reports SET
       title            = COALESCE(?, title),
       category         = COALESCE(?, category),
       document_date    = COALESCE(?, document_date),
       doctor_hospital  = ?,
       notes            = ?,
       updated_at       = ?
     WHERE id = ?`,
    [
      data.title ?? null, data.category ?? null,
      data.documentDate ?? null, data.doctorOrHospital ?? null,
      data.notes ?? null, now, id,
    ]
  );
  getReportById(id).then((r) => {
    if (r) syncReportToCloud(r).catch(() => { });
  });
}

export async function deleteReport(id: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM medical_reports WHERE id = ?', [id]);
  deleteReportFromCloud(id).catch(() => { });
}
