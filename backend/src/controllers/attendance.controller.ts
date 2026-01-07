import { Request, Response } from 'express';
import prisma from '../config/database';
import { isSundayIn2026 } from '../utils/dateUtils';

/**
 * 출석 기록 조회 (인증 불필요, 공개 API)
 */
export async function getAttendance(req: Request, res: Response) {
  try {
    const {
      studentId,
      studentName,
      grade,
      departmentId,
      date,
      startDate,
      endDate,
      type, // 'grade' | 'department'
      page = '1',
      limit = '50',
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (studentId) {
      where.studentId = studentId;
    }

    if (studentName) {
      const student = await prisma.student.findFirst({
        where: { name: studentName as string },
      });
      if (student) {
        where.studentId = student.id;
      } else {
        // 학생이 없으면 빈 결과 반환
        return res.json({ attendance: [], total: 0, page: pageNum, limit: limitNum, totalPages: 0 });
      }
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (date) {
      where.date = new Date(date as string);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    // 출석 타입 필터링
    if (type) {
      where.type = type;
    }

    // 학년 필터링 (학생을 통해)
    if (grade) {
      const students = await prisma.student.findMany({
        where: { grade: grade as string },
        select: { id: true },
      });
      where.studentId = { in: students.map(s => s.id) };
    }

    const [attendance, total] = await Promise.all([
      prisma.attendance.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          student: {
            include: {
              department: true,
            },
          },
          department: true,
        },
        orderBy: { date: 'desc' },
      }),
      prisma.attendance.count({ where }),
    ]);

    return res.json({
      attendance,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    console.error('출석 기록 조회 오류:', error);
    return res.status(500).json({ error: '출석 기록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 2026년 일요일 목록 반환 (인증 불필요, 공개 API)
 */
export async function getAvailableDates(req: Request, res: Response) {
  try {
    const { getSundaysIn2026 } = await import('../utils/dateUtils');
    const dates = getSundaysIn2026();
    return res.json({ dates });
  } catch (error: any) {
    console.error('일요일 목록 조회 오류:', error);
    return res.status(500).json({ error: '일요일 목록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 출석 기록 생성/수정 (관리자만, 중복 체크 포함, 달란트 자동 지급)
 * type: 'grade' | 'department' - 학년 출석 또는 부서 출석
 */
export async function upsertAttendance(req: Request, res: Response) {
  try {
    const { studentId, departmentId, date, status, type = 'grade' } = req.body;

    // 필수 필드 확인
    if (!studentId || !date || !status) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 부서 출석인 경우 부서ID 필수
    if (type === 'department' && !departmentId) {
      return res.status(400).json({ error: '부서 출석은 부서를 선택해야 합니다.' });
    }

    // 날짜 검증: 2026년 일요일만 허용
    if (!isSundayIn2026(date)) {
      return res.status(400).json({
        error: '2026년 일요일만 출석체크가 가능합니다.',
      });
    }

    // 출석 상태 검증: 출석/결석만 허용
    if (status !== 'present' && status !== 'absent') {
      return res.status(400).json({
        error: '출석 상태는 출석 또는 결석만 가능합니다.',
      });
    }

    // 출석 타입 검증
    if (type !== 'grade' && type !== 'department') {
      return res.status(400).json({
        error: '출석 타입은 학년(grade) 또는 부서(department)만 가능합니다.',
      });
    }

    // 학생 확인
    const student = await prisma.student.findUnique({ where: { id: studentId } });
    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 부서 출석인 경우 부서 확인
    let department = null;
    if (type === 'department' && departmentId) {
      department = await prisma.department.findUnique({ where: { id: departmentId } });
      if (!department) {
        return res.status(404).json({ error: '부서를 찾을 수 없습니다.' });
      }
    }

    // 기존 기록 확인 (같은 학생, 같은 날짜, 같은 타입)
    const existing = await prisma.attendance.findUnique({
      where: {
        studentId_date_type: {
          studentId,
          date: new Date(date),
          type,
        },
      },
    });

    const oldStatus = existing?.status;
    const oldTalentGiven = existing?.talentGiven || 0;
    const talentGiven = status === 'present' ? 1 : 0;

    const typeLabel = type === 'grade' ? '학년' : '부서';
    const targetName = type === 'grade' ? student.grade : (department?.name || '');

    // 트랜잭션으로 출석 기록 저장/수정 및 달란트 처리
    const result = await prisma.$transaction(async (tx) => {
      // 출석 기록 저장/수정
      const attendance = await tx.attendance.upsert({
        where: {
          studentId_date_type: {
            studentId,
            date: new Date(date),
            type,
          },
        },
        update: {
          status,
          talentGiven,
          departmentId: type === 'department' ? departmentId : null,
        },
        create: {
          studentId,
          departmentId: type === 'department' ? departmentId : null,
          date: new Date(date),
          status,
          type,
          talentGiven,
        },
        include: {
          student: true,
          department: true,
        },
      });

      // 달란트 조정
      let talentDelta = 0;

      // 기존 달란트 회수 (상태 변경 시)
      if (oldStatus === 'present' && oldStatus !== status) {
        talentDelta -= oldTalentGiven;
        
        // 거래 내역 기록
        await tx.talentTransaction.create({
          data: {
            studentId,
            type: 'spend',
            amount: -oldTalentGiven,
            reason: `${typeLabel} 출석 상태 변경으로 인한 회수 (${targetName})`,
            attendanceId: attendance.id,
          },
        });
      }

      // 새 달란트 지급 (출석 상태일 때)
      if (status === 'present' && oldTalentGiven === 0) {
        talentDelta += 1;
        
        // 거래 내역 기록
        await tx.talentTransaction.create({
          data: {
            studentId,
            type: 'earn',
            amount: 1,
            reason: `${typeLabel} 출석 보상 (${targetName})`,
            attendanceId: attendance.id,
          },
        });
      }

      // 학생 달란트 업데이트
      if (talentDelta !== 0) {
        await tx.student.update({
          where: { id: studentId },
          data: {
            talent: {
              increment: talentDelta,
            },
          },
        });
      }

      return attendance;
    });

    return res.json(result);
  } catch (error: any) {
    console.error('출석 기록 저장 오류:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: '이미 등록된 출석 기록입니다.' });
    }
    return res.status(500).json({ error: '출석 기록 저장 중 오류가 발생했습니다.' });
  }
}

/**
 * 출석 기록 수정 (관리자만, 달란트 자동 조정)
 */
export async function updateAttendance(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'present' && status !== 'absent') {
      return res.status(400).json({
        error: '출석 상태는 출석 또는 결석만 가능합니다.',
      });
    }

    // 기존 기록 확인
    const existing = await prisma.attendance.findUnique({
      where: { id },
      include: {
        student: true,
        department: true,
      },
    });

    if (!existing) {
      return res.status(404).json({ error: '출석 기록을 찾을 수 없습니다.' });
    }

    const oldStatus = existing.status;
    const oldTalentGiven = existing.talentGiven || 0;
    const talentGiven = status === 'present' ? 1 : 0;

    // 트랜잭션으로 출석 기록 수정 및 달란트 처리
    const result = await prisma.$transaction(async (tx) => {
      // 출석 기록 수정
      const attendance = await tx.attendance.update({
        where: { id },
        data: {
          status,
          talentGiven,
        },
        include: {
          student: true,
          department: true,
        },
      });

      // 달란트 조정
      let talentDelta = 0;

      // 기존 달란트 회수
      if (oldStatus === 'present' && oldStatus !== status) {
        talentDelta -= oldTalentGiven;
        
        await tx.talentTransaction.create({
          data: {
            studentId: existing.studentId,
            type: 'spend',
            amount: -oldTalentGiven,
            reason: `부서 출석 상태 변경으로 인한 회수 (${existing.department.name})`,
            attendanceId: id,
          },
        });
      }

      // 새 달란트 지급
      if (status === 'present' && oldTalentGiven === 0) {
        talentDelta += 1;
        
        await tx.talentTransaction.create({
          data: {
            studentId: existing.studentId,
            type: 'earn',
            amount: 1,
            reason: `부서 출석 보상 (${existing.department.name})`,
            attendanceId: id,
          },
        });
      }

      // 학생 달란트 업데이트
      if (talentDelta !== 0) {
        await tx.student.update({
          where: { id: existing.studentId },
          data: {
            talent: {
              increment: talentDelta,
            },
          },
        });
      }

      return attendance;
    });

    return res.json(result);
  } catch (error: any) {
    console.error('출석 기록 수정 오류:', error);
    return res.status(500).json({ error: '출석 기록 수정 중 오류가 발생했습니다.' });
  }
}

/**
 * 출석 기록 삭제 (관리자만, 달란트 회수)
 */
export async function deleteAttendance(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 기존 기록 확인
    const existing = await prisma.attendance.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '출석 기록을 찾을 수 없습니다.' });
    }

    // 트랜잭션으로 출석 기록 삭제 및 달란트 회수
    await prisma.$transaction(async (tx) => {
      // 달란트 회수 (출석 상태였던 경우)
      if (existing.status === 'present' && existing.talentGiven > 0) {
        await tx.student.update({
          where: { id: existing.studentId },
          data: {
            talent: {
              decrement: existing.talentGiven,
            },
          },
        });

        // 거래 내역 기록
        await tx.talentTransaction.create({
          data: {
            studentId: existing.studentId,
            type: 'spend',
            amount: -existing.talentGiven,
            reason: '출석 기록 삭제로 인한 회수',
            attendanceId: id,
          },
        });
      }

      // 출석 기록 삭제
      await tx.attendance.delete({
        where: { id },
      });
    });

    return res.json({ success: true, message: '출석 기록이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('출석 기록 삭제 오류:', error);
    return res.status(500).json({ error: '출석 기록 삭제 중 오류가 발생했습니다.' });
  }
}

/**
 * 학년별 출석 기록 조회
 */
export async function getAttendanceByGrade(req: Request, res: Response) {
  try {
    const { grade } = req.params;
    const { date, startDate, endDate } = req.query;

    const students = await prisma.student.findMany({
      where: { grade },
      select: { id: true },
    });

    const where: any = {
      studentId: { in: students.map(s => s.id) },
    };

    if (date) {
      where.date = new Date(date as string);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            department: true,
          },
        },
        department: true,
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ attendance });
  } catch (error: any) {
    console.error('학년별 출석 기록 조회 오류:', error);
    return res.status(500).json({ error: '학년별 출석 기록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서별 출석 기록 조회
 */
export async function getAttendanceByDepartment(req: Request, res: Response) {
  try {
    const { departmentId } = req.params;
    const { date, startDate, endDate } = req.query;

    const where: any = {
      departmentId,
    };

    if (date) {
      where.date = new Date(date as string);
    }

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate as string);
      if (endDate) where.date.lte = new Date(endDate as string);
    }

    const attendance = await prisma.attendance.findMany({
      where,
      include: {
        student: {
          include: {
            department: true,
          },
        },
        department: true,
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ attendance });
  } catch (error: any) {
    console.error('부서별 출석 기록 조회 오류:', error);
    return res.status(500).json({ error: '부서별 출석 기록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 이름으로 출석 기록 조회
 */
export async function getAttendanceByStudentName(req: Request, res: Response) {
  try {
    const { studentName } = req.params;

    const student = await prisma.student.findFirst({
      where: { name: studentName },
    });

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    const attendance = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: {
        department: true,
      },
      orderBy: { date: 'desc' },
    });

    return res.json({ attendance });
  } catch (error: any) {
    console.error('학생 이름으로 출석 기록 조회 오류:', error);
    return res.status(500).json({ error: '출석 기록 조회 중 오류가 발생했습니다.' });
  }
}


