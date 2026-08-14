/**
 * Admin Authentication Service
 * Uses Repository pattern for data access
 */

import bcrypt from 'bcrypt'
import { getAdminRepository } from '../repositories/repository.factory'
import { Admin, AdminRepository } from '../repositories/repository.interfaces'
import { getCache } from '../services/cache.service'

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
// Token Blacklist Service (using unified cache layer)
// ============================================

class TokenBlacklistService {
  private readonly BLACKLIST_PREFIX = 'blacklist:token';
  private readonly ADMIN_TOKENS_PREFIX = 'blacklist:admin';

  /**
   * Add a token to the blacklist
   */
  async blacklist(token: string, ttlMs: number = 30 * 24 * 60 * 60 * 1000): Promise<boolean> {
    const cache = await getCache()
    const decoded = this.decodeToken(token)
    if (!decoded) {
      return false
    }

    const adminId = decoded.adminId
    const tokenKey = `${this.BLACKLIST_PREFIX}:${token}`

    // Check if already blacklisted
    const existing = await cache.get(tokenKey)
    if (existing) {
      return false
    }

    // Store the token blacklist entry
    await cache.set(tokenKey, { adminId, expiresAt: Date.now() + ttlMs }, ttlMs)

    // Track by admin for batch revocation
    const adminKey = `${this.ADMIN_TOKENS_PREFIX}:${adminId}`
    const adminTokens = (await cache.get(adminKey)) as string[] || []
    adminTokens.push(token)
    await cache.set(adminKey, adminTokens, ttlMs)

    return true
  }

  /**
   * Check if a token is blacklisted
   */
  async isBlacklisted(token: string): Promise<boolean> {
    const cache = await getCache()
    const tokenKey = `${this.BLACKLIST_PREFIX}:${token}`
    const entry = await cache.get(tokenKey)
    return entry !== undefined && entry !== null
  }

  /**
   * Blacklist all tokens for a specific admin
   */
  async blacklistByAdmin(adminId: string, ttlMs: number = 30 * 24 * 60 * 60 * 1000): Promise<number> {
    const cache = await getCache()
    const adminKey = `${this.ADMIN_TOKENS_PREFIX}:${adminId}`
    const adminTokens = (await cache.get(adminKey)) as string[] || []

    if (adminTokens.length === 0) {
      return 0
    }

    let revokedCount = 0
    const expiresAt = Date.now() + ttlMs

    for (const token of adminTokens) {
      const tokenKey = `${this.BLACKLIST_PREFIX}:${token}`
      await cache.set(tokenKey, { adminId, expiresAt }, ttlMs)
      revokedCount++
    }

    // Clear the admin token list
    await cache.del(adminKey)

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
    const passwordValidation = validatePasswordStrength(data.passwordHash)
    if (!passwordValidation.valid) {
      throw new Error(`Password validation failed: ${passwordValidation.message}`)
    }

    const hashedPassword = await bcrypt.hash(data.passwordHash, 12)

    return this.repo.create({
      ...data,
      passwordHash: hashedPassword
    })
  }

  /**
   * Update admin
   */
  async update(id: string, data: Partial<Admin>): Promise<Admin | null> {
    if (data.passwordHash) {
      const passwordValidation = validatePasswordStrength(data.passwordHash)
      if (!passwordValidation.valid) {
        throw new Error(`Password validation failed: ${passwordValidation.message}`)
      }
      data.passwordHash = await bcrypt.hash(data.passwordHash, 12)
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
    return bcrypt.compare(password, admin.passwordHash)
  }

  /**
   * Expose password validator
   */
  validatePasswordStrength(password: string): { valid: boolean; message: string } {
    return validatePasswordStrength(password)
  }
}

export const adminService = new AdminAuthService()
