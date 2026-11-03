/**
 * API Log Service
 * Records third-party API calls to ApiLog table
 *
 * Tiered retention (raw → daily → monthly) lives in
 * `api-log-rollup.service.ts`.
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