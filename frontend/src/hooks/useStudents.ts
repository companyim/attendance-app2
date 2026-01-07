import { useState, useEffect } from 'react';
import api from '../services/api';
import { Student } from '../types/Student';

interface UseStudentsParams {
  grade?: string;
  departmentId?: string;
  search?: string;
}

export function useStudents(params: UseStudentsParams = {}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStudents() {
      setLoading(true);
      setError(null);
      try {
        const queryParams = new URLSearchParams();
        if (params.grade) queryParams.append('grade', params.grade);
        if (params.departmentId) queryParams.append('departmentId', params.departmentId);
        if (params.search) queryParams.append('search', params.search);

        const response = await api.get(`/students?${queryParams.toString()}`);
        setStudents(response.data.students || []);
      } catch (err: any) {
        setError(err.response?.data?.error || '학생 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoading(false);
      }
    }

    fetchStudents();
  }, [params.grade, params.departmentId, params.search]);

  return { students, loading, error };
}

export async function getStudentByName(name: string) {
  try {
    const response = await api.get(`/students/search?name=${encodeURIComponent(name)}`);
    return response.data;
  } catch (error: any) {
    throw new Error(error.response?.data?.error || '학생을 찾을 수 없습니다.');
  }
}


