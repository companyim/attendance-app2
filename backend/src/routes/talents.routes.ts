import { Router } from 'express';
import * as talentsController from '../controllers/talents.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

// 공개 API (인증 불필요)
router.get('/student/:studentId', talentsController.getStudentTalent);
router.get('/student/name/:studentName', talentsController.getStudentTalentByName);
router.get('/transactions', talentsController.getTalentTransactions);
router.get('/leaderboard', talentsController.getLeaderboard);
router.get('/department/:departmentId', talentsController.getDepartmentTalent);
router.get('/grade/:grade', talentsController.getGradeTalent);

// 관리자 전용 API
router.post('/adjust', requireAdmin, talentsController.adjustTalent);

export default router;


