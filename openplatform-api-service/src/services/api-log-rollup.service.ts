/**
 * Daily rollup pipeline for API logs.
 *
 *   raw (per developer, default 3 days) → daily snapshot + endpoint daily (6 months)
 *                                       → monthly snapshot (5 years)
 *
 * Runs once per cluster (see utils/single-instance). Every write is an idempotent
 * upsert, so a missed or repeated run converges to the same result. Day and
 * month boundaries are UTC, matching `DATE(created_at)` in the database.
 */

import { getApiLogRepository } from '../repositories/repository.factory';
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
import { resolveRetentionForDevelopers } from './api-log-retention.service';

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

    // 0) Resolve retention for everyone who can still hold raw rows. The set is
    //    taken from the days that actually have rows, not a fixed lookback: a
    //    developer whose oldest rows predate the window must still be in the
    //    delete pass, otherwise those rows are rolled up but never removed.
    //    Developers with stored settings are added too, so a lowered retention
    //    takes effect even when their rows are all older than the window.
    const dueDevelopers = new Set<string>();
    let rawDays: string[] = [];
    try {
      rawDays = await repo.listDaysWithRawLogs();
    } catch (error) {
      failed = true;
      console.error(`[ApiLog] Failed to list raw days: ${messageOf(error)}`);
    }
    for (const day of rawDays) {
      try {
        const devs = await repo.listDevelopersWithRawLogs(day);
        devs.forEach((dev) => dueDevelopers.add(dev));
      } catch (error) {
        failed = true;
        console.error(`[ApiLog] Failed to list raw logs for ${day}: ${messageOf(error)}`);
      }
    }
    try {
      (await repo.listAlertSettingDevelopers()).forEach((dev) => dueDevelopers.add(dev));
    } catch (error) {
      failed = true;
      console.error(`[ApiLog] Failed to list retention settings: ${messageOf(error)}`);
    }

    let retention: Map<string, { effectiveDays: number }>;
    try {
      retention = await resolveRetentionForDevelopers([...dueDevelopers]);
    } catch (error) {
      failed = true;
      console.error(`[ApiLog] Failed to resolve retention: ${messageOf(error)}`);
      retention = new Map();
    }

    // 1) Roll up every day that still holds raw rows, oldest first. Walking the
    //    days the data actually occupies (instead of a fixed lookback window)
    //    means a long outage or a long-stalled job catches up completely: no day
    //    is left without a snapshot, and the delete step in (2) can therefore
    //    remove every rolled-up day without ever dropping un-aggregated calls.
    //    A day already rolled up converges again harmlessly (idempotent upsert).
    //    `rawDays` was collected in step 0 and is reused rather than re-listed.
    const rollupFailed = new Set<string>();
    for (const day of rawDays) {
      if (day >= today) continue; // today is rolled up the next morning
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
          rollupFailed.add(dev);
          console.error(`[ApiLog] Rollup failed for ${dev}/${day}: ${messageOf(error)}`);
        }
      }
    }

    // 2) Per developer: delete raw rows day by day, and only for days that
    //    already have a daily snapshot. Deleting per day (instead of "everything
    //    before a cutoff") means a day whose rollup failed keeps its raw rows
    //    and is retried tomorrow, and no call is ever dropped before it has
    //    been aggregated. Days still inside the retention window are kept as-is.
    for (const dev of dueDevelopers) {
      const effectiveDays = retention.get(dev)?.effectiveDays;
      if (effectiveDays === undefined || rollupFailed.has(dev) || failed) continue;
      const cutoff = addDays(today, -(effectiveDays - 1));

      let rawDays: string[];
      try {
        rawDays = await repo.listRawDaysForDeveloper(dev);
      } catch (error) {
        console.error(`[ApiLog] Failed to list raw days for ${dev}: ${messageOf(error)}`);
        continue;
      }

      let deletedTotal = 0;
      for (const day of rawDays) {
        if (day >= cutoff) continue;
        try {
          const hasSnapshot = await repo.hasDailySnapshot(dev, day);
          if (!hasSnapshot) {
            // No snapshot is expected when the day holds only callback pushes
            // (rollupDay skips them and writes nothing). Anything else means the
            // rollup failed, so those rows must survive to be retried.
            const apiCalls = await repo.countApiCallRawForDeveloper(dev, day);
            if (apiCalls > 0) {
              console.warn(`[ApiLog] No snapshot for ${dev}/${day}; keeping its raw rows`);
              continue;
            }
          }
          const deleted = await repo.deleteRawForDay(dev, day);
          deletedTotal += deleted.count;
        } catch (error) {
          console.error(`[ApiLog] Raw deletion failed for ${dev}/${day}: ${messageOf(error)}`);
        }
      }
      if (deletedTotal > 0) {
        console.log(`[ApiLog] Deleted ${deletedTotal} rolled-up raw rows for ${dev} (before ${cutoff})`);
      }
    }

    // 3) Rows with no developer id cannot have a per-developer retention. They
    //    are pruned on the platform default, but only when no rollup failed, so
    //    an unassigned row cannot be deleted before its snapshot exists.
    if (!failed) {
      const defaultCutoff = addDays(today, -(RAW_RETENTION_DAYS - 1));
      try {
        const deleted = await repo.deleteUnassignedRawBefore(defaultCutoff);
        if (deleted.count > 0) {
          console.log(`[ApiLog] Deleted ${deleted.count} raw rows older than ${defaultCutoff}`);
        }
      } catch (error) {
        console.error(`[ApiLog] Raw deletion failed: ${messageOf(error)}`);
      }
    }

    const currentMonth = monthKey(now(), tz);
    const dailyWindowStartMonth = addMonths(currentMonth, -(DAILY_RETENTION_MONTHS - 1));

    // 4) Roll months that aged out of the daily window into monthly snapshots.
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

    // 5) Prune expired tiers.
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
 * Only the primary instance schedules the job. The advisory lock is taken on
 * a dedicated connection (see withAdvisoryLock) rather than inside an
 * interactive `$transaction`: a pooled client may hand each statement a
 * different session, and a transaction would impose its 5s timeout on a job
 * that legitimately takes longer. The pipeline writes through the pooled
 * client; every write is an idempotent upsert, so the lock only has to keep
 * two instances from running the pipeline concurrently.
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
        // Not wrapped in a transaction: the lock lives on a dedicated session
        // for the whole run, and a long rollup must not hit the interactive
        // transaction timeout.
        await withAdvisoryLock('api_log_rollup', () => createApiLogRollupService().runOnce());
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
