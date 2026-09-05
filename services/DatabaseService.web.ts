// Web stub for DatabaseService — expo-sqlite is not supported on web
// All functions return safe empty/mock values so the app renders in Live Preview

export async function getDatabase(): Promise<any> {
  return null;
}

export type Admin = {
  id: number;
  username: string;
  password_hash: string;
  created_at: string;
};

export async function getAdminByUsername(_username: string): Promise<Admin | null> {
  // Web stub: return a mock admin for preview
  return {
    id: 1,
    username: 'admin',
    password_hash: 'MOCK_HASH_admin123_REPLACE_WITH_ARGON2ID',
    created_at: new Date().toISOString(),
  };
}

export async function logAdminLogin(
  _adminId: number | null,
  _status: 'success' | 'failed',
  _photoPath?: string
): Promise<void> {}

export type Person = {
  id: number;
  name: string;
  father_name: string | null;
  age: number | null;
  created_at: string;
  updated_at: string;
};

export async function getAllPersons(): Promise<Person[]> {
  return [
    { id: 1, name: 'Ramesh Kumar', father_name: 'Suresh Kumar', age: 22, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 2, name: 'Priya Sharma', father_name: 'Anil Sharma', age: 20, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
    { id: 3, name: 'Amit Singh', father_name: 'Rajesh Singh', age: 21, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  ];
}

export async function getPersonById(_id: number): Promise<Person | null> {
  return null;
}

export async function insertPerson(
  name: string,
  fatherName: string,
  age: number
): Promise<number> {
  return Math.floor(Math.random() * 1000);
}

export async function deletePerson(_id: number): Promise<void> {}

export type FaceEmbedding = {
  id: number;
  person_id: number;
  embedding: string;
  image_no: number;
  created_at: string;
};

export async function getEmbeddingsForPerson(_personId: number): Promise<FaceEmbedding[]> {
  return [];
}

export async function getAllEmbeddings(): Promise<FaceEmbedding[]> {
  return [];
}

export async function insertEmbedding(
  _personId: number,
  _embedding: number[],
  _imageNo: number
): Promise<void> {}

export async function registerPersonAtomic(
  _name: string,
  _fatherName: string,
  _age: number,
  _embeddings: number[][]
): Promise<{ success: boolean; personId?: number; error?: string }> {
  return { success: true, personId: Math.floor(Math.random() * 1000) };
}

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

const MOCK_ATTENDANCE: AttendanceRecord[] = Array.from({ length: 28 }, (_, i) => ({
  id: i + 1,
  person_id: (i % 3) + 1,
  person_name: ['Ramesh Kumar', 'Priya Sharma', 'Amit Singh'][i % 3],
  column_1: `R${100 + i}`,
  column_2: 'COPA-1',
  column_3: 'Computer',
  column_4: `P${(i % 6) + 1}`,
  column_5: 'Present',
  column_6: null,
  column_7: null,
  column_8: null,
  timestamp: new Date(Date.now() - i * 3600000).toISOString().replace('T', ' ').substring(0, 19),
}));

export async function insertAttendance(
  _personId: number,
  _personName: string
): Promise<number> {
  return Math.floor(Math.random() * 1000);
}

export async function getAttendancePage(
  page: number,
  pageSize: number = 12
): Promise<{ records: AttendanceRecord[]; total: number }> {
  const offset = (page - 1) * pageSize;
  return {
    records: MOCK_ATTENDANCE.slice(offset, offset + pageSize),
    total: MOCK_ATTENDANCE.length,
  };
}

export async function updateAttendanceRecord(
  _id: number,
  _fields: any
): Promise<void> {}

export async function getAllAttendance(): Promise<AttendanceRecord[]> {
  return MOCK_ATTENDANCE;
}

export async function getSetting(key: string): Promise<string | null> {
  const defaults: Record<string, string> = {
    recognition_threshold: '0.85',
    duplicate_threshold: '0.90',
    dark_mode: 'true',
    sync_enabled: 'false',
    sync_endpoint: '',
    camera_timeout: '8',
  };
  return defaults[key] ?? null;
}

export async function setSetting(_key: string, _value: string): Promise<void> {}

export async function getAllSettings(): Promise<Record<string, string>> {
  return {
    recognition_threshold: '0.85',
    duplicate_threshold: '0.90',
    dark_mode: 'true',
    sync_enabled: 'false',
    sync_endpoint: '',
    camera_timeout: '8',
  };
}
