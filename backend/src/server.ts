import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database';
import { migrateDepartmentRelation } from './scripts/migrateDepartments';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/departments.routes';
import studentRoutes from './routes/students.routes';
import attendanceRoutes from './routes/attendance.routes';
import talentRoutes from './routes/talents.routes';
import statisticsRoutes from './routes/statistics.routes';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// 미들웨어
// CORS 설정: 여러 origin을 환경 변수로 설정 가능 (쉼표로 구분)
const corsOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:3000',
  'https://attendance-app-one-neon.vercel.app',
  'https://attendance-app2-wheat.vercel.app',
  ...(process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim()) : [])
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // origin이 없거나 (같은 도메인 요청) 허용된 origin 목록에 있으면 허용
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // 개발 환경에서는 모든 origin 허용 (네트워크 연결 편의를 위해)
      if (process.env.NODE_ENV !== 'production') {
        callback(null, true);
      } else {
        callback(new Error('CORS 정책에 의해 차단되었습니다.'));
      }
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 기본 라우트
app.get('/', (req, res) => {
  res.json({ message: '출석부 앱 API 서버' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API 라우트
app.use('/api/auth', authRoutes);
app.use('/api/departments', departmentRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/talents', talentRoutes);
app.use('/api/statistics', statisticsRoutes);
// app.use('/api/students', studentRoutes);
// app.use('/api/attendance', attendanceRoutes);

// 에러 핸들링
app.use(errorHandler);

// 404 핸들링
app.use((req, res) => {
  res.status(404).json({ error: '요청한 리소스를 찾을 수 없습니다.' });
});

// 서버 시작
async function startServer() {
  const dbConnected = await connectDatabase();
  if (!dbConnected) {
    console.error('데이터베이스 연결 실패. 서버를 종료합니다.');
    process.exit(1);
  }

  await migrateDepartmentRelation();

  // 0.0.0.0으로 바인딩하여 모든 네트워크 인터페이스에서 접근 가능하게 함
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
    console.log(`로컬 접속: http://localhost:${PORT}`);
    console.log(`네트워크 접속: http://[본인 PC의 IP 주소]:${PORT}`);
  });
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('서버 종료 중...');
  await disconnectDatabase();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('서버 종료 중...');
  await disconnectDatabase();
  process.exit(0);
});

startServer();

