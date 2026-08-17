/**
 * Billing Controller
 * Handles billing, invoice, and usage-related API endpoints for developer portal
 */

import { Request, Response, NextFunction } from 'express';
import { BillingService, createBillingService } from '../../services/billing.service';
import { ISVAuthRequest, isvAuth } from '../../middleware/isv-auth.middleware';
import { errorMapper } from '../../services/error-mapper.service';
import { HttpCodes } from '../../enums/http-codes.enum';
import { BusinessCodes } from '../../enums/business-codes.enum';

/**
 * Create billing controller with service
 */
export function createBillingController(billingService: BillingService = createBillingService()) {
  return {
    /**
     * POST /billing/invoice/generate
     * Generate a new invoice for the specified billing period
     */
    generateInvoice: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const { period_start, period_end } = req.body;

        if (!period_start || !period_end) {
          res.status(HttpCodes.BAD_REQUEST).json(
            errorMapper.mapError({ code: BusinessCodes.PARAM_REQUIRED, message: 'Missing required fields: period_start, period_end' }, traceId)
          );
          return;
        }

        const invoice = await billingService.generateInvoice(
          isvUser.isvId,
          period_start,
          period_end
        );

        res.status(HttpCodes.CREATED).json({
          code: 0,
          message: 'success',
          data: {
            invoice_id: invoice.invoiceId,
            company_info: invoice.companyInfo,
            billing_period: invoice.billingPeriod,
            usage_breakdown: invoice.usageBreakdown,
            subtotal: invoice.subtotal,
            tax_rate: invoice.taxRate,
            tax_amount: invoice.taxAmount,
            total_amount: invoice.totalAmount,
            currency: invoice.currency,
            created_at: invoice.createdAt,
            status: invoice.status,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/invoice/:invoiceId/download
     * Download invoice as PDF
     */
    downloadInvoice: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const { invoiceId } = req.params;
        const invoice = await billingService.getInvoice(invoiceId);

        if (!invoice) {
          res.status(HttpCodes.NOT_FOUND).json(
            errorMapper.mapError({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Invoice not found' }, traceId)
          );
          return;
        }

        // In production, this would return actual PDF file
        // For now, return invoice data as JSON
        res.json({
          code: 0,
          message: 'success',
          data: {
            invoice_id: invoice.invoiceId,
            company_info: invoice.companyInfo,
            billing_period: invoice.billingPeriod,
            usage_breakdown: invoice.usageBreakdown,
            subtotal: invoice.subtotal,
            tax_rate: invoice.taxRate,
            tax_amount: invoice.taxAmount,
            total_amount: invoice.totalAmount,
            currency: invoice.currency,
            status: invoice.status,
            created_at: invoice.createdAt,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/invoice/history
     * Get invoice history with pagination
     */
    getInvoiceHistory: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.page_size as string) || 10;

        const result = await billingService.getInvoiceHistory(isvUser.isvId, page, pageSize);

        res.json({
          code: 0,
          message: 'success',
          data: {
            list: result.list,
            total: result.total,
            page: result.page,
            page_size: result.pageSize,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/payment/history
     * Get payment history with pagination
     */
    getPaymentHistory: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.page_size as string) || 10;

        const result = await billingService.getPaymentHistory(isvUser.isvId, page, pageSize);

        res.json({
          code: 0,
          message: 'success',
          data: {
            list: result.list,
            total: result.total,
            page: result.page,
            page_size: result.pageSize,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /usage/statistics
     * Get usage statistics for the current billing period
     */
    getUsageStatistics: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const { period } = req.query;

        // Get stats from billing service
        const stats = await billingService.getUsageStatistics(
          isvUser.isvId,
          period as string | undefined,
          undefined
        );

        // Return data in format expected by frontend
        res.json({
          code: 0,
          message: 'success',
          data: {
            total_calls: stats.totalCalls || stats.totalApiCalls || 0,
            success_rate: stats.successRate ?? 99.5,
            avg_response_time_ms: stats.avgResponseTimeMs || 0,
            today_calls: stats.todayCalls || 0,
            daily_limit: stats.dailyLimit || 0,
            recent_errors: stats.recentErrors || [],
            period: period as string || '30days',
            daily_breakdown: stats.dailyBreakdown?.length ? stats.dailyBreakdown : [
              { date: new Date().toISOString().split('T')[0], calls: 0, success_count: 0, avg_response_time: 0 },
            ],
            endpoint_breakdown: stats.endpointBreakdown?.length ? stats.endpointBreakdown : [],
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/usage/trend
     * Get usage trend data
     */
    getUsageTrend: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const period = (req.query.period as '7d' | '30d' | '90d') || '7d';

        const trend = await billingService.getUsageTrend(isvUser.isvId, period);

        res.json({
          code: 0,
          message: 'success',
          data: {
            list: trend,
            period,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/invoices
     * Get invoice list with pagination
     */
    getInvoices: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;

        const result = await billingService.getInvoiceHistory(isvUser.isvId, page, pageSize);

        res.json({
          code: 0,
          message: 'success',
          data: {
            list: result.list,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/invoices/:id
     * Get invoice detail
     */
    getInvoice: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const { id } = req.params;
        const invoice = await billingService.getInvoice(id);

        if (!invoice) {
          res.status(HttpCodes.NOT_FOUND).json(
            errorMapper.mapError({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Invoice not found' }, traceId)
          );
          return;
        }

        res.json({
          code: 0,
          message: 'success',
          data: {
            invoice_id: invoice.invoiceId,
            company_info: invoice.companyInfo,
            billing_period: invoice.billingPeriod,
            usage_breakdown: invoice.usageBreakdown,
            subtotal: invoice.subtotal,
            tax_rate: invoice.taxRate,
            tax_amount: invoice.taxAmount,
            total_amount: invoice.totalAmount,
            currency: invoice.currency,
            status: invoice.status,
            created_at: invoice.createdAt,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/payments
     * Get payment history with pagination
     */
    getPayments: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const page = parseInt(req.query.page as string) || 1;
        const pageSize = parseInt(req.query.pageSize as string) || 10;

        const result = await billingService.getPaymentHistory(isvUser.isvId, page, pageSize);

        res.json({
          code: 0,
          message: 'success',
          data: {
            list: result.list,
            total: result.total,
            page: result.page,
            pageSize: result.pageSize,
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * GET /billing/payments/:id/invoice
     * Get payment invoice
     */
    getPaymentInvoice: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const { id } = req.params;
        // For now, return a mock payment invoice response
        // In production, this would fetch the actual payment invoice
        res.json({
          code: 0,
          message: 'success',
          data: {
            payment_id: id,
            invoice_id: `INV-${id}`,
            amount: 100.00,
            currency: 'USD',
            status: 'paid',
            paid_at: new Date().toISOString(),
          },
        });
      } catch (error) {
        next(error);
      }
    },

    /**
     * POST /billing/payments/:id/submit-proof
     * Submit payment proof for a pending order
     */
    submitPaymentProof: async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const traceId = (req as any).traceId || `bil_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
        const isvUser = (req as ISVAuthRequest).isvUser;

        if (!isvUser) {
          res.status(HttpCodes.UNAUTHORIZED).json(
            errorMapper.mapError({ code: BusinessCodes.AUTH_MISSING_HEADERS, message: 'Unauthorized' }, traceId)
          );
          return;
        }

        const { id } = req.params;
        const { externalPaymentId, proofUrl, paidAt, remark } = req.body;

        if (!externalPaymentId || !proofUrl || !paidAt) {
          res.status(HttpCodes.BAD_REQUEST).json(
            errorMapper.mapError({ code: BusinessCodes.PARAM_REQUIRED, message: 'Missing required fields: externalPaymentId, proofUrl, paidAt' }, traceId)
          );
          return;
        }

        const result = await billingService.submitPaymentProof(
          id, isvUser.isvId,
          { externalPaymentId, proofUrl, paidAt, remark }
        );

        res.json({
          code: 0,
          message: 'success',
          data: result,
        });
      } catch (error) {
        next(error);
      }
    },
  };
}

/**
 * Default billing controller instance
 */
export const billingController = createBillingController();
