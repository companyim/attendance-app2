import { Student } from '../../types/Student';
import { Department } from '../../types/Department';
import { formatStudentDisplay } from '../../utils/studentFormatter';

interface StudentCardProps {
  student: Student;
  department?: Department;
  onAttendanceClick?: (student: Student) => void;
}

export default function StudentCard({ student, department, onAttendanceClick }: StudentCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 mb-2 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium">{formatStudentDisplay(student, department)}</p>
        </div>
        {onAttendanceClick && (
          <div className="flex gap-2">
            <button
              onClick={() => onAttendanceClick(student)}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              출석
            </button>
            <button
              onClick={() => onAttendanceClick(student)}
              className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
            >
              결석
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


