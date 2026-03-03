/**
 * Developer Types
 * Types for developer/ISV management in Admin Portal
 */

// Developer account status
export type DeveloperStatus = 'active' | 'suspended' | 'banned' | 'pending'

// KYB review status
export type KYBStatus = 'approved' | 'pending' | 'rejected'

// UBO information
export interface UBOInfo {
  name: string
  idType: 'passport' | 'national_id'
  idNumber: string
  nationality: string
  phone: string
}

// Developer list item
export interface DeveloperItem {
  id: string
  legalName: string
  registrationNumber: string
  jurisdiction: string
  contactEmail: string
  status: DeveloperStatus
  kybStatus: KYBStatus
  createdAt: string
}

// Developer detail information
export interface DeveloperDetail extends DeveloperItem {
  contactPhone?: string
  website?: string
  kybReviewedBy?: string
  kybReviewedAt?: string
  dateOfIncorporation: string
  registeredAddress: string
  uboInfo: UBOInfo[]
  updatedAt?: string
}

// Developer list request parameters
export interface DevelopersRequest {
  page?: number
  pageSize?: number
  status?: DeveloperStatus
  kybStatus?: KYBStatus
}

// Developer list response
export interface DevelopersResponse {
  code: number
  data: {
    list: DeveloperItem[]
    total: number
    page: number
    pageSize: number
  }
  message?: string
}

// Developer detail response
export interface DeveloperDetailResponse {
  code: number
  data: DeveloperDetail
  message?: string
}

// Status mapping
export const developerStatusMap: Record<DeveloperStatus, string> = {
  active: 'Active',
  suspended: 'Suspended',
  banned: 'Banned',
  pending: 'Pending Review'
}

export const kybStatusMap: Record<KYBStatus, string> = {
  approved: 'Approved',
  pending: 'Pending Review',
  rejected: 'Rejected'
}
