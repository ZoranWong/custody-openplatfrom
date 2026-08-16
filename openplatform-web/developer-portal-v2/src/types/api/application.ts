// Application Types
export interface ApplicationApiUsage {
  totalCalls: number
  last30Days: number
  successRate: number
}

export type ApplicationType = 'corporate' | 'payment' | 'custody'

export interface Application {
  id: string
  isvDeveloperId: string
  appName?: string
  appDescription?: string
  appType?: ApplicationType
  appSecret?: string
  status: 'pending_review' | 'active' | 'inactive' | 'suspended'
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

export interface CreateAppParams {
  appName: string
  appDescription?: string
  appType?: ApplicationType
  callbackUrl?: string
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