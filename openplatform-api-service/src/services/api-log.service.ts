/**
 * API Log Service
 * Records third-party API calls to ApiLog table
 */

import { getPrismaClient } from '../database/prisma-client';

export interface ApiLogEntry {
  appId: string;
  developerId?: string;
  subscriptionId?: string;
  endpoint: string;
  method: string;
  requestHeaders?: Record<string, unknown>;
  requestBody?: Record<string, unknown>;
  responseStatus?: number;
  responseBody?: Record<string, unknown>;
  responseTime?: number;
  ipAddress?: string;
  userAgent?: string;
  isError?: boolean;
}

const prisma = getPrismaClient();

/**
 * Create API log entry (fire-and-forget, never throws)
 */
export async function createApiLog(entry: ApiLogEntry): Promise<void> {
  try {
    await prisma.apiLog.create({
      data: {
        appId: entry.appId,
        developerId: entry.developerId,
        subscriptionId: entry.subscriptionId,
        endpoint: entry.endpoint,
        method: entry.method,
        requestHeaders: entry.requestHeaders as any,
        requestBody: entry.requestBody as any,
        responseStatus: entry.responseStatus,
        responseBody: entry.responseBody as any,
        responseTime: entry.responseTime,
        ipAddress: entry.ipAddress,
        userAgent: entry.userAgent,
        isError: entry.isError || false,
      },
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
    const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);
    const result = await prisma.apiLog.deleteMany({
      where: { createdAt: { lt: cutoff } },
    });
    console.log(`[ApiLog] Cleaned up ${result.count} logs older than ${retentionDays} days`);
  } catch (error) {
    console.error('[ApiLog] Cleanup failed:', (error as Error).message);
  }
}