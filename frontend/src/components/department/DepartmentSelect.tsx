import React from 'react';
import { Department } from '../../types/Department';

interface DepartmentSelectProps {
  departments: Department[];
  selectedId?: string;
  onSelect: (departmentId: string) => void;
  label?: string;
  includeAll?: boolean;
}

export default function DepartmentSelect({
  departments,
  selectedId,
  onSelect,
  label = '부서 선택 (서브 필터)',
  includeAll = true,
}: DepartmentSelectProps) {
  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">{label}</label>
      <select
        value={selectedId || ''}
        onChange={(e) => onSelect(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-lg"
      >
        {includeAll && <option value="">전체</option>}
        {departments.map((dept) => (
          <option key={dept.id} value={dept.id}>
            {dept.name}
          </option>
        ))}
      </select>
    </div>
  );
}


