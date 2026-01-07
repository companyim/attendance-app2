import { Router } from 'express';
import multer from 'multer';
import * as studentsController from '../controllers/students.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// 공개 API (인증 불필요)
router.get('/', studentsController.getStudents);
router.get('/search', studentsController.getStudentByName);
router.get('/name/:studentName', studentsController.getStudentDetailByName);
router.get('/:id', studentsController.getStudent);

// 관리자 전용 API
router.post('/', requireAdmin, studentsController.createStudent);
router.post('/upload-excel', requireAdmin, upload.single('file'), studentsController.uploadStudentsExcel);
router.put('/:id', requireAdmin, studentsController.updateStudent);
router.put('/:id/department', requireAdmin, studentsController.updateStudentDepartment);
router.delete('/all', requireAdmin, studentsController.deleteAllStudents);
router.delete('/:id', requireAdmin, studentsController.deleteStudent);

export default router;

