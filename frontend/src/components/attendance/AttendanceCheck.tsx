import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Student, Grade } from '../../types/Student';
import { Department } from '../../types/Department';
import GradeFilter from './GradeFilter';
import DatePicker from './DatePicker';
import DepartmentSelect from '../department/DepartmentSelect';
import Button from '../common/Button';

export default function AttendanceCheck() {
  const [selectedGrade, setSelectedGrade] = useState<Grade | ''>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 부서 목록 로드
  useEffect(() => {
    async function fetchDepartments() {
      try {
        const response = await api.get('/departments');
        setDepartments(response.data);
      } catch (error) {
        console.error('부서 목록 로드 실패:', error);
      }
    }
    fetchDepartments();
  }, []);

  // 학생 목록 로드 (학년 또는 부서 중 하나만 선택해도 됨)
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedGrade && !selectedDepartment) {
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (selectedGrade) {
          params.append('grade', selectedGrade);
        }
        if (selectedDepartment) {
          params.append('departmentId', selectedDepartment);
        }

        const response = await api.get(`/students?${params.toString()}`);
        const loaded = response.data.students || [];
        setStudents(loaded);
        const defaultMap: Record<string, 'present' | 'absent'> = {};
        for (const s of loaded) { defaultMap[s.id] = 'present'; }
        setAttendanceMap(defaultMap);
      } catch (error) {
        console.error('학생 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [selectedGrade, selectedDepartment]);

  // 기존 출석 기록 로드
  useEffect(() => {
    async function fetchAttendance() {
      if (!selectedDate || (!selectedGrade && !selectedDepartment)) return;

      try {
        const params = new URLSearchParams();
        params.append('date', selectedDate);
        if (selectedGrade) {
          params.append('grade', selectedGrade);
        }
        if (selectedDepartment) {
          params.append('departmentId', selectedDepartment);
        }

        const response = await api.get(`/attendance?${params.toString()}`);
        const records = response.data.attendance || [];
        if (records.length > 0) {
          const map: Record<string, 'present' | 'absent'> = {};
          for (const record of records) {
            map[record.studentId] = record.status;
          }
          setAttendanceMap(map);
        }
      } catch (error) {
        console.error('출석 기록 로드 실패:', error);
      }
    }
    fetchAttendance();
  }, [selectedDate, selectedGrade, selectedDepartment]);

  const handleAttendanceChange = (studentId: string, status: 'present' | 'absent') => {
    setAttendanceMap(prev => ({
      ...prev,
      [studentId]: status,
    }));
  };

  const handleAllPresent = () => {
    const map: Record<string, 'present' | 'absent'> = {};
    for (const student of students) {
      map[student.id] = 'present';
    }
    setAttendanceMap(map);
  };

  const handleSave = async () => {
    if (!selectedDate) {
      setMessage('날짜를 선택해주세요.');
      return;
    }

    if (!selectedGrade && !selectedDepartment) {
      setMessage('학년 또는 부서를 선택해주세요.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      let successCount = 0;
      let skipCount = 0;
      
      for (const student of students) {
        const status = attendanceMap[student.id];
        if (status) {
          // 부서가 선택되어 있으면 선택된 부서 사용, 아니면 학생의 기본 부서 사용
          const departmentId = selectedDepartment || student.departmentId;
          
          if (!departmentId) {
            skipCount++;
            continue; // 부서가 없는 학생은 건너뜀
          }
          
          await api.post('/attendance', {
            studentId: student.id,
            departmentId: departmentId,
            date: selectedDate,
            status,
          });
          successCount++;
        }
      }
      
      if (skipCount > 0) {
        setMessage(`출석 기록이 저장되었습니다. (${successCount}명 저장, ${skipCount}명 부서 미배정으로 건너뜀)`);
      } else {
        setMessage(`출석 기록이 저장되었습니다. (${successCount}명)`);
      }
    } catch (error: any) {
      setMessage(error.response?.data?.error || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return '미배정';
    const dept = departments.find(d => d.id === departmentId);
    return dept?.name || '미배정';
  };

  return (
    <div className="p-4">
      <h2 className="text-xl font-bold mb-4">출석 체크</h2>

      {/* 필터 영역 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GradeFilter 
            selectedGrade={selectedGrade} 
            onGradeChange={setSelectedGrade} 
          />
          <DepartmentSelect
            selectedId={selectedDepartment}
            onSelect={setSelectedDepartment}
            departments={departments}
            label="부서 선택"
          />
          <DatePicker 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
        </div>
      </div>

      {/* 일괄 출석 버튼 */}
      {students.length > 0 && (
        <div className="mb-4 flex gap-2">
          <Button onClick={handleAllPresent} variant="secondary">
            전원 출석
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            저장
          </Button>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message}
        </div>
      )}

      {/* 학생 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {(selectedGrade || selectedDepartment) ? '학생이 없습니다.' : '학년 또는 부서를 선택해주세요.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">세례명</th>
                <th className="px-4 py-3 text-left">부서</th>
                <th className="px-4 py-3 text-center">출석</th>
                <th className="px-4 py-3 text-center">결석</th>
                <th className="px-4 py-3 text-left">달란트</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-gray-600">{student.baptismName || '-'}</td>
                  <td className="px-4 py-3">{getDepartmentName(student.departmentId)}</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'present')}
                      className={`w-10 h-10 rounded-full ${
                        attendanceMap[student.id] === 'present'
                          ? 'bg-green-500 text-white'
                          : 'bg-gray-200 hover:bg-green-200'
                      }`}
                    >
                      ✓
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'absent')}
                      className={`w-10 h-10 rounded-full ${
                        attendanceMap[student.id] === 'absent'
                          ? 'bg-red-500 text-white'
                          : 'bg-gray-200 hover:bg-red-200'
                      }`}
                    >
                      ✗
                    </button>
                  </td>
                  <td className="px-4 py-3">{student.talent}개</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
