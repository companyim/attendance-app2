/**
 * 2026년의 모든 일요일 목록을 반환합니다.
 */
export function getSundaysIn2026(): string[] {
  const sundays: string[] = [];
  const startDate = new Date('2026-01-01');
  const endDate = new Date('2026-12-31');
  
  for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
    if (date.getDay() === 0) { // 일요일
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      sundays.push(`${year}-${month}-${day}`);
    }
  }
  
  return sundays;
}

/**
 * 날짜가 2026년 일요일인지 확인합니다.
 */
export function isSundayIn2026(dateString: string): boolean {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const dayOfWeek = date.getDay();
  
  return year === 2026 && dayOfWeek === 0;
}


