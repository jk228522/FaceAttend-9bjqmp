import { useState, useCallback } from 'react';
import {
  getAllPersons,
  Person,
  getAllEmbeddings,
  FaceEmbedding,
} from '@/services/DatabaseService';
import { StoredEmbedding } from '@/services/FaceRecognitionService';

export function usePersons() {
  const [persons, setPersons] = useState<Person[]>([]);
  const [loading, setLoading] = useState(false);

  const loadPersons = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getAllPersons();
      setPersons(list);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStoredEmbeddings = useCallback(async (): Promise<StoredEmbedding[]> => {
    const [allPersons, allEmbs] = await Promise.all([getAllPersons(), getAllEmbeddings()]);
    const personMap = new Map<number, string>();
    for (const p of allPersons) personMap.set(p.id, p.name);

    return allEmbs.map((e: FaceEmbedding) => ({
      personId: e.person_id,
      personName: personMap.get(e.person_id) ?? 'Unknown',
      embedding: JSON.parse(e.embedding) as number[],
    }));
  }, []);

  return { persons, loading, loadPersons, loadStoredEmbeddings };
}
