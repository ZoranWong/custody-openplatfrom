/**
 * Mock Data Service for Developer Portal
 * Provides realistic mock data for billing, usage, and payment modules
 * All data uses camelCase naming convention as per project standards
 */

import type {
  UsageStats,
  DailyUsage,
  EndpointUsage,
  InvoiceData,
  InvoiceHistoryItem,
  PaymentHistoryItem
} from '@/services/api'

// Seeded random number generator for consistent data
class SeededRandom {
  private seed: number

  constructor(seed: number) {
    this.seed = seed
  }

  next(): number {
    this.seed = (this.seed * 1103515245 + 12345) & 0x7fffffff
    return this.seed / 0x7fffffff
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min
  }

  nextFloat(min: number, max: number): number {
    return this.next() * (max - min) + min
  }

  pick<T>(array: readonly T[]): T {
    return array[Math.floor(this.next() * array.length)]
  }
}

// Helper functions
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]
}

function formatDateTime(date: Date): string {
  return date.toISOString()
}

function getDateDaysAgo(days: number): Date {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

// Generate daily usage data for the past N days
function generateDailyUsage(days: number, random: SeededRandom): DailyUsage[] {
  const data: DailyUsage[] = []
  const baseCalls = random.nextInt(8000, 15000)

  for (let i = days; i >= 0; i--) {
    const date = getDateDaysAgo(i)
    const variation = random.nextFloat(0.7, 1.3)
    const calls = Math.floor(baseCalls * variation)
    const successCount = Math.floor(calls * (random.nextFloat(0.95, 0.99)))
    const avgResponseTime = random.nextInt(45, 120)

    data.push({
      date: formatDate(date),
      calls,
      successCount,
      avgResponseTime
    })
  }

  return data
}

// Generate endpoint breakdown
function generateEndpointUsage(random: SeededRandom): EndpointUsage[] {
  const endpoints = [
    { endpoint: '/api/v1/wallet/balance', method: 'GET', base: 25 },
    { endpoint: '/api/v1/transactions/list', method: 'GET', base: 20 },
    { endpoint: '/api/v1/wallet/deposit', method: 'POST', base: 15 },
    { endpoint: '/api/v1/wallet/withdraw', method: 'POST', base: 12 },
    { endpoint: '/api/v1/transfer', method: 'POST', base: 10 },
    { endpoint: '/api/v1/address/generate', method: 'POST', base: 8 },
    { endpoint: '/api/v1/webhook/callback', method: 'POST', base: 5 },
    { endpoint: '/api/v1/kyc/submit', method: 'POST', base: 3 },
    { endpoint: '/api/v1/account/info', method: 'GET', base: 2 }
  ]

  let remaining = 100
  const results: EndpointUsage[] = []

  for (let i = 0; i < endpoints.length; i++) {
    const isLast = i === endpoints.length - 1
    const percentage = isLast ? remaining : random.nextInt(5, Math.min(remaining - 5, endpoints[i].base + 10))
    remaining -= percentage

    results.push({
      endpoint: endpoints[i].endpoint,
      method: endpoints[i].method,
      calls: Math.floor(percentage * 150),
      percentage
    })
  }

  return results.sort((a, b) => b.calls - a.calls)
}

// Company info for invoices
const companyInfo = {
  name: 'TechCorp Solutions Inc.',
  address: '123 Innovation Drive, Silicon Valley, CA 94025',
  taxId: 'US-123456789',
  email: 'billing@techcorp.com'
}

// Generate usage breakdown items
function generateUsageBreakdownItems(random: SeededRandom): InvoiceData['usageBreakdown'] {
  const items = [
    { item: 'API Calls', unit: '1K calls', unitPrice: random.nextFloat(0.5, 1.5), quantity: random.nextInt(200, 500) },
    { item: 'Data Transfer', unit: 'GB', unitPrice: random.nextFloat(0.1, 0.3), quantity: random.nextInt(100, 300) },
    { item: 'Wallet Operations', unit: 'operations', unitPrice: random.nextFloat(0.02, 0.05), quantity: random.nextInt(1000, 3000) },
    { item: 'Webhook Callbacks', unit: 'callbacks', unitPrice: random.nextFloat(0.01, 0.02), quantity: random.nextInt(500, 1500) }
  ]

  return items.map(item => ({
    item: item.item,
    quantity: item.quantity,
    unitPrice: Number(item.unitPrice.toFixed(4)),
    amount: Number((item.quantity * item.unitPrice).toFixed(2)),
    currency: 'USD'
  }))
}

export class MockDataService {
  private random: SeededRandom

  constructor(seed: number = 12345) {
    this.random = new SeededRandom(seed)
  }

  // ============================================
  // Usage Statistics Mock Data
  // ============================================

  getUsageStats(period: '7days' | '30days' | '90days' = '30days'): UsageStats & { treasuryUnits: number; addressCount: number; billingCost: number } {
    const days = period === '7days' ? 7 : period === '90days' ? 90 : 30
    const dailyBreakdown = generateDailyUsage(days, this.random)

    const totalCalls = dailyBreakdown.reduce((sum, d) => sum + d.calls, 0)
    const avgSuccessRate = dailyBreakdown.reduce((sum, d) => sum + (d.successCount / d.calls), 0) / days * 100
    const avgResponseTime = dailyBreakdown.reduce((sum, d) => sum + d.avgResponseTime, 0) / days

    // Generate billing cost based on API calls
    const billingCost = Number((totalCalls * 0.0001).toFixed(2))

    return {
      totalCalls,
      successRate: Number(avgSuccessRate.toFixed(2)),
      avgResponseTimeMs: Math.round(avgResponseTime),
      period,
      dailyBreakdown,
      endpointBreakdown: generateEndpointUsage(this.random),
      // Prepaid dimension fields
      treasuryUnits: this.random.nextInt(2, 10),
      addressCount: this.random.nextInt(50, 500),
      billingCost
    }
  }

  // ============================================
  // Invoice Generation Mock Data
  // ============================================

  generateInvoice(startDate: string, endDate: string): InvoiceData {
    const usageBreakdown = generateUsageBreakdownItems(this.random)
    const subtotal = usageBreakdown.reduce((sum, item) => sum + item.amount, 0)
    const taxRate = 0.08
    const taxAmount = Number((subtotal * taxRate).toFixed(2))
    const totalAmount = Number((subtotal + taxAmount).toFixed(2))

    return {
      invoiceId: `INV-${Date.now().toString(36).toUpperCase()}`,
      companyInfo,
      billingPeriod: {
        start: startDate,
        end: endDate
      },
      usageBreakdown,
      subtotal: Number(subtotal.toFixed(2)),
      taxRate,
      taxAmount,
      totalAmount,
      currency: 'USD',
      createdAt: formatDateTime(new Date()),
      status: 'generated'
    }
  }

  getInvoiceHistory(page: number = 1, pageSize: number = 10): { list: InvoiceHistoryItem[]; total: number; page: number; pageSize: number } {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    const list: InvoiceHistoryItem[] = []

    for (let i = 0; i < 24; i++) {
      let month = currentMonth - i
      let year = currentYear
      if (month < 0) {
        month += 12
        year -= 1
      }

      const startDate = new Date(year, month, 1)
      const endDate = new Date(year, month + 1, 0)
      const totalAmount = this.random.nextFloat(500, 5000)
      const statuses = ['generated', 'downloaded', 'archived'] as const
      const status = this.random.pick(statuses)

      list.push({
        invoiceId: `INV-${year}${String(month + 1).padStart(2, '0')}-${String(this.random.nextInt(1000, 9999))}`,
        billingPeriod: {
          start: formatDate(startDate),
          end: formatDate(endDate)
        },
        totalAmount: Number(totalAmount.toFixed(2)),
        currency: 'USD',
        status,
        createdAt: formatDateTime(new Date(year, month, this.random.nextInt(1, 28)))
      })
    }

    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: list.slice(start, end),
      total: list.length,
      page,
      pageSize
    }
  }

  // ============================================
  // Payment History Mock Data
  // ============================================

  getPaymentHistory(
    page: number = 1,
    pageSize: number = 10,
    status?: 'all' | 'success' | 'pending' | 'failed'
  ): {
    list: PaymentHistoryItem[]
    total: number
    page: number
    pageSize: number
    totalAmount: number
    currency: string
  } {
    const statuses = ['success', 'success', 'success', 'pending', 'failed'] as const
    const descriptions = [
      'Monthly API subscription',
      'Prepaid balance top-up',
      'Invoice payment - January',
      'Invoice payment - December',
      'Additional API quota purchase',
      'Service activation fee',
      'Annual subscription renewal'
    ]

    const list: PaymentHistoryItem[] = []

    for (let i = 0; i < 50; i++) {
      const date = getDateDaysAgo(this.random.nextInt(0, 180))
      const amount = this.random.nextFloat(100, 10000)
      const paymentStatus = this.random.pick(statuses)

      list.push({
        id: `PAY-${Date.now().toString(36).toUpperCase()}-${i}`,
        date: formatDateTime(date),
        amount: Number(amount.toFixed(2)),
        currency: 'USD',
        status: paymentStatus,
        invoiceId: `INV-${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}-${String(this.random.nextInt(1000, 9999))}`,
        description: this.random.pick(descriptions)
      })
    }

    let filteredList = list
    if (status && status !== 'all') {
      filteredList = list.filter(p => p.status === status)
    }

    const start = (page - 1) * pageSize
    const paginatedList = filteredList.slice(start, start + pageSize)
    const totalAmount = filteredList
      .filter(p => p.status === 'success')
      .reduce((sum, p) => sum + p.amount, 0)

    return {
      list: paginatedList,
      total: filteredList.length,
      page,
      pageSize,
      totalAmount: Number(totalAmount.toFixed(2)),
      currency: 'USD'
    }
  }

  // ============================================
  // Account Balance Mock Data (Prepaid Model)
  // ============================================

  getAccountBalance(): {
    availableBalance: number
    currency: string
    lastUpdated: string
    prepaidUnits: {
      treasuryUnits: { current: number; included: number; unitPrice: number }
      addresses: { current: number; included: number; unitPrice: number }
      apiCalls: { current: number; included: number; unitPrice: number }
    }
  } {
    return {
      availableBalance: this.random.nextFloat(5000, 50000),
      currency: 'USD',
      lastUpdated: formatDateTime(new Date()),
      prepaidUnits: {
        treasuryUnits: {
          current: this.random.nextInt(2, 10),
          included: 10,
          unitPrice: 99.99
        },
        addresses: {
          current: this.random.nextInt(50, 500),
          included: 100,
          unitPrice: 0.5
        },
        apiCalls: {
          current: this.random.nextInt(50000, 500000),
          included: 100000,
          unitPrice: 0.001
        }
      }
    }
  }

  // ============================================
  // Billing Summary Mock Data
  // ============================================

  getBillingSummary(): {
    currentMonthUsage: number
    currentMonthCost: number
    prepaidBalance: number
    averageMonthlyCost: number
    usageByCategory: { category: string; amount: number; percentage: number }[]
  } {
    const categories = [
      { category: 'API Calls', base: 400 },
      { category: 'Data Transfer', base: 150 },
      { category: 'Wallet Operations', base: 100 },
      { category: 'Webhook Callbacks', base: 50 }
    ]

    const usageByCategory = categories.map(cat => ({
      category: cat.category,
      amount: this.random.nextFloat(cat.base * 0.8, cat.base * 1.2),
      percentage: 0
    }))

    const total = usageByCategory.reduce((sum, c) => sum + c.amount, 0)
    usageByCategory.forEach(c => {
      c.amount = Number(c.amount.toFixed(2))
      c.percentage = Number((c.amount / total * 100).toFixed(1))
    })

    return {
      currentMonthUsage: this.random.nextInt(700000, 800000),
      currentMonthCost: Number(total.toFixed(2)),
      prepaidBalance: this.random.nextFloat(5000, 50000),
      averageMonthlyCost: Number((total * 0.95).toFixed(2)),
      usageByCategory
    }
  }

  // ============================================
  // Recharge Records Mock Data
  // ============================================

  getRechargeRecords(page: number = 1, pageSize: number = 10): {
    list: {
      id: string
      date: string
      amount: number
      currency: string
      paymentMethod: string
      balanceBefore: number
      balanceAfter: number
      status: 'completed' | 'pending' | 'failed'
    }[]
    total: number
    totalAmount: number
  } {
    const paymentMethods = ['Credit Card (Visa ****4532)', 'Bank Transfer (CHASE ***1234)', 'USDT (TRC20)', 'PayPal']
    const statuses = ['completed', 'completed', 'completed', 'pending', 'failed'] as const

    const list = []
    let balance = 15000

    for (let i = 0; i < 30; i++) {
      const date = getDateDaysAgo(i)
      const amount = this.random.pick([1000, 2000, 5000, 10000, 20000])
      const status = this.random.pick(statuses)
      balance = status === 'completed' ? balance + amount : balance

      list.push({
        id: `RCH-${Date.now().toString(36).toUpperCase()}-${i}`,
        date: formatDateTime(date),
        amount,
        currency: 'USD',
        paymentMethod: this.random.pick(paymentMethods),
        balanceBefore: Number((balance - amount).toFixed(2)),
        balanceAfter: Number(balance.toFixed(2)),
        status
      })
    }

    const start = (page - 1) * pageSize
    const totalAmount = list
      .filter(r => r.status === 'completed')
      .reduce((sum, r) => sum + r.amount, 0)

    return {
      list: list.slice(start, start + pageSize),
      total: list.length,
      totalAmount
    }
  }
}

// Export singleton instance
export const mockDataService = new MockDataService()

// Export SeededRandom for custom seeds
export { SeededRandom }
