import React, { useState, useEffect } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Student } from '../types/Student';
import { Department } from '../types/Department';
import Button from '../components/common/Button';
import { formatStudentDisplay } from '../utils/studentFormatter';

interface Attendance {
  id: string;
  date: string;
  status: 'present' | 'absent';
  department: Department;
  talentGiven: number;
}

interface TalentTransaction {
  id: string;
  type: string;
  amount: number;
  reason: string;
  createdAt: string;
}

interface StudentData {
  student: Student & { department?: Department };
  attendance: Attendance[];
  transactions: TalentTransaction[];
}

export default function StudentView() {
  const { studentName } = useParams<{ studentName: string }>();
  const location = useLocation();
  const navigate = useNavigate();
  const [data, setData] = useState<StudentData | null>(location.state as StudentData || null);
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!data && studentName) {
      loadStudentData();
    }
  }, [studentName]);

  const loadStudentData = async () => {
    if (!studentName) return;

    setLoading(true);
    setError('');

    try {
      const response = await api.get(`/students/name/${encodeURIComponent(studentName)}`);
      setData(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || '학생 정보를 불러올 수 없습니다.');
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

  const { student, attendance, transactions } = data;

  // 출석 통계 계산
  const presentCount = attendance.filter(a => a.status === 'present').length;
  const absentCount = attendance.filter(a => a.status === 'absent').length;
  const attendanceRate = attendance.length > 0 ? (presentCount / attendance.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-6">
          <Button variant="secondary" onClick={() => navigate('/')}>
            ← 홈으로
          </Button>
        </div>

        {/* 학생 정보 카드 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h1 className="text-2xl font-bold mb-2">
            <span className="text-blue-600 mr-2">[{student.studentNumber}]</span>
            {student.name}
            {student.baptismName && <span className="text-gray-600 font-normal"> ({student.baptismName})</span>}
          </h1>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="text-center p-3 bg-blue-50 rounded-lg">
              <div className="text-xl font-bold text-blue-600">{student.grade}</div>
              <div className="text-sm text-gray-600">학년</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{student.department?.name || '미배정'}</div>
              <div className="text-sm text-gray-600">부서</div>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-lg">
              <div className="text-xl font-bold text-yellow-600">{student.talent}개</div>
              <div className="text-sm text-gray-600">달란트</div>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-lg">
              <div className="text-xl font-bold text-purple-600">{attendanceRate.toFixed(1)}%</div>
              <div className="text-sm text-gray-600">출석률</div>
            </div>
          </div>
        </div>

        {/* 출석 통계 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">출석 현황</h2>
          <div className="flex gap-4 mb-4">
            <div className="flex-1 text-center p-3 bg-green-100 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{presentCount}</div>
              <div className="text-sm text-gray-600">출석</div>
            </div>
            <div className="flex-1 text-center p-3 bg-red-100 rounded-lg">
              <div className="text-2xl font-bold text-red-600">{absentCount}</div>
              <div className="text-sm text-gray-600">결석</div>
            </div>
          </div>
        </div>

        {/* 출석 기록 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">출석 기록</h2>
          {attendance.length === 0 ? (
            <p className="text-gray-500 text-center py-4">출석 기록이 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {attendance.map((record) => (
                <div
                  key={record.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    record.status === 'present' ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div>
                    <span className="font-medium">{record.date.split('T')[0]}</span>
                    <span className="text-gray-600 ml-2">({record.department?.name || '미배정'})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {record.talentGiven > 0 && (
                      <span className="text-yellow-600">+{record.talentGiven} 달란트</span>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-sm font-medium ${
                        record.status === 'present'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {record.status === 'present' ? '출석' : '결석'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 달란트 거래 내역 */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">달란트 거래 내역</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-500 text-center py-4">거래 내역이 없습니다.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className={`flex justify-between items-center p-3 rounded-lg ${
                    tx.amount > 0 ? 'bg-green-50' : 'bg-red-50'
                  }`}
                >
                  <div>
                    <span className="font-medium">{tx.reason}</span>
                    <div className="text-sm text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString('ko-KR')}
                    </div>
                  </div>
                  <span
                    className={`font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-red-600'}`}
                  >
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
