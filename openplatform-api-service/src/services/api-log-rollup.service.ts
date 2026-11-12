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
  MAX_RAW_RETENTION_DAYS,
  RAW_RETENTION_DAYS,
  DAILY_RETENTION_MONTHS,
  MONTHLY_RETENTION_YEARS,
} from '../config/api-log-retention';
import { resolveRetentionForDevelopers } from './api-log-retention.service';

/**
 * Whether a developer still holds raw rows on `day` that must be rolled up
 * before deletion. Covers today and every day inside the retention window; the
 * next run then rolls up the last missed day.
 */
function needsRollup(day: string, today: string, retentionDays: number): boolean {
  return day >= addDays(today, -retentionDays);
}

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

    // 0) Resolve retention for everyone who can still hold raw rows: developers
    //    seen inside the longest window, plus anyone with stored settings whose
    //    retention may have been lowered below the remaining rows.
    const dueDevelopers = new Set<string>();
    for (let i = 0; i <= MAX_RAW_RETENTION_DAYS; i++) {
      const day = addDays(today, -i);
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

    // 1) Recompute every day inside the longest window, for the developers that
    //    still need it. A developer with a longer retention keeps older days
    //    live, so a day already rolled up converges again after a retention bump.
    const rollupFailed = new Set<string>();
    for (let i = 1; i <= MAX_RAW_RETENTION_DAYS; i++) {
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
        if (!needsRollup(day, today, retention.get(dev)?.effectiveDays ?? 0)) continue;
        try {
          await repo.rollupDay(dev, day);
        } catch (error) {
          failed = true;
          rollupFailed.add(dev);
          console.error(`[ApiLog] Rollup failed for ${dev}/${day}: ${messageOf(error)}`);
        }
      }
    }

    // 2) Per developer: raw rows strictly before D-(retention-1) may be deleted
    //    once every day left behind has a daily snapshot. The oldest deleted day
    //    (and the 8 days before it) are checked: a missed or failed run leaves
    //    no snapshot there and blocks deletion. Any failure in the pass above
    //    (day listing, settings, another developer) blocks every delete.
    for (const dev of dueDevelopers) {
      const effectiveDays = retention.get(dev)?.effectiveDays;
      if (effectiveDays === undefined || rollupFailed.has(dev) || failed) continue;
      const cutoff = addDays(today, -(effectiveDays - 1));
      const checkStart = addDays(cutoff, -1);
      const checkFloor = addDays(cutoff, -9);
      let missing = false;
      for (let day = checkStart; day >= checkFloor; day = addDays(day, -1)) {
        try {
          const rowCount = await repo.countRawForDeveloper(dev, day);
          if (rowCount === 0) continue;
          if (!(await repo.hasDailySnapshot(dev, day))) {
            missing = true;
            console.warn(`[ApiLog] Rollup missing for ${dev}/${day}; skipping raw deletion`);
          }
        } catch (error) {
          missing = true;
          console.error(`[ApiLog] Snapshot check failed for ${dev}/${day}: ${messageOf(error)}`);
        }
      }
      if (missing) continue;
      try {
        const deleted = await repo.deleteRawBeforeForDeveloper(dev, cutoff);
        if (deleted.count > 0) {
          console.log(`[ApiLog] Deleted ${deleted.count} raw rows for ${dev} older than ${cutoff}`);
        }
      } catch (error) {
        console.error(`[ApiLog] Raw deletion failed for ${dev}: ${messageOf(error)}`);
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
