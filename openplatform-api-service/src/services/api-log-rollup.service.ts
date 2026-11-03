/**
 * Daily rollup pipeline for API logs.
 *
 *   raw (3 days) → daily snapshot + endpoint daily (6 months) → monthly snapshot (5 years)
 *
 * Runs once per cluster (see utils/single-instance). Every write is an idempotent
 * upsert, so a missed or repeated run converges to the same result. Day and
 * month boundaries are UTC, matching `DATE(created_at)` in the database.
 */

import { getApiLogRepository } from '../repositories/repository.factory';
import { getClient } from '../repositories/db-client';
import {
  addDays,
  addMonths,
  dayKey,
  monthKey,
  LOG_TIMEZONE,
} from '../utils/api-log-dates';
import { isRollupInstance, withAdvisoryLock } from '../utils/single-instance';
import {
  RAW_RETENTION_DAYS,
  DAILY_RETENTION_MONTHS,
  MONTHLY_RETENTION_YEARS,
} from '../config/api-log-retention';

export interface ApiLogRollupOptions {
  now?: () => Date;
  timeZone?: string;
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function createApiLogRollupService(opts: ApiLogRollupOptions = {}) {
  const now = opts.now ?? (() => new Date());
  const tz = opts.timeZone ?? LOG_TIMEZONE;

  async function runOnce(): Promise<void> {
    const repo = getApiLogRepository();
    const today = dayKey(now(), tz);
    let failed = false;

    // 1) Recompute D-1..D-RAW. The recompute window is one day wider than the
    //    retention window so a missed run self-heals the next day. One bad
    //    developer/day is logged and skipped; the rest of the window still runs.
    for (let i = 1; i <= RAW_RETENTION_DAYS; i++) {
      const day = addDays(today, -i);
      let devs: string[];
      try {
        devs = await repo.listDevelopersWithRawLogs(day);
      } catch (error) {
        failed = true;
        console.error(`[ApiLog] Rollup failed for ${day}: ${messageOf(error)}`);
        continue;
      }
      for (const dev of devs) {
        try {
          await repo.rollupDay(dev, day);
        } catch (error) {
          failed = true;
          console.error(`[ApiLog] Rollup failed for ${dev}/${day}: ${messageOf(error)}`);
        }
      }
    }

    // 2) Delete raw rows strictly before D-(RAW-1), but only when every
    //    developer still holding raw rows in the older span has a daily
    //    snapshot. A failed rollup above also blocks the delete this run.
    const cutoff = addDays(today, -(RAW_RETENTION_DAYS - 1));
    for (let i = RAW_RETENTION_DAYS; i <= RAW_RETENTION_DAYS + 7; i++) {
      const day = addDays(today, -i);
      try {
        const devs = await repo.listDevelopersWithRawLogs(day);
        for (const dev of devs) {
          if (!(await repo.hasDailySnapshot(dev, day))) {
            failed = true;
            console.warn(`[ApiLog] Rollup missing for ${dev}/${day}; skipping raw deletion`);
          }
        }
      } catch (error) {
        failed = true;
        console.error(`[ApiLog] Snapshot check failed for ${day}: ${messageOf(error)}`);
      }
    }

    if (!failed) {
      try {
        const deleted = await repo.deleteRawBefore(cutoff);
        if (deleted.count > 0) {
          console.log(`[ApiLog] Deleted ${deleted.count} raw rows older than ${cutoff}`);
        }
      } catch (error) {
        console.error(`[ApiLog] Raw deletion failed: ${messageOf(error)}`);
      }
    }

    const currentMonth = monthKey(now(), tz);
    const dailyWindowStartMonth = addMonths(currentMonth, -(DAILY_RETENTION_MONTHS - 1));

    // 3) Roll months that aged out of the daily window into monthly snapshots.
    //    Walk backwards until a month has no daily data left; the cap covers
    //    the full monthly retention window in case the job has been down long.
    //    Errors here never abort the prune below.
    try {
      for (let back = 1; back <= MONTHLY_RETENTION_YEARS * 12; back++) {
        const month = addMonths(dailyWindowStartMonth, -back);
        const devs = await repo.listDevelopersWithDailySnapshots(month);
        if (devs.length === 0) break;
        for (const dev of devs) {
          try {
            await repo.rollupMonth(dev, month);
          } catch (error) {
            console.error(`[ApiLog] Month rollup failed for ${dev}/${month}: ${messageOf(error)}`);
          }
        }
      }
    } catch (error) {
      console.error(`[ApiLog] Month rollup failed: ${messageOf(error)}`);
    }

    // 4) Prune expired tiers.
    try {
      const pruned = await repo.pruneDailyOlderThan(`${dailyWindowStartMonth}-01`);
      if (pruned.snapshots || pruned.endpoints) {
        console.log(
          `[ApiLog] Pruned ${pruned.snapshots} daily snapshots / ${pruned.endpoints} endpoint rows before ${dailyWindowStartMonth}-01`,
        );
      }
    } catch (error) {
      console.error(`[ApiLog] Daily prune failed: ${messageOf(error)}`);
    }

    try {
      const monthlyCutoff = addMonths(currentMonth, -MONTHLY_RETENTION_YEARS * 12);
      const months = await repo.pruneMonthlyOlderThan(monthlyCutoff);
      if (months) {
        console.log(`[ApiLog] Pruned ${months} monthly snapshots before ${monthlyCutoff}`);
      }
    } catch (error) {
      console.error(`[ApiLog] Monthly prune failed: ${messageOf(error)}`);
    }
  }

  return { runOnce };
}

/**
 * Start the daily 00:05 (local time) scheduler.
 *
 * Only the primary instance schedules the job. `getClient()` returns the
 * pooled Prisma client, so `GET_LOCK`/`RELEASE_LOCK` must run inside an
 * interactive transaction: with `@prisma/adapter-mariadb` a plain query may
 * pick an arbitrary pooled connection, and a release on a different session
 * would never free the lock. The pipeline itself opens its own transactions
 * from the pooled client (getClient() is not inside AsyncLocalStorage here),
 * so those writes run on separate connections — safe because every write is
 * an idempotent upsert and no `FOR UPDATE` is taken; the lock only prevents
 * two instances from running the pipeline at the same time.
 */
export function startRollupScheduler(): () => void {
  if (!isRollupInstance()) {
    console.log('[ApiLog] Rollup scheduler skipped on non-primary instance');
    return () => {};
  }

  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const scheduleNext = () => {
    const next = new Date();
    next.setHours(24, 5, 0, 0); // next 00:05 local time
    timer = setTimeout(async () => {
      if (stopped) return;
      try {
        await getClient().$transaction(async (tx) => {
          await withAdvisoryLock(tx, 'api_log_rollup', () =>
            createApiLogRollupService().runOnce(),
          );
        });
      } catch (error) {
        console.error(`[ApiLog] Rollup failed: ${messageOf(error)}`);
      }
      if (!stopped) scheduleNext();
    }, Math.max(0, next.getTime() - Date.now()));
  };

  scheduleNext();
  return () => {
    stopped = true;
    clearTimeout(timer);
  };
}
