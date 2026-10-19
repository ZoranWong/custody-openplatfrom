/**
 * API Log Routes (ISV)
 * Developer-side API call log queries
 */

import { Router } from 'express';
import { isvAuth } from '../../middleware/isv-auth.middleware';
import { getApiLogRepository } from '../../repositories/repository.factory';

const router = Router();

/**
 * GET /api/v1/api-logs
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
 * GET /api/v1/api-logs/:id
 * Get a single API call log (only if it belongs to the current developer)
 */
router.get('/:id', isvAuth, async (req: any, res: any) => {
  try {
    const isvUser = req.isvUser;
    const repo = getApiLogRepository();
    const log: any = await repo.findById(req.params.id);

    if (!log || log.developerId !== isvUser.isvId) {
      res.status(404).json({ code: 40401, message: 'API log not found' });
      return;
    }

    res.json({
      code: 0,
      message: 'Success',
      data: {
        id: log.id,
        traceId: log.traceId,
        appId: log.appId,
        apiName: log.apiName || log.endpoint,
        endpoint: log.endpoint,
        method: log.method,
        requestHeaders: log.requestHeaders,
        requestBody: log.requestBody,
        responseStatus: log.responseStatus,
        responseBody: log.responseBody,
        responseTime: log.responseTime,
        ipAddress: log.ipAddress,
        userAgent: log.userAgent,
        isError: log.isError,
        createdAt: log.createdAt?.toISOString?.() || log.createdAt,
      },
    });
  } catch (error) {
    console.error('Get API log detail error:', error);
    res.status(500).json({ code: 50001, message: 'Internal server error' });
  }
});

export default router;