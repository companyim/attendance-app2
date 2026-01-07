import { Request, Response } from 'express';
import prisma from '../config/database';

/**
 * 부서 목록 조회
 */
export async function getDepartments(req: Request, res: Response) {
  try {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    return res.json(departments);
  } catch (error: any) {
    console.error('부서 목록 조회 오류:', error);
    return res.status(500).json({ error: '부서 목록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서 상세 조회
 */
export async function getDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const department = await prisma.department.findUnique({
      where: { id },
      include: {
        students: true,
      },
    });

    if (!department) {
      return res.status(404).json({ error: '부서를 찾을 수 없습니다.' });
    }

    return res.json(department);
  } catch (error: any) {
    console.error('부서 상세 조회 오류:', error);
    return res.status(500).json({ error: '부서 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서 등록 (관리자만)
 */
export async function createDepartment(req: Request, res: Response) {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ error: '부서명을 입력해주세요.' });
    }

    // 부서명 중복 확인
    const existing = await prisma.department.findUnique({
      where: { name },
    });

    if (existing) {
      return res.status(409).json({ error: '이미 존재하는 부서명입니다.' });
    }

    const department = await prisma.department.create({
      data: {
        name,
        description,
      },
    });

    return res.status(201).json(department);
  } catch (error: any) {
    console.error('부서 등록 오류:', error);
    return res.status(500).json({ error: '부서 등록 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서 정보 수정 (관리자만)
 */
export async function updateDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    // 부서 존재 확인
    const existing = await prisma.department.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '부서를 찾을 수 없습니다.' });
    }

    // 부서명 중복 확인 (다른 부서와 이름이 겹치지 않도록)
    if (name && name !== existing.name) {
      const duplicate = await prisma.department.findUnique({
        where: { name },
      });

      if (duplicate) {
        return res.status(409).json({ error: '이미 존재하는 부서명입니다.' });
      }
    }

    const department = await prisma.department.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
      },
    });

    return res.json(department);
  } catch (error: any) {
    console.error('부서 수정 오류:', error);
    return res.status(500).json({ error: '부서 수정 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서 삭제 (관리자만, 소속 학생이 없을 때만)
 */
export async function deleteDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 소속 학생 확인
    const studentCount = await prisma.student.count({
      where: { departmentId: id },
    });

    if (studentCount > 0) {
      return res.status(400).json({
        error: '소속 학생이 있어 부서를 삭제할 수 없습니다. 먼저 학생들을 다른 부서로 이동하세요.',
      });
    }

    await prisma.department.delete({
      where: { id },
    });

    return res.json({ success: true, message: '부서가 삭제되었습니다.' });
  } catch (error: any) {
    console.error('부서 삭제 오류:', error);
    return res.status(500).json({ error: '부서 삭제 중 오류가 발생했습니다.' });
  }
}

/**
 * 부서별 학생 목록
 */
export async function getDepartmentStudents(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const students = await prisma.student.findMany({
      where: { departmentId: id },
      orderBy: { name: 'asc' },
    });
    return res.json(students);
  } catch (error: any) {
    console.error('부서별 학생 목록 조회 오류:', error);
    return res.status(500).json({ error: '학생 목록 조회 중 오류가 발생했습니다.' });
  }
}


