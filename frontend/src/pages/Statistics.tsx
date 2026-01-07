import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useDepartments } from '../hooks/useDepartments';
import Button from '../components/common/Button';

interface DateGradeData {
  date: string;
  grades: { grade: string; rate: number; present: number; total: number }[];
}

interface DateDepartmentData {
  date: string;
  departments: { departmentId: string; departmentName: string; rate: number; present: number; total: number }[];
}

export default function Statistics() {
  const [overview, setOverview] = useState<any>(null);
  const [gradesComparison, setGradesComparison] = useState<any>(null);
  const [departmentsComparison, setDepartmentsComparison] = useState<any>(null);
  const [dateGradeComparison, setDateGradeComparison] = useState<DateGradeData[]>([]);
  const [dateDepartmentComparison, setDateDepartmentComparison] = useState<DateDepartmentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [selectedGrade, setSelectedGrade] = useState<string>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'dateGrade' | 'dateDepartment'>('overview');

  const { departments } = useDepartments();

  useEffect(() => {
    loadStatistics();
  }, [selectedGrade, selectedDepartment]);

  const loadStatistics = async () => {
    setLoading(true);
    try {
      const params: any = {};
      if (selectedGrade) params.grade = selectedGrade;
      if (selectedDepartment) params.departmentId = selectedDepartment;

      const [overviewRes, gradesRes, deptRes, dateGradeRes, dateDeptRes] = await Promise.all([
        api.get('/statistics/overview', { params }),
        api.get('/statistics/grades'),
        api.get('/statistics/departments'),
        api.get('/statistics/date-grade-comparison'),
        api.get('/statistics/date-department-comparison'),
      ]);

      setOverview(overviewRes.data);
      setGradesComparison(gradesRes.data.comparison);
      setDepartmentsComparison(deptRes.data.comparison);
      setDateGradeComparison(dateGradeRes.data.comparison || []);
      setDateDepartmentComparison(dateDeptRes.data.comparison || []);
    } catch (error) {
      console.error('통계 로드 실패:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await api.get('/statistics/export-excel', {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `출석부_데이터_${new Date().toISOString().split('T')[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('엑셀 내보내기 실패:', error);
      alert('엑셀 내보내기에 실패했습니다.');
    } finally {
      setExporting(false);
    }
  };

  const getAttendanceColor = (rate: number) => {
    if (rate >= 80) return 'bg-green-500';
    if (rate >= 60) return 'bg-yellow-500';
    if (rate >= 40) return 'bg-orange-500';
    return 'bg-red-500';
  };

  if (loading) {
    return <div className="p-4">통계 로딩 중...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">통계 대시보드</h1>
        <Button onClick={handleExportExcel} isLoading={exporting} variant="primary">
          📥 전체 데이터 엑셀 내보내기
        </Button>
      </div>

      {/* 탭 네비게이션 */}
      <div className="flex gap-2 border-b pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'overview'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          전체 현황
        </button>
        <button
          onClick={() => setActiveTab('dateGrade')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'dateGrade'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          날짜별 학년 비교
        </button>
        <button
          onClick={() => setActiveTab('dateDepartment')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'dateDepartment'
              ? 'bg-purple-600 text-white'
              : 'bg-gray-100 hover:bg-gray-200'
          }`}
        >
          날짜별 부서 비교
        </button>
      </div>

      {/* 전체 현황 탭 */}
      {activeTab === 'overview' && (
        <>
          {/* 필터 */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 font-medium">학년별 필터</label>
                <select
                  value={selectedGrade}
                  onChange={(e) => setSelectedGrade(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">전체</option>
                  <option value="유치부">유치부</option>
                  <option value="1학년">1학년</option>
                  <option value="2학년">2학년</option>
                  <option value="첫영성체">첫영성체</option>
                  <option value="4학년">4학년</option>
                  <option value="5학년">5학년</option>
                  <option value="6학년">6학년</option>
                </select>
              </div>
              <div>
                <label className="block mb-2 font-medium">부서별 필터</label>
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  <option value="">전체</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 전체 현황 */}
          {overview && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">전체 현황</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <div className="text-2xl font-bold text-blue-600">{overview.studentCount}</div>
                  <div className="text-gray-600">학생 수</div>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">{overview.attendanceCount}</div>
                  <div className="text-gray-600">출석 기록</div>
                </div>
                <div className="text-center p-4 bg-yellow-50 rounded-lg">
                  <div className="text-2xl font-bold text-yellow-600">
                    {overview.attendanceRate.toFixed(1)}%
                  </div>
                  <div className="text-gray-600">출석률</div>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <div className="text-2xl font-bold text-purple-600">{overview.totalTalent}</div>
                  <div className="text-gray-600">총 달란트</div>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-gray-600">출석: {overview.presentCount}</div>
                  <div className="text-sm text-gray-600">결석: {overview.absentCount}</div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">
                    평균 달란트: {overview.averageTalent.toFixed(1)}개
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 학년별 비교 */}
          {gradesComparison && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">학년별 출석률 비교</h2>
              <div className="space-y-3">
                {gradesComparison.map((item: any) => (
                  <div key={item.grade}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{item.grade}</span>
                      <span className="text-gray-600">
                        {item.attendanceRate.toFixed(1)}% ({item.presentCount}/{item.totalAttendance})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{ width: `${item.attendanceRate}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      학생 수: {item.studentCount}명
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 부서별 비교 */}
          {departmentsComparison && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold mb-4">부서별 출석률 비교</h2>
              <div className="space-y-3">
                {departmentsComparison.map((item: any) => (
                  <div key={item.department.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-medium">{item.department.name}</span>
                      <span className="text-gray-600">
                        {item.attendanceRate.toFixed(1)}% ({item.presentCount}/{item.totalAttendance})
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-green-600 h-2 rounded-full"
                        style={{ width: `${item.attendanceRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* 날짜별 학년 비교 탭 */}
      {activeTab === 'dateGrade' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">📅 날짜별 학년 출석률 비교</h2>
          {dateGradeComparison.length === 0 ? (
            <p className="text-gray-500 text-center py-8">출석 기록이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-green-50">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">날짜</th>
                    <th className="px-3 py-2 text-center font-medium">유치부</th>
                    <th className="px-3 py-2 text-center font-medium">1학년</th>
                    <th className="px-3 py-2 text-center font-medium">2학년</th>
                    <th className="px-3 py-2 text-center font-medium">첫영성체</th>
                    <th className="px-3 py-2 text-center font-medium">4학년</th>
                    <th className="px-3 py-2 text-center font-medium">5학년</th>
                    <th className="px-3 py-2 text-center font-medium">6학년</th>
                  </tr>
                </thead>
                <tbody>
                  {dateGradeComparison.map((dateData) => (
                    <tr key={dateData.date} className="border-t hover:bg-gray-50">
                      <td className="px-3 py-2 font-medium">{dateData.date}</td>
                      {['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'].map((grade) => {
                        const gradeData = dateData.grades.find(g => g.grade === grade);
                        if (!gradeData || gradeData.total === 0) {
                          return <td key={grade} className="px-3 py-2 text-center text-gray-400">-</td>;
                        }
                        return (
                          <td key={grade} className="px-3 py-2 text-center">
                            <span className={`inline-block px-2 py-1 rounded text-white text-xs ${getAttendanceColor(gradeData.rate)}`}>
                              {gradeData.rate}%
                            </span>
                            <div className="text-xs text-gray-500 mt-1">
                              {gradeData.present}/{gradeData.total}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="mt-4 flex gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> 80%+</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> 60-79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded"></span> 40-59%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> 40% 미만</span>
          </div>
        </div>
      )}

      {/* 날짜별 부서 비교 탭 */}
      {activeTab === 'dateDepartment' && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-bold mb-4">📅 날짜별 부서 출석률 비교</h2>
          {dateDepartmentComparison.length === 0 ? (
            <p className="text-gray-500 text-center py-8">출석 기록이 없습니다.</p>
          ) : (
            <div className="space-y-6">
              {dateDepartmentComparison.map((dateData) => (
                <div key={dateData.date} className="border rounded-lg p-4">
                  <h3 className="text-lg font-medium mb-3 text-purple-700">{dateData.date}</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {dateData.departments.map((dept) => (
                      <div
                        key={dept.departmentId}
                        className="bg-gray-50 rounded-lg p-3 text-center"
                      >
                        <div className="font-medium text-sm mb-2">{dept.departmentName}</div>
                        <div className={`text-2xl font-bold ${
                          dept.rate >= 80 ? 'text-green-600' :
                          dept.rate >= 60 ? 'text-yellow-600' :
                          dept.rate >= 40 ? 'text-orange-600' : 'text-red-600'
                        }`}>
                          {dept.rate}%
                        </div>
                        <div className="text-xs text-gray-500">
                          {dept.present}/{dept.total}명
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2 text-xs">
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> 80%+</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> 60-79%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-orange-500 rounded"></span> 40-59%</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 bg-red-500 rounded"></span> 40% 미만</span>
          </div>
        </div>
      )}
    </div>
  );
}


