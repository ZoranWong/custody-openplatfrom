import { Request, Response } from 'express';
import { getApiLogRepository } from '../../repositories/repository.factory';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';

/**
 * GET /admin/api-logs
 * Get paginated API call logs for admin (all developers)
 */
export async function getApiLogs(req: Request, res: Response): Promise<void> {
  try {
    const repo = getApiLogRepository();

    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const developerId = req.query.developerId as string | undefined;
    const isError = req.query.isError !== undefined ? req.query.isError === '1' : undefined;
    const apiName = req.query.apiName as string | undefined;

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
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    });
  } catch (error) {
    console.error('Get API logs error:', error);
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get API logs',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    });
  }
}

/**
 * GET /admin/api-logs/:id
 * Get a single API call log with request/response payloads.
 */
export async function getApiLogDetail(req: Request, res: Response): Promise<void> {
  const traceId = (req.headers['x-trace-id'] as string) || '';
  try {
    const repo = getApiLogRepository();
    const log: any = await repo.findById(req.params.id);

    if (!log) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'API log not found',
        data: null,
        trace_id: traceId,
      });
      return;
    }

    res.json({
      code: 0,
      message: 'Success',
      data: {
        id: log.id,
        traceId: log.traceId,
        appId: log.appId,
        developerId: log.developerId,
        subscriptionId: log.subscriptionId,
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
      trace_id: traceId,
    });
  } catch (error) {
    console.error('Get API log detail error:', error);
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get API log detail',
      data: null,
      trace_id: traceId,
    });
  }
}