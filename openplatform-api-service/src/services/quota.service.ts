/**
 * Quota Service
 * Checks and manages daily API usage quotas per developer subscription
 */

import { getPrismaClient } from '../database/prisma-client';

const prisma = getPrismaClient();

/**
 * Check if developer has remaining daily quota and atomically increment usage.
 * Returns true if allowed, false if quota exceeded.
 */
export async function checkAndIncrement(developerId: string): Promise<{ allowed: boolean; currentUsage: number; dailyLimit: number; subscriptionId?: string }> {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { developerId, status: 'active' },
      include: { package: { select: { dailyApiLimit: true } } },
      orderBy: { startDate: 'asc' },
    });

    if (!subscription) {
      return { allowed: true, currentUsage: 0, dailyLimit: 0 };
    }

    const dailyLimit = subscription.package?.dailyApiLimit ?? 1000;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Count actual API calls from ApiLog for today
    const todayCount = await prisma.apiLog.count({
      where: {
        developerId,
        isError: false,
        createdAt: { gte: today },
      },
    });

    // Check if exceeded
    if (todayCount >= dailyLimit) {
      return { allowed: false, currentUsage: todayCount, dailyLimit, subscriptionId: subscription.id };
    }

    // Sync dailyApiUsage with actual count
    await prisma.subscription.update({
      where: { id: subscription.id },
      data: { dailyApiUsage: todayCount + 1 },
    });

    return { allowed: true, currentUsage: todayCount + 1, dailyLimit, subscriptionId: subscription.id };
  } catch (error) {
    console.error('[Quota] Check failed:', (error as Error).message);
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
    console.log(`[Quota] Reset daily usage for ${result} subscriptions`);
    return result;
  } catch (error) {
    console.error('[Quota] Reset failed:', (error as Error).message);
    return 0;
  }
}

/**
 * Start daily reset scheduler
 * Uses setTimeout to trigger precisely at midnight, then reschedules
 */
export function startDailyResetScheduler(): void {
  const scheduleNext = () => {
    const now = new Date();
    const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
    const msUntilMidnight = tomorrow.getTime() - now.getTime();
    setTimeout(() => {
      resetDailyUsage();
      scheduleNext();
    }, msUntilMidnight);
  };

  // Check immediately on startup
  resetDailyUsage();
  scheduleNext();

  console.log('[Quota] Daily reset scheduler started');
}