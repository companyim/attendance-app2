import { useState, useEffect } from 'react';
import api from '../../services/api';
import { Student, Grade } from '../../types/Student';
import GradeFilter from './GradeFilter';
import DatePicker from './DatePicker';
import Button from '../common/Button';

export default function MassAttendanceCheck() {
  const [selectedGrade, setSelectedGrade] = useState<Grade | ''>('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [students, setStudents] = useState<Student[]>([]);
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent'>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // 학생 목록 로드 (학년별)
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedGrade) {
        setStudents([]);
        return;
      }

      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append('grade', selectedGrade);

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
  }, [selectedGrade]);

  // 기존 출석 기록 로드
  useEffect(() => {
    async function fetchAttendance() {
      if (!selectedDate || !selectedGrade) return;

      try {
        const params = new URLSearchParams();
        params.append('date', selectedDate);
        params.append('grade', selectedGrade);
        params.append('type', 'mass');

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
  }, [selectedDate, selectedGrade]);

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

    if (!selectedGrade) {
      setMessage('학년을 선택해주세요.');
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
            date: selectedDate,
            status,
            type: 'mass', // 미사출석
            talentAmount: status === 'present' ? 1 : 0, // 출석시 달란트 1개
          });
          successCount++;
        }
      }
      
      setMessage(`미사출석이 저장되었습니다. (${successCount}명, 교리출석과 무관하게 미사만 반영)`);
    } catch (error: any) {
      setMessage(error.response?.data?.error || '저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
        <h2 className="text-xl font-bold">미사출석 체크</h2>
        <span className="text-sm text-orange-600 bg-orange-100 px-2 py-1 rounded">출석 시 달란트 +1</span>
        <span className="text-sm text-slate-600 bg-slate-100 px-2 py-1 rounded">수정 가능 · 교리출석과 별도</span>
      </div>

      {/* 필터 영역 */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GradeFilter 
            selectedGrade={selectedGrade} 
            onGradeChange={setSelectedGrade}
            required={true}
            label="학년 선택 (필수)"
          />
          <DatePicker 
            selectedDate={selectedDate} 
            onDateChange={setSelectedDate} 
          />
        </div>
        {!selectedGrade && (
          <div className="mt-2 text-sm text-amber-600 bg-amber-50 p-2 rounded">
            ⚠️ 미사출석은 학년별로 체크합니다. 학년을 선택해주세요.
          </div>
        )}
        {selectedGrade && (
          <div className="mt-2 text-sm text-slate-600 bg-slate-50 p-2 rounded">
            💡 여기서 수정해도 교리출석에는 영향 없습니다. 미사만 따로 수정할 수 있습니다.
          </div>
        )}
      </div>

      {/* 일괄 출석 버튼 */}
      {selectedGrade && students.length > 0 && (
        <div className="mb-4 flex gap-2 flex-wrap">
          <Button onClick={handleAllPresent} variant="secondary">
            전원 출석
          </Button>
          <Button onClick={handleReset} variant="secondary">
            초기화
          </Button>
          <Button 
            onClick={handleSave} 
            isLoading={saving}
            disabled={!selectedDate || !selectedGrade}
          >
            저장
          </Button>
        </div>
      )}

      {message && (
        <div className={`mb-4 p-3 rounded ${message.includes('오류') ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'}`}>
          {message}
        </div>
      )}

      {/* 학생 목록 */}
      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {selectedGrade ? '학생이 없습니다.' : '학년을 선택해주세요.'}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-orange-50">
                <tr>
                  <th className="px-2 md:px-4 py-3 text-left whitespace-nowrap">번호</th>
                  <th className="px-2 md:px-4 py-3 text-left whitespace-nowrap">이름</th>
                  <th className="px-2 md:px-4 py-3 text-left whitespace-nowrap">세례명</th>
                  <th className="px-2 md:px-4 py-3 text-center whitespace-nowrap">출석</th>
                  <th className="px-2 md:px-4 py-3 text-center whitespace-nowrap">결석</th>
                  <th className="px-2 md:px-4 py-3 text-center whitespace-nowrap">취소</th>
                  <th className="px-2 md:px-4 py-3 text-left whitespace-nowrap">달란트</th>
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-t hover:bg-gray-50">
                    <td className="px-2 md:px-4 py-3 text-blue-600 font-medium whitespace-nowrap">{student.studentNumber}</td>
                    <td className="px-2 md:px-4 py-3 font-medium whitespace-nowrap">{student.name}</td>
                    <td className="px-2 md:px-4 py-3 text-gray-600 whitespace-nowrap">{student.baptismName || '-'}</td>
                    <td className="px-2 md:px-4 py-3 text-center">
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'present')}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full text-sm md:text-base ${
                          attendanceMap[student.id] === 'present'
                            ? 'bg-orange-500 text-white'
                            : 'bg-gray-200 hover:bg-orange-200'
                        }`}
                      >
                        ✓
                      </button>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-center">
                      <button
                        onClick={() => handleAttendanceChange(student.id, 'absent')}
                        className={`w-8 h-8 md:w-10 md:h-10 rounded-full text-sm md:text-base ${
                          attendanceMap[student.id] === 'absent'
                            ? 'bg-red-500 text-white'
                            : 'bg-gray-200 hover:bg-red-200'
                        }`}
                      >
                        ✗
                      </button>
                    </td>
                    <td className="px-2 md:px-4 py-3 text-center">
                      {attendanceMap[student.id] && (
                        <button
                          onClick={() => {
                            const newMap = { ...attendanceMap };
                            delete newMap[student.id];
                            setAttendanceMap(newMap);
                          }}
                          className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gray-300 hover:bg-gray-400 text-gray-600 text-sm md:text-base"
                          title="출석 취소"
                        >
                          ↺
                        </button>
                      )}
                    </td>
                    <td className="px-2 md:px-4 py-3 whitespace-nowrap">{student.talent}개</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
