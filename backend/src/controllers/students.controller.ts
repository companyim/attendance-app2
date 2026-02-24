import { Request, Response } from 'express';
import prisma from '../config/database';
import ExcelJS from 'exceljs';

/**
 * 학년에 따른 번호 접두어 반환
 */
function getGradePrefix(grade: string): string {
  switch (grade) {
    case '유치부': return '유';
    case '1학년': return '1';
    case '2학년': return '2';
    case '첫영성체': return '첫';
    case '4학년': return '4';
    case '5학년': return '5';
    case '6학년': return '6';
    default: return '?';
  }
}

/**
 * 학생 목록에 자동 번호(학번) 부여
 * 가나다순 정렬 후 번호 부여 - 새 학생은 마지막 번호
 */
function assignStudentNumbers(students: any[]): any[] {
  // 학년별로 그룹화
  const byGrade: Record<string, any[]> = {};
  
  for (const student of students) {
    const grade = student.grade;
    if (!byGrade[grade]) {
      byGrade[grade] = [];
    }
    byGrade[grade].push(student);
  }
  
  // 각 학년별로 가나다순 정렬 후 번호 부여
  const result: any[] = [];
  for (const grade of Object.keys(byGrade)) {
    // 가나다순 정렬 (이름 기준)
    const gradeStudents = byGrade[grade].sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });
    const prefix = getGradePrefix(grade);
    
    gradeStudents.forEach((student, index) => {
      result.push({
        ...student,
        studentNumber: `${prefix}-${index + 1}`,
      });
    });
  }
  
  // 학년 순서대로 정렬 후 번호순
  const gradeOrder = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
  result.sort((a, b) => {
    const aOrder = gradeOrder.indexOf(a.grade);
    const bOrder = gradeOrder.indexOf(b.grade);
    if (aOrder !== bOrder) return aOrder - bOrder;
    // 같은 학년이면 번호순
    const aNum = parseInt(a.studentNumber.split('-')[1]);
    const bNum = parseInt(b.studentNumber.split('-')[1]);
    return aNum - bNum;
  });
  
  return result;
}

/**
 * 학생 목록 조회 (인증 불필요, 공개 API)
 */
export async function getStudents(req: Request, res: Response) {
  try {
    const {
      page = '1',
      limit = '50',
      search,
      grade,
      departmentId,
    } = req.query;

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};

    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { baptismName: { contains: search as string } },
      ];
    }

    if (grade) {
      where.grade = grade;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [studentsRaw, total] = await Promise.all([
      prisma.student.findMany({
        where,
        skip,
        take: limitNum,
        include: {
          department: true,
        },
        orderBy: [
          { grade: 'asc' },
          { name: 'asc' },
        ],
      }),
      prisma.student.count({ where }),
    ]);

    // 자동 번호 부여
    const students = assignStudentNumbers(studentsRaw);

    return res.json({
      students,
      total,
      page: pageNum,
      limit: limitNum,
      totalPages: Math.ceil(total / limitNum),
    });
  } catch (error: any) {
    console.error('학생 목록 조회 오류:', error);
    return res.status(500).json({ error: '학생 목록 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 이름으로 검색 (인증 불필요, 공개 API)
 * 라우트: GET /students/search?name=xxx
 */
export async function getStudentByName(req: Request, res: Response) {
  try {
    const { name } = req.query;

    if (!name) {
      return res.status(400).json({ error: '학생 이름을 입력해주세요.' });
    }

    const studentsRaw = await prisma.student.findMany({
      where: {
        name: { contains: name as string },
      },
      include: {
        department: true,
      },
    });

    // 자동 번호 부여
    const students = assignStudentNumbers(studentsRaw);

    return res.json({ students });
  } catch (error: any) {
    console.error('학생 검색 오류:', error);
    return res.status(500).json({ error: '학생 검색 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 상세 조회 (인증 불필요, 공개 API)
 */
export async function getStudent(req: Request, res: Response) {
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

    // 출석 기록 조회
    const attendance = await prisma.attendance.findMany({
      where: { studentId: id },
      include: {
        department: true,
      },
      orderBy: { date: 'desc' },
      take: 20,
    });

    // 달란트 거래 내역 조회
    const transactions = await prisma.talentTransaction.findMany({
      where: { studentId: id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });

    return res.json({
      student,
      attendance,
      transactions,
    });
  } catch (error: any) {
    console.error('학생 상세 조회 오류:', error);
    return res.status(500).json({ error: '학생 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 이름으로 상세 조회 (인증 불필요, 공개 API)
 * 라우트: GET /students/name/:studentName
 */
export async function getStudentDetailByName(req: Request, res: Response) {
  try {
    const { studentName } = req.params;

    const studentRaw = await prisma.student.findFirst({
      where: { name: studentName },
      include: {
        department: true,
      },
    });

    if (!studentRaw) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 같은 학년의 모든 학생을 가져와서 번호 계산
    const sameGradeStudents = await prisma.student.findMany({
      where: { grade: studentRaw.grade },
      orderBy: { name: 'asc' },
    });
    
    const prefix = getGradePrefix(studentRaw.grade);
    const index = sameGradeStudents.findIndex(s => s.id === studentRaw.id);
    const studentNumber = `${prefix}-${index + 1}`;

    const student = { ...studentRaw, studentNumber };

    // 출석 기록 조회
    const attendance = await prisma.attendance.findMany({
      where: { studentId: student.id },
      include: {
        department: true,
      },
      orderBy: { date: 'desc' },
    });

    // 달란트 거래 내역 조회
    const transactions = await prisma.talentTransaction.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({
      student,
      attendance,
      transactions,
    });
  } catch (error: any) {
    console.error('학생 이름으로 조회 오류:', error);
    return res.status(500).json({ error: '학생 조회 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 등록 (관리자만)
 */
export async function createStudent(req: Request, res: Response) {
  try {
    const {
      name,
      baptismName,
      grade,
      departmentId,
      studentNumber,
      email,
      phone,
    } = req.body;

    if (!name || !grade) {
      return res.status(400).json({ error: '이름과 학년은 필수입니다.' });
    }

    // 학년 유효성 검사
    const validGrades = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
    if (!validGrades.includes(grade)) {
      return res.status(400).json({ error: '유효하지 않은 학년입니다.' });
    }

    // 부서 확인
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return res.status(404).json({ error: '부서를 찾을 수 없습니다.' });
      }
    }

    // 같은 학년의 모든 학생을 가져와서 가나다순 정렬
    const sameGradeStudents = await prisma.student.findMany({
      where: { grade },
      orderBy: { name: 'asc' },
    });

    // 가나다순 정렬
    sameGradeStudents.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });

    // 새 학생을 포함한 가나다순 정렬하여 위치 확인
    const allStudents = [...sameGradeStudents, { name, grade } as any];
    allStudents.sort((a, b) => {
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });

    // 새 학생의 가나다순 위치에 맞는 번호 할당
    const newStudentIndex = allStudents.findIndex(s => s.name === name);
    const prefix = getGradePrefix(grade);
    const autoStudentNumber = `${prefix}-${newStudentIndex + 1}`;

    const student = await prisma.student.create({
      data: {
        name,
        baptismName,
        grade,
        departmentId: departmentId || null,
        studentNumber: autoStudentNumber,
        email: email || null,
        phone: phone || null,
      },
      include: {
        department: true,
      },
    });

    return res.status(201).json(student);
  } catch (error: any) {
    console.error('학생 등록 오류:', error);
    return res.status(500).json({ error: '학생 등록 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 정보 수정 (관리자만)
 */
export async function updateStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const {
      name,
      baptismName,
      grade,
      departmentId,
      studentNumber,
      email,
      phone,
    } = req.body;

    // 학생 존재 확인
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 학년 유효성 검사
    if (grade) {
      const validGrades = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
      if (!validGrades.includes(grade)) {
        return res.status(400).json({ error: '유효하지 않은 학년입니다.' });
      }
    }

    // 부서 확인
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return res.status(404).json({ error: '부서를 찾을 수 없습니다.' });
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(baptismName !== undefined && { baptismName }),
        ...(grade && { grade }),
        ...(departmentId !== undefined && { departmentId }),
        ...(studentNumber !== undefined && { studentNumber }),
        ...(email !== undefined && { email }),
        ...(phone !== undefined && { phone }),
      },
      include: {
        department: true,
      },
    });

    return res.json(student);
  } catch (error: any) {
    console.error('학생 수정 오류:', error);
    return res.status(500).json({ error: '학생 수정 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 소속 부서 변경 (관리자만)
 */
export async function updateStudentDepartment(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { departmentId } = req.body;

    // 학생 존재 확인
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    // 부서 확인
    if (departmentId) {
      const department = await prisma.department.findUnique({
        where: { id: departmentId },
      });
      if (!department) {
        return res.status(404).json({ error: '부서를 찾을 수 없습니다.' });
      }
    }

    const student = await prisma.student.update({
      where: { id },
      data: { departmentId },
      include: {
        department: true,
      },
    });

    return res.json(student);
  } catch (error: any) {
    console.error('학생 부서 변경 오류:', error);
    return res.status(500).json({ error: '부서 변경 중 오류가 발생했습니다.' });
  }
}

/**
 * 학생 삭제 (관리자만)
 */
export async function deleteStudent(req: Request, res: Response) {
  try {
    const { id } = req.params;

    // 학생 존재 확인
    const existing = await prisma.student.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: '학생을 찾을 수 없습니다.' });
    }

    await prisma.student.delete({
      where: { id },
    });

    return res.json({ success: true, message: '학생이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('학생 삭제 오류:', error);
    return res.status(500).json({ error: '학생 삭제 중 오류가 발생했습니다.' });
  }
}

/**
 * 엑셀 파일 프리뷰 (시트 목록, 열 헤더, 샘플 데이터 반환)
 */
export async function previewExcel(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 업로드해주세요.' });
    }

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);

    const sheets = workbook.worksheets.map((ws, index) => {
      const headers: string[] = [];
      const sampleRows: string[][] = [];

      const firstRow = ws.getRow(1);
      const colCount = ws.columnCount || 0;
      for (let c = 1; c <= colCount; c++) {
        const val = firstRow.getCell(c).value?.toString().trim() || `열${c}`;
        headers.push(val);
      }

      const maxPreview = Math.min(ws.rowCount, 6);
      for (let r = 2; r <= maxPreview; r++) {
        const row = ws.getRow(r);
        const vals: string[] = [];
        for (let c = 1; c <= colCount; c++) {
          vals.push(row.getCell(c).value?.toString().trim() || '');
        }
        if (vals.some(v => v !== '')) {
          sampleRows.push(vals);
        }
      }

      const suggestedMapping: Record<string, number> = {
        name: 0, baptismName: 0, grade: 0, department: 0, phone: 0,
      };
      headers.forEach((h, i) => {
        const col = i + 1;
        const lower = h.toLowerCase();
        if (lower.includes('이름') && !suggestedMapping.name) suggestedMapping.name = col;
        else if ((lower.includes('세례') || lower.includes('영명')) && !suggestedMapping.baptismName) suggestedMapping.baptismName = col;
        else if (lower.includes('학년') && !suggestedMapping.grade) suggestedMapping.grade = col;
        else if (lower.includes('부서') && !suggestedMapping.department) suggestedMapping.department = col;
        else if ((lower.includes('연락') || lower.includes('전화') || lower.includes('핸드폰') || lower.includes('휴대')) && !suggestedMapping.phone) suggestedMapping.phone = col;
      });

      return {
        index,
        name: ws.name,
        headers,
        sampleRows,
        rowCount: ws.rowCount,
        suggestedMapping,
      };
    });

    return res.json({ sheets });
  } catch (error: any) {
    console.error('엑셀 프리뷰 오류:', error);
    return res.status(500).json({ error: '엑셀 파일을 읽는 중 오류가 발생했습니다.' });
  }
}

/**
 * 엑셀 파일 업로드로 학생 일괄 등록 (관리자만)
 */
export async function uploadStudentsExcel(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '파일을 업로드해주세요.' });
    }

    // 열 매핑 정보 파싱 (JSON 문자열로 전달됨)
    const mapping = req.body.mapping ? JSON.parse(req.body.mapping) : null;
    const sheetIndex = req.body.sheetIndex ? parseInt(req.body.sheetIndex, 10) : 0;
    const headerRowIndex = req.body.headerRow ? parseInt(req.body.headerRow, 10) : 1;

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(req.file.buffer as any);

    const worksheet = workbook.worksheets[sheetIndex];
    if (!worksheet) {
      return res.status(400).json({ error: '유효한 워크시트가 없습니다.' });
    }

    const students: any[] = [];
    const errors: string[] = [];

    const validGrades = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];

    function normalizeGrade(raw: string): string | null {
      if (!raw) return null;
      for (const g of validGrades) {
        if (raw.startsWith(g) || raw.includes(g)) return g;
      }
      return null;
    }

    function parseNameAndBaptism(raw: string): { name: string; baptismName: string | null } {
      if (!raw) return { name: '', baptismName: null };
      const cleaned = raw.replace(/[,/]/g, ' ').trim();
      const parts = cleaned.split(/\s+/);
      if (parts.length >= 2) {
        const koreanNameParts: string[] = [];
        const baptismParts: string[] = [];
        for (const part of parts) {
          if (/^[가-힣]+$/.test(part) && koreanNameParts.length < 1) {
            koreanNameParts.push(part);
          } else if (koreanNameParts.length > 0) {
            baptismParts.push(part);
          } else {
            koreanNameParts.push(part);
          }
        }
        return {
          name: koreanNameParts.join(''),
          baptismName: baptismParts.length > 0 ? baptismParts.join(' ') : null,
        };
      }
      return { name: cleaned, baptismName: null };
    }

    // 열 매핑: 사용자가 지정한 열 번호 (1-based) 사용, 없으면 자동 감지
    let colName = mapping?.name || 0;
    let colBaptism = mapping?.baptismName || 0;
    let colGrade = mapping?.grade || 0;
    let colDepartment = mapping?.department || 0;
    let colPhone = mapping?.phone || 0;
    const nameIncludesBaptism = !colBaptism && colName;

    // 매핑이 없으면 헤더 기반 자동 감지
    if (!mapping) {
      const firstRow = worksheet.getRow(1);
      colName = 2;
      colGrade = 3;
      colPhone = 4;
      for (let c = 1; c <= (worksheet.columnCount || 11); c++) {
        const val = firstRow.getCell(c).value?.toString().trim() || '';
        if (val.includes('이름')) colName = c;
        else if (val.includes('학년')) colGrade = c;
        else if (val.includes('연락') || val.includes('전화')) colPhone = c;
      }
    }

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber <= headerRowIndex) return;

      const rawName = colName ? row.getCell(colName).value?.toString().trim() : null;
      const rawBaptism = colBaptism ? row.getCell(colBaptism).value?.toString().trim() : null;
      const rawGrade = colGrade ? row.getCell(colGrade).value?.toString().trim() : null;
      const rawDepartment = colDepartment ? row.getCell(colDepartment).value?.toString().trim() : null;
      const rawPhone = colPhone ? row.getCell(colPhone).value?.toString().trim() : null;

      if (!rawName && !rawGrade) return;

      if (!rawName) {
        errors.push(`${rowNumber}행: 이름이 없습니다.`);
        return;
      }

      if (!rawGrade) {
        errors.push(`${rowNumber}행: 학년이 없습니다.`);
        return;
      }

      const grade = normalizeGrade(rawGrade);
      if (!grade) {
        errors.push(`${rowNumber}행: 유효하지 않은 학년입니다 (${rawGrade}).`);
        return;
      }

      let name: string;
      let baptismName: string | null;

      if (colBaptism) {
        name = rawName.replace(/[,/]/g, ' ').trim().split(/\s+/)[0] || rawName;
        baptismName = rawBaptism || null;
      } else {
        const parsed = parseNameAndBaptism(rawName);
        name = parsed.name;
        baptismName = parsed.baptismName;
      }

      if (!name) {
        errors.push(`${rowNumber}행: 이름을 파싱할 수 없습니다 (${rawName}).`);
        return;
      }

      students.push({
        name,
        baptismName,
        grade,
        phone: rawPhone || null,
        departmentName: rawDepartment || null,
        studentNumber: null,
      });
    });

    if (errors.length > 0 && students.length === 0) {
      return res.status(400).json({ error: '유효한 데이터가 없습니다.', errors });
    }

    // 부서 이름으로 부서 ID 매핑 (없으면 생성)
    const departments = await prisma.department.findMany();
    const deptMap = new Map(departments.map(d => [d.name, d.id]));

    // 엑셀에 있는 부서 이름들 수집
    const uniqueDeptNames = new Set(students.map(s => s.departmentName).filter(Boolean));
    
    // 없는 부서 생성
    for (const deptName of uniqueDeptNames) {
      if (!deptMap.has(deptName)) {
        const newDept = await prisma.department.create({
          data: { name: deptName },
        });
        deptMap.set(deptName, newDept.id);
        console.log(`새 부서 생성: ${deptName}`);
      }
    }

    // 학생 등록 전 정렬: 학년별 우선, 같은 학년 내에서 가나다순
    students.sort((a, b) => {
      // 1순위: 학년순
      const gradeOrder = ['유치부', '1학년', '2학년', '첫영성체', '4학년', '5학년', '6학년'];
      const aGradeOrder = gradeOrder.indexOf(a.grade);
      const bGradeOrder = gradeOrder.indexOf(b.grade);
      if (aGradeOrder !== bGradeOrder) {
        return aGradeOrder - bGradeOrder;
      }
      // 2순위: 같은 학년이면 가나다순 (이름 기준)
      const nameA = a.name || '';
      const nameB = b.name || '';
      return nameA.localeCompare(nameB, 'ko');
    });

    // 학생 등록
    const created: any[] = [];
    const skipped: any[] = [];

    console.log('부서 맵:', Object.fromEntries(deptMap));

    for (const student of students) {
      console.log(`학생: ${student.name}, 부서명: "${student.departmentName}"`);
      const departmentId = student.departmentName ? deptMap.get(student.departmentName) : null;
      console.log(`-> 매핑된 부서ID: ${departmentId}`);

      // 이미 존재하는 학생 확인 (이름 + 학년으로)
      const existing = await prisma.student.findFirst({
        where: {
          name: student.name,
          grade: student.grade,
        },
      });

      if (existing) {
        // 기존 학생의 부서 업데이트
        if (departmentId && existing.departmentId !== departmentId) {
          await prisma.student.update({
            where: { id: existing.id },
            data: { departmentId },
          });
          console.log(`-> 기존 학생 부서 업데이트: ${existing.name} -> ${departmentId}`);
          skipped.push({ ...student, reason: '기존 학생 부서 업데이트됨' });
        } else {
          skipped.push({ ...student, reason: '이미 존재하는 학생' });
        }
        continue;
      }

      const createdStudent = await prisma.student.create({
        data: {
          name: student.name,
          baptismName: student.baptismName,
          grade: student.grade,
          departmentId: departmentId || null,
          studentNumber: student.studentNumber,
          phone: student.phone || null,
        },
      });

      created.push(createdStudent);
    }

    return res.json({
      success: true,
      message: `${created.length}명의 학생이 등록되었습니다.`,
      created: created.length,
      skipped: skipped.length,
      errors: errors.length,
      details: {
        skipped,
        errors,
      },
    });
  } catch (error: any) {
    console.error('엑셀 업로드 오류:', error);
    return res.status(500).json({ error: '엑셀 업로드 중 오류가 발생했습니다.' });
  }
}

/**
 * 모든 학생 데이터 삭제 (관리자만)
 * 학생, 출석 기록, 달란트 거래 내역, 부서 모두 삭제
 */
export async function deleteAllStudents(req: Request, res: Response) {
  try {
    // 트랜잭션으로 모든 데이터 삭제
    await prisma.$transaction(async (tx) => {
      // 1. 달란트 거래 내역 삭제
      await tx.talentTransaction.deleteMany({});
      
      // 2. 출석 기록 삭제
      await tx.attendance.deleteMany({});
      
      // 3. 학생 삭제
      await tx.student.deleteMany({});
      
      // 4. 부서 삭제
      await tx.department.deleteMany({});
    });

    return res.json({ 
      success: true, 
      message: '모든 학생 데이터가 삭제되었습니다.' 
    });
  } catch (error: any) {
    console.error('전체 삭제 오류:', error);
    return res.status(500).json({ error: '전체 삭제 중 오류가 발생했습니다.' });
  }
}
