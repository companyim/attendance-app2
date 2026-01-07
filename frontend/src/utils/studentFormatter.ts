import { Student } from '../types/Student';
import { Department } from '../types/Department';

/**
 * 학생 정보를 표시 형식으로 포맷합니다.
 * 형식: "이름 (세례명) - 부서명 - 달란트: N개"
 */
export function formatStudentDisplay(
  student: Student,
  department?: Department
): string {
  const baptism = student.baptismName ? ` (${student.baptismName})` : '';
  const deptName = department?.name || '부서 없음';
  return `${student.name}${baptism} - ${deptName} - 달란트: ${student.talent}개`;
}


