import axios from 'axios'
import type { AxiosInstance } from 'axios'

// ============================================
// Health Statistics Types (B.3.3)
// ============================================

export interface HealthStatsSummary {
  overall: {
    status: 'healthy' | 'degraded' | 'down'
    lastCheck: string
    uptime: number
  }
  servicesCount: {
    healthy: number
    degraded: number
    down: number
    total: number
  }
}

export interface ServiceHealth {
  serviceId: string
  serviceName: string
  status: 'healthy' | 'degraded' | 'down'
  responseTime: {
    avg: number
    p50: number
    p95: number
    p99: number
  }
  errorRate: number
  lastCheck: string
}

export interface ResourceUsage {
  cpu: number
  memory: number
  disk: number
  network: {
    in: number
    out: number
  }
}

export interface HealthHistory {
  timestamp: string
  overallStatus: 'healthy' | 'degraded' | 'down'
  servicesHealthy: number
  servicesDegraded: number
  servicesDown: number
  cpu: number
  memory: number
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  trace_id?: string
}

// ============================================
// Health Statistics Service (B.3.3)
// ============================================

class HealthApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1/admin',
      withCredentials: true
    })
  }

  /**
   * Get overall health status
   */
  async getHealthStatus(): Promise<ApiResponse<HealthStatsSummary>> {
    const response = await this.client.get<ApiResponse<HealthStatsSummary>>('/health/status')
    return response.data
  }

  /**
   * Get service-level health status
   */
  async getServicesHealth(): Promise<ApiResponse<ServiceHealth[]>> {
    const response = await this.client.get<ApiResponse<ServiceHealth[]>>('/health/services')
    return response.data
  }

  /**
   * Get resource usage metrics
   */
  async getResourceUsage(): Promise<ApiResponse<ResourceUsage>> {
    const response = await this.client.get<ApiResponse<ResourceUsage>>('/health/resources')
    return response.data
  }

  /**
   * Get historical health data
   */
  async getHealthHistory(hours: number = 24): Promise<ApiResponse<HealthHistory[]>> {
    const response = await this.client.get<ApiResponse<HealthHistory[]>>('/health/history', {
      params: { hours }
    })
    return response.data
  }

  /**
   * Get specific service detail
   */
  async getServiceDetail(serviceId: string): Promise<ApiResponse<ServiceHealth>> {
    const response = await this.client.get<ApiResponse<ServiceHealth>>(`/health/service/${serviceId}`)
    return response.data
  }

  /**
   * Force refresh health data
   */
  async refreshHealthData(): Promise<ApiResponse<{
    summary: HealthStatsSummary
    services: ServiceHealth[]
    resources: ResourceUsage
  }>> {
    const response = await this.client.post<ApiResponse<any>>('/health/refresh')
    return response.data
  }
}

export const healthApiService = new HealthApiService()
