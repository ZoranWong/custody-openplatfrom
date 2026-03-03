/**
 * Usage Routes
 * Usage statistics and trend API endpoints for developer portal
 *
 * Base path: /api/v1/usage
 */

import { Router } from 'express';
import { isvAuth, ISVAuthRequest } from '../../middleware/isv-auth.middleware';
import { billingController } from '../../controllers/billing.controller';

const router = Router();

// ============================================
// Usage Routes
// ============================================

/**
 * GET /usage/statistics
 * Get usage statistics for the current billing period
 */
router.get('/statistics', isvAuth, (req: any, res: any, next: any) => {
  billingController.getUsageStatistics(req, res, next);
});

/**
 * GET /usage/trend
 * Get usage trend data
 */
router.get('/trend', isvAuth, (req: any, res: any, next: any) => {
  billingController.getUsageTrend(req, res, next);
});

export default router;
