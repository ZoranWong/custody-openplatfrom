import axios from 'axios'
import type { AxiosInstance } from 'axios'

// ============================================
// ISV Status Types
// ============================================

export enum ISVStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

export interface ISVStatusHistoryItem {
  id: string
  isvId: string
  previousStatus: ISVStatus
  newStatus: ISVStatus
  adminId: string
  reason?: string
  timestamp: string
}

export interface ISVStatusResponse {
  id: string
  developerId: string
  companyName: string
  email: string
  status: ISVStatus
  kybStatus: string
  createdAt: string
  updatedAt: string
  statusHistory: ISVStatusHistoryItem[]
}

export interface ApiResponse<T> {
  code: number
  message: string
  data: T
  trace_id?: string
}

// ============================================
// ISV Status API Service
// ============================================

class ISVStatusApiService {
  private client: AxiosInstance

  constructor() {
    this.client = axios.create({
      baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1/admin',
      withCredentials: true
    })
  }

  /**
   * Get ISV status details
   */
  async getISVStatus(id: string): Promise<ApiResponse<ISVStatusResponse>> {
    const response = await this.client.get<ApiResponse<ISVStatusResponse>>(`/isv/${id}/status`)
    return response.data
  }

  /**
   * Activate ISV (change from suspended/banned to active)
   */
  async activateISV(id: string, reason?: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(`/isv/${id}/activate`, { reason })
    return response.data
  }

  /**
   * Suspend ISV (change from active to suspended)
   */
  async suspendISV(id: string, reason?: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(`/isv/${id}/suspend`, { reason })
    return response.data
  }

  /**
   * Ban ISV (change from active/suspended to banned - requires reason)
   */
  async banISV(id: string, reason: string): Promise<ApiResponse<void>> {
    const response = await this.client.post<ApiResponse<void>>(`/isv/${id}/ban`, { reason })
    return response.data
  }

  /**
   * Get ISV status history
   */
  async getISVStatusHistory(id: string): Promise<ApiResponse<ISVStatusHistoryItem[]>> {
    const response = await this.client.get<ApiResponse<ISVStatusHistoryItem[]>>(`/isv/${id}/status/history`)
    return response.data
  }
}

export const isvStatusApiService = new ISVStatusApiService()
