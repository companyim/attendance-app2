import { Router } from 'express';
import * as authController from '../controllers/auth.controller';
import { requireAdmin } from '../middleware/auth.middleware';

const router = Router();

router.post('/admin/login', authController.adminLogin);
router.post('/admin/logout', authController.adminLogout);
router.get('/admin/check', authController.checkAdminAuth);

export default router;


