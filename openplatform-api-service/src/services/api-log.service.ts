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

/**
 * Clean up logs older than N days
 */
export async function cleanupOldLogs(retentionDays: number = 30): Promise<void> {
  try {
    const repo = getApiLogRepository();
    const result = await repo.cleanup(retentionDays);
    console.log(`[ApiLog] Cleaned up ${result.count} logs older than ${retentionDays} days`);
  } catch (error) {
    console.error('[ApiLog] Cleanup failed:', (error as Error).message);
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