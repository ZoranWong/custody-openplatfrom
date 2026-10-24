/**
 * API Log Service
 * Records third-party API calls to ApiLog table
 */

import { getApiLogRepository } from '../repositories/repository.factory';

export interface ApiLogEntry {
  appId: string;
  developerId?: string;
  subscriptionId?: string;
  apiName?: string;
  endpoint: string;
  method: string;
  traceId?: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: Record<string, unknown>;
  responseTime?: number;
  ipAddress?: string;
  userAgent?: string;
  sdkName?: string;
  sdkVersion?: string;
  sdkLanguage?: string;
  isError?: boolean;
}

/** Default log retention in days. Read from env at boot. */
const DEFAULT_RETENTION_DAYS = 30;

function getRetentionDays(): number {
  const raw = process.env.API_LOG_RETENTION_DAYS;
  if (!raw) return DEFAULT_RETENTION_DAYS;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_RETENTION_DAYS;
}

/**
 * Create API log entry (fire-and-forget, never throws)
 */
export async function createApiLog(entry: ApiLogEntry): Promise<void> {
  try {
    const repo = getApiLogRepository();
    await repo.create({
        appId: entry.appId,
        developerId: entry.developerId,
        subscriptionId: entry.subscriptionId,
        apiName: entry.apiName,
        endpoint: entry.endpoint,
        method: entry.method,
        traceId: entry.traceId,
        requestHeaders: entry.requestHeaders as any,
        requestBody: entry.requestBody as any,
        responseStatus: entry.responseStatus,
        responseBody: entry.responseBody as any,
        responseTime: entry.responseTime,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        sdkName: entry.sdkName,
        sdkVersion: entry.sdkVersion,
        sdkLanguage: entry.sdkLanguage,
        isError: entry.isError || false,
    });
  } catch (error) {
    // Silently fail - logging should never block or crash the request
    console.error('[ApiLog] Failed to write log:', (error as Error).message);
  }
}

/** Default: strip large payload fields after this many days (keep stats fields). */
const DEFAULT_SLIM_DAYS = 7;

/** Default: physically delete entire rows after this many days. */
const DEFAULT_DELETE_DAYS = 180;

/**
 * Clean up logs in two tiers:
 * 1. **Slim** logs older than `slimDays` — null out requestBody / responseBody
 *    / requestHeaders to reclaim space while keeping stats intact.
 * 2. **Delete** logs older than `deleteDays` — physical removal.
 *
 * Admin dashboard queries and statistics only need the small fields
 * (endpoint, responseStatus, isError, responseTime, createdAt), so slimming
 * does not break any downstream consumer.
 */
export async function cleanupOldLogs(
  slimDays?: number,
  deleteDays?: number,
): Promise<void> {
  const slim = slimDays ?? DEFAULT_SLIM_DAYS;
  const del = deleteDays ?? DEFAULT_DELETE_DAYS;
  try {
    const repo = getApiLogRepository();

    // Phase 0: snapshot — build daily aggregates for the window about to be slimmed.
    // Snapshot range = [now - del, now - slim).  Rows already snapshotted are idempotent.
    const snapshotEnd = new Date();
    const snapshotStart = new Date(Date.now() - del * 24 * 60 * 60 * 1000);
    const snaps = await repo.buildDailySnapshot(snapshotStart, snapshotEnd);
    if (snaps > 0) {
      console.log(`[ApiLog] Built ${snaps} daily snapshot(s) for range ${snapshotStart.toISOString()} → ${snapshotEnd.toISOString()}`);
    }

    // Phase 1: slim — strip large payloads, keep metadata + stats fields
    const slimmed = await repo.slimOlderThan(slim);
    if (slimmed.count > 0) {
      console.log(`[ApiLog] Slimmed ${slimmed.count} logs older than ${slim} days (payloads removed)`);
    }

    // Phase 2: delete — remove rows beyond the hard retention window
    const deleted = await repo.cleanup(del);
    if (deleted.count > 0) {
      console.log(`[ApiLog] Deleted ${deleted.count} logs older than ${del} days`);
    }
  } catch (error) {
    console.error('[ApiLog] Cleanup failed:', (error as Error).message);
  }
}

/**
 * Start a periodic cleanup timer that fires daily at a jittered off-peak hour.
 * Returns a cleanup function that stops the timer.
 */
export function startCleanupScheduler(): () => void {
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;

  const scheduleNext = () => {
    // Random offset within the next 24 h (18–22 UTC off-peak window)
    const now = new Date();
    const nextRun = new Date(now);
    nextRun.setUTCHours(18 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 60), 0, 0);
    if (nextRun <= now) nextRun.setUTCDate(nextRun.getUTCDate() + 1);
    timer = setTimeout(() => {
      if (stopped) return;
      cleanupOldLogs();
      scheduleNext();
    }, nextRun.getTime() - now.getTime());
  };

  scheduleNext();
  return () => { stopped = true; clearTimeout(timer); };
}

/**
 * Get recent API errors for dashboard display
 */
export async function getRecentErrors(developerId: string, limit: number = 5): Promise<any[]> {
  try {
    const repo = getApiLogRepository();
    return await repo.findRecentErrors(developerId, limit);
  } catch {
    return [];
  }
}

export { getRetentionDays };