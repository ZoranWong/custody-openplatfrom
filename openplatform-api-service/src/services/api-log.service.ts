/**
 * API Log Service
 * Records third-party API calls to ApiLog table
 */

import { getApiLogRepository } from '../repositories/repository.factory';
import { byteLength } from '../utils/byte-size';

export interface ApiLogEntry {
  appId?: string;
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
  requestBytes?: number;
  responseBytes?: number;
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
 * Use a valid explicit byte count when given; otherwise derive it from the payload.
 * Invalid explicit values (NaN, Infinity, non-integer, negative) would make the
 * whole row insert fail, losing the log entry and its traffic metric.
 */
function explicitBytes(value: number | undefined, payload: unknown): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  return byteLength(payload);
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
        requestBytes: explicitBytes(entry.requestBytes, entry.requestBody),
        responseBytes: explicitBytes(entry.responseBytes, entry.responseBody),
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

/** Default: physically delete entire rows after this many days. */
const DEFAULT_DELETE_DAYS = 180;

/**
 * Hard-delete API logs older than `deleteDays`.
 *
 * Tiered retention (raw → daily → monthly) is owned by the rollup pipeline
 * (`api-log-rollup.service`). Until that pipeline is wired up, this legacy
 * helper only performs the physical delete; the `slimDays` parameter is kept
 * for call-site compatibility.
 */
export async function cleanupOldLogs(
  _slimDays?: number,
  deleteDays?: number,
): Promise<void> {
  const del = deleteDays ?? DEFAULT_DELETE_DAYS;
  try {
    const repo = getApiLogRepository();

    // Delete — remove rows beyond the hard retention window
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