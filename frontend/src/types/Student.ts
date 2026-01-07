export type Grade = '유치부' | '1학년' | '2학년' | '첫영성체' | '4학년' | '5학년' | '6학년';

export interface Student {
  id: string;
  name: string;
  baptismName?: string;
  studentNumber?: string;
  email?: string;
  phone?: string;
  departmentId: string;
  grade: Grade;
  talent: number;
  createdAt: Date;
  updatedAt: Date;
}


