/**
 * Billing Service Tests
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { BillingService, createBillingService } from '../../src/services/billing.service';

describe('BillingService', () => {
  let service: BillingService;

  beforeEach(() => {
    service = createBillingService();
  });

  describe('generateInvoice', () => {
    it('should generate an invoice for the given period', async () => {
      const invoice = await service.generateInvoice(
        'isv_123',
        '2026-01-01',
        '2026-01-31'
      );

      expect(invoice.invoiceId).toBeDefined();
      expect(invoice.invoiceId).toMatch(/^INV-\d{4}-\d{4}$/);
      expect(invoice.companyInfo).toBeDefined();
      expect(invoice.companyInfo.name).toBe('Tech Corp');
      expect(invoice.billingPeriod.start).toBe('2026-01-01');
      expect(invoice.billingPeriod.end).toBe('2026-01-31');
      expect(invoice.status).toBe('generated');
      expect(invoice.currency).toBe('USD');
    });

    it('should include usage breakdown', async () => {
      const invoice = await service.generateInvoice(
        'isv_123',
        '2026-02-01',
        '2026-02-28'
      );

      expect(invoice.usageBreakdown).toBeDefined();
      expect(invoice.usageBreakdown.length).toBeGreaterThan(0);
      expect(invoice.usageBreakdown[0].item).toBe('API Calls');
      expect(invoice.usageBreakdown[0].currency).toBe('USD');
    });
  });

  describe('getInvoice', () => {
    it('should return invoice by ID', async () => {
      const invoice = await service.getInvoice('INV-2026-0001');

      expect(invoice).toBeDefined();
      expect(invoice?.invoiceId).toBe('INV-2026-0001');
      expect(invoice?.companyInfo.name).toBe('Tech Corp');
    });

    it('should return null for non-existent invoice', async () => {
      const invoice = await service.getInvoice('INVALID');
      expect(invoice).toBeNull();
    });
  });

  describe('getInvoiceHistory', () => {
    it('should return paginated invoice history', async () => {
      const result = await service.getInvoiceHistory('isv_123', 1, 10);

      expect(result.list).toBeDefined();
      expect(result.total).toBeGreaterThan(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should respect pagination parameters', async () => {
      const result = await service.getInvoiceHistory('isv_123', 2, 1);

      expect(result.page).toBe(2);
      expect(result.pageSize).toBe(1);
      expect(result.list.length).toBeLessThanOrEqual(1);
    });

    it('should return lightweight invoice history items', async () => {
      const result = await service.getInvoiceHistory('isv_123', 1, 10);

      // History items should not have full usage breakdown
      if (result.list.length > 0) {
        expect(result.list[0]).not.toHaveProperty('usageBreakdown');
        expect(result.list[0]).toHaveProperty('invoiceId');
        expect(result.list[0]).toHaveProperty('billingPeriod');
        expect(result.list[0]).toHaveProperty('totalAmount');
      }
    });
  });

  describe('getPaymentHistory', () => {
    it('should return paginated payment history', async () => {
      const result = await service.getPaymentHistory('isv_123', 1, 10);

      expect(result.list).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should have correct payment structure', async () => {
      const result = await service.getPaymentHistory('isv_123', 1, 10);

      if (result.list.length > 0) {
        expect(result.list[0]).toHaveProperty('paymentId');
        expect(result.list[0]).toHaveProperty('invoiceId');
        expect(result.list[0]).toHaveProperty('amount');
        expect(result.list[0]).toHaveProperty('currency');
        expect(result.list[0]).toHaveProperty('status');
      }
    });
  });

  describe('getUsageStatistics', () => {
    it('should return usage statistics', async () => {
      const stats = await service.getUsageStatistics('isv_123');

      expect(stats.totalApiCalls).toBeGreaterThan(0);
      expect(stats.totalBandwidth).toBeGreaterThan(0);
      expect(stats.totalCost).toBeGreaterThan(0);
      expect(stats.currency).toBe('USD');
    });

    it('should include cost breakdown', async () => {
      const stats = await service.getUsageStatistics('isv_123');

      expect(stats.apiCallCost).toBeGreaterThanOrEqual(0);
      expect(stats.bandwidthCost).toBeGreaterThanOrEqual(0);
      expect(stats.storageCost).toBeGreaterThanOrEqual(0);
    });
  });

  describe('getUsageTrend', () => {
    it('should return usage trend for 7 days', async () => {
      const trend = await service.getUsageTrend('isv_123', '7d');

      expect(trend).toBeDefined();
      expect(trend.length).toBeLessThanOrEqual(7);
    });

    it('should return usage trend for 30 days', async () => {
      const trend = await service.getUsageTrend('isv_123', '30d');

      expect(trend).toBeDefined();
      expect(trend.length).toBeLessThanOrEqual(30);
    });

    it('should return usage trend data points', async () => {
      const trend = await service.getUsageTrend('isv_123', '7d');

      if (trend.length > 0) {
        expect(trend[0]).toHaveProperty('date');
        expect(trend[0]).toHaveProperty('apiCalls');
        expect(trend[0]).toHaveProperty('bandwidth');
      }
    });

    it('should default to 7 days if no period specified', async () => {
      const trend = await service.getUsageTrend('isv_123');

      expect(trend.length).toBeLessThanOrEqual(7);
    });
  });
});

describe('Billing Types', () => {
  describe('Invoice', () => {
    it('should have correct structure', async () => {
      const service = createBillingService();
      const invoice = await service.generateInvoice('isv_123', '2026-01-01', '2026-01-31');

      expect(invoice.invoiceId).toBeDefined();
      expect(invoice.companyInfo).toBeDefined();
      expect(invoice.companyInfo.name).toBeDefined();
      expect(invoice.companyInfo.taxId).toBeDefined();
      expect(invoice.billingPeriod).toBeDefined();
      expect(invoice.usageBreakdown).toBeDefined();
      expect(invoice.subtotal).toBeDefined();
      expect(invoice.taxRate).toBeDefined();
      expect(invoice.taxAmount).toBeDefined();
      expect(invoice.totalAmount).toBeDefined();
      expect(invoice.currency).toBe('USD');
    });
  });

  describe('PaymentHistoryItem', () => {
    it('should have correct structure', async () => {
      const service = createBillingService();
      const result = await service.getPaymentHistory('isv_123');

      if (result.list.length > 0) {
        const payment = result.list[0];
        expect(payment.paymentId).toBeDefined();
        expect(payment.invoiceId).toBeDefined();
        expect(payment.amount).toBeGreaterThan(0);
        expect(payment.status).toMatch(/^(pending|processing|completed|failed|refunded)$/);
        expect(payment.paymentMethod).toMatch(/^(bank_transfer|credit_card|debit_card|crypto)$/);
      }
    });
  });
});
