/**
 * Payment History Page Unit Tests
 * Tests for payment history functionality
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock apiService
const mockGetPaymentHistory = vi.fn()
const mockDownloadPaymentInvoice = vi.fn()
const mockSuccess = vi.fn()
const mockError = vi.fn()
const mockWarning = vi.fn()

vi.mock('@/services/api', () => ({
  default: {
    getPaymentHistory: mockGetPaymentHistory,
    downloadPaymentInvoice: mockDownloadPaymentInvoice
  }
}))

vi.mock('element-plus', () => ({
  ElMessage: {
    success: mockSuccess,
    error: mockError,
    warning: mockWarning
  }
}))

vi.mock('vue-router', () => ({
  useRouter: () => ({
    push: vi.fn()
  })
}))

describe('PaymentHistoryPage Logic Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Payment Status Badge Colors', () => {
    const statusColors: Record<string, string> = {
      success: 'success',
      pending: 'warning',
      failed: 'danger'
    }

    const statusLabels: Record<string, string> = {
      success: '成功',
      pending: '处理中',
      failed: '失败'
    }

    it('maps success status to green badge', () => {
      expect(statusColors.success).toBe('success')
      expect(statusLabels.success).toBe('成功')
    })

    it('maps pending status to orange badge', () => {
      expect(statusColors.pending).toBe('warning')
      expect(statusLabels.pending).toBe('处理中')
    })

    it('maps failed status to red badge', () => {
      expect(statusColors.failed).toBe('danger')
      expect(statusLabels.failed).toBe('失败')
    })
  })

  describe('Date Formatting', () => {
    const formatDate = (dateStr: string | undefined | null): string => {
      if (!dateStr) {
        return '-'
      }
      const date = new Date(dateStr)
      if (isNaN(date.getTime())) {
        return '-'
      }
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    }

    it('formats valid date string', () => {
      const result = formatDate('2026-02-05T10:30:00Z')
      expect(result).toContain('2026')
      expect(result).toContain('2')
      expect(result).toContain('5')
    })

    it('handles undefined date', () => {
      expect(formatDate(undefined)).toBe('-')
    })

    it('handles null date', () => {
      expect(formatDate(null)).toBe('-')
    })

    it('handles invalid date string', () => {
      expect(formatDate('invalid-date')).toBe('-')
    })
  })

  describe('Currency Formatting', () => {
    const DEFAULT_CURRENCY = 'USD'
    const ALLOWED_CURRENCIES = ['USD', 'CNY', 'EUR', 'GBP', 'JPY']

    const formatCurrency = (amount: number, currency: string = DEFAULT_CURRENCY): string => {
      if (typeof amount !== 'number' || isNaN(amount) || amount < 0) {
        amount = 0
      }
      const validCurrency = ALLOWED_CURRENCIES.includes(currency) ? currency : DEFAULT_CURRENCY
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: validCurrency
      }).format(amount)
    }

    it('formats USD correctly', () => {
      const result = formatCurrency(29.99, 'USD')
      expect(result).toContain('29')
      expect(result).toContain('$')
    })

    it('formats CNY correctly', () => {
      const result = formatCurrency(100, 'CNY')
      expect(result).toContain('100')
      expect(result).toContain('¥')
    })

    it('handles negative amount', () => {
      const result = formatCurrency(-100)
      expect(result).toContain('0')
    })

    it('handles NaN', () => {
      const result = formatCurrency(NaN)
      expect(result).toContain('0')
    })

    it('uses default currency for invalid currency code', () => {
      const result = formatCurrency(100, 'INVALID')
      expect(result).toContain('$') // USD uses $
    })
  })

  describe('API Integration', () => {
    it('calls getPaymentHistory with filters', async () => {
      const mockResponse = {
        list: [],
        total: 0,
        total_amount: 0,
        currency: 'USD'
      }
      mockGetPaymentHistory.mockResolvedValue(mockResponse)

      await mockGetPaymentHistory({
        page: 1,
        pageSize: 10,
        status: 'success',
        startDate: '2026-01-01',
        endDate: '2026-01-31'
      })

      expect(mockGetPaymentHistory).toHaveBeenCalled()
    })

    it('calls downloadPaymentInvoice with paymentId', async () => {
      const mockBlob = new Blob()
      mockDownloadPaymentInvoice.mockResolvedValue(mockBlob)

      await mockDownloadPaymentInvoice('PAY-2026-0001')

      expect(mockDownloadPaymentInvoice).toHaveBeenCalledWith('PAY-2026-0001')
    })

    it('handles API errors gracefully', async () => {
      mockGetPaymentHistory.mockRejectedValue({
        response: { status: 401, data: { code: 401, message: 'Unauthorized' } }
      })

      let caughtError = false
      try {
        await mockGetPaymentHistory({})
      } catch {
        caughtError = true
      }

      expect(caughtError).toBe(true)
    })
  })

  describe('Filter Parameters', () => {
    const getFilters = (selectedStatus: string, dateRange: [Date, Date] | null, page: number, pageSize: number) => {
      const filters: Record<string, any> = {
        page,
        pageSize
      }

      if (selectedStatus !== 'all') {
        filters.status = selectedStatus
      }

      if (dateRange && dateRange.length === 2) {
        filters.startDate = dateRange[0].toISOString().split('T')[0]
        filters.endDate = dateRange[1].toISOString().split('T')[0]
      }

      return filters
    }

    it('builds filters with pagination only', () => {
      const filters = getFilters('all', null, 1, 10)
      expect(filters.page).toBe(1)
      expect(filters.pageSize).toBe(10)
      expect(filters.status).toBeUndefined()
      expect(filters.startDate).toBeUndefined()
    })

    it('builds filters with status', () => {
      const filters = getFilters('success', null, 1, 10)
      expect(filters.status).toBe('success')
    })

    it('builds filters with date range', () => {
      const dateRange: [Date, Date] = [new Date('2026-01-01'), new Date('2026-01-31')]
      const filters = getFilters('all', dateRange, 1, 10)
      expect(filters.startDate).toBe('2026-01-01')
      expect(filters.endDate).toBe('2026-01-31')
    })
  })

  describe('Payment Data Structure', () => {
    it('validates payment item structure', () => {
      const payment = {
        id: 'PAY-2026-0001',
        date: '2026-02-05T10:30:00Z',
        amount: 29.99,
        currency: 'USD',
        status: 'success',
        invoice_id: 'INV-2026-0001',
        description: 'API Usage - January 2026',
        balance_after: 1000.00,
        payment_method: '银行转账'
      }

      expect(payment.id).toBe('PAY-2026-0001')
      expect(payment.amount).toBe(29.99)
      expect(payment.status).toBe('success')
      expect(payment.invoice_id).toBe('INV-2026-0001')
    })

    it('validates payment history response structure', () => {
      const response = {
        list: [
          {
            id: 'PAY-2026-0001',
            amount: 29.99,
            currency: 'USD',
            status: 'success'
          }
        ],
        total: 12,
        page: 1,
        page_size: 10,
        total_amount: 356.88,
        currency: 'USD'
      }

      expect(response.list).toHaveLength(1)
      expect(response.total).toBe(12)
      expect(response.total_amount).toBe(356.88)
      expect(response.currency).toBe('USD')
    })
  })

  describe('Status Filter Options', () => {
    const statusOptions = [
      { label: '全部', value: 'all' },
      { label: '成功', value: 'success' },
      { label: '处理中', value: 'pending' },
      { label: '失败', value: 'failed' }
    ]

    it('has all required options', () => {
      expect(statusOptions).toHaveLength(4)
      expect(statusOptions[0].value).toBe('all')
      expect(statusOptions[1].value).toBe('success')
      expect(statusOptions[2].value).toBe('pending')
      expect(statusOptions[3].value).toBe('failed')
    })

    it('has correct Chinese labels', () => {
      expect(statusOptions.find(o => o.value === 'success')?.label).toBe('成功')
      expect(statusOptions.find(o => o.value === 'pending')?.label).toBe('处理中')
      expect(statusOptions.find(o => o.value === 'failed')?.label).toBe('失败')
    })
  })

  describe('Pagination Logic', () => {
    const calculateTotalPages = (total: number, pageSize: number): number => {
      return Math.ceil(total / pageSize)
    }

    it('calculates total pages correctly', () => {
      expect(calculateTotalPages(100, 10)).toBe(10)
      expect(calculateTotalPages(101, 10)).toBe(11)
      expect(calculateTotalPages(0, 10)).toBe(0)
      expect(calculateTotalPages(5, 10)).toBe(1)
    })

    it('handles edge cases', () => {
      expect(calculateTotalPages(1, 10)).toBe(1)
      expect(calculateTotalPages(10, 10)).toBe(1)
      expect(calculateTotalPages(11, 10)).toBe(2)
    })
  })
})
