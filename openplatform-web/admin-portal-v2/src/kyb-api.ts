import axios from 'axios'
import type { AxiosInstance } from 'axios'

// ============================================
// KYB Review Types
// ============================================

export enum KYBStatus {
  PENDING = 'pending',
  PENDING_INFO = 'pending_info',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

export interface UBOInfo {
  name: string
  idType: 'passport' | 'national_id'
  idNumber: string
  nationality: string
  phone: string
  documentUrl?: string
}

export interface CompanyStructure {
  entityName: string
  relationship: string
  ownershipPercentage: number
}

export interface ContactInfo {
  name: string
  email: string
  phone: string
  position: string
}

export interface KYBAuditEntry {
  id: string
  timestamp: string
  adminId: string
  action: string
  details?: string
}

export interface KYBApplication {
  id: string
  developerId: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  dateOfIncorporation: string
  registeredAddress: string
  website?: string
  businessLicenseUrl: string
  uboInfo: UBOInfo[]
  companyStructure: CompanyStructure[]
  contactInfo: ContactInfo
  submittedAt: string
  status: KYBStatus
  reviewerId?: string
  reviewerComment?: string
  reviewedAt?: string
  auditTrail: KYBAuditEntry[]
}

export interface KYBPendingItem {
  id: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  submittedAt: string
  status: KYBStatus
}

export interface KYBPaginationParams {
  page?: number
  limit?: number
}

export interface KYBPaginatedResponse<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface KYBStats {
  pending: number
  approved: number
  rejected: number
  pendingInfo: number
}

export interface ReviewActionResponse {
  id: string
  status: KYBStatus
  reviewedAt: string
}

// ============================================
// History Types
// ============================================

export interface KYBHistoryItem {
  id: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  reviewerId: string
  decision: KYBStatus
  comments?: string
  reviewedAt: string
  submittedAt: string
}

export interface HistoryFilters {
  status?: KYBStatus
  startDate?: string
  endDate?: string
  search?: string
  page?: number
  limit?: number
  sortBy?: 'reviewedAt' | 'submittedAt'
  sortOrder?: 'asc' | 'desc'
}

export interface KYBApiResponse<T> {
  code: number
  message: string
  data?: T
  trace_id?: string
}

// ============================================
// API Service
// ============================================

class KYBApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1/admin',
      withCredentials: true
    })
  }

  /**
   * Get list of pending KYB applications
   */
  async getPendingApplications(): Promise<KYBApiResponse<KYBPendingItem[]>> {
    const response = await this.client.get<KYBApiResponse<KYBPendingItem[]>>('/kyb/pending')
    return response.data
  }

  /**
   * Get all KYB applications (with optional status filter and pagination)
   */
  async getAllApplications(
    status?: KYBStatus,
    pagination?: KYBPaginationParams
  ): Promise<KYBApiResponse<KYBPaginatedResponse<KYBPendingItem>>> {
    const params: Record<string, string | number> = {}
    if (status) params.status = status
    if (pagination?.page) params.page = pagination.page
    if (pagination?.limit) params.limit = pagination.limit
    const response = await this.client.get<KYBApiResponse<KYBPaginatedResponse<KYBPendingItem>>>('/kyb', { params })
    return response.data
  }

  /**
   * Get KYB application details by ID
   */
  async getApplicationById(id: string): Promise<KYBApiResponse<KYBApplication>> {
    const response = await this.client.get<KYBApiResponse<KYBApplication>>(`/kyb/${id}`)
    return response.data
  }

  /**
   * Approve a KYB application
   */
  async approveApplication(id: string, comment?: string): Promise<KYBApiResponse<ReviewActionResponse>> {
    const response = await this.client.post<KYBApiResponse<ReviewActionResponse>>(`/kyb/${id}/approve`, {
      comment
    })
    return response.data
  }

  /**
   * Reject a KYB application (requires reason)
   */
  async rejectApplication(id: string, reason: string): Promise<KYBApiResponse<ReviewActionResponse>> {
    const response = await this.client.post<KYBApiResponse<ReviewActionResponse>>(`/kyb/${id}/reject`, {
      comment: reason
    })
    return response.data
  }

  /**
   * Request additional information
   */
  async requestInfo(id: string, comment: string): Promise<KYBApiResponse<ReviewActionResponse>> {
    const response = await this.client.post<KYBApiResponse<ReviewActionResponse>>(`/kyb/${id}/request-info`, {
      comment
    })
    return response.data
  }

  /**
   * Get KYB statistics
   */
  async getStats(): Promise<KYBApiResponse<KYBStats>> {
    const response = await this.client.get<KYBApiResponse<KYBStats>>('/kyb/stats')
    return response.data
  }

  /**
   * Get KYB history applications with filters
   */
  async getHistoryApplications(
    filters?: HistoryFilters
  ): Promise<KYBApiResponse<KYBPaginatedResponse<KYBHistoryItem>>> {
    const params: Record<string, string | number> = {}
    if (filters?.status) params.status = filters.status
    if (filters?.startDate) params.startDate = filters.startDate
    if (filters?.endDate) params.endDate = filters.endDate
    if (filters?.search) params.search = filters.search
    if (filters?.page) params.page = filters.page
    if (filters?.limit) params.limit = filters.limit
    if (filters?.sortBy) params.sortBy = filters.sortBy
    if (filters?.sortOrder) params.sortOrder = filters.sortOrder

    const response = await this.client.get<KYBApiResponse<KYBPaginatedResponse<KYBHistoryItem>>>('/kyb/history', { params })
    return response.data
  }

  /**
   * Get KYB history application detail
   */
  async getHistoryApplicationById(id: string): Promise<KYBApiResponse<KYBApplication>> {
    const response = await this.client.get<KYBApiResponse<KYBApplication>>(`/kyb/history/${id}`)
    return response.data
  }
}

export const kybApiService = new KYBApiService()
