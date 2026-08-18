/**
 * Billing Service
 * Handles invoice generation, payment history, and usage statistics for developer portal.
 * All data access goes through the Repository layer.
 */

import { Invoice, InvoiceHistoryItem, PaymentHistoryItem, UsageStatistics, UsageTrend } from '../types/billing.types';
import { getOrderRepository, getApiLogRepository, getSubscriptionRepository } from '../repositories/repository.factory';
import { getRecentErrors } from './api-log.service';

/**
 * Billing Service
 * Provides billing-related functionality for the developer portal
 */
export class BillingService {
  /**
   * Generate a new invoice (not yet implemented — returns placeholder)
   */
  async generateInvoice(
    enterpriseId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<Invoice> {
    // TODO: Implement real invoice generation when invoice template is finalized
    throw new Error('Invoice generation not yet implemented');
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    // TODO: Fetch from invoice storage when implemented
    return null;
  }

  async getInvoiceHistory(
    enterpriseId: string, page: number = 1, pageSize: number = 10
  ): Promise<{ list: InvoiceHistoryItem[]; total: number; page: number; pageSize: number }> {
    // TODO: Fetch from invoice storage when implemented
    return { list: [], total: 0, page, pageSize };
  }

  /**
   * Get payment history from orders table
   */
  async getPaymentHistory(
    isvId: string, page: number = 1, pageSize: number = 10
  ): Promise<{ list: PaymentHistoryItem[]; total: number; page: number; pageSize: number }> {
    try {
      const repo = getOrderRepository();
      const { list, total } = await repo.findByFilters(
        { developerId: isvId } as any,
        page,
        pageSize
      );

      const paymentItems: PaymentHistoryItem[] = list.map((order: any) => ({
        id: order.id,
        externalPaymentId: order.externalPaymentId || '',
        amount: Number(order.amount),
        currency: order.currency,
        paymentMethod: order.paymentMethod || '',
        proofUrl: order.proofUrl || undefined,
        status: order.status,
        createdAt: order.createdAt?.toISOString?.() || order.createdAt,
        paidAt: order.paidAt?.toISOString?.() || order.paidAt,
        confirmedAt: order.confirmedAt?.toISOString?.() || order.confirmedAt,
        remark: order.remark || undefined,
      }));

      return { list: paymentItems, total, page, pageSize };
    } catch {
      return { list: [], total: 0, page, pageSize };
    }
  }

  async getUsageStatistics(
    enterpriseId: string, periodStart?: string, periodEnd?: string
  ): Promise<UsageStatistics> {
    const apiLogRepo = getApiLogRepository();
    const subRepo = getSubscriptionRepository();

    const now = new Date();

    // Parse periodStart: accept '30days', '7d', '90d' or a date string
    let days = 30;
    if (periodStart) {
      const match = periodStart.match(/^(\d+)d(?:ays)?$/);
      if (match) {
        days = parseInt(match[1], 10);
      }
    }
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

    const stats = await apiLogRepo.getStats(enterpriseId, startDate);
    const dailyBreakdown = await apiLogRepo.getDailyBreakdown(enterpriseId, startDate);
    const endpointBreakdown = await apiLogRepo.getEndpointBreakdown(enterpriseId, startDate, stats.totalCalls);
    const activeSub = await subRepo.findActiveWithPackage(enterpriseId);

    const successRate = stats.totalCalls > 0
      ? ((stats.totalCalls - stats.errorCalls) / stats.totalCalls) * 100
      : 100;

    return {
      period: { start: startDate.toISOString().split('T')[0], end: now.toISOString().split('T')[0] },
      totalApiCalls: stats.totalCalls, totalBandwidth: 0, totalStorage: 0,
      apiCallCost: 0, bandwidthCost: 0, storageCost: 0, totalCost: 0, currency: 'USD',
      totalCalls: stats.totalCalls, successRate, avgResponseTimeMs: stats.avgResponseTime,
      todayCalls: Number(activeSub?.dailyApiUsage) || 0,
      dailyLimit: activeSub?.package?.dailyApiLimit ?? 0,
      recentErrors: await getRecentErrors(enterpriseId),
      dailyBreakdown: dailyBreakdown.map((d) => ({
        date: d.date, calls: d.calls, successCount: d.successCount,
        avgResponseTime: d.avgResponseTime,
      })),
      endpointBreakdown: endpointBreakdown.map((e) => ({
        endpoint: e.endpoint, method: e.method,
        calls: e.calls, successCount: e.successCount,
        successRate: e.successRate, percentage: e.percentage,
        avgResponseTime: e.avgResponseTime, maxResponseTime: e.maxResponseTime,
      })),
    };
  }

  async getUsageTrend(
    enterpriseId: string, period: '7d' | '30d' | '90d' = '7d'
  ): Promise<UsageTrend[]> {
    const apiLogRepo = getApiLogRepository();
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const breakdown = await apiLogRepo.getDailyBreakdown(enterpriseId, startDate);
    return breakdown.map((d) => ({
      date: d.date, apiCalls: d.calls, bandwidth: 0,
    }));
  }

  /**
   * Submit payment proof for a pending order.
   * Creates a ticket for admin review.
   */
  async submitPaymentProof(
    orderId: string,
    isvId: string,
    data: { externalPaymentId: string; proofUrl: string; paidAt: string; remark?: string }
  ): Promise<any> {
    const repo = getOrderRepository();
    const order = await repo.findById(orderId);
    if (!order) throw new Error('Order not found');
    if (order.developerId !== isvId) throw new Error('Permission denied');
    if (order.status !== 'pending') throw new Error('Order is not pending');

    const updated = await repo.update(orderId, {
      externalPaymentId: data.externalPaymentId,
      proofUrl: data.proofUrl,
      paidAt: new Date(data.paidAt),
      remark: data.remark || order.remark,
      status: 'pending',
    } as any);

    // Create a ticket for admin review
    const { getTicketRepository } = await import('../repositories/repository.factory');
    const ticketRepo = getTicketRepository();
    await ticketRepo.create({
      developerId: isvId,
      title: `Payment Proof - ${data.externalPaymentId}`,
      description: `Payment proof submitted for order ${orderId}.\nExternal Payment ID: ${data.externalPaymentId}\nProof URL: ${data.proofUrl}\nPaid At: ${data.paidAt}\nRemark: ${data.remark || 'N/A'}`,
      type: 'payment',
      priority: 'normal',
      status: 'pending',
    } as any);

    return updated;
  }
}

export function createBillingService(): BillingService {
  return new BillingService();
}