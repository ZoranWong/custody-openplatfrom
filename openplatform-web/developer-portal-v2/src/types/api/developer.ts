// ISV Developer Types
export type ISVUserRole = 'owner' | 'developer'

export interface ISVUser {
  id: string
  isvDeveloperId: string
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
  email: string
  password: string
}

export interface AuthResponse {
  code: number
  message: string
  data?: {
    accessToken: string
    refreshToken?: string
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