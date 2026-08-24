import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/common/Button';

interface Student {
  id: string;
  name: string;
  baptismName?: string;
  grade: string;
  studentNumber?: string;
  departments?: { id: string; name: string }[];
}

export default function Home() {
  const [studentName, setStudentName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchResults, setSearchResults] = useState<Student[]>([]);
  const navigate = useNavigate();

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSearchResults([]);
    
    if (!studentName.trim()) {
      setError('학생 이름을 입력해주세요.');
      return;
    }

    setLoading(true);
    try {
      const response = await api.get(`/students/search?name=${encodeURIComponent(studentName.trim())}`);
      const students = response.data.students || [];
      
      if (students.length === 0) {
        setError('학생을 찾을 수 없습니다.');
      } else if (students.length === 1) {
        // 한 명만 검색되면 바로 상세 페이지로 이동 (ID로 이동해 동명이인 구분)
        navigate(`/student/${students[0].id}`);
      } else {
        // 여러 명이면 목록 표시
        setSearchResults(students);
      }
    } catch (err: any) {
      setError(err?.userMessage || err.response?.data?.error || '학생을 찾을 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectStudent = (student: Student) => {
    navigate(`/student/${student.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">출석부 앱</h1>
          <p className="text-gray-600">학생 조회 화면 (인증 불필요)</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-4">
          <form onSubmit={handleSearch}>
            <div className="mb-4">
              <label className="block mb-2 font-medium">학생 이름</label>
              <input
                type="text"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg"
                placeholder="학생 이름을 입력하세요"
                required
              />
            </div>
            {error && <div className="text-red-600 mb-4">{error}</div>}
            <Button type="submit" isLoading={loading} className="w-full">
              조회
            </Button>
          </form>
        </div>

        <a
          href="https://gospel-quiz-two.vercel.app"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between bg-white rounded-lg shadow-md p-6 mb-4 border border-transparent hover:border-blue-300 hover:bg-blue-50 transition-colors"
        >
          <div>
            <div className="font-bold">복음퀴즈부</div>
            <div className="text-sm text-gray-600">복음 퀴즈 바로가기</div>
          </div>
          <span className="text-blue-600 text-xl" aria-hidden="true">→</span>
        </a>

        {/* 검색 결과 목록 */}
        {searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-4">
            <h2 className="text-lg font-bold mb-4">검색 결과 ({searchResults.length}명)</h2>
            <div className="space-y-2">
              {searchResults.map((student) => (
                <button
                  key={student.id}
                  onClick={() => handleSelectStudent(student)}
                  className="w-full text-left p-3 rounded-lg border hover:bg-blue-50 hover:border-blue-300 transition-colors"
                >
                  <div className="font-medium">
                    {student.studentNumber && <span className="text-blue-600 mr-2">[{student.studentNumber}]</span>}
                    {student.name}
                    {student.baptismName && <span className="text-gray-500 ml-1">({student.baptismName})</span>}
                  </div>
                  <div className="text-sm text-gray-600">
                    {student.grade} | {student.departments?.map(d => d.name).join(', ') || '부서 미배정'}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="text-center">
          <button
            onClick={() => navigate('/admin/login')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            관리자 모드로 이동
          </button>
        </div>
      </div>
    </div>
  );
}


