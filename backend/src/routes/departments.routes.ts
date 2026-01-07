import { Router } from 'express';
import * as departmentsController from '../controllers/departments.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// 공개 API (인증 불필요)
router.get('/', departmentsController.getDepartments);
router.get('/:id', departmentsController.getDepartment);
router.get('/:id/students', departmentsController.getDepartmentStudents);

// 관리자 전용 API
router.post('/', requireAdmin, departmentsController.createDepartment);
router.put('/:id', requireAdmin, departmentsController.updateDepartment);
router.delete('/:id', requireAdmin, departmentsController.deleteDepartment);

export default router;


