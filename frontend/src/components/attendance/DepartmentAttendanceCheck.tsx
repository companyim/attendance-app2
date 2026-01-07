import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Student } from '../../types/Student';
import { Department } from '../../types/Department';
import DepartmentSelect from '../department/DepartmentSelect';
import DatePicker from './DatePicker';
import Button from '../common/Button';

export default function DepartmentAttendanceCheck() {
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

  // 학생 목록 로드 (부서별)
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedDepartment) {
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('departmentId', selectedDepartment);

        const response = await api.get(`/students?${params.toString()}`);
        setStudents(response.data.students || []);
      } catch (error) {
        console.error('학생 목록 로드 실패:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudents();
  }, [selectedDepartment]);

  // 기존 출석 기록 로드
  useEffect(() => {
    async function fetchAttendance() {
      if (!selectedDate || !selectedDepartment) {
        setAttendanceMap({});
        return;
      }

      try {
        const params = new URLSearchParams();
        params.append('date', selectedDate);
        params.append('departmentId', selectedDepartment);
        params.append('type', 'department'); // 부서 출석 타입

        const response = await api.get(`/attendance?${params.toString()}`);
        const map: Record<string, 'present' | 'absent'> = {};
        for (const record of response.data.attendance || []) {
          map[record.studentId] = record.status;
        }
        setAttendanceMap(map);
      } catch (error) {
        console.error('출석 기록 로드 실패:', error);
      }
    }
    fetchAttendance();
  }, [selectedDate, selectedDepartment]);

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

  const handleReset = () => {
    if (!confirm('출석 체크를 초기화하시겠습니까?')) return;
    setAttendanceMap({});
  };

  const handleSave = async () => {
    if (!selectedDate) {
      setMessage('날짜를 선택해주세요.');
      return;
    }

    if (!selectedDepartment) {
      setMessage('부서를 선택해주세요.');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      let successCount = 0;
      
      for (const student of students) {
        const status = attendanceMap[student.id];
        if (status) {
          await api.post('/attendance', {
            studentId: student.id,
            departmentId: selectedDepartment,
            date: selectedDate,
            status,
            type: 'department', // 부서 출석
            talentAmount: status === 'present' ? 1 : 0, // 출석시 달란트 1개
          });
          successCount++;
        }
      }
      
      setMessage(`부서 출석이 저장되었습니다. (${successCount}명, 출석자 달란트 +1)`);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
        <h2 className="text-xl font-bold">부서 출석 체크</h2>
        <span className="text-sm text-purple-600 bg-purple-100 px-2 py-1 rounded">출석 시 달란트 +1</span>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        <div className="mb-4 flex gap-2 flex-wrap">
          <Button onClick={handleAllPresent} variant="secondary">
            전원 출석
          </Button>
          <Button onClick={handleReset} variant="secondary">
            초기화
          </Button>
          <Button onClick={handleSave} isLoading={saving}>
            저장
          </Button>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'}`}>
          {message}
        </div>
      )}

      {/* 학생 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {selectedDepartment ? '해당 부서에 학생이 없습니다.' : '부서를 선택해주세요.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-purple-50">
              <tr>
                <th className="px-4 py-3 text-left">번호</th>
                <th className="px-4 py-3 text-left">이름</th>
                <th className="px-4 py-3 text-left">세례명</th>
                <th className="px-4 py-3 text-left">달란트</th>
                <th className="px-4 py-3 text-center">출석</th>
                <th className="px-4 py-3 text-center">결석</th>
                <th className="px-4 py-3 text-center">취소</th>
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={student.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3 text-blue-600 font-medium">{student.studentNumber}</td>
                  <td className="px-4 py-3 font-medium">{student.name}</td>
                  <td className="px-4 py-3 text-gray-600">{student.baptismName || '-'}</td>
                  <td className="px-4 py-3">{student.talent}개</td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleAttendanceChange(student.id, 'present')}
                      className={`w-10 h-10 rounded-full ${
                        attendanceMap[student.id] === 'present'
                          ? 'bg-purple-500 text-white'
                          : 'bg-gray-200 hover:bg-purple-200'
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
                  <td className="px-4 py-3 text-center">
                    {attendanceMap[student.id] && (
                      <button
                        onClick={() => {
                          const newMap = { ...attendanceMap };
                          delete newMap[student.id];
                          setAttendanceMap(newMap);
                        }}
                        className="w-10 h-10 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-600"
                        title="출석 취소"
                      >
                        ↺
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

