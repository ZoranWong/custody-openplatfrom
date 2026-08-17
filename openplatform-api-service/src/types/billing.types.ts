/**
 * Billing Types
 * Type definitions for billing, invoice, and usage tracking
 */

/**
 * Company information for invoices
 */
export interface CompanyInfo {
  name: string;
  address: string;
  taxId: string;
  email: string;
}

/**
 * Billing period
 */
export interface BillingPeriod {
  start: string;
  end: string;
}

/**
 * Usage breakdown item
 */
export interface UsageBreakdownItem {
  item: string;
  quantity: number;
  unitPrice: number;
  amount: number;
  currency: string;
}

/**
 * Invoice status
 */
export type InvoiceStatus = 'draft' | 'generated' | 'sent' | 'paid' | 'overdue' | 'cancelled';

/**
 * Invoice
 */
export interface Invoice {
  invoiceId: string;
  companyInfo: CompanyInfo;
  billingPeriod: BillingPeriod;
  usageBreakdown: UsageBreakdownItem[];
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: string;
}

/**
 * Invoice history item (lightweight version)
 */
export interface InvoiceHistoryItem {
  invoiceId: string;
  billingPeriod: BillingPeriod;
  totalAmount: number;
  currency: string;
  status: InvoiceStatus;
  createdAt: string;
}

/**
 * Payment status
 */
export type PaymentStatus = 'pending' | 'confirmed' | 'rejected';

/**
 * Payment method
 */
export type PaymentMethod = 'bank_transfer' | 'web3';

/**
 * Payment history item
 */
export interface PaymentHistoryItem {
  id: string;
  externalPaymentId: string;
  amount: number;
  currency: string;
  paymentMethod: string;
  proofUrl?: string;
  status: string;
  createdAt: string;
  confirmedAt?: string;
  remark?: string;
}

/**
 * Usage statistics
 */
export interface UsageStatistics {
  period: BillingPeriod;
  totalApiCalls: number;
  totalBandwidth: number;
  totalStorage: number;
  apiCallCost: number;
  bandwidthCost: number;
  storageCost: number;
  totalCost: number;
  currency: string;
  successRate?: number;
  totalCalls?: number;
  avgResponseTimeMs?: number;
  todayCalls?: number;
  dailyLimit?: number;
  recentErrors?: Array<{
    apiName: string;
    endpoint: string;
    responseStatus: number;
    createdAt: string;
  }>;
  dailyBreakdown?: Array<{
    date: string;
    calls: number;
    successCount: number;
    avgResponseTime: number;
  }>;
  endpointBreakdown?: Array<{
    endpoint: string;
    method: string;
    calls: number;
    percentage: number;
  }>;
}

/**
 * Usage trend data point
 */
export interface UsageTrend {
  date: string;
  apiCalls: number;
  bandwidth: number; // GB
}

/**
 * Generate invoice request
 */
export interface GenerateInvoiceRequest {
  period_start: string;
  period_end: string;
}

/**
 * Invoice generation response
 */
export interface GenerateInvoiceResponse {
  invoice_id: string;
  company_info: CompanyInfo;
  billing_period: BillingPeriod;
  usage_breakdown: UsageBreakdownItem[];
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  status: InvoiceStatus;
}

/**
 * Invoice history response
 */
export interface InvoiceHistoryResponse {
  list: InvoiceHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Payment history response
 */
export interface PaymentHistoryResponse {
  list: PaymentHistoryItem[];
  total: number;
  page: number;
  page_size: number;
}

/**
 * Usage statistics response
 */
export interface UsageStatisticsResponse {
  period: BillingPeriod;
  total_api_calls: number;
  total_bandwidth: number;
  total_storage: number;
  api_call_cost: number;
  bandwidth_cost: number;
  storage_cost: number;
  total_cost: number;
  currency: string;
}

/**
 * Usage trend response
 */
export interface UsageTrendResponse {
  list: UsageTrend[];
  period: string;
}
