import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/error.middleware';
import authRoutes from './routes/auth.routes';
import departmentRoutes from './routes/departments.routes';
import studentRoutes from './routes/students.routes';
import attendanceRoutes from './routes/attendance.routes';
import talentRoutes from './routes/talents.routes';
import statisticsRoutes from './routes/statistics.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://attendance-app-one-neon.vercel.app',
    process.env.CORS_ORIGIN || ''
  ].filter(Boolean),
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
  // 데이터베이스 연결
  const dbConnected = await connectDatabase();
  if (!dbConnected) {
    console.error('데이터베이스 연결 실패. 서버를 종료합니다.');
    process.exit(1);
  }

  app.listen(PORT, () => {
    console.log(`서버가 포트 ${PORT}에서 실행 중입니다.`);
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

