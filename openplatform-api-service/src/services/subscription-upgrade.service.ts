/**
 * Subscription Upgrade Service
 * Handles payment-based subscription upgrades with prorated credit calculation.
 */

import {
  getOrderRepository,
  getSubscriptionRepository,
  getPackageRepository,
} from '../repositories/repository.factory';

export interface UpgradeResult {
  oldSubscriptionId: string;
  newSubscriptionId: string;
  bonusDays: number;
  totalDays: number;
}

/**
 * Process a payment approval: upgrade the developer's subscription.
 *
 * Business logic:
 * - Find the developer's pending order
 * - End all active subscriptions, marking them as "upgraded"
 * - Calculate prorated credit: (oldPrice/oldDays * remainingDays) / newPricePerDay
 * - Create a new subscription with newDays + bonusDays
 * - Mark the order as confirmed
 */
export async function processPaymentApproval(developerId: string): Promise<UpgradeResult | null> {
  const orderRepo = getOrderRepository();
  const subRepo = getSubscriptionRepository();
  const pkgRepo = getPackageRepository();

  const { list: orders } = await orderRepo.findByFilters(
    { developerId, status: 'pending' } as any, 1, 1
  );

  if (orders.length === 0) return null;
  const order = orders[0];

  const newPkg = await pkgRepo.findById(order.packageId);
  if (!newPkg) return null;

  const now = new Date();
  const newDays = order.period === 'yearly' ? 365 : 30;
  let bonusDays = 0;

  // Find active subscriptions and upgrade them
  const activeSubs = await subRepo.findByFilters(
    { developerId, status: 'active' } as any, 1, 10
  );

  for (const oldSub of activeSubs.list || []) {
    const oldPkg = await pkgRepo.findById(oldSub.packageId);
    if (!oldPkg) continue;

    const oldTotalDays = oldSub.billingCycle === 'yearly' ? 365 : 30;
    const oldMonthlyPrice = Number(oldPkg.monthlyPrice) || 0;
    const oldYearlyPrice = Number(oldPkg.yearlyPrice) || 0;
    const oldTotalPrice = oldSub.billingCycle === 'yearly'
      ? (oldYearlyPrice || oldMonthlyPrice * 10)
      : oldMonthlyPrice;
    const remainingMs = Math.max(0, oldSub.endDate.getTime() - now.getTime());
    const remainingDays = Math.ceil(remainingMs / (24 * 60 * 60 * 1000));

    // Prorated credit formula: (totalPrice / totalDays * remainingDays) / newPricePerDay
    const newMonthlyPrice = Number(newPkg.monthlyPrice) || 0;
    const newYearlyPrice = Number(newPkg.yearlyPrice) || 0;
    const newTotalPrice = order.period === 'yearly'
      ? (newYearlyPrice || newMonthlyPrice * 10)
      : newMonthlyPrice;
    const newPricePerDay = newTotalPrice / newDays;
    if (newPricePerDay > 0 && oldTotalPrice > 0) {
      const credit = (oldTotalPrice / oldTotalDays * remainingDays) / newPricePerDay;
      bonusDays += Math.ceil(credit);
    }

    // End old subscription, mark as upgraded
    await subRepo.update(oldSub.id, {
      endDate: now,
      status: 'upgraded',
    } as any);
  }

  const totalDays = newDays + bonusDays;
  const endDate = new Date(now.getTime() + totalDays * 24 * 60 * 60 * 1000);

  // Create new subscription
  const subscription = await subRepo.create({
    developerId,
    packageId: order.packageId,
    status: 'active',
    startDate: now,
    endDate,
    billingCycle: order.period || 'monthly',
  } as any);

  // Update order
  await orderRepo.update(order.id, {
    status: 'confirmed',
    confirmedAt: new Date(),
    subscriptionId: subscription.id,
  } as any);

  return {
    oldSubscriptionId: activeSubs.list?.[0]?.id || '',
    newSubscriptionId: subscription.id,
    bonusDays,
    totalDays,
  };
}

/**
 * Process a payment rejection: mark the pending order as rejected.
 */
export async function processPaymentRejection(developerId: string): Promise<void> {
  const orderRepo = getOrderRepository();
  const { list: orders } = await orderRepo.findByFilters(
    { developerId, status: 'pending' } as any, 1, 1
  );
  if (orders.length === 0) return;
  await orderRepo.update(orders[0].id, { status: 'rejected' } as any);
}