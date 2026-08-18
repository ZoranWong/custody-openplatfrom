/**
 * API Log Routes
 * Query API call logs for developer & admin portals
 */

import { Router } from 'express';
import { isvAuth } from '../../middleware/isv-auth.middleware';
import { adminAuthMiddleware } from '../../middleware/admin-auth.middleware';
import { getApiLogRepository } from '../../repositories/repository.factory';

const router = Router();

/**
 * GET /api-logs (ISV)
 * Get paginated API call logs for the current developer
 */
router.get('/', isvAuth, async (req: any, res: any) => {
  try {
    const isvUser = req.isvUser;
    const repo = getApiLogRepository();

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const isError = req.query.isError !== undefined ? req.query.isError === '1' : undefined;
    const apiName = req.query.apiName as string | undefined;
    const startDate = req.query.startDate ? new Date(req.query.startDate as string) : undefined;
    const endDate = req.query.endDate ? new Date(req.query.endDate as string) : undefined;

    const result = await repo.findByDeveloper(isvUser.isvId, page, pageSize, {
      isError,
      apiName,
      startDate,
      endDate,
    });

    res.json({
      code: 0,
      message: 'Success',
      data: {
        list: result.list.map((log: any) => ({
          id: log.id,
          apiName: log.apiName || log.endpoint,
          endpoint: log.endpoint,
          method: log.method,
          responseStatus: log.responseStatus,
          responseTime: log.responseTime,
          ipAddress: log.ipAddress,
          isError: log.isError,
          createdAt: log.createdAt?.toISOString?.() || log.createdAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    console.error('Get API logs error:', error);
    res.status(500).json({ code: 50001, message: 'Internal server error' });
  }
});

/**
 * GET /api-logs/admin (Admin)
 * Get paginated API call logs for admin (all developers)
 */
router.get('/admin', adminAuthMiddleware, async (req: any, res: any) => {
  try {
    const repo = getApiLogRepository();

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const developerId = req.query.developerId as string | undefined;
    const isError = req.query.isError !== undefined ? req.query.isError === '1' : undefined;
    const apiName = req.query.apiName as string | undefined;

    const where: any = {};
    if (developerId) where.developerId = developerId;
    if (isError !== undefined) where.isError = isError;
    if (apiName) where.apiName = { contains: apiName };

    const result = await repo.findByDeveloper('__admin__', page, pageSize, {
      isError,
      apiName,
    });

    res.json({
      code: 0,
      message: 'Success',
      data: {
        list: result.list.map((log: any) => ({
          id: log.id,
          appId: log.appId,
          developerId: log.developerId,
          subscriptionId: log.subscriptionId,
          apiName: log.apiName || log.endpoint,
          endpoint: log.endpoint,
          method: log.method,
          responseStatus: log.responseStatus,
          responseTime: log.responseTime,
          ipAddress: log.ipAddress,
          isError: log.isError,
          createdAt: log.createdAt?.toISOString?.() || log.createdAt,
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    console.error('Get API logs error:', error);
    res.status(500).json({ code: 50001, message: 'Internal server error' });
  }
});

export default router;