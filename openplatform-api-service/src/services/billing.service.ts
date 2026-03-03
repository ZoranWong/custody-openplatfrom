/**
 * Billing Service
 * Handles invoice generation, payment history, and usage statistics for developer portal
 */

import { Invoice, InvoiceHistoryItem, PaymentHistoryItem, UsageStatistics, UsageTrend } from '../types/billing.types';

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

const MOCK_PAYMENTS: PaymentHistoryItem[] = [
  {
    paymentId: 'PAY-2026-0001',
    invoiceId: 'INV-2026-0001',
    amount: 26.75,
    currency: 'USD',
    status: 'completed',
    paymentMethod: 'bank_transfer',
    paidAt: '2026-02-15T10:00:00Z',
  },
  {
    paymentId: 'PAY-2026-0002',
    invoiceId: 'INV-2025-0012',
    amount: 150.00,
    currency: 'USD',
    status: 'completed',
    paymentMethod: 'credit_card',
    paidAt: '2026-01-10T09:30:00Z',
  },
];

const MOCK_USAGE_STATS: UsageStatistics = {
  period: {
    start: '2026-02-01',
    end: '2026-02-28',
  },
  totalApiCalls: 45230,
  totalBandwidth: 5.2, // GB
  totalStorage: 1.8, // GB
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
   * Generate a new invoice for the given period
   */
  async generateInvoice(
    enterpriseId: string,
    periodStart: string,
    periodEnd: string
  ): Promise<Invoice> {
    // In production, this would call the developer-portal backend
    // For now, return mock data
    const newInvoice: Invoice = {
      invoiceId: `INV-${new Date().getFullYear()}-${String(MOCK_INVOICES.length + 1).padStart(4, '0')}`,
      companyInfo: {
        name: 'Tech Corp',
        address: '123 Tech Street, Beijing',
        taxId: '91110000XXXXX',
        email: 'billing@techcorp.com',
      },
      billingPeriod: {
        start: periodStart,
        end: periodEnd,
      },
      usageBreakdown: [
        { item: 'API Calls', quantity: Math.floor(Math.random() * 20000), unitPrice: 0.001, amount: Math.random() * 20, currency: 'USD' },
        { item: 'Bandwidth', quantity: Math.floor(Math.random() * 3000), unitPrice: 0.01, amount: Math.random() * 30, currency: 'USD' },
      ],
      subtotal: Math.random() * 50,
      taxRate: 6.0,
      taxAmount: Math.random() * 3,
      totalAmount: Math.random() * 53,
      currency: 'USD',
      status: 'generated',
      createdAt: new Date().toISOString(),
    };

    return newInvoice;
  }

  /**
   * Get invoice by ID
   */
  async getInvoice(invoiceId: string): Promise<Invoice | null> {
    return MOCK_INVOICES.find((inv) => inv.invoiceId === invoiceId) || null;
  }

  /**
   * Get invoice history with pagination
   */
  async getInvoiceHistory(
    enterpriseId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ list: InvoiceHistoryItem[]; total: number; page: number; pageSize: number }> {
    const historyItems: InvoiceHistoryItem[] = MOCK_INVOICES.map((inv) => ({
      invoiceId: inv.invoiceId,
      billingPeriod: inv.billingPeriod,
      totalAmount: inv.totalAmount,
      currency: inv.currency,
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    const start = (page - 1) * pageSize;
    const paginatedList = historyItems.slice(start, start + pageSize);

    return {
      list: paginatedList,
      total: historyItems.length,
      page,
      pageSize,
    };
  }

  /**
   * Get payment history
   */
  async getPaymentHistory(
    enterpriseId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<{ list: PaymentHistoryItem[]; total: number; page: number; pageSize: number }> {
    const start = (page - 1) * pageSize;
    const paginatedList = MOCK_PAYMENTS.slice(start, start + pageSize);

    return {
      list: paginatedList,
      total: MOCK_PAYMENTS.length,
      page,
      pageSize,
    };
  }

  /**
   * Get usage statistics
   */
  async getUsageStatistics(
    enterpriseId: string,
    periodStart?: string,
    periodEnd?: string
  ): Promise<UsageStatistics> {
    return MOCK_USAGE_STATS;
  }

  /**
   * Get usage trend data
   */
  async getUsageTrend(
    enterpriseId: string,
    period: '7d' | '30d' | '90d' = '7d'
  ): Promise<UsageTrend[]> {
    // Return mock data based on period
    return MOCK_USAGE_TREND.slice(0, period === '7d' ? 7 : period === '30d' ? 30 : 90);
  }
}

/**
 * Create billing service instance
 */
export function createBillingService(): BillingService {
  return new BillingService();
}
