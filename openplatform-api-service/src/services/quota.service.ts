/**
 * Quota Service
 * Checks and manages daily API usage quotas per developer subscription
 */

import { getPrismaClient } from '../database/prisma-client';

const prisma = getPrismaClient();

/** Track last reset date to avoid redundant resets */
let lastResetDate: string | null = null;

/**
 * Check if developer has remaining daily quota and atomically increment usage.
 * Returns true if allowed, false if quota exceeded.
 */
export async function checkAndIncrement(developerId: string): Promise<{ allowed: boolean; currentUsage: number; dailyLimit: number; subscriptionId?: string }> {
  try {
    // Find active subscription with package info
    const subscription = await prisma.subscription.findFirst({
      where: { developerId, status: 'active' },
      include: { package: { select: { dailyApiLimit: true } } },
      orderBy: { startDate: 'asc' },
    });

    if (!subscription) {
      return { allowed: true, currentUsage: 0, dailyLimit: 0 };
    }

    const dailyLimit = subscription.package?.dailyApiLimit ?? 1000;

    // Atomic increment with WHERE guard
    const result = await prisma.$executeRaw`
      UPDATE subscriptions
      SET daily_api_usage = daily_api_usage + 1
      WHERE id = ${subscription.id}
        AND daily_api_usage < ${dailyLimit}
    `;

    if (result === 0) {
      // Quota exceeded - get current usage
      const updated = await prisma.subscription.findUnique({
        where: { id: subscription.id },
        select: { dailyApiUsage: true },
      });
      return {
        allowed: false,
        currentUsage: updated?.dailyApiUsage ?? dailyLimit,
        dailyLimit,
        subscriptionId: subscription.id,
      };
    }

    const updated = await prisma.subscription.findUnique({
      where: { id: subscription.id },
      select: { dailyApiUsage: true },
    });

    return {
      allowed: true,
      currentUsage: updated?.dailyApiUsage ?? 0,
      dailyLimit,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error('[Quota] Check failed:', (error as Error).message);
    // Fail open - allow request if quota check fails
    return { allowed: true, currentUsage: 0, dailyLimit: 0 };
  }
}

/**
 * Reset all daily API usage counters to 0
 */
export async function resetDailyUsage(): Promise<number> {
  try {
    const result = await prisma.$executeRaw`
      UPDATE subscriptions
      SET daily_api_usage = 0
      WHERE daily_api_usage > 0
    `;
    lastResetDate = new Date().toISOString().split('T')[0];
    console.log(`[Quota] Reset daily usage for ${result} subscriptions`);
    return result;
  } catch (error) {
    console.error('[Quota] Reset failed:', (error as Error).message);
    return 0;
  }
}

/**
 * Check if reset is needed and perform it
 */
export async function checkAndResetIfNeeded(): Promise<void> {
  const today = new Date().toISOString().split('T')[0];
  if (lastResetDate !== today) {
    await resetDailyUsage();
  }
}

/**
 * Start daily reset scheduler (runs every minute, checks if new day)
 */
export function startDailyResetScheduler(): void {
  // Check every 60 seconds if we've crossed midnight
  setInterval(() => {
    checkAndResetIfNeeded();
  }, 60_000);

  // Also check immediately on startup
  checkAndResetIfNeeded();

  console.log('[Quota] Daily reset scheduler started');
}