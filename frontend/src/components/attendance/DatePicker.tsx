import React, { useState, useEffect } from 'react';
import { getSundaysIn2026 } from '../../utils/dateUtils';
import api from '../../services/api';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDates() {
      try {
        const response = await api.get('/attendance/available-dates');
        setAvailableDates(response.data.dates);
      } catch (error) {
        // API 실패 시 로컬 함수 사용
        setAvailableDates(getSundaysIn2026());
      } finally {
        setLoading(false);
      }
    }

    fetchDates();
  }, []);

  if (loading) {
    return <div>날짜 목록 로딩 중...</div>;
  }

  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">날짜 선택 (2026년 일요일만)</label>
      <select
        value={selectedDate}
        onChange={(e) => onDateChange(e.target.value)}
        className="w-full p-2 border border-gray-300 rounded-lg"
      >
        <option value="">날짜 선택</option>
        {availableDates.map((date) => (
          <option key={date} value={date}>
            {date}
          </option>
        ))}
      </select>
    </div>
  );
}


