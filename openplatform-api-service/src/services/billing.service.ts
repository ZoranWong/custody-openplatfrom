/**
 * Billing Service
 * Handles invoice generation, payment history, and usage statistics for developer portal
 */

import { Invoice, InvoiceHistoryItem, PaymentHistoryItem, UsageStatistics, UsageTrend } from '../types/billing.types';
import { getOrderRepository } from '../repositories/repository.factory';
import { getRecentErrors } from './api-log.service';

/**
 * Mock data for demonstration
 * In production, these would be fetched from the developer-portal backend service
 */
const MOCK_INVOICES: Invoice[] = [
  {
    invoiceId: 'INV-2026-0001',
    companyInfo: {
      name: 'Tech Corp',
      address: '123 Tech Street, Beijing',
      taxId: '91110000XXXXX',
      email: 'billing@techcorp.com',
    },
    billingPeriod: {
      start: '2026-01-01',
      end: '2026-01-31',
    },
    usageBreakdown: [
      { item: 'API Calls', quantity: 15000, unitPrice: 0.001, amount: 15.00, currency: 'USD' },
      { item: 'Bandwidth', quantity: 1024, unitPrice: 0.01, amount: 10.24, currency: 'USD' },
    ],
    subtotal: 25.24,
    taxRate: 6.0,
    taxAmount: 1.51,
    totalAmount: 26.75,
    currency: 'USD',
    status: 'generated',
    createdAt: '2026-02-10T10:30:00Z',
  },
  {
    invoiceId: 'INV-2026-0002',
    companyInfo: {
      name: 'Tech Corp',
      address: '123 Tech Street, Beijing',
      taxId: '91110000XXXXX',
      email: 'billing@techcorp.com',
    },
    billingPeriod: {
      start: '2026-02-01',
      end: '2026-02-28',
    },
    usageBreakdown: [
      { item: 'API Calls', quantity: 18000, unitPrice: 0.001, amount: 18.00, currency: 'USD' },
      { item: 'Bandwidth', quantity: 2048, unitPrice: 0.01, amount: 20.48, currency: 'USD' },
    ],
    subtotal: 38.48,
    taxRate: 6.0,
    taxAmount: 2.31,
    totalAmount: 40.79,
    currency: 'USD',
    status: 'generated',
    createdAt: '2026-03-05T14:20:00Z',
  },
];

const MOCK_USAGE_STATS: UsageStatistics = {
  period: { start: '2026-02-01', end: '2026-02-28' },
  totalApiCalls: 45230,
  totalBandwidth: 5.2,
  totalStorage: 1.8,
  apiCallCost: 45.23,
  bandwidthCost: 52.00,
  storageCost: 18.00,
  totalCost: 115.23,
  currency: 'USD',
};

const MOCK_USAGE_TREND: UsageTrend[] = [
  { date: '2026-02-01', apiCalls: 1200, bandwidth: 0.15 },
  { date: '2026-02-02', apiCalls: 1350, bandwidth: 0.18 },
  { date: '2026-02-03', apiCalls: 1100, bandwidth: 0.12 },
  { date: '2026-02-04', apiCalls: 1450, bandwidth: 0.20 },
  { date: '2026-02-05', apiCalls: 1600, bandwidth: 0.22 },
  { date: '2026-02-06', apiCalls: 1380, bandwidth: 0.17 },
  { date: '2026-02-07', apiCalls: 1550, bandwidth: 0.19 },
];

/**
 * Billing Service
 * Provides billing-related functionality for the developer portal
 */
export class BillingService {
  /**
   * Generate a new invoice
   */
  async generateInvoice(
    enterpriseId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<Invoice> {
    const newInvoice: Invoice = {
      invoiceId: `INV-${new Date().getFullYear()}-${String(MOCK_INVOICES.length + 1).padStart(4, '0')}`,
      companyInfo: {
        name: 'Tech Corp', address: '123 Tech Street, Beijing',
        taxId: '91110000XXXXX', email: 'billing@techcorp.com',
      },
      billingPeriod: { start: periodStart, end: periodEnd },
      usageBreakdown: [
        { item: 'API Calls', quantity: Math.floor(Math.random() * 20000), unitPrice: 0.001, amount: Math.random() * 20, currency: 'USD' },
        { item: 'Bandwidth', quantity: Math.floor(Math.random() * 3000), unitPrice: 0.01, amount: Math.random() * 30, currency: 'USD' },
      ],
      subtotal: Math.random() * 50, taxRate: 6.0, taxAmount: Math.random() * 3,
      totalAmount: Math.random() * 53, currency: 'USD',
      status: 'generated', createdAt: new Date().toISOString(),
    };
    return newInvoice;
  }

  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return MOCK_INVOICES.find((inv) => inv.invoiceId === invoiceId) || null;
  }

  async getInvoiceHistory(
    enterpriseId: string, page: number = 1, pageSize: number = 10
  ): Promise<{ list: InvoiceHistoryItem[]; total: number; page: number; pageSize: number }> {
    const historyItems: InvoiceHistoryItem[] = MOCK_INVOICES.map((inv) => ({
      invoiceId: inv.invoiceId, billingPeriod: inv.billingPeriod,
      totalAmount: inv.totalAmount, currency: inv.currency,
      status: inv.status, createdAt: inv.createdAt,
    }));
    const start = (page - 1) * pageSize;
    return { list: historyItems.slice(start, start + pageSize), total: historyItems.length, page, pageSize };
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
      // Fallback to empty if orders table not available
      return { list: [], total: 0, page, pageSize };
    }
  }

  async getUsageStatistics(
    enterpriseId: string, periodStart?: string, periodEnd?: string
  ): Promise<UsageStatistics> {
    try {
      const { getPrismaClient } = await import('../database/prisma-client');
      const prisma = getPrismaClient();

      const now = new Date();
      const days = 30;
      const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
      const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      // Single CTE query for total stats (no todayCalls - use subscription dailyApiUsage)
      const results = await (prisma as any).$queryRaw`
        WITH s AS (
          SELECT COUNT(*) as total_calls,
                 SUM(CASE WHEN is_error = 1 THEN 1 ELSE 0 END) as error_calls,
                 ROUND(AVG(response_time), 0) as avg_response_time
          FROM api_logs
          WHERE developer_id = ${enterpriseId} AND created_at >= ${startDate}
        ) SELECT * FROM s
      `;
      const stats = (results as any[])[0] || {};
      const totalCalls = Number(stats.total_calls) || 0;
      const errorCalls = Number(stats.error_calls) || 0;
      const avgResponseTime = Number(stats.avg_response_time) || 0;
      const successRate = totalCalls > 0 ? ((totalCalls - errorCalls) / totalCalls) * 100 : 100;

      // Daily breakdown
      const dailyBreakdown = await (prisma as any).$queryRaw`
        SELECT DATE(created_at) as date, COUNT(*) as calls,
               SUM(CASE WHEN is_error = 0 THEN 1 ELSE 0 END) as success_count,
               ROUND(AVG(response_time), 0) as avg_response_time
        FROM api_logs
        WHERE developer_id = ${enterpriseId} AND created_at >= ${startDate}
        GROUP BY DATE(created_at) ORDER BY date ASC
      `;

      // Endpoint breakdown
      const endpointBreakdown = await (prisma as any).$queryRaw`
        SELECT endpoint, method, COUNT(*) as calls,
               SUM(CASE WHEN is_error = 0 THEN 1 ELSE 0 END) as success_count,
               ROUND(SUM(CASE WHEN is_error = 0 THEN 1 ELSE 0 END) * 100.0 / COUNT(*), 1) as success_rate,
               ROUND(COUNT(*) * 100.0 / ${totalCalls || 1}, 1) as percentage,
               ROUND(AVG(response_time), 0) as avg_response_time,
               MAX(response_time) as max_response_time
        FROM api_logs
        WHERE developer_id = ${enterpriseId} AND created_at >= ${startDate}
        GROUP BY endpoint, method
        ORDER BY calls DESC LIMIT 10
      `;

      const activeSub = await (prisma as any).subscription.findFirst({
        where: { developerId: enterpriseId, status: 'active' },
        select: { dailyApiUsage: true, package: { select: { dailyApiLimit: true } } },
        orderBy: { startDate: 'asc' }
      });

      return {
        period: { start: startDate.toISOString().split('T')[0], end: now.toISOString().split('T')[0] },
        totalApiCalls: totalCalls, totalBandwidth: 0, totalStorage: 0,
        apiCallCost: 0, bandwidthCost: 0, storageCost: 0, totalCost: 0, currency: 'USD',
        totalCalls, successRate, avgResponseTimeMs: avgResponseTime,
        todayCalls: Number(activeSub?.dailyApiUsage) || 0,
        dailyLimit: activeSub?.package?.dailyApiLimit ?? 0,
        recentErrors: await getRecentErrors(enterpriseId),
        dailyBreakdown: (dailyBreakdown as any[]).map((d: any) => ({
          date: typeof d.date === 'string' ? d.date : new Date(d.date).toISOString().split('T')[0],
          calls: Number(d.calls), successCount: Number(d.success_count),
          avgResponseTime: Number(d.avg_response_time) || 0,
        })),
        endpointBreakdown: (endpointBreakdown as any[]).map((e: any) => ({
          endpoint: e.endpoint, method: e.method,
          calls: Number(e.calls), successCount: Number(e.success_count || 0),
          successRate: Number(e.success_rate || 0), percentage: Number(e.percentage),
          avgResponseTime: Number(e.avg_response_time || 0),
          maxResponseTime: Number(e.max_response_time || 0),
        })),
      };
    } catch {
      return MOCK_USAGE_STATS;
    }
  }
  async getUsageTrend(
    enterpriseId: string, period: '7d' | '30d' | '90d' = '7d'
  ): Promise<UsageTrend[]> {
    return MOCK_USAGE_TREND.slice(0, period === '7d' ? 7 : period === '30d' ? 30 : 90);
  }

  /**
   * Submit payment proof for a pending order
   * Creates a ticket for admin review
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