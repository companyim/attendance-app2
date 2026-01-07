import { Router } from 'express';
import * as attendanceController from '../controllers/attendance.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// 공개 API (인증 불필요)
router.get('/', attendanceController.getAttendance);
router.get('/available-dates', attendanceController.getAvailableDates);
router.get('/student/:studentName', attendanceController.getAttendanceByStudentName);
router.get('/grade/:grade', attendanceController.getAttendanceByGrade);
router.get('/department/:departmentId', attendanceController.getAttendanceByDepartment);

// 관리자 전용 API
router.post('/', requireAdmin, attendanceController.upsertAttendance);
router.put('/:id', requireAdmin, attendanceController.updateAttendance);
router.delete('/:id', requireAdmin, attendanceController.deleteAttendance);

export default router;


