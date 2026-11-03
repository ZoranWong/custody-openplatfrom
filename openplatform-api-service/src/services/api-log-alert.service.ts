/**
 * Periodic API log error alert scanner.
 *
 * Runs every N minutes (default 5). For every developer who has alerts
 * enabled, it checks whether the error count in their configured time window
 * (since their last cooldown end) exceeds their threshold. If so, it records
 * a DeveloperAlertEvent and (optionally) sends an alert email.
 *
 * The scanner uses `isRollupInstance()` to skip on non-primary workers and
 * a MySQL advisory lock to prevent concurrent runs across the cluster.
 */

import { getApiLogRepository } from '../repositories/repository.factory';
import { getClient } from '../repositories/db-client';
import { isRollupInstance, withAdvisoryLock } from '../utils/single-instance';
import { sendAlertEmail } from './email.service';

export interface ApiLogAlertConfig {
  /** Interval in seconds between scan runs. Default 300 (5 min). */
  intervalSeconds?: number;
  now?: () => Date;
}

interface AlertSetting {
  developerId: string;
  alertEmail: string | null;
  enabled: boolean;
  windowSeconds: number;
  errorThreshold: number;
  cooldownSeconds: number;
}

interface ErrorSample {
  endpoint: string;
  method: string;
  traceId: string | null;
  responseStatus: number | null;
  createdAt: string;
}

export function createApiLogAlertService(config: ApiLogAlertConfig = {}) {
  const interval = config.intervalSeconds ?? 300;
  const now = config.now ?? (() => new Date());

  /**
   * Single scan pass: check every enabled developer and fire alerts if needed.
   */
  async function runCheck(): Promise<void> {
    const repo = getApiLogRepository();
    const client = getClient();
    const settings = await repo.listAlertSettings(true);
    if (settings.length === 0) return;

    for (const s of settings) {
      if (!s.alertEmail) continue;
      const cooldownEnd = await repo.getAlertCooldownEnd(s.developerId);
      const scanEnd = now();
      // With no prior alert, the cooldown end is the epoch — fall back to a
      // bounded sliding window so the first scan does not tally all history.
      const windowStart =
        cooldownEnd.getTime() === 0 ||
        cooldownEnd.getTime() < scanEnd.getTime() - s.windowSeconds * 1000
          ? new Date(scanEnd.getTime() - s.windowSeconds * 1000)
          : cooldownEnd;
      const windowEnd = scanEnd;

      const [{ errorCount, totalCount }] = await repo.countErrorsInWindow(
        s.developerId,
        windowStart,
        windowEnd,
      );

      if (errorCount < s.errorThreshold) continue;

      // Build sample errors (most recent 5)
      const samples = await repo.findRecentErrorsInWindow(
        s.developerId,
        windowStart,
        windowEnd,
        5,
      );

      const sampleErrors: ErrorSample[] = samples.map((e: any) => ({
        endpoint: e.endpoint,
        method: e.method,
        traceId: e.trace_id ?? e.traceId ?? null,
        responseStatus: e.response_status ?? e.responseStatus ?? null,
        createdAt:
          e.created_at instanceof Date
            ? e.created_at.toISOString()
            : String(e.created_at ?? e.createdAt ?? ''),
      }));

      // Record the alert event
      await repo.createAlertEvent({
        developerId: s.developerId,
        windowEnd,
        errorCount,
        totalCount,
        sampleErrors,
        sent: false,
      });

      // Send email (returns false when SMTP is not configured)
      let emailSent = false;
      try {
        emailSent = await sendAlertEmail(s.alertEmail, s.developerId, errorCount, sampleErrors);
      } catch (err) {
        console.error(
          '[ApiLogAlert] Failed to send alert email for %s:',
          s.developerId,
          (err as Error).message,
        );
      }

      if (emailSent) {
        await repo.markAlertSent(s.developerId, windowEnd);
      }

      console.log(
        '[ApiLogAlert] %s: %d errors in window → alert %s (cooldown until %s)',
        s.developerId,
        errorCount,
        emailSent ? 'email sent' : 'email failed, event recorded',
        new Date(windowEnd.getTime() + s.cooldownSeconds * 1000).toISOString(),
      );
    }
  }

  /** Start the periodic scheduler. Returns a stop function. */
  function startScheduler(): () => void {
    if (!isRollupInstance()) {
      console.log('[ApiLogAlert] Scanner skipped on non-primary instance');
      return () => {};
    }

    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    const scheduleNext = () => {
      timer = setTimeout(async () => {
        if (stopped) return;
        try {
          await withAdvisoryLock(getClient(), 'api_log_alert', runCheck);
        } catch (err) {
          console.error('[ApiLogAlert] Scanner failed:', (err as Error).message);
        }
        if (!stopped) scheduleNext();
      }, interval * 1000);
    };

    scheduleNext();
    return () => { stopped = true; clearTimeout(timer); };
  }

  return { runCheck, startScheduler };
}

export function startAlertScheduler(intervalSeconds = 300): () => void {
  return createApiLogAlertService({ intervalSeconds }).startScheduler();
}
