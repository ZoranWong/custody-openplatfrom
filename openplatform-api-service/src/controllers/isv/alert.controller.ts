/**
 * ISV Alert Settings Controller
 * GET/PUT alert settings, GET alert event history.
 */

import { Request, Response } from 'express';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';
import { getApiLogRepository } from '../../repositories/repository.factory';

export async function getAlertSettings(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser;
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' });
      return;
    }
    const repo = getApiLogRepository();
    const settings = await repo.listAlertSettings(false);
    const mySetting = settings.find((s) => s.developerId === isvUser.isvId);

    res.json({
      code: 0,
      message: 'Success',
      data: {
        alertEmail: mySetting?.alertEmail ?? null,
        enabled: mySetting?.enabled ?? false,
        windowSeconds: mySetting?.windowSeconds ?? 300,
        errorThreshold: mySetting?.errorThreshold ?? 10,
        cooldownSeconds: mySetting?.cooldownSeconds ?? 3600,
      },
    });
  } catch (error) {
    console.error('Get alert settings error:', error);
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' });
  }
}

export async function updateAlertSettings(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser;
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' });
      return;
    }
    const { alertEmail, enabled, windowSeconds, errorThreshold, cooldownSeconds } = req.body;
    const repo = getApiLogRepository();
    await repo.upsertAlertSetting({
      developerId: isvUser.isvId,
      alertEmail: alertEmail ?? null,
      enabled: enabled ?? false,
      windowSeconds: windowSeconds ?? 300,
      errorThreshold: errorThreshold ?? 10,
      cooldownSeconds: cooldownSeconds ?? 3600,
    });
    res.json({ code: 0, message: 'Alert settings updated' });
  } catch (error) {
    console.error('Update alert settings error:', error);
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' });
  }
}

export async function getAlertEvents(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser;
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' });
      return;
    }
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const repo = getApiLogRepository();
    const result = await repo.getAlertEvents(isvUser.isvId, page, pageSize);
    res.json({
      code: 0,
      message: 'Success',
      data: {
        list: result.list.map((e: any) => ({
          windowEnd: e.windowEnd?.toISOString?.() ?? String(e.windowEnd),
          errorCount: e.errorCount,
          totalCount: e.totalCount,
          sent: e.sent,
          createdAt: e.createdAt?.toISOString?.() ?? String(e.createdAt),
        })),
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
      },
    });
  } catch (error) {
    console.error('Get alert events error:', error);
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Internal server error' });
  }
}
