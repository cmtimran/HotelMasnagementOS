import { Router } from 'express';
import { reportController } from '../controllers/report.controller.js';
import { requirePermission } from '../middleware/rbacGuard.js';
import { requirePropertyScope } from '../middleware/propertyScope.js';

const router = Router();

router.use(requirePropertyScope);

// Reporting Overview Metrics
router.get('/overview/metrics', requirePermission('reports.view'), reportController.getOverviewMetrics);

// Unified Report Slug Route - dynamically dispatches any of the 54 hospitality reports
router.get('/:slug', requirePermission('reports.view'), reportController.getReportBySlug);

export default router;
