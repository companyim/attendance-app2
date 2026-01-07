import { Request, Response } from 'express';
import prisma from '../config/database';
import * as ExcelJS from 'exceljs';

/**
 * 전체 통계 개요
 */
export async function getOverview(req: Request, res: Response) {
  try {
    const { grade, departmentId } = req.query;

    const where: any = {};
    if (grade) {
      where.grade = grade;
    }
    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [studentCount, attendanceCount, totalTalent] = await Promise.all([
      prisma.student.count({ where }),
      prisma.attendance.count({
        where: departmentId ? { departmentId: departmentId as string } : {},
      }),
      prisma.student.aggregate({
        where,
        _sum: { talent: true },
      }),
    ]);

    const presentCount = await prisma.attendance.count({
      where: {
        status: 'present',
        ...(departmentId ? { departmentId: departmentId as string } : {}),
      },
    });

    const attendanceRate = attendanceCount > 0 ? (presentCount / attendanceCount) * 100 : 0;

    return res.json({
      studentCount,
      attendanceCount,
      presentCount,
      absentCount: attendanceCount - presentCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      totalTalent: totalTalent._sum.talent || 0,
      averageTalent: studentCount > 0 ? (totalTalent._sum.talent || 0) / studentCount : 0,
    });
  } catch (error: any) {
    console.error('통계 개요 조회 오류:', error);
    return res.status(500).json({ error: '통계 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생별 통계
 */
export async function getStudentStatistics(req: Request, res: Response) {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    const [totalAttendance, presentCount] = await Promise.all([
      prisma.attendance.count({
        where: { studentId: id },
      }),
      prisma.attendance.count({
        where: {
          studentId: id,
          status: 'present',
        },
      }),
    ]);

    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    return res.json({
      student,
      totalAttendance,
      presentCount,
      absentCount: totalAttendance - presentCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      talent: student.talent,
    });
  } catch (error: any) {
    console.error('학생별 통계 조회 오류:', error);
    return res.status(500).json({ error: '학생 통계 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 기간별 통계
 */
export async function getPeriodStatistics(req: Request, res: Response) {
  try {
    const { startDate, endDate, grade, departmentId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: '시작일과 종료일을 입력해주세요.' });
    }

    const where: any = {
      date: {
        gte: new Date(startDate as string),
        lte: new Date(endDate as string),
      },
    };

    if (departmentId) {
      where.departmentId = departmentId;
    }

    // 학년 필터링
    let studentIds: string[] | undefined;
    if (grade) {
      const students = await prisma.student.findMany({
        where: { grade: grade as string },
        select: { id: true },
      });
      studentIds = students.map(s => s.id);
      where.studentId = { in: studentIds };
    }

    const [totalAttendance, presentCount] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({
        where: {
          ...where,
          status: 'present',
        },
      }),
    ]);

    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    return res.json({
      startDate,
      endDate,
      totalAttendance,
      presentCount,
      absentCount: totalAttendance - presentCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    });
  } catch (error: any) {
    console.error('기간별 통계 조회 오류:', error);
    return res.status(500).json({ error: '기간별 통계 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 출석 추이 데이터
 */
export async function getAttendanceTrend(req: Request, res: Response) {
  try {
    const { grade, departmentId } = req.query;

    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // 학년 필터링
    if (grade) {
      const students = await prisma.student.findMany({
        where: { grade: grade as string },
        select: { id: true },
      });
      where.studentId = { in: students.map(s => s.id) };
    }

    const attendance = await prisma.attendance.groupBy({
      by: ['date'],
      where,
      _count: {
        id: true,
      },
      orderBy: {
        date: 'asc',
      },
    });

    return res.json({ trend: attendance });
  } catch (error: any) {
    console.error('출석 추이 조회 오류:', error);
    return res.status(500).json({ error: '출석 추이 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 출석률 계산
 */
export async function getAttendanceRate(req: Request, res: Response) {
  try {
    const { grade, departmentId } = req.query;

    const where: any = {};
    if (departmentId) {
      where.departmentId = departmentId;
    }

    // 학년 필터링
    if (grade) {
      const students = await prisma.student.findMany({
        where: { grade: grade as string },
        select: { id: true },
      });
      where.studentId = { in: students.map(s => s.id) };
    }

    const [totalAttendance, presentCount] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.count({
        where: {
          ...where,
          status: 'present',
        },
      }),
    ]);

    const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

    return res.json({
      totalAttendance,
      presentCount,
      absentCount: totalAttendance - presentCount,
      attendanceRate: Math.round(attendanceRate * 100) / 100,
    });
  } catch (error: any) {
    console.error('출석률 조회 오류:', error);
    return res.status(500).json({ error: '출석률 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학년별 출석률 비교
 */
export async function getGradesComparison(req: Request, res: Response) {
  try {
    const grades = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
    const comparison = await Promise.all(
      grades.map(async (grade) => {
        const students = await prisma.student.findMany({
          where: { grade },
          select: { id: true },
        });

        if (students.length === 0) {
          return {
            grade,
            studentCount: 0,
            attendanceRate: 0,
            totalAttendance: 0,
            presentCount: 0,
          };
        }

        const [totalAttendance, presentCount] = await Promise.all([
          prisma.attendance.count({
            where: { studentId: { in: students.map(s => s.id) } },
          }),
          prisma.attendance.count({
            where: {
              studentId: { in: students.map(s => s.id) },
              status: 'present',
            },
          }),
        ]);

        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        return {
          grade,
          studentCount: students.length,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          totalAttendance,
          presentCount,
        };
      })
    );

    return res.json({ comparison });
  } catch (error: any) {
    console.error('학년별 비교 조회 오류:', error);
    return res.status(500).json({ error: '학년별 비교 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서별 출석률 비교
 */
export async function getDepartmentsComparison(req: Request, res: Response) {
  try {
    const departments = await prisma.department.findMany();

    const comparison = await Promise.all(
      departments.map(async (dept) => {
        const [totalAttendance, presentCount] = await Promise.all([
          prisma.attendance.count({
            where: { departmentId: dept.id },
          }),
          prisma.attendance.count({
            where: {
              departmentId: dept.id,
              status: 'present',
            },
          }),
        ]);

        const attendanceRate = totalAttendance > 0 ? (presentCount / totalAttendance) * 100 : 0;

        return {
          department: dept,
          attendanceRate: Math.round(attendanceRate * 100) / 100,
          totalAttendance,
          presentCount,
        };
      })
    );

    return res.json({ comparison });
  } catch (error: any) {
    console.error('부서별 비교 조회 오류:', error);
    return res.status(500).json({ error: '부서별 비교 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 달란트 통계
 */
export async function getTalentStatistics(req: Request, res: Response) {
  try {
    const { grade, departmentId } = req.query;

    const where: any = {};
    if (grade) where.grade = grade;
    if (departmentId) where.departmentId = departmentId;

    const students = await prisma.student.findMany({
      where,
      include: {
        department: true,
      },
    });

    const totalTalent = students.reduce((sum, student) => sum + student.talent, 0);
    const averageTalent = students.length > 0 ? totalTalent / students.length : 0;

    // 상위 10명
    const topStudents = students
      .sort((a, b) => b.talent - a.talent)
      .slice(0, 10);

    return res.json({
      totalTalent,
      averageTalent: Math.round(averageTalent * 100) / 100,
      studentCount: students.length,
      topStudents,
    });
  } catch (error: any) {
    console.error('달란트 통계 조회 오류:', error);
    return res.status(500).json({ error: '달란트 통계 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 날짜별 학년 출석률 비교
 */
export async function getDateGradeComparison(req: Request, res: Response) {
  try {
    const grades = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
    
    // 모든 출석 날짜 가져오기
    const allDates = await prisma.attendance.findMany({
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 20, // 최근 20개 날짜
    });

    const dateList = allDates.map(d => d.date);

    // 각 날짜별, 학년별 출석률 계산
    const result = await Promise.all(
      dateList.map(async (date) => {
        const gradeStats = await Promise.all(
          grades.map(async (grade) => {
            const students = await prisma.student.findMany({
              where: { grade },
              select: { id: true },
            });

            if (students.length === 0) {
              return { grade, rate: 0, present: 0, total: 0 };
            }

            const studentIds = students.map(s => s.id);

            const [total, present] = await Promise.all([
              prisma.attendance.count({
                where: {
                  date,
                  studentId: { in: studentIds },
                },
              }),
              prisma.attendance.count({
                where: {
                  date,
                  studentId: { in: studentIds },
                  status: 'present',
                },
              }),
            ]);

            return {
              grade,
              rate: total > 0 ? Math.round((present / total) * 100) : 0,
              present,
              total,
            };
          })
        );

        return {
          date: date.toISOString().split('T')[0],
          grades: gradeStats,
        };
      })
    );

    return res.json({ comparison: result });
  } catch (error: any) {
    console.error('날짜별 학년 비교 조회 오류:', error);
    return res.status(500).json({ error: '날짜별 학년 비교 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 날짜별 부서 출석률 비교
 */
export async function getDateDepartmentComparison(req: Request, res: Response) {
  try {
    const departments = await prisma.department.findMany();
    
    // 모든 출석 날짜 가져오기
    const allDates = await prisma.attendance.findMany({
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'desc' },
      take: 20, // 최근 20개 날짜
    });

    const dateList = allDates.map(d => d.date);

    // 각 날짜별, 부서별 출석률 계산
    const result = await Promise.all(
      dateList.map(async (date) => {
        const deptStats = await Promise.all(
          departments.map(async (dept) => {
            const [total, present] = await Promise.all([
              prisma.attendance.count({
                where: {
                  date,
                  departmentId: dept.id,
                },
              }),
              prisma.attendance.count({
                where: {
                  date,
                  departmentId: dept.id,
                  status: 'present',
                },
              }),
            ]);

            return {
              departmentId: dept.id,
              departmentName: dept.name,
              rate: total > 0 ? Math.round((present / total) * 100) : 0,
              present,
              total,
            };
          })
        );

        return {
          date: date.toISOString().split('T')[0],
          departments: deptStats.filter(d => d.total > 0), // 출석 기록이 있는 부서만
        };
      })
    );

    return res.json({ comparison: result.filter(r => r.departments.length > 0) });
  } catch (error: any) {
    console.error('날짜별 부서 비교 조회 오류:', error);
    return res.status(500).json({ error: '날짜별 부서 비교 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 전체 데이터 엑셀 내보내기
 */
export async function exportAllDataExcel(req: Request, res: Response) {
  try {
    const workbook = new ExcelJS.Workbook();

    // 1. 학생 목록 시트
    const studentSheet = workbook.addWorksheet('학생목록');
    studentSheet.columns = [
      { header: '번호', key: 'studentNumber', width: 10 },
      { header: '이름', key: 'name', width: 15 },
      { header: '세례명', key: 'baptismName', width: 15 },
      { header: '학년', key: 'grade', width: 12 },
      { header: '부서', key: 'department', width: 15 },
      { header: '달란트', key: 'talent', width: 10 },
    ];

    const students = await prisma.student.findMany({
      include: { department: true },
      orderBy: [{ grade: 'asc' }, { createdAt: 'asc' }],
    });

    // 학번 부여
    const gradeOrder = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
    const gradePrefix: Record<string, string> = {
      '유치부': '유', '1학년': '1', '2학년': '2', '첫영성체': '첫',
      '4학년': '4', '5학년': '5', '6학년': '6'
    };
    const gradeCounters: Record<string, number> = {};

    students.forEach(student => {
      if (!gradeCounters[student.grade]) gradeCounters[student.grade] = 0;
      gradeCounters[student.grade]++;
      const prefix = gradePrefix[student.grade] || '기타';
      const studentNumber = `${prefix}-${gradeCounters[student.grade]}`;

      studentSheet.addRow({
        studentNumber,
        name: student.name,
        baptismName: student.baptismName || '',
        grade: student.grade,
        department: student.department?.name || '',
        talent: student.talent,
      });
    });

    // 헤더 스타일
    studentSheet.getRow(1).font = { bold: true };
    studentSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 2. 출석 기록 시트
    const attendanceSheet = workbook.addWorksheet('출석기록');
    attendanceSheet.columns = [
      { header: '날짜', key: 'date', width: 12 },
      { header: '학생이름', key: 'studentName', width: 15 },
      { header: '학년', key: 'grade', width: 12 },
      { header: '부서', key: 'department', width: 15 },
      { header: '출석타입', key: 'type', width: 12 },
      { header: '상태', key: 'status', width: 10 },
      { header: '달란트', key: 'talentGiven', width: 10 },
    ];

    const attendances = await prisma.attendance.findMany({
      include: {
        student: true,
        department: true,
      },
      orderBy: [{ date: 'desc' }, { student: { name: 'asc' } }],
    });

    attendances.forEach(att => {
      attendanceSheet.addRow({
        date: att.date.toISOString().split('T')[0],
        studentName: att.student?.name || '',
        grade: att.student?.grade || '',
        department: att.department?.name || '',
        type: att.type === 'grade' ? '학년출석' : '부서출석',
        status: att.status === 'present' ? '출석' : '결석',
        talentGiven: att.talentGiven,
      });
    });

    attendanceSheet.getRow(1).font = { bold: true };
    attendanceSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 3. 학년별 통계 시트
    const gradeStatsSheet = workbook.addWorksheet('학년별통계');
    gradeStatsSheet.columns = [
      { header: '학년', key: 'grade', width: 12 },
      { header: '학생수', key: 'studentCount', width: 10 },
      { header: '총출석기록', key: 'totalAttendance', width: 12 },
      { header: '출석', key: 'present', width: 10 },
      { header: '결석', key: 'absent', width: 10 },
      { header: '출석률(%)', key: 'rate', width: 12 },
    ];

    for (const grade of gradeOrder) {
      const gradeStudents = await prisma.student.findMany({
        where: { grade },
        select: { id: true },
      });

      const studentIds = gradeStudents.map(s => s.id);
      const [total, present] = await Promise.all([
        prisma.attendance.count({
          where: { studentId: { in: studentIds } },
        }),
        prisma.attendance.count({
          where: { studentId: { in: studentIds }, status: 'present' },
        }),
      ]);

      gradeStatsSheet.addRow({
        grade,
        studentCount: gradeStudents.length,
        totalAttendance: total,
        present,
        absent: total - present,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }

    gradeStatsSheet.getRow(1).font = { bold: true };
    gradeStatsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 4. 부서별 통계 시트
    const deptStatsSheet = workbook.addWorksheet('부서별통계');
    deptStatsSheet.columns = [
      { header: '부서', key: 'department', width: 15 },
      { header: '학생수', key: 'studentCount', width: 10 },
      { header: '총출석기록', key: 'totalAttendance', width: 12 },
      { header: '출석', key: 'present', width: 10 },
      { header: '결석', key: 'absent', width: 10 },
      { header: '출석률(%)', key: 'rate', width: 12 },
    ];

    const departments = await prisma.department.findMany();
    for (const dept of departments) {
      const deptStudentCount = await prisma.student.count({
        where: { departmentId: dept.id },
      });

      const [total, present] = await Promise.all([
        prisma.attendance.count({
          where: { departmentId: dept.id },
        }),
        prisma.attendance.count({
          where: { departmentId: dept.id, status: 'present' },
        }),
      ]);

      deptStatsSheet.addRow({
        department: dept.name,
        studentCount: deptStudentCount,
        totalAttendance: total,
        present,
        absent: total - present,
        rate: total > 0 ? Math.round((present / total) * 100) : 0,
      });
    }

    deptStatsSheet.getRow(1).font = { bold: true };
    deptStatsSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 5. 달란트 거래 내역 시트
    const talentSheet = workbook.addWorksheet('달란트내역');
    talentSheet.columns = [
      { header: '날짜', key: 'date', width: 18 },
      { header: '학생이름', key: 'studentName', width: 15 },
      { header: '학년', key: 'grade', width: 12 },
      { header: '유형', key: 'type', width: 10 },
      { header: '금액', key: 'amount', width: 10 },
      { header: '사유', key: 'reason', width: 30 },
    ];

    const talentTransactions = await prisma.talentTransaction.findMany({
      include: { student: true },
      orderBy: { createdAt: 'desc' },
    });

    talentTransactions.forEach(tx => {
      talentSheet.addRow({
        date: tx.createdAt.toISOString().replace('T', ' ').substring(0, 19),
        studentName: tx.student?.name || '',
        grade: tx.student?.grade || '',
        type: tx.type === 'earn' ? '획득' : '사용',
        amount: tx.amount,
        reason: tx.reason,
      });
    });

    talentSheet.getRow(1).font = { bold: true };
    talentSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    // 6. 날짜별 출석 현황표 (학년출석)
    const gradeAttendanceSheet = workbook.addWorksheet('학년출석현황표');
    
    // 학년출석 날짜 목록 가져오기
    const gradeAttendanceDates = await prisma.attendance.findMany({
      where: { type: 'grade' },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'asc' },
    });
    const gradeDateList = gradeAttendanceDates.map(d => d.date.toISOString().split('T')[0]);

    // 학년출석 현황표 헤더
    gradeAttendanceSheet.columns = [
      { header: '번호', key: 'studentNumber', width: 8 },
      { header: '이름', key: 'name', width: 12 },
      { header: '학년', key: 'grade', width: 10 },
      ...gradeDateList.map(date => ({ header: date.substring(5), key: date, width: 6 })), // MM-DD 형식
      { header: '출석', key: 'presentCount', width: 6 },
      { header: '결석', key: 'absentCount', width: 6 },
      { header: '출석률', key: 'rate', width: 8 },
    ];

    // 학년출석 데이터
    const gradeAttendanceData = await prisma.attendance.findMany({
      where: { type: 'grade' },
      select: {
        studentId: true,
        date: true,
        status: true,
      },
    });

    // 학생별 출석 맵 생성
    const gradeAttendanceMap: Record<string, Record<string, string>> = {};
    gradeAttendanceData.forEach(att => {
      const dateKey = att.date.toISOString().split('T')[0];
      if (!gradeAttendanceMap[att.studentId]) {
        gradeAttendanceMap[att.studentId] = {};
      }
      gradeAttendanceMap[att.studentId][dateKey] = att.status === 'present' ? 'O' : 'X';
    });

    // 학생 목록 (학년순, 등록순)
    const allStudentsForSheet = await prisma.student.findMany({
      orderBy: [{ grade: 'asc' }, { createdAt: 'asc' }],
    });

    // 학번 부여 및 행 추가
    const gradeCountersForSheet: Record<string, number> = {};
    allStudentsForSheet.forEach(student => {
      if (!gradeCountersForSheet[student.grade]) gradeCountersForSheet[student.grade] = 0;
      gradeCountersForSheet[student.grade]++;
      const prefix = gradePrefix[student.grade] || '기타';
      const studentNumber = `${prefix}-${gradeCountersForSheet[student.grade]}`;

      const studentAttendance = gradeAttendanceMap[student.id] || {};
      let presentCount = 0;
      let absentCount = 0;

      const rowData: any = {
        studentNumber,
        name: student.name,
        grade: student.grade,
      };

      gradeDateList.forEach(date => {
        const status = studentAttendance[date] || '-';
        rowData[date] = status;
        if (status === 'O') presentCount++;
        else if (status === 'X') absentCount++;
      });

      rowData.presentCount = presentCount;
      rowData.absentCount = absentCount;
      rowData.rate = (presentCount + absentCount) > 0 
        ? `${Math.round((presentCount / (presentCount + absentCount)) * 100)}%` 
        : '-';

      gradeAttendanceSheet.addRow(rowData);
    });

    // 헤더 스타일
    gradeAttendanceSheet.getRow(1).font = { bold: true };
    gradeAttendanceSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFD4EDDA' }, // 녹색 배경
    };

    // 7. 날짜별 출석 현황표 (부서출석)
    const deptAttendanceSheet = workbook.addWorksheet('부서출석현황표');
    
    // 부서출석 날짜 목록 가져오기
    const deptAttendanceDates = await prisma.attendance.findMany({
      where: { type: 'department' },
      select: { date: true },
      distinct: ['date'],
      orderBy: { date: 'asc' },
    });
    const deptDateList = deptAttendanceDates.map(d => d.date.toISOString().split('T')[0]);

    // 부서출석 현황표 헤더
    deptAttendanceSheet.columns = [
      { header: '번호', key: 'studentNumber', width: 8 },
      { header: '이름', key: 'name', width: 12 },
      { header: '부서', key: 'department', width: 12 },
      ...deptDateList.map(date => ({ header: date.substring(5), key: date, width: 6 })), // MM-DD 형식
      { header: '출석', key: 'presentCount', width: 6 },
      { header: '결석', key: 'absentCount', width: 6 },
      { header: '출석률', key: 'rate', width: 8 },
    ];

    // 부서출석 데이터
    const deptAttendanceData = await prisma.attendance.findMany({
      where: { type: 'department' },
      select: {
        studentId: true,
        date: true,
        status: true,
      },
    });

    // 학생별 부서출석 맵 생성
    const deptAttendanceMap: Record<string, Record<string, string>> = {};
    deptAttendanceData.forEach(att => {
      const dateKey = att.date.toISOString().split('T')[0];
      if (!deptAttendanceMap[att.studentId]) {
        deptAttendanceMap[att.studentId] = {};
      }
      deptAttendanceMap[att.studentId][dateKey] = att.status === 'present' ? 'O' : 'X';
    });

    // 부서가 있는 학생만 (부서순, 등록순)
    const studentsWithDept = await prisma.student.findMany({
      where: { departmentId: { not: null } },
      include: { department: true },
      orderBy: [{ department: { name: 'asc' } }, { createdAt: 'asc' }],
    });

    // 학번 부여 및 행 추가
    const deptCountersForSheet: Record<string, number> = {};
    studentsWithDept.forEach(student => {
      if (!deptCountersForSheet[student.grade]) deptCountersForSheet[student.grade] = 0;
      deptCountersForSheet[student.grade]++;
      const prefix = gradePrefix[student.grade] || '기타';
      const studentNumber = `${prefix}-${deptCountersForSheet[student.grade]}`;

      const studentAttendance = deptAttendanceMap[student.id] || {};
      let presentCount = 0;
      let absentCount = 0;

      const rowData: any = {
        studentNumber,
        name: student.name,
        department: student.department?.name || '',
      };

      deptDateList.forEach(date => {
        const status = studentAttendance[date] || '-';
        rowData[date] = status;
        if (status === 'O') presentCount++;
        else if (status === 'X') absentCount++;
      });

      rowData.presentCount = presentCount;
      rowData.absentCount = absentCount;
      rowData.rate = (presentCount + absentCount) > 0 
        ? `${Math.round((presentCount / (presentCount + absentCount)) * 100)}%` 
        : '-';

      deptAttendanceSheet.addRow(rowData);
    });

    // 헤더 스타일
    deptAttendanceSheet.getRow(1).font = { bold: true };
    deptAttendanceSheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE2D5F1' }, // 보라색 배경
    };

    // 엑셀 파일 생성 및 응답
    const buffer = await workbook.xlsx.writeBuffer();

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=attendance_data_${new Date().toISOString().split('T')[0]}.xlsx`);
    
    return res.send(buffer);
  } catch (error: any) {
    console.error('엑셀 내보내기 오류:', error);
    return res.status(500).json({ error: '엑셀 내보내기 중 오류가 발생했습니다.' });
  }
}


