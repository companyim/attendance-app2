import React, { useState } from 'react';
import { useDepartments } from '../hooks/useDepartments';
import { Department } from '../types/Department';
import api from '../services/api';
import Modal from '../components/common/Modal';
import Button from '../components/common/Button';

export default function DepartmentManagement() {
  const { departments, loading } = useDepartments();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const openModal = (dept?: Department) => {
    if (dept) {
      setEditingDepartment(dept);
      setFormData({ name: dept.name, description: dept.description || '' });
    } else {
      setEditingDepartment(null);
      setFormData({ name: '', description: '' });
    }
    setIsModalOpen(true);
    setError('');
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingDepartment(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);

    try {
      if (editingDepartment) {
        await api.put(`/departments/${editingDepartment.id}`, formData);
      } else {
        await api.post('/departments', formData);
      }
      closeModal();
      window.location.reload();
    } catch (err: any) {
      setError(err.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (departmentId: string) => {
    if (!confirm('정말 삭제하시겠습니까? 소속 학생이 없는 부서만 삭제할 수 있습니다.')) return;

    try {
      await api.delete(`/departments/${departmentId}`);
      window.location.reload();
    } catch (err: any) {
      alert(err.response?.data?.error || '삭제에 실패했습니다.');
    }
  };

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">부서 관리</h1>
        <Button onClick={() => openModal()}>부서 추가</Button>
      </div>

      {loading ? (
        <div className="text-center py-8">로딩 중...</div>
      ) : departments.length === 0 ? (
        <div className="text-center text-gray-500 py-8">부서가 없습니다.</div>
      ) : (
        <div className="space-y-2">
          {departments.map((dept) => (
            <div key={dept.id} className="bg-white rounded-lg shadow-md p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{dept.name}</h3>
                  {dept.description && (
                    <p className="text-gray-600 mt-1">{dept.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" onClick={() => openModal(dept)}>
                    수정
                  </Button>
                  <Button variant="danger" onClick={() => handleDelete(dept.id)}>
                    삭제
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingDepartment ? '부서 수정' : '부서 등록'}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block mb-1 font-medium">부서명 *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                required
              />
            </div>

            <div>
              <label className="block mb-1 font-medium">설명</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2 border border-gray-300 rounded-lg"
                rows={3}
              />
            </div>

            {error && <div className="text-red-600">{error}</div>}

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="secondary" onClick={closeModal}>
                취소
              </Button>
              <Button type="submit" isLoading={saving}>
                저장
              </Button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}


