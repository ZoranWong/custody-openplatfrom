/**
 * Billing Routes
 * Billing, invoice, and usage-related API endpoints for developer portal
 *
 * Base path: /api/v1/billing
 */

import { Router } from 'express';
import { isvAuth } from '../../middleware/isv-auth.middleware';
import { billingController } from '../../controllers/billing.controller';

const router = Router();

// ============================================
// Usage Routes
// ============================================

/**
 * GET /billing/usage
 * Get usage statistics for the current billing period
 */
router.get('/usage', isvAuth, (req: any, res: any, next: any) => {
  billingController.getUsageStatistics(req, res, next);
});

/**
 * GET /billing/usage/trend
 * Get usage trend data
 */
router.get('/usage/trend', isvAuth, (req: any, res: any, next: any) => {
  billingController.getUsageTrend(req, res, next);
});

// ============================================
// Invoice Routes
// ============================================

/**
 * GET /billing/invoices
 * Get invoice list with pagination
 */
router.get('/invoices', isvAuth, (req: any, res: any, next: any) => {
  billingController.getInvoices(req, res, next);
});

/**
 * GET /billing/invoices/:id
 * Get invoice detail
 */
router.get('/invoices/:id', isvAuth, (req: any, res: any, next: any) => {
  billingController.getInvoice(req, res, next);
});

/**
 * POST /billing/invoice/generate
 * Generate a new invoice for the specified billing period
 */
router.post('/invoice/generate', isvAuth, (req: any, res: any, next: any) => {
  billingController.generateInvoice(req, res, next);
});

/**
 * GET /billing/invoice/:invoiceId/download
 * Download invoice as PDF
 */
router.get('/invoice/:invoiceId/download', isvAuth, (req: any, res: any, next: any) => {
  billingController.downloadInvoice(req, res, next);
});

/**
 * GET /billing/invoice/history
 * Get invoice history with pagination
 */
router.get('/invoice/history', isvAuth, (req: any, res: any, next: any) => {
  billingController.getInvoiceHistory(req, res, next);
});

// ============================================
// Payment Routes
// ============================================

/**
 * GET /billing/payments
 * Get payment history with pagination
 */
router.get('/payments', isvAuth, (req: any, res: any, next: any) => {
  billingController.getPayments(req, res, next);
});

/**
 * GET /billing/payments/:id/invoice
 * Get payment invoice
 */
router.get('/payments/:id/invoice', isvAuth, (req: any, res: any, next: any) => {
  billingController.getPaymentInvoice(req, res, next);
});

export default router;
