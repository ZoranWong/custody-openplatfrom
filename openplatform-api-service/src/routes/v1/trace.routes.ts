/**
 * Trace Routes
 * Admin endpoints for trace query and management
 */

import { Router } from 'express';
import { getTraceById, listTraces, getTraceStats } from '../../controllers/trace.controller';
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware';
import { requirePermission } from '../../middleware/admin-permission.middleware';
import { Resource } from '../../constants/admin-permissions';

const router = Router();

/**
 * GET /api/v1/admin/traces/:traceId
 * Get trace by ID
 */
router.get(
  '/traces/:traceId',
  adminAuthMiddleware,
  requirePermission(Resource.ANALYTICS_VIEW),
  getTraceById
);

/**
 * GET /api/v1/admin/traces
 * List traces with filters
 */
router.get(
  '/traces',
  adminAuthMiddleware,
  requirePermission(Resource.ANALYTICS_VIEW),
  listTraces
);

/**
 * GET /api/v1/admin/traces/stats
 * Get trace statistics
 */
router.get(
  '/traces/stats',
  adminAuthMiddleware,
  requirePermission(Resource.ANALYTICS_VIEW),
  getTraceStats
);

export default router;
