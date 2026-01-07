import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * 학생 달란트 현황 조회 (인증 불필요, 공개 API)
 */
export async function getStudentTalent(req: Request, res: Response) {
  try {
    const { studentId } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: {
        department: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 거래 내역 조회
    const transactions = await prisma.talentTransaction.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      student: {
        id: student.id,
        name: student.name,
        talent: student.talent,
        department: student.department,
      },
      transactions,
    });
  } catch (error: any) {
    console.error('학생 달란트 조회 오류:', error);
    return res.status(500).json({ error: '달란트 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 이름으로 달란트 현황 조회 (인증 불필요, 공개 API)
 */
export async function getStudentTalentByName(req: Request, res: Response) {
  try {
    const { studentName } = req.params;

    const student = await prisma.student.findFirst({
      where: { name: studentName },
      include: {
        department: true,
      },
    });

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 거래 내역 조회
    const transactions = await prisma.talentTransaction.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      student: {
        id: student.id,
        name: student.name,
        talent: student.talent,
        department: student.department,
      },
      transactions,
    });
  } catch (error: any) {
    console.error('학생 이름으로 달란트 조회 오류:', error);
    return res.status(500).json({ error: '달란트 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 달란트 거래 내역 조회 (인증 불필요, 공개 API)
 */
export async function getTalentTransactions(req: Request, res: Response) {
  try {
    const { studentId, studentName, startDate, endDate } = req.query;

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
        return res.json({ transactions: [] });
      }
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate as string);
      if (endDate) where.createdAt.lte = new Date(endDate as string);
    }

    const transactions = await prisma.talentTransaction.findMany({
      where,
      include: {
        student: {
          include: {
            department: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ transactions });
  } catch (error: any) {
    console.error('달란트 거래 내역 조회 오류:', error);
    return res.status(500).json({ error: '거래 내역 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 달란트 수동 조정 (관리자만)
 */
export async function adjustTalent(req: Request, res: Response) {
  try {
    const { studentId, amount, reason } = req.body;

    if (!studentId || amount === undefined || !reason) {
      return res.status(400).json({ error: '필수 필드가 누락되었습니다.' });
    }

    // 학생 확인
    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 트랜잭션으로 달란트 조정
    const result = await prisma.$transaction(async (tx) => {
      // 학생 달란트 업데이트
      const updatedStudent = await tx.student.update({
        where: { id: studentId },
        data: {
          talent: {
            increment: amount,
          },
        },
      });

      // 거래 내역 기록
      const transaction = await tx.talentTransaction.create({
        data: {
          studentId,
          type: amount > 0 ? 'adjust' : 'adjust',
          amount,
          reason,
        },
      });

      return { student: updatedStudent, transaction };
    });

    return res.json(result);
  } catch (error: any) {
    console.error('달란트 조정 오류:', error);
    return res.status(500).json({ error: '달란트 조정 중 오류가 발생했습니다.' });
  }
}

/**
 * 달란트 리더보드 (인증 불필요, 공개 API)
 */
export async function getLeaderboard(req: Request, res: Response) {
  try {
    const { grade, departmentId, limit = '10' } = req.query;

    const where: any = {};
    if (grade) where.grade = grade;
    if (departmentId) where.departmentId = departmentId;

    const students = await prisma.student.findMany({
      where,
      orderBy: { talent: 'desc' },
      take: parseInt(limit as string, 10),
      include: {
        department: true,
      },
    });

    return res.json({ leaderboard: students });
  } catch (error: any) {
    console.error('리더보드 조회 오류:', error);
    return res.status(500).json({ error: '리더보드 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서별 달란트 현황 (인증 불필요, 공개 API)
 */
export async function getDepartmentTalent(req: Request, res: Response) {
  try {
    const { departmentId } = req.params;

    const students = await prisma.student.findMany({
      where: { departmentId },
      orderBy: { talent: 'desc' },
      include: {
        department: true,
      },
    });

    const totalTalent = students.reduce((sum, student) => sum + student.talent, 0);
    const averageTalent = students.length > 0 ? totalTalent / students.length : 0;

    return res.json({
      departmentId,
      students,
      totalTalent,
      averageTalent,
      studentCount: students.length,
    });
  } catch (error: any) {
    console.error('부서별 달란트 조회 오류:', error);
    return res.status(500).json({ error: '부서별 달란트 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학년별 달란트 현황 (인증 불필요, 공개 API)
 */
export async function getGradeTalent(req: Request, res: Response) {
  try {
    const { grade } = req.params;

    const students = await prisma.student.findMany({
      where: { grade },
      orderBy: { talent: 'desc' },
      include: {
        department: true,
      },
    });

    const totalTalent = students.reduce((sum, student) => sum + student.talent, 0);
    const averageTalent = students.length > 0 ? totalTalent / students.length : 0;

    return res.json({
      grade,
      students,
      totalTalent,
      averageTalent,
      studentCount: students.length,
    });
  } catch (error: any) {
    console.error('학년별 달란트 조회 오류:', error);
    return res.status(500).json({ error: '학년별 달란트 조회 중 오류가 발생했습니다.' });
  }
}


