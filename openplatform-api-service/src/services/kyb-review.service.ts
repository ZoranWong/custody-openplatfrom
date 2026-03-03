import { v4 as uuidv4 } from 'uuid'
import bcrypt from 'bcrypt'

// ============================================
// KYB Review Types
// ============================================

export enum KYBStatus {
  PENDING = 'pending',
  PENDING_INFO = 'pending_info',
  APPROVED = 'approved',
  REJECTED = 'rejected'
}

// ============================================
// ISV Status Types (for b-2-3 ISV Status Management)
// ============================================

export enum ISVStatus {
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  BANNED = 'banned'
}

// Developer account status (includes KYB state)
export enum DeveloperAccountStatus {
  PENDING_KYB = 'pending_kyb',
  PENDING_REVIEW = 'pending_review',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  SUSPENDED = 'suspended'
}

export interface ISVAccount {
  id: string
  developerId: string
  companyName: string
  email: string
  status: ISVStatus
  kybStatus: KYBStatus
  createdAt: string
  updatedAt: string
  statusHistory: ISVStatusHistoryItem[]
}

// Developer with authentication fields
export interface DeveloperAccount extends ISVAccount {
  password?: string  // Hashed password
  creditCode?: string
  website?: string
  industry?: string
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

export interface ISVStatusAction {
  status: ISVStatus
  reason?: string
}

// ============================================
// KYB Application Types
// ============================================

export interface KYBApplication {
  id: string
  developerId: string
  companyName: string
  registrationNumber: string
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

export interface UBOInfo {
  name: string
  nationality: string
  ownershipPercentage: number
  position: string
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

export interface KYBReviewAction {
  status: KYBStatus
  comment?: string
}

// ============================================
// History Query Types
// ============================================

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

export interface KYBHistoryItem {
  id: string
  companyName: string
  reviewerId: string
  decision: KYBStatus
  comments?: string
  reviewedAt: string
  submittedAt: string
}

// ============================================
// In-Memory Store (for demo - replace with DB in production)
// ============================================

interface KYBStore {
  applications: Map<string, KYBApplication>
  isvAccounts: Map<string, ISVAccount>
}

// Singleton store instance
const kybStore: KYBStore = {
  applications: new Map(),
  isvAccounts: new Map()
}

// Initialize with sample data
function initSampleData(): void {
  if (kybStore.applications.size > 0) return

  const sampleApps: KYBApplication[] = [
    {
      id: uuidv4(),
      developerId: 'dev-001',
      companyName: 'TechCorp Solutions',
      registrationNumber: 'REG-2024-001234',
      businessLicenseUrl: '/documents/license-001.pdf',
      uboInfo: [
        { name: 'John Smith', nationality: 'US', ownershipPercentage: 35, position: 'CEO' },
        { name: 'Jane Doe', nationality: 'UK', ownershipPercentage: 25, position: 'CTO' }
      ],
      companyStructure: [
        { entityName: 'TechCorp Holdings', relationship: 'Parent', ownershipPercentage: 100 }
      ],
      contactInfo: {
        name: 'John Smith',
        email: 'john@techcorp.com',
        phone: '+1-555-0100',
        position: 'CEO'
      },
      submittedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: KYBStatus.PENDING,
      auditTrail: [
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
          adminId: 'system',
          action: 'SUBMITTED',
          details: 'KYB application submitted'
        }
      ]
    },
    {
      id: uuidv4(),
      developerId: 'dev-002',
      companyName: 'GlobalPay Inc',
      registrationNumber: 'REG-2024-005678',
      businessLicenseUrl: '/documents/license-002.pdf',
      uboInfo: [
        { name: 'Li Wei', nationality: 'CN', ownershipPercentage: 45, position: 'Founder' },
        { name: 'Zhang Min', nationality: 'CN', ownershipPercentage: 30, position: 'COO' }
      ],
      companyStructure: [
        { entityName: 'GlobalPay HK', relationship: 'Subsidiary', ownershipPercentage: 60 }
      ],
      contactInfo: {
        name: 'Li Wei',
        email: 'liwei@globalpay.com',
        phone: '+852-5550-1000',
        position: 'Founder'
      },
      submittedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      status: KYBStatus.PENDING_INFO,
      reviewerId: 'admin-001',
      reviewerComment: 'Please provide additional shareholder documents',
      reviewedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      auditTrail: [
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
          adminId: 'system',
          action: 'SUBMITTED',
          details: 'KYB application submitted'
        },
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
          adminId: 'admin-001',
          action: 'REQUEST_INFO',
          details: 'Please provide additional shareholder documents'
        }
      ]
    },
    {
      id: uuidv4(),
      developerId: 'dev-003',
      companyName: 'SecureFin Ltd',
      registrationNumber: 'REG-2024-009012',
      businessLicenseUrl: '/documents/license-003.pdf',
      uboInfo: [
        { name: 'Maria Garcia', nationality: 'ES', ownershipPercentage: 50, position: 'CEO' }
      ],
      companyStructure: [
        { entityName: 'SecureFin Group', relationship: 'Parent', ownershipPercentage: 100 }
      ],
      contactInfo: {
        name: 'Maria Garcia',
        email: 'maria@securefin.eu',
        phone: '+34-555-0200',
        position: 'CEO'
      },
      submittedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: KYBStatus.APPROVED,
      reviewerId: 'admin-001',
      reviewerComment: 'All documents verified. Approved for platform access.',
      reviewedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      auditTrail: [
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          adminId: 'system',
          action: 'SUBMITTED',
          details: 'KYB application submitted'
        },
        {
          id: uuidv4(),
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
          adminId: 'admin-001',
          action: 'APPROVED',
          details: 'All documents verified. Approved for platform access.'
        }
      ]
    }
  ]

  sampleApps.forEach(app => {
    kybStore.applications.set(app.id, app)
  })
}

// Initialize on module load
initSampleData()

// ============================================
// KYB Review Service
// ============================================

export const kybReviewService = {
  /**
   * Get all pending KYB applications
   */
  getPendingApplications(): KYBApplication[] {
    return Array.from(kybStore.applications.values())
      .filter(app => app.status === KYBStatus.PENDING || app.status === KYBStatus.PENDING_INFO)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  },

  /**
   * Get all applications (for list view)
   */
  getAllApplications(): KYBApplication[] {
    return Array.from(kybStore.applications.values())
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
  },

  /**
   * Get KYB application by ID
   */
  getApplicationById(id: string): KYBApplication | null {
    return kybStore.applications.get(id) || null
  },

  /**
   * Review KYB application (approve/reject/request_info)
   */
  reviewApplication(
    id: string,
    adminId: string,
    action: KYBReviewAction
  ): { success: boolean; application?: KYBApplication; error?: string } {
    const application = kybStore.applications.get(id)

    if (!application) {
      return { success: false, error: 'Application not found' }
    }

    // Validate state transition
    if (application.status === KYBStatus.APPROVED || application.status === KYBStatus.REJECTED) {
      return { success: false, error: 'Cannot review an application that has already been finalized' }
    }

    // Update application
    application.status = action.status
    application.reviewerId = adminId
    application.reviewerComment = action.comment || undefined
    application.reviewedAt = new Date().toISOString()

    // Add audit entry
    const auditEntry: KYBAuditEntry = {
      id: uuidv4(),
      timestamp: new Date().toISOString(),
      adminId,
      action: this.getActionFromStatus(action.status),
      details: action.comment
    }
    application.auditTrail.push(auditEntry)

    return { success: true, application }
  },

  /**
   * Get action string from status
   */
  getActionFromStatus(status: KYBStatus): string {
    switch (status) {
      case KYBStatus.APPROVED:
        return 'APPROVED'
      case KYBStatus.REJECTED:
        return 'REJECTED'
      case KYBStatus.PENDING_INFO:
        return 'REQUEST_INFO'
      default:
        return 'STATUS_CHANGE'
    }
  },

  /**
   * Get statistics
   */
  getStats(): { pending: number; approved: number; rejected: number; pendingInfo: number } {
    const apps = Array.from(kybStore.applications.values())
    return {
      pending: apps.filter(a => a.status === KYBStatus.PENDING).length,
      approved: apps.filter(a => a.status === KYBStatus.APPROVED).length,
      rejected: apps.filter(a => a.status === KYBStatus.REJECTED).length,
      pendingInfo: apps.filter(a => a.status === KYBStatus.PENDING_INFO).length
    }
  },

  /**
   * Get history applications with filters (for reviewed KYB applications)
   */
  getHistoryApplications(filters: HistoryFilters): { items: KYBHistoryItem[]; total: number } {
    let apps = Array.from(kybStore.applications.values())

    // Only include finalized applications (not pending)
    apps = apps.filter(app =>
      app.status === KYBStatus.APPROVED ||
      app.status === KYBStatus.REJECTED ||
      app.status === KYBStatus.PENDING_INFO
    )

    // Apply status filter
    if (filters.status) {
      apps = apps.filter(app => app.status === filters.status)
    }

    // Apply date range filter (based on reviewedAt)
    if (filters.startDate) {
      const startDate = new Date(filters.startDate)
      apps = apps.filter(app => {
        const reviewedAt = app.reviewedAt ? new Date(app.reviewedAt) : null
        return reviewedAt && reviewedAt >= startDate
      })
    }
    if (filters.endDate) {
      const endDate = new Date(filters.endDate)
      apps = apps.filter(app => {
        const reviewedAt = app.reviewedAt ? new Date(app.reviewedAt) : null
        return reviewedAt && reviewedAt <= endDate
      })
    }

    // Apply search filter (company name or reviewer ID)
    if (filters.search) {
      const query = filters.search.toLowerCase()
      apps = apps.filter(app =>
        app.companyName.toLowerCase().includes(query) ||
        app.reviewerId?.toLowerCase().includes(query)
      )
    }

    // Apply sorting
    const sortBy = filters.sortBy || 'reviewedAt'
    const sortOrder = filters.sortOrder || 'desc'

    apps.sort((a, b) => {
      const dateA = new Date(sortBy === 'submittedAt' ? a.submittedAt : (a.reviewedAt || a.submittedAt)).getTime()
      const dateB = new Date(sortBy === 'submittedAt' ? b.submittedAt : (b.reviewedAt || b.submittedAt)).getTime()
      return sortOrder === 'asc' ? dateA - dateB : dateB - dateA
    })

    // Map to history items
    const items: KYBHistoryItem[] = apps.map(app => ({
      id: app.id,
      companyName: app.companyName,
      reviewerId: app.reviewerId || 'unknown',
      decision: app.status,
      comments: app.reviewerComment,
      reviewedAt: app.reviewedAt || app.submittedAt,
      submittedAt: app.submittedAt
    }))

    return { items, total: items.length }
  },

  /**
   * Get history application by ID (for detail view)
   */
  getHistoryApplicationById(id: string): KYBApplication | null {
    const app = kybStore.applications.get(id)
    if (!app) return null

    // Only return if it's a finalized application
    if (app.status === KYBStatus.PENDING) return null

    return app
  },

  // ============================================
  // ISV Status Management Methods (b-2-3)
  // ============================================

  /**
   * Initialize ISV sample data
   */
  initISVData(): void {
    if (kybStore.isvAccounts.size > 0) return

    const sampleISVs: ISVAccount[] = [
      {
        id: 'isv-001',
        developerId: 'dev-001',
        companyName: 'TechCorp Solutions',
        email: 'john@techcorp.com',
        status: ISVStatus.ACTIVE,
        kybStatus: KYBStatus.APPROVED,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        statusHistory: [
          {
            id: uuidv4(),
            isvId: 'isv-001',
            previousStatus: ISVStatus.ACTIVE,
            newStatus: ISVStatus.ACTIVE,
            adminId: 'system',
            reason: 'Initial ISV account created',
            timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'isv-002',
        developerId: 'dev-002',
        companyName: 'GlobalPay Inc',
        email: 'liwei@globalpay.com',
        status: ISVStatus.SUSPENDED,
        kybStatus: KYBStatus.APPROVED,
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        statusHistory: [
          {
            id: uuidv4(),
            isvId: 'isv-002',
            previousStatus: ISVStatus.ACTIVE,
            newStatus: ISVStatus.ACTIVE,
            adminId: 'system',
            reason: 'Initial ISV account created',
            timestamp: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: uuidv4(),
            isvId: 'isv-002',
            previousStatus: ISVStatus.ACTIVE,
            newStatus: ISVStatus.SUSPENDED,
            adminId: 'admin-001',
            reason: 'Pending compliance review',
            timestamp: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      },
      {
        id: 'isv-003',
        developerId: 'dev-003',
        companyName: 'SecureFin Ltd',
        email: 'maria@securefin.eu',
        status: ISVStatus.BANNED,
        kybStatus: KYBStatus.REJECTED,
        createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        updatedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        statusHistory: [
          {
            id: uuidv4(),
            isvId: 'isv-003',
            previousStatus: ISVStatus.ACTIVE,
            newStatus: ISVStatus.ACTIVE,
            adminId: 'system',
            reason: 'Initial ISV account created',
            timestamp: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            id: uuidv4(),
            isvId: 'isv-003',
            previousStatus: ISVStatus.ACTIVE,
            newStatus: ISVStatus.BANNED,
            adminId: 'admin-001',
            reason: 'Violation of platform terms of service',
            timestamp: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      }
    ]

    sampleISVs.forEach(isv => {
      kybStore.isvAccounts.set(isv.id, isv)
    })
  },

  /**
   * Get ISV account by ID
   */
  getISVById(id: string): ISVAccount | null {
    this.initISVData()
    return kybStore.isvAccounts.get(id) || null
  },

  /**
   * Get all ISV accounts
   */
  getAllISVAccounts(): ISVAccount[] {
    this.initISVData()
    return Array.from(kybStore.isvAccounts.values())
  },

  /**
   * Change ISV status with validation
   */
  changeISVStatus(
    isvId: string,
    adminId: string,
    action: ISVStatusAction
  ): { success: boolean; isv?: ISVAccount; error?: string } {
    this.initISVData()

    const isv = kybStore.isvAccounts.get(isvId)
    if (!isv) {
      return { success: false, error: 'ISV account not found' }
    }

    const currentStatus = isv.status

    // Define allowed transitions
    const allowedTransitions: Record<ISVStatus, ISVStatus[]> = {
      [ISVStatus.ACTIVE]: [ISVStatus.SUSPENDED, ISVStatus.BANNED],
      [ISVStatus.SUSPENDED]: [ISVStatus.ACTIVE, ISVStatus.BANNED],
      [ISVStatus.BANNED]: [ISVStatus.ACTIVE]
    }

    // Validate transition
    if (!allowedTransitions[currentStatus].includes(action.status)) {
      return { success: false, error: 'Invalid status transition' }
    }

    // Validate reason for ban
    if (action.status === ISVStatus.BANNED && !action.reason) {
      return { success: false, error: 'Ban reason is required' }
    }

    // Update status
    isv.status = action.status
    isv.updatedAt = new Date().toISOString()

    // Create status history entry
    const historyEntry: ISVStatusHistoryItem = {
      id: uuidv4(),
      isvId,
      previousStatus: currentStatus,
      newStatus: action.status,
      adminId,
      reason: action.reason,
      timestamp: new Date().toISOString()
    }
    isv.statusHistory.push(historyEntry)

    // Revoke tokens (placeholder - integrate with token service)
    // In production, this would invalidate JWT tokens in Redis
    console.log(`[ISV Status] Tokens revoked for ISV: ${isvId}`)

    // Log notification placeholder
    console.log(`[ISV Status] Notification sent to ISV: ${isv.email} - Status changed to ${action.status}`)

    return { success: true, isv }
  },

  /**
   * Get ISV status history
   */
  getISVStatusHistory(isvId: string): ISVStatusHistoryItem[] {
    const isv = this.getISVById(isvId)
    if (!isv) return []
    return isv.statusHistory.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    )
  }
}

// ============================================
// Developer Authentication Service
// ============================================

// Developer store (in-memory for demo)
interface DeveloperStore {
  accounts: Map<string, DeveloperAccount>
}

const developerStore: DeveloperStore = {
  accounts: new Map()
}

// Initialize with demo developer
function initDeveloperStore(): void {
  if (developerStore.accounts.size > 0) return

  const demoId = uuidv4()
  const hashedPassword = bcrypt.hashSync('demo123', 10)

  developerStore.accounts.set(demoId, {
    id: demoId,
    developerId: `dev-${demoId.substring(0, 8)}`,
    companyName: 'Demo Company',
    email: 'demo@cregis.com',
    password: hashedPassword,
    creditCode: '123456789012345678',
    website: 'https://demo.cregis.com',
    industry: 'Technology',
    status: ISVStatus.ACTIVE,
    kybStatus: KYBStatus.APPROVED,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    statusHistory: []
  })
}

// Initialize on module load
initDeveloperStore()

export const developerAuthService = {
  /**
   * Register new developer
   */
  register(params: {
    email: string
    password: string
    companyName: string
    creditCode: string
    website?: string
    industry: string
  }): { success: boolean; data?: DeveloperAccount; error?: string } {
    // Check if email exists
    const existing = Array.from(developerStore.accounts.values()).find(
      a => a.email === params.email
    )
    if (existing) {
      return { success: false, error: 'Email already registered' }
    }

    // Validate password
    if (params.password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters' }
    }

    const id = uuidv4()
    const hashedPassword = bcrypt.hashSync(params.password, 10)
    const now = new Date().toISOString()

    const developer: DeveloperAccount = {
      id,
      developerId: `dev-${id.substring(0, 8)}`,
      email: params.email,
      password: hashedPassword,
      companyName: params.companyName,
      creditCode: params.creditCode,
      website: params.website,
      industry: params.industry,
      status: ISVStatus.ACTIVE,
      kybStatus: KYBStatus.PENDING,
      createdAt: now,
      updatedAt: now,
      statusHistory: [{
        id: uuidv4(),
        isvId: id,
        previousStatus: ISVStatus.ACTIVE,
        newStatus: ISVStatus.ACTIVE,
        adminId: 'system',
        reason: 'Developer account created',
        timestamp: now
      }]
    }

    developerStore.accounts.set(id, developer)

    // Return without password
    const { password: _, ...result } = developer
    return { success: true, data: result }
  },

  /**
   * Developer login
   */
  login(email: string, password: string): { success: boolean; data?: Omit<DeveloperAccount, 'password'>; error?: string } {
    const developer = Array.from(developerStore.accounts.values()).find(
      a => a.email === email
    )

    if (!developer) {
      return { success: false, error: 'Invalid email or password' }
    }

    if (!developer.password || !bcrypt.compareSync(password, developer.password)) {
      return { success: false, error: 'Invalid email or password' }
    }

    if (developer.status === ISVStatus.BANNED) {
      return { success: false, error: 'Account is banned' }
    }

    const { password: _, ...result } = developer
    return { success: true, data: result }
  },

  /**
   * Get developer by ID
   */
  getById(id: string): DeveloperAccount | undefined {
    return developerStore.accounts.get(id)
  },

  /**
   * Get developer by email
   */
  getByEmail(email: string): DeveloperAccount | undefined {
    return Array.from(developerStore.accounts.values()).find(a => a.email === email)
  },

  /**
   * Get all developers
   */
  getAll(): DeveloperAccount[] {
    return Array.from(developerStore.accounts.values())
  },

  /**
   * Update developer profile
   */
  update(id: string, data: Partial<Pick<DeveloperAccount, 'companyName' | 'website'>>): DeveloperAccount | undefined {
    const developer = developerStore.accounts.get(id)
    if (!developer) return undefined

    Object.assign(developer, data, { updatedAt: new Date().toISOString() })
    return developer
  }
}

// Initialize ISV data on module load
kybReviewService.initISVData()

// Type exports for use in controller
export type { KYBStore, DeveloperStore }
