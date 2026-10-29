/**
 * SQLite database client – initialises the database and runs migrations.
 * Uses expo-sqlite v15+ (SDK 52+) drizzle-compatible async API.
 */
import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

let _dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

function isDatabaseLossError(err: unknown): boolean {
  if (!err) return false;
  const msg = typeof err === 'object' && 'message' in (err as any) ? String((err as any).message) : String(err);
  return /database not found|is closed|not open|nativeDatabaseId|no such database/i.test(msg);
}

/**
 * Creates raw SQLite connection and runs schema migrations.
 */
async function openRawDatabase(): Promise<SQLite.SQLiteDatabase> {
  let db: SQLite.SQLiteDatabase;
  try {
    db = await SQLite.openDatabaseAsync('medivault.db');
  } catch (err) {
    console.warn(
      'Could not open persistent SQLite database (possibly locked or unavailable). Falling back to in-memory database:',
      err
    );
    try {
      db = await SQLite.openDatabaseAsync(':memory:');
    } catch (fallbackErr) {
      console.error('Failed to open fallback in-memory SQLite database:', fallbackErr);
      throw fallbackErr;
    }
  }

  try {
    await migrate(db);
  } catch (migrationErr) {
    console.warn('Database migration warning:', migrationErr);
  }

  return db;
}

/**
 * Low-level getter that ensures only a single connection promise is pending.
 */
function getRawDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!_dbPromise) {
    _dbPromise = openRawDatabase().catch((err) => {
      _dbPromise = null;
      throw err;
    });
  }
  return _dbPromise;
}

/**
 * Reset the database cache to allow fresh connection creation.
 */
export function resetDatabaseConnection(): void {
  _dbPromise = null;
}

/**
 * Wraps the SQLiteDatabase instance with an auto-reconnecting Proxy.
 * If any query fails due to database loss, worker termination, or closed handle,
 * it automatically recovers the connection and retries the query once.
 */
function createResilientDbProxy(dbInstance: SQLite.SQLiteDatabase): SQLite.SQLiteDatabase {
  return new Proxy(dbInstance, {
    get(target, prop, receiver) {
      if (prop === 'closeAsync') {
        return async (...args: any[]) => {
          resetDatabaseConnection();
          try {
            return await (target as any).closeAsync?.(...args);
          } catch {}
        };
      }

      const orig = (target as any)[prop];
      if (typeof orig === 'function') {
        return async (...args: any[]) => {
          try {
            return await orig.apply(target, args);
          } catch (err: unknown) {
            if (isDatabaseLossError(err)) {
              console.warn('[Database] Connection lost or database not found. Reconnecting and retrying operation...', err);
              resetDatabaseConnection();
              try {
                const freshDb = await getRawDatabase();
                const freshMethod = (freshDb as any)[prop];
                if (typeof freshMethod === 'function') {
                  return await freshMethod.apply(freshDb, args);
                }
              } catch (retryErr) {
                console.error('[Database] Failed to recover database connection on retry:', retryErr);
                throw retryErr;
              }
            }
            throw err;
          }
        };
      }

      return Reflect.get(target, prop, receiver);
    },
  });
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  const db = await getRawDatabase();
  return createResilientDbProxy(db);
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
