/**
 * Quota Service
 * Checks and manages daily API usage quotas per developer subscription.
 * All data access goes through the Repository layer.
 */

import { getSubscriptionRepository } from '../repositories/repository.factory';

/**
 * Check if developer has remaining daily quota and atomically increment usage.
 * Returns { allowed, currentUsage, dailyLimit, subscriptionId }.
 *
 * Uses SubscriptionRepository.atomicIncrementDailyUsage() which performs
 * a database-level atomic update — no read-then-write race condition.
 */
export async function checkAndIncrement(developerId: string): Promise<{
  allowed: boolean;
  currentUsage: number;
  dailyLimit: number;
  subscriptionId?: string;
}> {
  try {
    const repo = getSubscriptionRepository();
    return await repo.atomicIncrementDailyUsage(developerId);
  } catch (error) {
    console.error('[Quota] Check failed:', (error as Error).message);
    // Fail-closed: deny access when quota service is unavailable.
    // In a bank-grade custody platform, a quota failure must never
    // result in unbounded API access.
    return { allowed: false, currentUsage: 0, dailyLimit: 0 };
  }
}

/**
 * Reset all daily API usage counters to 0
 */
export async function resetDailyUsage(): Promise<number> {
  try {
    const repo = getSubscriptionRepository();
    const result = await repo.resetAllDailyUsage();
    console.log(`[Quota] Reset daily usage for ${result} subscriptions`);
    return result;
  } catch (error) {
    console.error('[Quota] Reset failed:', (error as Error).message);
    return 0;
  }
}

/**
 * Start daily reset scheduler.
 * Uses setTimeout to trigger precisely at midnight, then reschedules.
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