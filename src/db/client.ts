/**
 * SQLite database client – initialises the database and runs migrations.
 * Uses expo-sqlite v15+ (SDK 52+) drizzle-compatible async API.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      let db: SQLite.SQLiteDatabase;
      try {
        db = await SQLite.openDatabaseAsync('medivault.db');
      } catch (err) {
        if (Platform.OS === 'web') {
          console.warn(
            'Could not open persistent SQLite database on web (possibly locked by another tab or worker). Falling back to in-memory database:',
            err
          );
          db = await SQLite.openDatabaseAsync(':memory:');
        } else {
          throw err;
        }
      }

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.addEventListener('beforeunload', () => {
          db.closeAsync().catch(() => {});
        });
      }

      await migrate(db);
      return db;
    })().catch((err) => {
      _dbPromise = null;
      throw err;
    });
  }
  return _dbPromise;
}

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  if (Platform.OS !== 'web') {
    try {
      await db.execAsync('PRAGMA journal_mode = WAL;');
    } catch (err) {
      console.warn('Could not set WAL journal mode:', err);
    }
  }
  try {
    await db.execAsync('PRAGMA foreign_keys = ON;');
  } catch (err) {
    console.warn('Could not set foreign keys:', err);
  }

  // ── Profiles ──────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS profiles (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      relationship  TEXT NOT NULL DEFAULT 'self',
      date_of_birth TEXT,
      gender        TEXT,
      blood_group   TEXT,
      avatar_uri    TEXT,
      is_default    INTEGER NOT NULL DEFAULT 0,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL
    );
  `);

  // ── Medicines ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medicines (
      id                   TEXT PRIMARY KEY,
      profile_id           TEXT NOT NULL,
      name                 TEXT NOT NULL,
      strength             TEXT,
      unit                 TEXT NOT NULL DEFAULT 'tablet',
      dosage_instructions  TEXT NOT NULL DEFAULT '',
      frequency            TEXT NOT NULL DEFAULT 'once_daily',
      scheduled_times      TEXT NOT NULL DEFAULT '[]',
      weekdays             TEXT,
      start_date           TEXT NOT NULL,
      end_date             TEXT,
      prescribing_doctor   TEXT,
      notes                TEXT,
      is_archived          INTEGER NOT NULL DEFAULT 0,
      color                TEXT NOT NULL DEFAULT '#27AE60',
      created_at           TEXT NOT NULL,
      updated_at           TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  // ── Dose Logs ─────────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS dose_logs (
      id             TEXT PRIMARY KEY,
      medicine_id    TEXT NOT NULL,
      profile_id     TEXT NOT NULL,
      scheduled_for  TEXT NOT NULL,
      taken_at       TEXT,
      status         TEXT NOT NULL DEFAULT 'upcoming',
      notes          TEXT,
      created_at     TEXT NOT NULL,
      FOREIGN KEY (medicine_id) REFERENCES medicines(id) ON DELETE CASCADE,
      UNIQUE(medicine_id, scheduled_for)
    );
  `);

  // ── Medical Reports ────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS medical_reports (
      id               TEXT PRIMARY KEY,
      profile_id       TEXT NOT NULL,
      title            TEXT NOT NULL,
      category         TEXT NOT NULL DEFAULT 'other',
      document_date    TEXT NOT NULL,
      doctor_hospital  TEXT,
      notes            TEXT,
      file_path        TEXT NOT NULL,
      file_name        TEXT NOT NULL,
      file_type        TEXT NOT NULL DEFAULT 'pdf',
      file_size_bytes  INTEGER NOT NULL DEFAULT 0,
      cloudinary_url   TEXT,
      cloudinary_public_id TEXT,
      created_at       TEXT NOT NULL,
      updated_at       TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);
  try { await db.execAsync('ALTER TABLE medical_reports ADD COLUMN cloudinary_url TEXT;'); } catch {}
  try { await db.execAsync('ALTER TABLE medical_reports ADD COLUMN cloudinary_public_id TEXT;'); } catch {}

  // ── Health Measurements ────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS health_measurements (
      id           TEXT PRIMARY KEY,
      profile_id   TEXT NOT NULL,
      type         TEXT NOT NULL,
      value        REAL NOT NULL,
      value2       REAL,
      unit         TEXT NOT NULL,
      measured_at  TEXT NOT NULL,
      notes        TEXT,
      created_at   TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  // ── Appointments ──────────────────────────────────────────────────────────
  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS appointments (
      id            TEXT PRIMARY KEY,
      profile_id    TEXT NOT NULL,
      doctor_name   TEXT NOT NULL,
      specialty     TEXT,
      location      TEXT,
      scheduled_at  TEXT NOT NULL,
      notes         TEXT,
      created_at    TEXT NOT NULL,
      updated_at    TEXT NOT NULL,
      FOREIGN KEY (profile_id) REFERENCES profiles(id) ON DELETE CASCADE
    );
  `);

  // ── Indices for performance ────────────────────────────────────────────────
  await db.execAsync(`
    CREATE INDEX IF NOT EXISTS idx_medicines_profile    ON medicines(profile_id);
    CREATE INDEX IF NOT EXISTS idx_dose_logs_medicine   ON dose_logs(medicine_id);
    CREATE INDEX IF NOT EXISTS idx_dose_logs_scheduled  ON dose_logs(scheduled_for);
    CREATE INDEX IF NOT EXISTS idx_reports_profile      ON medical_reports(profile_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_profile ON health_measurements(profile_id);
    CREATE INDEX IF NOT EXISTS idx_measurements_type    ON health_measurements(type, profile_id);
  `);
}
