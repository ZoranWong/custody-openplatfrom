import axios from 'axios'
import type { AxiosInstance } from 'axios'

// ============================================
// API Statistics Types (B.3.1)
// ============================================

export interface APIStatsSummary {
  totalCalls: number
  todayCalls: number
  weekCalls: number
  monthCalls: number
  avgResponseTime: number
  p50ResponseTime: number
  p95ResponseTime: number
  p99ResponseTime: number
  errorRate: number
  lastUpdated: string
}

export interface ResponseTimeTrend {
  timestamp: string
  avg: number
  p50: number
  p95: number
  p99: number
}

export interface ErrorTrend {
  timestamp: string
  total: number
  byType: { [key: string]: number }
}

export interface APITopApp {
  appId: string
  appName: string
  calls: number
  errorRate: number
  avgResponseTime: number
}

export interface AppStatsDetail {
  appId: string
  appName: string
  totalCalls: number
  avgResponseTime: number
  errorRate: number
  errorBreakdown: { [key: string]: number }
  dailyTrend: {
    timestamp: string
    calls: number
    errors: number
  }[]
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  trace_id?: string
}

// ============================================
// API Statistics Service (B.3.1)
// ============================================

class APIStatsApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1/admin',
      withCredentials: true
    })
  }

  /**
   * Get API statistics summary
   */
  async getAPIStatsSummary(): Promise<ApiResponse<APIStatsSummary>> {
    const response = await this.client.get<ApiResponse<APIStatsSummary>>('/stats/api/summary')
    return response.data
  }

  /**
   * Get top applications by API usage
   */
  async getAPITopApps(limit: number = 10): Promise<ApiResponse<APITopApp[]>> {
    const response = await this.client.get<ApiResponse<APITopApp[]>>('/stats/api/top-apps', {
      params: { limit }
    })
    return response.data
  }

  /**
   * Get response time trends
   */
  async getAPIResponseTimeTrend(days: number = 7): Promise<ApiResponse<ResponseTimeTrend[]>> {
    const response = await this.client.get<ApiResponse<ResponseTimeTrend[]>>('/stats/api/response-times', {
      params: { days }
    })
    return response.data
  }

  /**
   * Get error rate trends with type breakdown
   */
  async getAPIErrorTrend(days: number = 7): Promise<ApiResponse<ErrorTrend[]>> {
    const response = await this.client.get<ApiResponse<ErrorTrend[]>>('/stats/api/errors', {
      params: { days }
    })
    return response.data
  }

  /**
   * Get detailed statistics for a specific application
   */
  async getAppStatsDetail(appId: string): Promise<ApiResponse<AppStatsDetail>> {
    const response = await this.client.get<ApiResponse<AppStatsDetail>>(`/stats/api/app/${appId}`)
    return response.data
  }

  /**
   * Record an API call with metrics
   */
  async recordAPICall(params: {
    success: boolean
    responseTimeMs: number
    errorType?: string
  }): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>('/stats/api/record', params)
    return response.data
  }

  /**
   * Export API statistics to CSV
   */
  async exportAPIStats(timeRange: string = '7d'): Promise<Blob> {
    const response = await this.client.get('/stats/api/export', {
      params: { timeRange },
      responseType: 'blob'
    })
    return response.data
  }
}

export const apiStatsApiService = new APIStatsApiService()
