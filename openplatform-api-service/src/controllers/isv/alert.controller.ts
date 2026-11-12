/**
 * ISV Alert Settings Controller
 * GET/PUT alert settings, GET alert event history.
 */

import { Request, Response } from 'express';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';
import { getApiLogRepository } from '../../repositories/repository.factory';
import { getRetentionInfo } from '../../services/api-log-retention.service';

export async function getAlertSettings(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser;
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' });
      return;
    }
    const repo = getApiLogRepository();
    const [settings, retention] = await Promise.all([
      repo.listAlertSettings(false),
      getRetentionInfo(isvUser.isvId),
    ]);
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
        // Raw log retention: configured value, the package ceiling, and what
        // the rollup actually applies (min of the two).
        logRetentionDays: retention.configuredDays,
        maxLogRetentionDays: retention.maxDays,
        effectiveLogRetentionDays: retention.effectiveDays,
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
    const { alertEmail, enabled, windowSeconds, errorThreshold, cooldownSeconds, logRetentionDays } = req.body;

    // The package value is a ceiling: reject rather than silently persist a
    // value the rollup would then clamp, so the UI never shows a lie.
    const retention = await getRetentionInfo(isvUser.isvId);
    let nextRetention = retention.configuredDays;
    if (logRetentionDays !== undefined && logRetentionDays !== null) {
      const requested = Number(logRetentionDays);
      if (!Number.isInteger(requested) || requested < retention.minDays) {
        res.status(HttpCodes.BAD_REQUEST).json({
          code: BusinessCodes.PARAM_INVALID_FORMAT,
          message: `logRetentionDays must be an integer >= ${retention.minDays}`,
        });
        return;
      }
      if (requested > retention.maxDays) {
        res.status(HttpCodes.BAD_REQUEST).json({
          code: BusinessCodes.PARAM_BUSINESS_RULE,
          message: `logRetentionDays must be <= ${retention.maxDays} for the active package`,
        });
        return;
      }
      nextRetention = requested;
    }

    const repo = getApiLogRepository();
    await repo.upsertAlertSetting({
      developerId: isvUser.isvId,
      alertEmail: alertEmail ?? null,
      enabled: enabled ?? false,
      windowSeconds: windowSeconds ?? 300,
      errorThreshold: errorThreshold ?? 10,
      cooldownSeconds: cooldownSeconds ?? 3600,
      logRetentionDays: nextRetention,
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
