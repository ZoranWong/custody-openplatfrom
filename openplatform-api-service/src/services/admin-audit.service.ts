import { Request } from 'express'

// ============================================
// Admin Audit Service
// ============================================

export enum AuditAction {
  // Auth actions
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  TOKEN_REFRESH = 'TOKEN_REFRESH',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // ISV actions
  ISV_VIEW = 'ISV_VIEW',
  ISV_CREATE = 'ISV_CREATE',
  ISV_UPDATE = 'ISV_UPDATE',
  ISV_DELETE = 'ISV_DELETE',
  ISV_KYB_APPROVE = 'ISV_KYB_APPROVE',
  ISV_KYB_REJECT = 'ISV_KYB_REJECT',

  // Application actions
  APP_VIEW = 'APP_VIEW',
  APP_CREATE = 'APP_CREATE',
  APP_UPDATE = 'APP_UPDATE',
  APP_DELETE = 'APP_DELETE',
  APP_SECRET_REGENERATE = 'APP_SECRET_REGENERATE',

  // System actions
  SYSTEM_CONFIG_UPDATE = 'SYSTEM_CONFIG_UPDATE',
  ADMIN_CREATE = 'ADMIN_CREATE',
  ADMIN_UPDATE = 'ADMIN_UPDATE',
  ADMIN_DELETE = 'ADMIN_DELETE',

  // Data export
  DATA_EXPORT = 'DATA_EXPORT'
}

export enum AuditResult {
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  PARTIAL = 'PARTIAL'
}

export interface AuditLog {
  id: string
  adminId: string
  adminEmail: string
  adminRole: string
  action: AuditAction
  resource: string
  resourceId?: string
  result: AuditResult
  ipAddress: string
  userAgent: string
  requestPath: string
  requestMethod: string
  details?: Record<string, any>
  errorMessage?: string
  timestamp: string
  traceId: string
}

interface AuditEntry {
  log: AuditLog
  expiresAt: number
}

// In-memory storage (use database in production)
class AuditLogService {
  private logs: Map<string, AuditEntry> = new Map()
  private readonly LOG_RETENTION_MS = 90 * 24 * 60 * 60 * 1000 // 90 days

  /**
   * Create an audit log entry
   */
  async log(params: {
    adminId: string
    adminEmail: string
    adminRole: string
    action: AuditAction
    resource: string
    resourceId?: string
    result: AuditResult
    req: Request
    details?: Record<string, any>
    errorMessage?: string
  }): Promise<AuditLog> {
    const id = this.generateId()
    const now = new Date().toISOString()
    const expiresAt = Date.now() + this.LOG_RETENTION_MS

    const auditLog: AuditLog = {
      id,
      adminId: params.adminId,
      adminEmail: params.adminEmail,
      adminRole: params.adminRole,
      action: params.action,
      resource: params.resource,
      resourceId: params.resourceId,
      result: params.result,
      ipAddress: this.getClientIP(params.req),
      userAgent: params.req.headers['user-agent'] || 'unknown',
      requestPath: params.req.path,
      requestMethod: params.req.method,
      details: params.details,
      errorMessage: params.errorMessage,
      timestamp: now,
      traceId: (params.req.headers['x-trace-id'] as string) || ''
    }

    this.logs.set(id, {
      log: auditLog,
      expiresAt
    })

    // Cleanup expired entries
    this.cleanup()

    console.log(`[Audit] ${params.action} by ${params.adminEmail} - Result: ${params.result}`)
    return auditLog
  }

  /**
   * Query audit logs with filters
   */
  async query(filters: {
    adminId?: string
    action?: AuditAction
    resource?: string
    resourceId?: string
    result?: AuditResult
    startDate?: string
    endDate?: string
    limit?: number
    offset?: number
  }): Promise<{ logs: AuditLog[]; total: number }> {
    let logs: AuditLog[] = []

    for (const [id, entry] of this.logs.entries()) {
      // Check expiration
      if (Date.now() > entry.expiresAt) {
        this.logs.delete(id)
        continue
      }

      const log = entry.log

      // Apply filters
      if (filters.adminId && log.adminId !== filters.adminId) continue
      if (filters.action && log.action !== filters.action) continue
      if (filters.resource && log.resource !== filters.resource) continue
      if (filters.resourceId && log.resourceId !== filters.resourceId) continue
      if (filters.result && log.result !== filters.result) continue

      if (filters.startDate && new Date(log.timestamp) < new Date(filters.startDate)) continue
      if (filters.endDate && new Date(log.timestamp) > new Date(filters.endDate)) continue

      logs.push(log)
    }

    // Sort by timestamp descending (newest first)
    logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

    const total = logs.length

    // Apply pagination
    const offset = filters.offset || 0
    const limit = filters.limit || 100
    logs = logs.slice(offset, offset + limit)

    return { logs, total }
  }

  /**
   * Get audit log by ID
   */
  async getById(id: string): Promise<AuditLog | null> {
    const entry = this.logs.get(id)
    if (!entry) return null

    // Check expiration
    if (Date.now() > entry.expiresAt) {
      this.logs.delete(id)
      return null
    }

    return entry.log
  }

  /**
   * Get audit logs for a specific admin
   */
  async getByAdminId(adminId: string, limit: number = 50): Promise<AuditLog[]> {
    const { logs } = await this.query({
      adminId,
      limit
    })
    return logs
  }

  /**
   * Get audit logs for a specific resource
   */
  async getByResource(resource: string, resourceId?: string, limit: number = 50): Promise<AuditLog[]> {
    const { logs } = await this.query({
      resource,
      resourceId,
      limit
    })
    return logs
  }

  /**
   * Export audit logs (for compliance)
   */
  async export(filters: {
    startDate: string
    endDate: string
    format: 'json' | 'csv'
  }): Promise<string> {
    const { logs } = await this.query({
      startDate: filters.startDate,
      endDate: filters.endDate,
      limit: 100000 // Max export
    })

    if (filters.format === 'csv') {
      return this.toCsv(logs)
    }

    return JSON.stringify(logs, null, 2)
  }

  /**
   * Cleanup expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [id, entry] of this.logs.entries()) {
      if (now > entry.expiresAt) {
        this.logs.delete(id)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[Audit] Cleaned up ${removed} expired entries`)
    }
  }

  /**
   * Generate unique ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`
  }

  /**
   * Get client IP address
   */
  private getClientIP(req: Request): string {
    const forwarded = req.headers['x-forwarded-for']
    if (forwarded) {
      return (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
    }
    return req.socket?.remoteAddress || req.ip || 'unknown'
  }

  /**
   * Convert logs to CSV format
   */
  private toCsv(logs: AuditLog[]): string {
    const headers = [
      'ID',
      'Timestamp',
      'Admin ID',
      'Admin Email',
      'Admin Role',
      'Action',
      'Resource',
      'Resource ID',
      'Result',
      'IP Address',
      'User Agent',
      'Request Path',
      'Request Method',
      'Error Message'
    ]

    const rows = logs.map(log => [
      log.id,
      log.timestamp,
      log.adminId,
      log.adminEmail,
      log.adminRole,
      log.action,
      log.resource,
      log.resourceId || '',
      log.result,
      log.ipAddress,
      log.userAgent,
      log.requestPath,
      log.requestMethod,
      log.errorMessage || ''
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n')

    return csvContent
  }

  /**
   * Get service statistics
   */
  async getStats(): Promise<{
    totalLogs: number
    expiredLogs: number
    oldestLog: string | null
    newestLog: string | null
  }> {
    let expiredLogs = 0
    let oldestLog: AuditLog | null = null
    let newestLog: AuditLog | null = null
    const now = Date.now()

    for (const [id, entry] of this.logs.entries()) {
      if (now > entry.expiresAt) {
        expiredLogs++
        continue
      }

      if (!oldestLog || new Date(entry.log.timestamp) < new Date(oldestLog.timestamp)) {
        oldestLog = entry.log
      }
      if (!newestLog || new Date(entry.log.timestamp) > new Date(newestLog.timestamp)) {
        newestLog = entry.log
      }
    }

    return {
      totalLogs: this.logs.size,
      expiredLogs,
      oldestLog: oldestLog?.timestamp || null,
      newestLog: newestLog?.timestamp || null
    }
  }
}

export const auditLogService = new AuditLogService()

// Helper function to create audit log from request
export async function createAuditLog(params: {
  adminId: string
  adminEmail: string
  adminRole: string
  action: AuditAction
  resource: string
  resourceId?: string
  result: AuditResult
  req: Request
  details?: Record<string, any>
  errorMessage?: string
}): Promise<AuditLog> {
  return auditLogService.log(params)
}
