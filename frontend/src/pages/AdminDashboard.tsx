import React, { useState, useEffect } from 'react';
import { useNavigate, Routes, Route, NavLink } from 'react-router-dom';
import api from '../services/api';
import GradeAttendanceCheck from '../components/attendance/GradeAttendanceCheck';
import DepartmentAttendanceCheck from '../components/attendance/DepartmentAttendanceCheck';
import StudentManagement from './StudentManagement';
import Statistics from './Statistics';
import Button from '../components/common/Button';

export default function AdminDashboard() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function checkAuth() {
      try {
        const response = await api.get('/auth/admin/check');
        setIsAuthenticated(response.data.isAdmin);
        if (!response.data.isAdmin) {
          navigate('/admin/login');
        }
      } catch (error) {
        navigate('/admin/login');
      } finally {
        setLoading(false);
      }
    }

    checkAuth();
  }, [navigate]);

  const handleLogout = async () => {
    try {
      await api.post('/auth/admin/logout');
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
    } catch (error) {
      localStorage.removeItem('adminToken');
      navigate('/admin/login');
    }
  };

  if (loading) {
    return <div className="p-4">인증 확인 중...</div>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow-md mb-4">
        <div className="max-w-7xl mx-auto px-4 py-3">
          <div className="flex justify-between items-center mb-3">
            <h1 className="text-xl font-bold">관리자 대시보드</h1>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/')}>
                학생 조회 화면
              </Button>
              <Button variant="secondary" onClick={handleLogout}>
                로그아웃
              </Button>
            </div>
          </div>
          <nav className="flex gap-4 border-t pt-3">
            <NavLink
              to="/admin/dashboard"
              end
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg ${isActive ? 'bg-green-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
              }
            >
              학년 출석
            </NavLink>
            <NavLink
              to="/admin/dashboard/department-attendance"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg ${isActive ? 'bg-purple-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
              }
            >
              부서 출석
            </NavLink>
            <NavLink
              to="/admin/dashboard/students"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
              }
            >
              학생 관리
            </NavLink>
            <NavLink
              to="/admin/dashboard/statistics"
              className={({ isActive }) =>
                `px-4 py-2 rounded-lg ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 hover:bg-gray-200'}`
              }
            >
              통계
            </NavLink>
          </nav>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto">
        <Routes>
          <Route index element={<GradeAttendanceCheck />} />
          <Route path="department-attendance" element={<DepartmentAttendanceCheck />} />
          <Route path="students" element={<StudentManagement />} />
          <Route path="statistics" element={<Statistics />} />
        </Routes>
      </div>
    </div>
  );
}

