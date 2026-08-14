import axios, { AxiosInstance, AxiosError } from 'axios'

// ============================================
// Developer Types
// ============================================
import type {
  DevelopersResponse,
  DeveloperDetailResponse
} from '@/types/developer'

// ============================================
// Dashboard Types
// ============================================

export interface DashboardStats {
  totalDevelopers: number
  totalApplications: number
  pendingKYBReviews: number
  apiCalls: {
    today: number
    thisWeek: number
    thisMonth: number
  }
  errorRate: number
  lastUpdated: string
}

export interface TrendData {
  timestamp: string
  value: number
}

export interface DashboardTrends {
  apiCalls: TrendData[]
  errorRate: TrendData[]
}

export interface DeveloperStats {
  total: number
  active: number
  pending: number
  suspended: number
}

export interface ApplicationStats {
  total: number
  active: number
  pendingReview: number
  suspended: number
}

export interface TopApplication {
  appId: string
  appName: string
  calls: number
  errorRate: number
}

export interface DashboardDetails {
  developers: DeveloperStats
  applications: ApplicationStats
  topApplications: TopApplication[]
}

export interface DashboardHealth {
  status: 'healthy' | 'degraded' | 'unhealthy'
  services: Record<string, { status: string; latency: number }>
}

export interface DashboardApiResponse<T> {
  code: number
  message: string
  data?: T
  trace_id?: string
}
export interface AdminLoginParams {
  email: string
  password: string
}

export interface AdminUser {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'operator'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
}

export interface AuthResponse {
  code: number
  message: string
  data?: {
    accessToken: string
    refreshToken: string
    user?: AdminUser
  }
  trace_id?: string
}

export interface RefreshTokenResponse {
  code: number
  message: string
  data?: {
    accessToken: string
    refreshToken: string
  }
}

export interface ChangePasswordParams {
  currentPassword: string
  newPassword: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

// Cookie helper functions
function getCookie(name: string): string | null {
  const value = `; ${document.cookie}`
  const parts = value.split(`; ${name}=`)
  if (parts.length === 2) {
    return parts.pop()?.split(';').shift() || null
  }
  return null
}

function deleteCookie(name: string): void {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`
}

class AdminApiService {
  private client: AxiosInstance
  private isRefreshing = false
  private refreshPromise: Promise<void> | null = null
  private failedRequests: Array<{ resolve: (token: string) => void; reject: (error: Error) => void }> = []

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Try Authorization header first
        const headerToken = localStorage.getItem('adminAccessToken')
        if (headerToken) {
          config.headers.Authorization = `Bearer ${headerToken}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor for 401 handling and token refresh (Task 4)
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any

        // Handle 401 errors for token refresh
        // Skip refresh for logout requests and auth requests to avoid loops
        if (error.response?.status === 401 &&
            originalRequest &&
            !originalRequest._retry &&
            !originalRequest.url?.includes('/auth/logout') &&
            !originalRequest.url?.includes('/auth/login') &&
            !originalRequest.url?.includes('/auth/refresh')) {
          originalRequest._retry = true

          // Check if we should attempt refresh
          const refreshToken = localStorage.getItem('adminRefreshToken') || getCookie('adminRefreshToken')
          if (!refreshToken) {
            this.handleLogout()
            return Promise.reject(new Error('No refresh token available'))
          }

          try {
            // Prevent multiple simultaneous refresh attempts - use queue pattern
            if (!this.isRefreshing) {
              this.isRefreshing = true

              // Create a promise that will be resolved when token is refreshed
              this.failedRequests.push({
                resolve: (_token: string) => { },
                reject: (_error: Error) => { }
              })

              this.refreshPromise = this.refreshAccessToken(refreshToken)

              // Wait for either refresh success or failure
              try {
                await this.refreshPromise
                // Refresh succeeded - resolve all waiting requests
                this.failedRequests.forEach(({ resolve }) => resolve('refreshed'))
                this.failedRequests = []
              } catch (refreshError) {
                // Refresh failed - reject all waiting requests
                this.failedRequests.forEach(({ reject }) => reject(refreshError as Error))
                this.failedRequests = []
                throw refreshError
              } finally {
                this.isRefreshing = false
                this.refreshPromise = null
              }
            } else {
              // Another request is already refreshing - queue this request
              await this.refreshPromise
            }

            // Retry the original request with new token
            const newToken = localStorage.getItem('adminAccessToken')
            if (newToken) {
              originalRequest.headers.Authorization = `Bearer ${newToken}`
            }
            return this.client(originalRequest)
          } catch (refreshError) {
            this.handleLogout()
            return Promise.reject(refreshError)
          }
        }

        return Promise.reject(error)
      }
    )
  }

  // ============================================
  // Token Refresh (Task 4 - Subtask 4.1)
  // ============================================
  private async refreshAccessToken(refreshToken: string): Promise<void> {
    try {
      const response = await axios.post<RefreshTokenResponse>(
        `${API_BASE_URL}/admin/auth/refresh`,
        { refreshToken },
        { withCredentials: true }
      )

      if (response.data.code === 0 && response.data.data) {
        // Store new tokens
        localStorage.setItem('adminAccessToken', response.data.data.accessToken)
        localStorage.setItem('adminRefreshToken', response.data.data.refreshToken)
      } else {
        throw new Error(response.data.message || 'Token refresh failed')
      }
    } catch (error) {
      console.error('Token refresh failed:', error)
      // Don't throw here - let the interceptor handle 401
      throw error
    }
  }

  // Handle logout on token refresh failure (Task 4 - Subtask 4.4)
  private handleLogout(): void {
    localStorage.removeItem('adminAccessToken')
    localStorage.removeItem('adminRefreshToken')
    deleteCookie('adminAccessToken')
    deleteCookie('adminRefreshToken')
    window.location.href = '/login'
  }

  // ============================================
  // Admin Auth APIs
  // ============================================
  async adminLogin(data: AdminLoginParams): Promise<AuthResponse> {
    const response = await this.client.post<AuthResponse>('/admin/auth/login', data, {
      withCredentials: true
    })

    // response.data is { code, message, data: { accessToken, refreshToken, user }, trace_id }
    const responseData = response.data
    if (responseData.data?.accessToken) {
      localStorage.setItem('adminAccessToken', responseData.data.accessToken)
      localStorage.setItem('adminRefreshToken', responseData.data.refreshToken)
    }

    // Return the full response object
    return responseData
  }

  async adminRefreshToken(): Promise<RefreshTokenResponse> {
    const refreshToken = localStorage.getItem('adminRefreshToken')
    const response = await this.client.post<RefreshTokenResponse>(
      '/admin/auth/refresh',
      { refreshToken },
      { withCredentials: true }
    )

    if (response.data.data?.accessToken) {
      localStorage.setItem('adminAccessToken', response.data.data.accessToken)
      localStorage.setItem('adminRefreshToken', response.data.data.refreshToken)
    }

    return response.data
  }

  // Alias for auth store
  async refreshAdminToken(): Promise<RefreshTokenResponse> {
    return this.adminRefreshToken()
  }

  async adminLogout(): Promise<void> {
    try {
      await this.client.post('/admin/auth/logout', {}, { withCredentials: true })
    } finally {
      this.handleLogout()
    }
  }

  async changePassword(data: ChangePasswordParams): Promise<{ code: number; message: string }> {
    const response = await this.client.post('/admin/auth/change-password', data, {
      withCredentials: true
    })
    return response.data
  }

  async getAdminProfile(): Promise<{ code: number; data: AdminUser }> {
    const response = await this.client.get('/admin/profile')
    return response.data
  }

  // ============================================
  // Dashboard APIs
  // ============================================

  async getDashboardStats(): Promise<DashboardApiResponse<DashboardStats>> {
    const response = await this.client.get<DashboardApiResponse<DashboardStats>>('/admin/dashboard/stats')
    return response.data
  }

  async getDashboardTrends(days: number = 7): Promise<DashboardApiResponse<DashboardTrends>> {
    const response = await this.client.get<DashboardApiResponse<DashboardTrends>>('/admin/dashboard/trends', {
      params: { days }
    })
    return response.data
  }

  async getDashboardDetails(): Promise<DashboardApiResponse<DashboardDetails>> {
    const response = await this.client.get<DashboardApiResponse<DashboardDetails>>('/admin/dashboard/details')
    return response.data
  }

  async refreshDashboardStats(): Promise<DashboardApiResponse<null>> {
    const response = await this.client.post<DashboardApiResponse<null>>('/admin/dashboard/refresh')
    return response.data
  }

  async getDashboardHealth(): Promise<DashboardApiResponse<DashboardHealth>> {
    const response = await this.client.get<DashboardApiResponse<DashboardHealth>>('/admin/dashboard/health')
    return response.data
  }

  // ============================================
  // Developer APIs
  // ============================================

  async getDevelopers(params: {
    page?: number
    pageSize?: number
    status?: string
    kybStatus?: string
  }): Promise<DevelopersResponse> {
    const response = await this.client.get<DevelopersResponse>('/admin/developers', { params })
    return response.data
  }

  async getDeveloperById(id: string): Promise<DeveloperDetailResponse> {
    const response = await this.client.get<DeveloperDetailResponse>(`/admin/developers/${id}`)
    return response.data
  }

  async approveDeveloper(id: string): Promise<{ code: number; message: string }> {
    const response = await this.client.post<{ code: number; message: string }>(`/admin/developers/${id}/approve`)
    return response.data
  }

  async rejectDeveloper(id: string, reason: string): Promise<{ code: number; message: string }> {
    const response = await this.client.post<{ code: number; message: string }>(`/admin/developers/${id}/reject`, { reason })
    return response.data
  }

  async activateDeveloper(id: string): Promise<{ code: number; message: string }> {
    const response = await this.client.post<{ code: number; message: string }>(`/admin/developers/${id}/activate`)
    return response.data
  }

  async suspendDeveloper(id: string, reason?: string): Promise<{ code: number; message: string }> {
    const response = await this.client.post<{ code: number; message: string }>(`/admin/developers/${id}/suspend`, { reason })
    return response.data
  }

  async banDeveloper(id: string, reason: string): Promise<{ code: number; message: string }> {
    const response = await this.client.post<{ code: number; message: string }>(`/admin/developers/${id}/ban`, { reason })
    return response.data
  }

  async getDeveloperHistory(id: string): Promise<{ code: number; data: any[] }> {
    const response = await this.client.get<{ code: number; data: any[] }>(`/admin/developers/${id}/history`)
    return response.data
  }

  async getDeveloperStats(): Promise<{
    code: number
    data: {
      total: number
      byStatus: Record<string, number>
      byKYBStatus: Record<string, number>
      approvalRate: number
      pendingReview: number
    }
  }> {
    const response = await this.client.get<{
      code: number
      data: {
        total: number
        byStatus: Record<string, number>
        byKYBStatus: Record<string, number>
        approvalRate: number
        pendingReview: number
      }
    }>('/admin/developers/stats')
    return response.data
  }

  // ============================================
  // API Stats APIs
  // ============================================

  async getAPIStatsOverview(): Promise<{
    code: number
    data: {
      today: { calls: number; avgResponseTime: number; errorRate: number }
      thisWeek: { calls: number; avgResponseTime: number }
      thisMonth: { calls: number; avgResponseTime: number }
      uniqueEndpoints: number
    }
  }> {
    const response = await this.client.get<{
      code: number
      data: {
        today: { calls: number; avgResponseTime: number; errorRate: number }
        thisWeek: { calls: number; avgResponseTime: number }
        thisMonth: { calls: number; avgResponseTime: number }
        uniqueEndpoints: number
      }
    }>('/admin/stats/api/overview')
    return response.data
  }

  async getAPITopApps(limit?: number): Promise<{
    code: number
    data: { appId: string; appName: string; calls: number; errorRate: number }[]
  }> {
    const response = await this.client.get<{
      code: number
      data: { appId: string; appName: string; calls: number; errorRate: number }[]
    }>('/admin/stats/api/top-apps', { params: { limit } })
    return response.data
  }

  async getAPIResponseTimeTrend(days?: number): Promise<{
    code: number
    data: { date: string; avgResponseTime: number }[]
  }> {
    const response = await this.client.get<{
      code: number
      data: { date: string; avgResponseTime: number }[]
    }>('/admin/stats/api/response-time', { params: { days } })
    return response.data
  }

  async getAPIErrorRateTrend(days?: number): Promise<{
    code: number
    data: { date: string; errorRate: number }[]
  }> {
    const response = await this.client.get<{
      code: number
      data: { date: string; errorRate: number }[]
    }>('/admin/stats/api/error-rate', { params: { days } })
    return response.data
  }

  async getAPIStatsByEndpoint(): Promise<{
    code: number
    data: { endpoint: string; totalCalls: number; avgResponseTime: number; errorRate: number }[]
  }> {
    const response = await this.client.get<{
      code: number
      data: { endpoint: string; totalCalls: number; avgResponseTime: number; errorRate: number }[]
    }>('/admin/stats/api/by-endpoint')
    return response.data
  }
}

export const apiService = new AdminApiService()
export default apiService
