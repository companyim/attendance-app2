import { useState, useEffect } from 'react';
import api from '../services/api';
import { Department } from '../types/Department';

export function useDepartments() {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDepartments() {
      setLoading(true);
      setError(null);
      try {
        const response = await api.get('/departments');
        setDepartments(response.data);
      } catch (err: any) {
        setError(err.response?.data?.error || '부서 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchDepartments();
  }, []);

  return { departments, loading, error };
}


