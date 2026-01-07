import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import prisma from '../config/database';

/**
 * 관리자 로그인
 */
export async function adminLogin(req: Request, res: Response) {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ error: '비밀번호를 입력해주세요.' });
    }

    // 관리자 인증 정보 조회
    let adminAuth = await prisma.adminAuth.findFirst();

    // 초기 설정: 관리자 비밀번호가 없으면 기본 비밀번호로 생성
    if (!adminAuth) {
      const defaultPassword = '1004'; // 기본 비밀번호 1004
      console.log('새 관리자 계정 생성, 기본 비밀번호:', defaultPassword);
      const hashedPassword = await bcrypt.hash(defaultPassword, 10);
      
      adminAuth = await prisma.adminAuth.create({
        data: {
          passwordHash: hashedPassword,
        },
      });
    }
    
    console.log('입력된 비밀번호:', password);

    // 비밀번호 확인
    const isValid = await bcrypt.compare(password, adminAuth.passwordHash);

    if (!isValid) {
      return res.status(401).json({ error: '비밀번호가 올바르지 않습니다.' });
    }

    // 세션 또는 쿠키에 관리자 인증 상태 저장
    // 임시로 간단한 토큰 반환 (추후 JWT로 변경 가능)
    const token = Buffer.from(`admin:${Date.now()}`).toString('base64');

    // 쿠키 설정 (선택사항)
    res.cookie('adminAuth', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000, // 24시간
    });

    return res.json({
      success: true,
      message: '관리자 모드로 진입했습니다.',
      token, // 클라이언트에서 사용할 수 있도록 토큰도 반환
    });
  } catch (error: any) {
    console.error('관리자 로그인 오류:', error);
    return res.status(500).json({ error: '로그인 중 오류가 발생했습니다.' });
  }
}

/**
 * 관리자 로그아웃
 */
export async function adminLogout(req: Request, res: Response) {
  res.clearCookie('adminAuth');
  return res.json({ success: true, message: '로그아웃되었습니다.' });
}

/**
 * 관리자 인증 상태 확인
 */
export async function checkAdminAuth(req: Request, res: Response) {
  const token = req.cookies?.adminAuth || req.headers.authorization?.replace('Bearer ', '');
  const isAdmin = !!token; // 간단한 체크 (추후 실제 토큰 검증 로직 추가)

  return res.json({ isAdmin });
}


