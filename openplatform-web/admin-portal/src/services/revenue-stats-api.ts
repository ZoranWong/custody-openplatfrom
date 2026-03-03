import axios from 'axios'
import type { AxiosInstance } from 'axios'

// ============================================
// Revenue Statistics Types (B.3.2)
// ============================================

// Service type constants
export const SERVICE_TYPE_API_CALLS = 'api_calls'
export const SERVICE_TYPE_TRANSACTION_FEES = 'transaction_fees'
export const SERVICE_TYPE_SUBSCRIPTION = 'subscription'

export interface RevenueStatsSummary {
  todayRevenue: number
  weekRevenue: number
  monthRevenue: number
  todayGrowth: number
  weekGrowth: number
  monthGrowth: number
  totalRevenue: number
  lastUpdated: string
}

export interface RevenueByDeveloper {
  developerId: string
  developerName: string
  revenue: number
  transactionCount: number
  avgFeeRate: number
  serviceTypes: {
    api_calls: number
    transaction_fees: number
    subscription: number
  }
}

export interface RevenueTrend {
  timestamp: string
  revenue: number
  transactionCount: number
  avgFee: number
}

export interface RevenueForecast {
  date: string
  predictedRevenue: number
  lowerBound: number
  upperBound: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  trace_id?: string
}

// ============================================
// Revenue Statistics Service (B.3.2)
// ============================================

class RevenueStatsApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1/admin',
      withCredentials: true
    })
  }

  /**
   * Get revenue statistics summary
   */
  async getRevenueSummary(): Promise<ApiResponse<RevenueStatsSummary>> {
    const response = await this.client.get<ApiResponse<RevenueStatsSummary>>('/stats/revenue/summary')
    return response.data
  }

  /**
   * Get revenue breakdown by developer
   */
  async getRevenueByDeveloper(limit: number = 10, timeRange: string = '7d'): Promise<ApiResponse<RevenueByDeveloper[]>> {
    const response = await this.client.get<ApiResponse<RevenueByDeveloper[]>>('/stats/revenue/by-developer', {
      params: { limit, timeRange }
    })
    return response.data
  }

  /**
   * Get revenue trends
   */
  async getRevenueTrend(days: number = 7): Promise<ApiResponse<RevenueTrend[]>> {
    const response = await this.client.get<ApiResponse<RevenueTrend[]>>('/stats/revenue/trends', {
      params: { days }
    })
    return response.data
  }

  /**
   * Get revenue forecast
   */
  async getRevenueForecast(days: number = 7): Promise<ApiResponse<RevenueForecast[]>> {
    const response = await this.client.get<ApiResponse<RevenueForecast[]>>('/stats/revenue/forecast', {
      params: { days }
    })
    return response.data
  }

  /**
   * Get developer revenue detail
   */
  async getDeveloperRevenueDetail(developerId: string): Promise<ApiResponse<RevenueByDeveloper>> {
    const response = await this.client.get<ApiResponse<RevenueByDeveloper>>(`/stats/revenue/developer/${developerId}`)
    return response.data
  }

  /**
   * Export revenue statistics to CSV
   */
  async exportRevenueStats(timeRange: string = '7d'): Promise<Blob> {
    const response = await this.client.get('/stats/revenue/export', {
      params: { timeRange },
      responseType: 'blob'
    })
    return response.data
  }
}

export const revenueStatsApiService = new RevenueStatsApiService()
