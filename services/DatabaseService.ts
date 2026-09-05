// Database Service — SQLite (expo-sqlite)
// NOTE: V1 uses unencrypted SQLite. Production upgrade: swap to op-sqlite with SQLCipher
// encryption via PRAGMA key. Database key to be stored in expo-secure-store (Keychain-backed).

import * as SQLite from 'expo-sqlite';
import { AppConfig } from '@/constants/config';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync(AppConfig.DB_NAME);
  await initializeSchema(db);
  return db;
}

async function initializeSchema(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS persons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      father_name TEXT,
      age INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS face_embeddings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER NOT NULL,
      embedding TEXT NOT NULL,
      image_no INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      person_id INTEGER,
      person_name TEXT,
      column_1 TEXT,
      column_2 TEXT,
      column_3 TEXT,
      column_4 TEXT,
      column_5 TEXT,
      column_6 TEXT,
      column_7 TEXT,
      column_8 TEXT,
      timestamp TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (person_id) REFERENCES persons(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS admin_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id INTEGER,
      login_photo_path TEXT,
      login_time TEXT NOT NULL DEFAULT (datetime('now')),
      login_status TEXT NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS backup_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      backup_path TEXT,
      status TEXT NOT NULL,
      error_message TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_person ON attendance(person_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_ts ON attendance(timestamp);
    CREATE INDEX IF NOT EXISTS idx_embeddings_person ON face_embeddings(person_id);
  `);

  // Seed default admin if none exists
  const adminCount = await database.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM admins'
  );
  if (!adminCount || adminCount.count === 0) {
    // Default admin: username=admin, password=admin123 (hashed)
    // In production: use Argon2id. Here: simple SHA-256-like via expo-crypto
    const defaultHash = 'MOCK_HASH_admin123_REPLACE_WITH_ARGON2ID';
    await database.runAsync(
      'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
      ['admin', defaultHash]
    );
  }

  // Seed default settings
  const defaultSettings = [
    ['recognition_threshold', '0.85'],
    ['duplicate_threshold', '0.90'],
    ['dark_mode', 'true'],
    ['sync_enabled', 'false'],
    ['sync_endpoint', ''],
    ['camera_timeout', '8'],
  ];
  for (const [key, value] of defaultSettings) {
    await database.runAsync(
      'INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)',
      [key, value]
    );
  }
}

// ─── Admin Operations ────────────────────────────────────────────────────────

export type Admin = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

export async function getAdminByUsername(username: string): Promise<Admin | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Admin>('SELECT * FROM admins WHERE username = ?', [username]);
}

export async function logAdminLogin(
  adminId: number | null,
  status: 'success' | 'failed',
  photoPath?: string
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO admin_logs (admin_id, login_status, login_photo_path) VALUES (?, ?, ?)',
    [adminId, status, photoPath ?? null]
  );
}

// ─── Person Operations ───────────────────────────────────────────────────────

export type Person = {
  id: number;
  name: string;
  father_name: string | null;
  age: number | null;
  created_at: string;
  updated_at: string;
};

export async function getAllPersons(): Promise<Person[]> {
  const db = await getDatabase();
  return db.getAllAsync<Person>('SELECT * FROM persons ORDER BY name ASC');
}

export async function getPersonById(id: number): Promise<Person | null> {
  const db = await getDatabase();
  return db.getFirstAsync<Person>('SELECT * FROM persons WHERE id = ?', [id]);
}

export async function insertPerson(
  name: string,
  fatherName: string,
  age: number
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO persons (name, father_name, age) VALUES (?, ?, ?)',
    [name, fatherName, age]
  );
  return result.lastInsertRowId;
}

export async function deletePerson(id: number): Promise<void> {
  const db = await getDatabase();
  await db.runAsync('DELETE FROM persons WHERE id = ?', [id]);
}

// ─── Face Embedding Operations ───────────────────────────────────────────────

export type FaceEmbedding = {
  id: number;
  person_id: number;
  embedding: string; // JSON array string
  image_no: number;
  created_at: string;
};

export async function getEmbeddingsForPerson(personId: number): Promise<FaceEmbedding[]> {
  const db = await getDatabase();
  return db.getAllAsync<FaceEmbedding>(
    'SELECT * FROM face_embeddings WHERE person_id = ?',
    [personId]
  );
}

export async function getAllEmbeddings(): Promise<FaceEmbedding[]> {
  const db = await getDatabase();
  return db.getAllAsync<FaceEmbedding>('SELECT * FROM face_embeddings');
}

export async function insertEmbedding(
  personId: number,
  embedding: number[],
  imageNo: number
): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT INTO face_embeddings (person_id, embedding, image_no) VALUES (?, ?, ?)',
    [personId, JSON.stringify(embedding), imageNo]
  );
}

// ─── Atomic Registration Transaction ─────────────────────────────────────────

export async function registerPersonAtomic(
  name: string,
  fatherName: string,
  age: number,
  embeddings: number[][]
): Promise<{ success: boolean; personId?: number; error?: string }> {
  const db = await getDatabase();
  try {
    let personId = 0;
    await db.withTransactionAsync(async () => {
      const result = await db.runAsync(
        'INSERT INTO persons (name, father_name, age) VALUES (?, ?, ?)',
        [name, fatherName, age]
      );
      personId = result.lastInsertRowId;
      for (let i = 0; i < embeddings.length; i++) {
        await db.runAsync(
          'INSERT INTO face_embeddings (person_id, embedding, image_no) VALUES (?, ?, ?)',
          [personId, JSON.stringify(embeddings[i]), i + 1]
        );
      }
    });
    return { success: true, personId };
  } catch (error: any) {
    return { success: false, error: error?.message ?? 'Registration failed' };
  }
}

// ─── Attendance Operations ───────────────────────────────────────────────────

export type AttendanceRecord = {
  id: number;
  person_id: number | null;
  person_name: string | null;
  column_1: string | null;
  column_2: string | null;
  column_3: string | null;
  column_4: string | null;
  column_5: string | null;
  column_6: string | null;
  column_7: string | null;
  column_8: string | null;
  timestamp: string;
};

export async function insertAttendance(
  personId: number,
  personName: string
): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    'INSERT INTO attendance (person_id, person_name) VALUES (?, ?)',
    [personId, personName]
  );
  return result.lastInsertRowId;
}

export async function getAttendancePage(
  page: number,
  pageSize: number = 12
): Promise<{ records: AttendanceRecord[]; total: number }> {
  const db = await getDatabase();
  const offset = (page - 1) * pageSize;
  const records = await db.getAllAsync<AttendanceRecord>(
    'SELECT * FROM attendance ORDER BY timestamp DESC LIMIT ? OFFSET ?',
    [pageSize, offset]
  );
  const countResult = await db.getFirstAsync<{ total: number }>(
    'SELECT COUNT(*) as total FROM attendance'
  );
  return { records, total: countResult?.total ?? 0 };
}

export async function updateAttendanceRecord(
  id: number,
  fields: Partial<Omit<AttendanceRecord, 'id' | 'timestamp' | 'person_id' | 'person_name'>>
): Promise<void> {
  const db = await getDatabase();
  const keys = Object.keys(fields) as (keyof typeof fields)[];
  if (keys.length === 0) return;
  const setClauses = keys.map((k) => `${k} = ?`).join(', ');
  const values = keys.map((k) => fields[k] ?? null);
  await db.runAsync(
    `UPDATE attendance SET ${setClauses} WHERE id = ?`,
    [...values, id]
  );
}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  const db = await getDatabase();
  return db.getAllAsync<AttendanceRecord>(
    'SELECT * FROM attendance ORDER BY timestamp DESC'
  );
}

// ─── Settings Operations ─────────────────────────────────────────────────────

export async function getSetting(key: string): Promise<string | null> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const db = await getDatabase();
  await db.runAsync(
    'INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, datetime("now"))',
    [key, value]
  );
}

export async function getAllSettings(): Promise<Record<string, string>> {
  const db = await getDatabase();
  const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const result: Record<string, string> = {};
  for (const row of rows) result[row.key] = row.value;
  return result;
}
