import { Router } from 'express';
import * as statisticsController from '../controllers/statistics.controller';

const router = Router();

// 모든 통계 API는 공개 (인증 불필요)
router.get('/overview', statisticsController.getOverview);
router.get('/student/:id', statisticsController.getStudentStatistics);
router.get('/period', statisticsController.getPeriodStatistics);
router.get('/trend', statisticsController.getAttendanceTrend);
router.get('/rate', statisticsController.getAttendanceRate);
router.get('/grades', statisticsController.getGradesComparison);
router.get('/departments', statisticsController.getDepartmentsComparison);
router.get('/talent', statisticsController.getTalentStatistics);
router.get('/date-grade-comparison', statisticsController.getDateGradeComparison);
router.get('/date-department-comparison', statisticsController.getDateDepartmentComparison);
router.get('/export-excel', statisticsController.exportAllDataExcel);

export default router;


