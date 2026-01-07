export type AttendanceStatus = 'present' | 'absent';

export interface Attendance {
  id: string;
  studentId: string;
  departmentId: string;
  date: string; // YYYY-MM-DD 형식, 2026년 일요일만
  status: AttendanceStatus;
  talentGiven: number;
  memo?: string;
  createdAt: Date;
  updatedAt: Date;
}


