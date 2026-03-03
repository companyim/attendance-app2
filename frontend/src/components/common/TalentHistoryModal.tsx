import { useState, useEffect } from 'react';
import api from '../../services/api';
import Modal from './Modal';

interface TalentTransaction {
  id: string;
  type: 'earn' | 'spend' | 'adjust';
  amount: number;
  reason: string;
  createdAt: string;
}

interface TalentHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentId: string;
  studentName: string;
  currentTalent: number;
}

const TYPE_LABELS: Record<string, { label: string; color: string }> = {
  earn: { label: '획득', color: 'text-blue-600 bg-blue-50' },
  spend: { label: '차감', color: 'text-red-600 bg-red-50' },
  adjust: { label: '조정', color: 'text-amber-600 bg-amber-50' },
};

export default function TalentHistoryModal({
  isOpen,
  onClose,
  studentId,
  studentName,
  currentTalent,
}: TalentHistoryModalProps) {
  const [transactions, setTransactions] = useState<TalentTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen || !studentId) return;

    async function fetchHistory() {
      setLoading(true);
      try {
        const response = await api.get(`/talents/student/${studentId}`);
        setTransactions(response.data.transactions || []);
      } catch (error) {
        console.error('달란트 내역 로드 실패:', error);
        setTransactions([]);
      } finally {
        setLoading(false);
      }
    }
    fetchHistory();
  }, [isOpen, studentId]);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${studentName} 달란트 내역`}>
      <div className="mb-3 flex items-center justify-between bg-gradient-to-r from-yellow-50 to-amber-50 p-3 rounded-lg border border-amber-200">
        <span className="text-sm font-medium text-gray-700">현재 보유</span>
        <span className="text-lg font-bold text-amber-600">{currentTalent}개</span>
      </div>

      {loading ? (
        <div className="text-center py-6 text-gray-500">로딩 중...</div>
      ) : transactions.length === 0 ? (
        <div className="text-center py-6 text-gray-400">달란트 내역이 없습니다.</div>
      ) : (
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {transactions.map((tx) => {
            const typeInfo = TYPE_LABELS[tx.type] || TYPE_LABELS.adjust;
            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${typeInfo.color}`}>
                      {typeInfo.label}
                    </span>
                    <span className="text-sm text-gray-700 truncate">{tx.reason}</span>
                  </div>
                  <div className="text-xs text-gray-400 mt-0.5">{formatDate(tx.createdAt)}</div>
                </div>
                <span
                  className={`ml-2 font-bold text-sm whitespace-nowrap ${
                    tx.amount > 0 ? 'text-blue-600' : 'text-red-500'
                  }`}
                >
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
