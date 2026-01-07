import { useState } from 'react';
import { useStudents } from '../hooks/useStudents';
import { useDepartments } from '../hooks/useDepartments';
import { Student, Grade } from '../types/Student';
import api from '../services/api';
import GradeFilter from '../components/attendance/GradeFilter';
import DepartmentSelect from '../components/department/DepartmentSelect';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';
import ExcelUpload from '../components/student/ExcelUpload';

const GRADES: Grade[] = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];

interface StudentFormData {
  name: string;
  baptismName: string;
  grade: Grade;
  departmentId: string;
  email: string;
  phone: string;
}

export default function StudentManagement() {
  const [selectedGrade, setSelectedGrade] = useState<Grade | ''>('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [formData, setFormData] = useState<StudentFormData>({
    name: '',
    baptismName: '',
    grade: '1학년',
    departmentId: '',
    email: '',
    phone: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const { students, loading: studentsLoading } = useStudents({
    grade: selectedGrade || undefined,
    departmentId: selectedDepartment || undefined,
    search: searchQuery || undefined,
  });

  const { departments, loading: departmentsLoading } = useDepartments();

  const openModal = (student?: Student) => {
    if (student) {
      setEditingStudent(student);
      setFormData({
        name: student.name,
        baptismName: student.baptismName || '',
        grade: student.grade,
        departmentId: student.departmentId || '',
        email: student.email || '',
        phone: student.phone || '',
      });
    } else {
      setEditingStudent(null);
      setFormData({
        name: '',
        baptismName: '',
        grade: '1학년',
        departmentId: '',
        email: '',
        phone: '',
      });
    }
    setIsModalOpen(true);
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingStudent(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (editingStudent) {
        // 수정
        await api.put(`/students/${editingStudent.id}`, formData);
      } else {
        // 등록
        await api.post('/students', formData);
      }
      closeModal();
      window.location.reload(); // 목록 새로고침
    } catch (err: any) {
      setError(err.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (studentId: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await api.delete(`/students/${studentId}`);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  const handleDeleteAll = async () => {
    if (!confirm('⚠️ 정말 모든 학생 데이터를 삭제하시겠습니까?\n\n이 작업은 되돌릴 수 없습니다!')) return;
    if (!confirm('⚠️ 한 번 더 확인합니다.\n\n모든 학생, 출석 기록, 달란트 기록이 삭제됩니다.\n정말 삭제하시겠습니까?')) return;

    setDeleting(true);
    try {
      await api.delete('/students/all');
      alert('모든 데이터가 삭제되었습니다.');
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || '삭제에 실패했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  const departmentMap = new Map(departments.map((d) => [d.id, d]));

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">학생 관리</h1>
        <div className="flex gap-2">
          <ExcelUpload onSuccess={() => window.location.reload()} />
          <Button onClick={() => openModal()}>학생 추가</Button>
          <Button variant="danger" onClick={handleDeleteAll} isLoading={deleting}>
            전체 삭제
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md p-4 mb-4">
        <div className="mb-4">
          <label className="block mb-2 font-medium">이름 검색</label>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full p-2 border border-gray-300 rounded-lg"
            placeholder="학생 이름 또는 세례명으로 검색"
          />
        </div>
        <GradeFilter selectedGrade={selectedGrade} onGradeChange={setSelectedGrade} />
        <DepartmentSelect
          departments={departments}
          selectedId={selectedDepartment}
          onSelect={setSelectedDepartment}
        />
      </div>

      {studentsLoading || departmentsLoading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : students.length === 0 ? (
        <div className="text-center text-gray-500 py-8">학생이 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {students.map((student) => {
            const department = departmentMap.get(student.departmentId);
            return (
              <div key={student.id} className="bg-white rounded-lg shadow-md p-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium">
                      <span className="text-blue-600 mr-2">[{student.studentNumber}]</span>
                      {student.name}
                      {student.baptismName && <span className="text-gray-500 ml-1">({student.baptismName})</span>}
                      <span className="text-gray-600 ml-2">- {student.grade}</span>
                      {department && <span className="text-purple-600 ml-2">| {department.name}</span>}
                    </p>
                    <div className="text-sm text-gray-600 mt-1">
                      달란트: {student.talent}개
                      {student.email && <span> | 이메일: {student.email}</span>}
                      {student.phone && <span> | 전화: {student.phone}</span>}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" onClick={() => openModal(student)}>
                      수정
                    </Button>
                    <Button variant="danger" onClick={() => handleDelete(student.id)}>
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={closeModal} title={editingStudent ? '학생 수정' : '학생 등록'}>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">이름 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">세례명</label>
              <input
                type="text"
                value={formData.baptismName}
                onChange={(e) => setFormData({ ...formData, baptismName: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">학년 *</label>
              <select
                value={formData.grade}
                onChange={(e) => setFormData({ ...formData, grade: e.target.value as Grade })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">부서</label>
              <select
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              >
                <option value="">부서 없음</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block mb-1 font-medium">이메일</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">전화번호</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
              />
            </div>

            {error && <div className="text-red-600">{error}</div>}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={closeModal}>
                취소
              </Button>
              <Button type="submit" isLoading={loading}>
                저장
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}

