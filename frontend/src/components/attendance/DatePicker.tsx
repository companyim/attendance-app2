import { useMemo, useState, useEffect } from 'react';
import { getSundaysInYear, toDateString } from '../../utils/dateUtils';

interface DatePickerProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];
const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 11 }, (_, i) => CURRENT_YEAR - 5 + i);

export default function DatePicker({ selectedDate, onDateChange }: DatePickerProps) {
  const initial = selectedDate
    ? (() => {
        const [y, m] = selectedDate.split('-').map(Number);
        return { year: y || CURRENT_YEAR, month: (m || 1) - 1 };
      })()
    : { year: CURRENT_YEAR, month: new Date().getMonth() };

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month); // 0-based

  useEffect(() => {
    if (!selectedDate) return;
    const [y, m] = selectedDate.split('-').map(Number);
    if (y) setViewYear(y);
    if (m) setViewMonth(m - 1);
  }, [selectedDate]);

  const sundaySet = useMemo(
    () => new Set(getSundaysInYear(viewYear)),
    [viewYear]
  );

  const calendarDays = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const cells: Array<{ day: number | null; dateStr: string | null; isSunday: boolean }> = [];

    for (let i = 0; i < startWeekday; i++) {
      cells.push({ day: null, dateStr: null, isSunday: false });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = toDateString(viewYear, viewMonth + 1, day);
      cells.push({
        day,
        dateStr,
        isSunday: sundaySet.has(dateStr),
      });
    }

    return cells;
  }, [viewYear, viewMonth, sundaySet]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  return (
    <div className="mb-4">
      <label className="block mb-2 font-medium">날짜 선택 (일요일만)</label>
      <div className="border border-gray-300 rounded-lg p-3 bg-white max-w-sm">
        <div className="flex items-center gap-2 mb-3">
          <select
            value={viewYear}
            onChange={(e) => setViewYear(Number(e.target.value))}
            className="p-1.5 border border-gray-300 rounded-md text-sm font-medium"
          >
            {YEAR_OPTIONS.map((y) => (
              <option key={y} value={y}>
                {y}년
              </option>
            ))}
          </select>

          <div className="flex-1 flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600"
              aria-label="이전 달"
            >
              ‹
            </button>
            <span className="font-semibold text-sm">{viewMonth + 1}월</span>
            <button
              type="button"
              onClick={goNextMonth}
              className="px-2 py-1 rounded hover:bg-gray-100 text-gray-600"
              aria-label="다음 달"
            >
              ›
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className={`text-center text-xs font-medium py-1 ${
                w === '일' ? 'text-red-500' : 'text-gray-500'
              }`}
            >
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((cell, idx) => {
            if (cell.day == null) {
              return <div key={`empty-${idx}`} className="aspect-square" />;
            }

            const isSelected = cell.dateStr === selectedDate;
            const selectable = cell.isSunday;

            return (
              <button
                key={cell.dateStr!}
                type="button"
                disabled={!selectable}
                onClick={() => selectable && onDateChange(cell.dateStr!)}
                className={[
                  'aspect-square rounded-lg text-sm flex items-center justify-center transition',
                  selectable
                    ? isSelected
                      ? 'bg-blue-600 text-white font-bold'
                      : 'text-red-600 hover:bg-blue-50 font-medium cursor-pointer'
                    : 'text-gray-300 cursor-not-allowed',
                ].join(' ')}
              >
                {cell.day}
              </button>
            );
          })}
        </div>

        {selectedDate && (
          <div className="mt-3 text-sm text-gray-600 text-center">
            선택: <span className="font-medium text-blue-700">{selectedDate}</span>
          </div>
        )}
      </div>
    </div>
  );
}
