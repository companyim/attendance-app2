export type TalentTransactionType = 'earn' | 'spend' | 'adjust';

export interface TalentTransaction {
  id: string;
  studentId: string;
  type: TalentTransactionType;
  amount: number; // 양수: 획득, 음수: 소모
  reason: string;
  attendanceId?: string;
  createdAt: Date;
}


