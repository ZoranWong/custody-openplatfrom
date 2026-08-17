// Billing & Usage Types
export interface UsageStat {
  date: string
  apiCalls: number
  bandwidth: number
  cost: number
}

export interface DailyUsage {
  date: string
  calls: number
  successCount: number
  avgResponseTime: number
}

export interface EndpointUsage {
  endpoint: string
  method: string
  calls: number
  percentage: number
  avgResponseTime?: number
  maxResponseTime?: number
}

export interface UsageStats {
  totalCalls: number
  successRate: number
  avgResponseTimeMs: number
  period: string
  dailyBreakdown: DailyUsage[]
  endpointBreakdown: EndpointUsage[]
}

export type PeriodType = '7days' | '30days' | '90days'

export interface Invoice {
  id: string
  amount: number
  currency: string
  status: 'pending' | 'paid' | 'failed'
  dueDate: string
  createdAt: string
}

export interface Payment {
  id: string
  amount: number
  currency: string
  status: 'success' | 'failed' | 'pending'
  createdAt: string
}

// Invoice Generation Types
export type BillingPeriodType = 'current_month' | 'last_month' | 'last_3_months' | 'custom'

export interface DateRange {
  start: string
  end: string
}

export interface CompanyInfo {
  name: string
  address: string
  taxId: string
  email: string
}

export interface UsageBreakdownItem {
  item: string
  quantity: number
  unitPrice: number
  amount: number
  currency: string
}

export interface InvoiceData {
  invoiceId: string
  companyInfo: CompanyInfo
  billingPeriod: DateRange
  usageBreakdown: UsageBreakdownItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  totalAmount: number
  currency: string
  createdAt: string
  status: 'generated' | 'downloaded' | 'archived'
}

export interface GenerateInvoiceParams {
  periodStart: string
  periodEnd: string
}

export interface InvoiceHistoryItem {
  invoiceId: string
  billingPeriod: DateRange
  totalAmount: number
  currency: string
  status: string
  createdAt: string
}

export interface InvoiceHistoryResponse {
  list: InvoiceHistoryItem[]
  total: number
  page: number
  pageSize: number
}

// Payment History Types
export type PaymentStatusFilter = 'all' | 'success' | 'pending' | 'failed'

export interface PaymentHistoryParams {
  page?: number
  pageSize?: number
  status?: PaymentStatusFilter
  startDate?: string
  endDate?: string
}

export interface PaymentHistoryItem {
  id: string
  externalPaymentId: string
  amount: number
  currency: string
  paymentMethod: 'bank_transfer' | 'web3'
  proofUrl?: string
  status: 'pending' | 'confirmed' | 'rejected'
  createdAt: string
  confirmedAt?: string
  remark?: string
}

export interface PaymentHistoryResponse {
  list: PaymentHistoryItem[]
  total: number
  page: number
  pageSize: number
}