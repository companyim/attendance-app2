import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Student } from '../types/Student';
import { Department } from '../types/Department';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import TalentHistoryModal from '../components/common/TalentHistoryModal';

interface Attendance {
  id: string;
  date: string;
  status: 'present' | 'absent';
  type?: string;
  department: Department;
  departmentName?: string;
  talentGiven: number;
}

interface TalentTransaction {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
  attendance?: { date: string; type: string } | null;
}

interface StudentData {
  student: Student;
  attendance: Attendance[];
  transactions: TalentTransaction[];
}

type AttendanceType = 'mass' | 'doctrine';
type HistoryKind = 'present' | 'absent';

interface HistoryState {
  type: AttendanceType;
  kind: HistoryKind;
}

function summarize(records: Attendance[]) {
  const present = records.filter((a) => a.status === 'present');
  const absent = records.filter((a) => a.status === 'absent');
  const rate = records.length > 0 ? (present.length / records.length) * 100 : 0;
  return { present, absent, presentCount: present.length, absentCount: absent.length, rate };
}

export default function StudentView() {
  const { studentId } = useParams<{ studentId: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryState | null>(null);
  const [talentOpen, setTalentOpen] = useState(false);

  useEffect(() => {
    if (studentId) {
      loadStudentData();
    }
  }, [studentId]);

  const loadStudentData = async () => {
    if (!studentId) return;

    setLoading(true);
    setError('');
    setData(null);

    try {
      const response = await api.get(`/students/${studentId}`);
      setData(response.data);
    } catch (err: any) {
      setError(err?.userMessage || err.response?.data?.error || '학생 정보를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>로딩 중...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-red-100 text-red-700 p-4 rounded-lg mb-4">
            {error || '학생 정보를 찾을 수 없습니다.'}
          </div>
          <Button onClick={() => navigate('/')}>홈으로 돌아가기</Button>
        </div>
      </div>
    );
  }

  const { student, attendance } = data;

  const massRecords = attendance.filter((a) => a.type === 'mass');
  const doctrineRecords = attendance.filter((a) => a.type === 'doctrine' || !a.type);
  const mass = summarize(massRecords);
  const doctrine = summarize(doctrineRecords);

  const historySource = history?.type === 'doctrine' ? doctrine : mass;
  const historyRecords =
    history?.kind === 'present' ? historySource.present : historySource.absent;
  const typeLabel = history?.type === 'doctrine' ? '교리' : '미사';
  const kindLabel = history?.kind === 'present' ? '출석' : '결석';
  const historyTitle = `${student.name} ${typeLabel} ${kindLabel} 내역`;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate('/')}>
            ← 홈으로
          </Button>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-blue-600 mr-2">[{student.studentNumber}]</span>
            {student.name}
            {student.baptismName && (
              <span className="text-gray-600 font-normal"> ({student.baptismName})</span>
            )}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{student.grade}</div>
              <div className="text-sm text-gray-600">학년</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">
                {student.departments?.map((d) => d.name).join(', ') || '미배정'}
              </div>
              <div className="text-sm text-gray-600">부서</div>
            </div>
            <button
              type="button"
              onClick={() => setTalentOpen(true)}
              className="text-center p-3 bg-yellow-50 rounded-lg hover:ring-2 hover:ring-amber-300 transition cursor-pointer"
            >
              <div className="text-xl font-bold text-yellow-600">{student.talent}개</div>
              <div className="text-sm text-gray-600">달란트</div>
            </button>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{mass.rate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">미사 출석률</div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-1">미사 출석 현황</h2>
          <p className="text-sm text-gray-500 mb-4">숫자를 누르면 내역을 볼 수 있습니다</p>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setHistory({ type: 'mass', kind: 'present' })}
              className="flex-1 text-center p-3 bg-green-100 rounded-lg hover:ring-2 hover:ring-green-400 transition cursor-pointer"
            >
              <div className="text-2xl font-bold text-green-600">{mass.presentCount}</div>
              <div className="text-sm text-gray-600">출석</div>
            </button>
            <button
              type="button"
              onClick={() => setHistory({ type: 'mass', kind: 'absent' })}
              className="flex-1 text-center p-3 bg-red-100 rounded-lg hover:ring-2 hover:ring-red-400 transition cursor-pointer"
            >
              <div className="text-2xl font-bold text-red-600">{mass.absentCount}</div>
              <div className="text-sm text-gray-600">결석</div>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-1">교리 출석 현황</h2>
          <p className="text-sm text-gray-500 mb-4">숫자를 누르면 내역을 볼 수 있습니다</p>
          <div className="flex gap-4 mb-4">
            <button
              type="button"
              onClick={() => setHistory({ type: 'doctrine', kind: 'present' })}
              className="flex-1 text-center p-3 bg-green-100 rounded-lg hover:ring-2 hover:ring-green-400 transition cursor-pointer"
            >
              <div className="text-2xl font-bold text-green-600">{doctrine.presentCount}</div>
              <div className="text-sm text-gray-600">출석</div>
            </button>
            <button
              type="button"
              onClick={() => setHistory({ type: 'doctrine', kind: 'absent' })}
              className="flex-1 text-center p-3 bg-red-100 rounded-lg hover:ring-2 hover:ring-red-400 transition cursor-pointer"
            >
              <div className="text-2xl font-bold text-red-600">{doctrine.absentCount}</div>
              <div className="text-sm text-gray-600">결석</div>
            </button>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-lg font-bold text-blue-600">{doctrine.rate.toFixed(1)}%</div>
            <div className="text-sm text-gray-600">교리 출석률</div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={history !== null}
        onClose={() => setHistory(null)}
        title={historyTitle}
      >
        {historyRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-6">내역이 없습니다.</p>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto">
            {historyRecords.map((record) => (
              <div
                key={record.id}
                className={`flex justify-between items-center p-3 rounded-lg ${
                  record.status === 'present' ? 'bg-green-50' : 'bg-red-50'
                }`}
              >
                <div>
                  <span className="font-medium">{record.date.split('T')[0]}</span>
                  {record.talentGiven > 0 && (
                    <span className="text-yellow-600 text-sm ml-2">
                      +{record.talentGiven} 달란트
                    </span>
                  )}
                </div>
                <span
                  className={`px-2 py-1 rounded text-sm font-medium text-white ${
                    record.status === 'present' ? 'bg-green-500' : 'bg-red-500'
                  }`}
                >
                  {record.status === 'present' ? '출석' : '결석'}
                </span>
              </div>
            ))}
          </div>
        )}
      </Modal>

      <TalentHistoryModal
        isOpen={talentOpen}
        onClose={() => setTalentOpen(false)}
        studentId={student.id}
        studentName={student.name}
        currentTalent={student.talent}
      />
    </div>
  );
}
