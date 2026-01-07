import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Button from '../components/common/Button';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await api.post('/auth/admin/login', { password });
      
      if (response.data.success) {
        // 토큰 저장
        if (response.data.token) {
          localStorage.setItem('adminToken', response.data.token);
        }
        
        // 관리자 대시보드로 이동
        navigate('/admin/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || '로그인에 실패했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h1>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block mb-2 font-medium">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-lg"
              placeholder="관리자 비밀번호를 입력하세요"
              required
            />
          </div>
          {error && <div className="text-red-600 mb-4">{error}</div>}
          <Button type="submit" isLoading={isLoading} className="w-full">
            로그인
          </Button>
        </form>
        
        <div className="mt-6 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-blue-600 hover:text-blue-800 underline"
          >
            ← 학생 조회 화면으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
}


