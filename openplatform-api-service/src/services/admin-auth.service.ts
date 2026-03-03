/**
 * Admin Authentication Service
 * Uses Repository pattern for data access
 */

import bcrypt from 'bcrypt'
import { getAdminRepository } from '../repositories/repository.factory'
import { Admin, AdminRepository } from '../repositories/repository.interfaces'

// Password strength validator
export function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  return { valid: true, message: 'Password is valid' }
}

// ============================================
// Token Blacklist Service (In-memory for demo, use Redis in production)
// ============================================

interface BlacklistEntry {
  token: string
  adminId: string
  expiresAt: number
}

interface AdminTokenRecord {
  adminId: string
  tokens: Set<string>
}

class TokenBlacklistService {
  // In-memory storage (use Redis in production)
  private blacklistMap: Map<string, BlacklistEntry> = new Map()
  private adminTokens: Map<string, AdminTokenRecord> = new Map()

  /**
   * Add a token to the blacklist
   */
  async blacklist(token: string, ttlMs: number = 30 * 24 * 60 * 60 * 1000): Promise<boolean> {
    if (this.blacklistMap.has(token)) {
      return false
    }

    const decoded = this.decodeToken(token)
    if (!decoded) {
      return false
    }

    const adminId = decoded.adminId
    const expiresAt = Date.now() + ttlMs

    this.blacklistMap.set(token, { token, adminId, expiresAt })

    if (!this.adminTokens.has(adminId)) {
      this.adminTokens.set(adminId, { adminId, tokens: new Set() })
    }
    this.adminTokens.get(adminId)!.tokens.add(token)

    this.cleanup()
    return true
  }

  /**
   * Check if a token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const entry = this.blacklistMap.get(token)
    if (!entry) return false

    if (Date.now() > entry.expiresAt) {
      this.blacklistMap.delete(token)
      return false
    }

    return true
  }

  /**
   * Blacklist all tokens for a specific admin
   */
  async blacklistByAdmin(adminId: string, ttlMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const adminRecord = this.adminTokens.get(adminId)
    if (!adminRecord) {
      return 0
    }

    let revokedCount = 0
    const expiresAt = Date.now() + ttlMs

    for (const token of adminRecord.tokens) {
      this.blacklistMap.set(token, { token, adminId, expiresAt })
      revokedCount++
    }

    this.adminTokens.delete(adminId)
    return revokedCount
  }

  /**
   * Decode token without verification
   */
  private decodeToken(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.')
      if (parts.length !== 3) return null
      const payload = Buffer.from(parts[1], 'base64').toString('utf-8')
      return JSON.parse(payload)
    } catch {
      return null
    }
  }

  /**
   * Clean up expired entries
   */
  async cleanup(): Promise<number> {
    const now = Date.now()
    let removed = 0

    for (const [token, entry] of this.blacklistMap.entries()) {
      if (now > entry.expiresAt) {
        this.blacklistMap.delete(token)
        removed++

        const adminRecord = this.adminTokens.get(entry.adminId)
        if (adminRecord) {
          adminRecord.tokens.delete(token)
          if (adminRecord.tokens.size === 0) {
            this.adminTokens.delete(entry.adminId)
          }
        }
      }
    }

    return removed
  }
}

export const tokenBlacklistService = new TokenBlacklistService()

// ============================================
// Admin Auth Service
// ============================================

export class AdminAuthService {
  private readonly repo: AdminRepository

  constructor() {
    this.repo = getAdminRepository()
  }

  /**
   * Find admin by email
   */
  async findByEmail(email: string): Promise<Admin | null> {
    return this.repo.findByEmail(email)
  }

  /**
   * Find admin by ID
   */
  async findById(id: string): Promise<Admin | null> {
    return this.repo.findById(id)
  }

  /**
   * Create new admin
   */
  async create(data: Omit<Admin, 'id' | 'createdAt' | 'updatedAt'>): Promise<Admin> {
    const passwordValidation = validatePasswordStrength(data.password)
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.message}`)
    }

    const hashedPassword = await bcrypt.hash(data.password, 12)

    return this.repo.create({
      ...data,
      password: hashedPassword
    })
  }

  /**
   * Update admin
   */
  async update(id: string, data: Partial<Admin>): Promise<Admin | null> {
    if (data.password) {
      const passwordValidation = validatePasswordStrength(data.password)
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.message}`)
      }
      data.password = await bcrypt.hash(data.password, 12)
    }

    return this.repo.update(id, data)
  }

  /**
   * Get all admins
   */
  async findAll(): Promise<Admin[]> {
    return this.repo.findAll()
  }

  /**
   * Find admins by role
   */
  async findByRole(role: 'super_admin' | 'admin' | 'operator'): Promise<Admin[]> {
    return this.repo.findByRole(role)
  }

  /**
   * Find active admins
   */
  async findActive(): Promise<Admin[]> {
    return this.repo.findActive()
  }

  /**
   * Validate password
   */
  async validatePassword(admin: Admin, password: string): Promise<boolean> {
    return bcrypt.compare(password, admin.password)
  }

  /**
   * Expose password validator
   */
  validatePasswordStrength(password: string): { valid: boolean; message: string } {
    return validatePasswordStrength(password)
  }
}

export const adminService = new AdminAuthService()
