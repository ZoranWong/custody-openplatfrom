import axios, { AxiosInstance } from 'axios'

// ISV User Types (matches backend)
export type ISVUserRole = 'owner' | 'developer'

export interface ISVUser {
  id: string
  isvId: string
  email: string
  name: string
  phone?: string
  role: ISVUserRole
  status: 'active' | 'inactive' | 'suspended'
  allowedApplications: string[]
  createdAt: string
  updatedAt: string
}

export interface ISVInfo {
  id: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  dateOfIncorporation: string
  registeredAddress: string
  website?: string
  kybStatus: 'pending' | 'approved' | 'rejected'
  status: 'active' | 'suspended' | 'banned'
  uboInfo: UBO[]
  createdAt: string
  updatedAt: string
}

// Application Types
export interface ApplicationApiUsage {
  totalCalls: number
  last30Days: number
  successRate: number
}

export type ApplicationType = 'corporate' | 'payment' | 'custody'

export interface Application {
  id: string
  isvId: string
  name: string
  appId: string
  appSecret?: string
  type: ApplicationType
  status: 'pending_review' | 'active' | 'inactive' | 'suspended'
  description?: string
  callbackUrl?: string
  permittedUsers: string[]
  apiUsage?: ApplicationApiUsage
  createdAt: string
  updatedAt: string
}

// Application type config
export const applicationTypeConfig: Record<ApplicationType, { label: string; icon: string; color: string }> = {
  corporate: { label: 'Corporate Treasury', icon: 'OfficeBuilding', color: 'amber' },
  payment: { label: 'Payment Processing', icon: 'CreditCard', color: 'blue' },
  custody: { label: 'Individual Custody', icon: 'UserFilled', color: 'emerald' }
}

// UBO Types
export interface UBO {
  name: string
  idType: 'passport' | 'national_id'
  idNumber: string
  nationality: string
  phone: string
}

// Registration/Login Types
export interface RegisterParams {
  email: string
  password: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  dateOfIncorporation: string
  registeredAddress: string
  website?: string
  uboInfo: UBO[]
}

export interface LoginParams {
  isvId?: string  // Optional, for demo can use any ISV
  email: string
  password: string
}

export interface AuthResponse {
  code: number
  message: string
  data?: {
    accessToken: string
    user?: ISVUser
  }
}

export interface ISVAuthResponse {
  code: number
  message: string
  data?: {
    accessToken: string
    user?: ISVUser
  }
}

export interface ISVInfoResponse {
  code: number
  message: string
  data?: {
    isv: ISVInfo
  }
}

export interface ApplicationResponse {
  code: number
  message: string
  data?: {
    application: Application & { applicationSecret?: string }
  }
}

export interface ApplicationListResponse {
  code: number
  message: string
  data?: {
    list: (Application & { applicationSecret?: string })[]
    total: number
  }
}

export interface UserListResponse {
  code: number
  message: string
  data?: {
    list: ISVUser[]
    total: number
  }
}

// Legacy types for backward compatibility
export interface UserProfile {
  id: string
  email: string
  companyName: string
  status: 'pending' | 'approved' | 'rejected'
  kybStatus: 'pending' | 'approved' | 'rejected'
  createdAt: string
  updatedAt: string
}

export interface CreateAppParams {
  name: string
  description?: string
  callbackUrl?: string
}

export interface ListParams {
  page?: number
  pageSize?: number
  keyword?: string
}

export interface ListResponse<T> {
  list: T[]
  total: number
  page: number
  pageSize: number
}

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
}

export interface UsageStats {
  totalCalls: number
  successRate: number
  avgResponseTimeMs: number
  period: string
  dailyBreakdown: DailyUsage[]
  endpointBreakdown: EndpointUsage[]
  // Prepaid dimension fields
  treasuryUnits?: number
  addressCount?: number
  billingCost?: number
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
  date: string
  amount: number
  currency: string
  status: 'success' | 'pending' | 'failed'
  invoiceId: string
  description: string
}

export interface PaymentHistoryResponse {
  list: PaymentHistoryItem[]
  total: number
  page: number
  pageSize: number
  totalAmount: number
  currency: string
}

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api/v1'

class ApiService {
  private client: AxiosInstance

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
        const token = localStorage.getItem('accessToken')
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken')
          localStorage.removeItem('refreshToken')
          window.location.href = '/login'
        }
        return Promise.reject(error)
      }
    )
  }

  // ISV Auth APIs
  async register(data: RegisterParams): Promise<AuthResponse> {
    const response = await this.client.post('/isv/auth/register', data)
    if (response.data.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken)
    }
    return response.data
  }

  async login(data: LoginParams): Promise<AuthResponse> {
    const response = await this.client.post('/isv/auth/login', data)
    if (response.data.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken)
    }
    if (response.data.data?.refreshToken) {
      localStorage.setItem('refreshToken', response.data.data.refreshToken)
    }
    return response.data
  }

  async logout(): Promise<void> {
    try {
      await this.client.post('/isv/auth/logout')
    } finally {
      localStorage.removeItem('accessToken')
    }
  }

  // ISV User APIs
  async getISVProfile(): Promise<AuthResponse> {
    const response = await this.client.get('/isv/profile')
    return response.data
  }

  async updateISVProfile(data: Partial<ISVUser>): Promise<AuthResponse> {
    const response = await this.client.put('/isv/profile', data)
    return response.data
  }

  async getISVInfo(): Promise<ISVInfoResponse> {
    const response = await this.client.get('/isv/info')
    return response.data
  }

  // ISV Application APIs
  async getISVApplications(): Promise<ApplicationListResponse> {
    const response = await this.client.get('/isv/applications')
    return response.data
  }

  async getISVApplication(id: string): Promise<ApplicationResponse> {
    const response = await this.client.get(`/isv/applications/${id}`)
    return response.data
  }

  async createISVApplication(data: { name: string; description?: string; callbackUrl?: string; type: 'corporate' | 'payment' | 'custody' }): Promise<ApplicationResponse> {
    const response = await this.client.post('/isv/applications', data)
    return response.data
  }

  async updateISVApplication(id: string, data: Partial<Application>): Promise<ApplicationResponse> {
    const response = await this.client.put(`/isv/applications/${id}`, data)
    return response.data
  }

  async deleteISVApplication(id: string): Promise<void> {
    await this.client.delete(`/isv/applications/${id}`)
  }

  async regenerateISVAppSecret(id: string): Promise<{ applicationSecret: string }> {
    const response = await this.client.post(`/isv/applications/${id}/regenerate-secret`)
    return response.data
  }

  async getISVUsers(): Promise<UserListResponse> {
    const response = await this.client.get('/isv/users')
    return response.data
  }

  async addISVUser(data: {
    email: string
    password: string
    name: string
    phone?: string
  }): Promise<{ user: ISVUser }> {
    const response = await this.client.post('/isv/users', data)
    return response.data
  }

  async updateISVApplicationPermissions(
    appId: string,
    userIds: string[]
  ): Promise<ApplicationResponse> {
    const response = await this.client.put(`/isv/applications/${appId}/permissions`, { userIds })
    return response.data
  }

  // Legacy Auth APIs (deprecated, use ISV versions)
  async _legacyLogin(data: LoginParams): Promise<AuthResponse> {
    const response = await this.client.post('/auth/login', data)
    if (response.data.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken)
      localStorage.setItem('refreshToken', response.data.data.refreshToken)
    }
    return response.data
  }

  async _legacyRefreshToken(): Promise<void> {
    const refreshToken = localStorage.getItem('refreshToken')
    if (!refreshToken) throw new Error('No refresh token')

    const response = await this.client.post('/auth/refresh', { refreshToken })
    if (response.data.data?.accessToken) {
      localStorage.setItem('accessToken', response.data.data.accessToken)
      localStorage.setItem('refreshToken', response.data.data.refreshToken)
    }
  }

  // User APIs
  async getProfile(): Promise<UserProfile> {
    const response = await this.client.get('/user/profile')
    return response.data
  }

  async updateProfile(data: Partial<UserProfile>): Promise<UserProfile> {
    const response = await this.client.put('/user/profile', data)
    return response.data
  }

  // Application APIs
  async createApplication(data: CreateAppParams): Promise<Application> {
    const response = await this.client.post('/applications', data)
    return response.data
  }

  async getApplications(params?: ListParams): Promise<ListResponse<Application>> {
    const response = await this.client.get('/applications', { params })
    return response.data
  }

  async getApplication(id: string): Promise<Application> {
    const response = await this.client.get(`/applications/${id}`)
    return response.data
  }

  async updateApplication(id: string, data: Partial<Application>): Promise<Application> {
    const response = await this.client.put(`/applications/${id}`, data)
    return response.data
  }

  async deleteApplication(id: string): Promise<void> {
    await this.client.delete(`/applications/${id}`)
  }

  async regenerateAppSecret(id: string): Promise<{ app_secret: string }> {
    const response = await this.client.post(`/applications/${id}/regenerate-secret`)
    return response.data
  }

  // Billing APIs
  async getUsageStats(period: PeriodType = '30days'): Promise<UsageStats> {
    const response = await this.client.get('/billing/usage', { params: { period } })
    return response.data
  }

  async getInvoices(params?: ListParams): Promise<ListResponse<Invoice>> {
    const response = await this.client.get('/billing/invoices', { params })
    return response.data
  }

  async getInvoice(id: string): Promise<Invoice> {
    const response = await this.client.get(`/billing/invoices/${id}`)
    return response.data
  }

  async getPaymentHistory(params?: PaymentHistoryParams): Promise<PaymentHistoryResponse> {
    const response = await this.client.get('/billing/payments', { params })
    return response.data
  }

  async downloadPaymentInvoice(paymentId: string): Promise<Blob> {
    // Validate payment ID format (basic validation)
    if (!paymentId || typeof paymentId !== 'string' || paymentId.trim().length === 0) {
      throw new Error('Invalid payment ID')
    }
    if (paymentId.length > 100) {
      throw new Error('Payment ID exceeds maximum length')
    }
    // Sanitize payment ID to prevent path traversal
    const sanitizedId = paymentId.replace(/[^a-zA-Z0-9\-_]/g, '')

    const response = await this.client.get(`/billing/payments/${sanitizedId}/invoice`, {
      responseType: 'blob'
    })
    return response.data
  }

  // Invoice Generation APIs
  async generateInvoice(params: GenerateInvoiceParams): Promise<InvoiceData> {
    const response = await this.client.post('/billing/invoice/generate', params)
    return response.data
  }

  async downloadInvoicePDF(invoiceId: string): Promise<Blob> {
    const response = await this.client.get(`/billing/invoice/${invoiceId}/download`, {
      responseType: 'blob'
    })
    return response.data
  }

  async getInvoiceHistory(params?: ListParams): Promise<InvoiceHistoryResponse> {
    const response = await this.client.get('/billing/invoice/history', { params })
    return response.data
  }

  // Password Reset APIs
  async forgotPassword(data: { email: string }): Promise<{ code: number; message: string }> {
    const response = await this.client.post('/isv/auth/forgot-password', data)
    return response.data
  }

  async resetPassword(data: { token: string; password: string }): Promise<{ code: number; message: string }> {
    const response = await this.client.post('/isv/auth/reset-password', data)
    return response.data
  }
}

export const apiService = new ApiService()
export default apiService
