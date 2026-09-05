import { useState, useCallback } from 'react';
import {
  getAttendancePage,
  insertAttendance,
  updateAttendanceRecord,
  getAllAttendance,
  AttendanceRecord,
} from '@/services/DatabaseService';
import { AppConfig } from '@/constants/config';

export type AttendancePageData = {
  records: AttendanceRecord[];
  total: number;
  totalPages: number;
  currentPage: number;
};

export function useAttendance() {
  const [data, setData] = useState<AttendancePageData>({
    records: [],
    total: 0,
    totalPages: 1,
    currentPage: 1,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPage = useCallback(async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const { records, total } = await getAttendancePage(page, AppConfig.ROWS_PER_PAGE);
      setData({
        records,
        total,
        totalPages: Math.max(1, Math.ceil(total / AppConfig.ROWS_PER_PAGE)),
        currentPage: page,
      });
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  const addAttendance = useCallback(async (personId: number, personName: string) => {
    try {
      await insertAttendance(personId, personName);
      return true;
    } catch {
      return false;
    }
  }, []);

  const saveEdit = useCallback(async (
    id: number,
    fields: Partial<Omit<AttendanceRecord, 'id' | 'timestamp' | 'person_id' | 'person_name'>>
  ) => {
    try {
      await updateAttendanceRecord(id, fields);
      return true;
    } catch {
      return false;
    }
  }, []);

  const exportAll = useCallback(async (): Promise<AttendanceRecord[]> => {
    return getAllAttendance();
  }, []);

  return { data, loading, error, loadPage, addAttendance, saveEdit, exportAll };
}
