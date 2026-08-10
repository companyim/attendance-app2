/**
 * 지정한 연도의 모든 일요일 목록을 반환합니다. (YYYY-MM-DD)
 */
export function getSundaysInYear(year: number): string[] {
  const sundays: string[] = [];
  const date = new Date(year, 0, 1);

  const day = date.getDay();
  if (day !== 0) {
    date.setDate(date.getDate() + (7 - day));
  }

  while (date.getFullYear() === year) {
    const y = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    sundays.push(`${y}-${month}-${d}`);
    date.setDate(date.getDate() + 7);
  }

  return sundays;
}

/** @deprecated getSundaysInYear(2026) 사용 */
export function getSundaysIn2026(): string[] {
  return getSundaysInYear(2026);
}

/**
 * 출석 가능한 날짜인지 확인 (일요일)
 */
export function isAttendanceSunday(dateString: string): boolean {
  const [y, m, d] = String(dateString).split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return false;
  const date = new Date(y, m - 1, d);
  return (
    date.getFullYear() === y &&
    date.getMonth() === m - 1 &&
    date.getDate() === d &&
    date.getDay() === 0
  );
}

/** @deprecated isAttendanceSunday 사용 */
export function isSundayIn2026(dateString: string): boolean {
  return isAttendanceSunday(dateString);
}
