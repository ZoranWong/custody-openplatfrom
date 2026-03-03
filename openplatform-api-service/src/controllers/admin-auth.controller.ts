import { Request, Response } from 'express'
import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { adminService, tokenBlacklistService } from '../services/admin-auth.service'

// Get JWT config from environment or defaults
function getJwtConfig() {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is required')
  }
  return {
    secret,
    expiresIn: (process.env.JWT_EXPIRES_IN || '2h') as string & { __brand: 'ExpiresIn' },
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '30d') as string & { __brand: 'ExpiresIn' }
  }
}

// Generate tokens helper
function generateTokens(admin: any) {
  const { secret, expiresIn, refreshExpiresIn } = getJwtConfig()
  const tokenPayload = {
    adminId: admin.id,
    email: admin.email,
    role: admin.role
  }

  const accessToken = jwt.sign(tokenPayload, secret, { expiresIn } as any)
  const refreshToken = jwt.sign({ adminId: admin.id }, secret, { expiresIn: refreshExpiresIn } as any)

  return { accessToken, refreshToken }
}

// Rate limiting store (in-memory for demo, use Redis in production)
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>()
const refreshAttempts = new Map<string, { count: number; lastAttempt: number }>()

// Rate limiting helper for login
function checkLoginRateLimit(email: string, maxAttempts: number = 5, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const attempts = loginAttempts.get(email)

  if (!attempts) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
    return true
  }

  if (now - attempts.lastAttempt > windowMs) {
    loginAttempts.set(email, { count: 1, lastAttempt: now })
    return true
  }

  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  attempts.lastAttempt = now
  return true
}

// Rate limiting helper for refresh
function checkRefreshRateLimit(refreshToken: string, maxAttempts: number = 10, windowMs: number = 15 * 60 * 1000): boolean {
  const now = Date.now()
  const attempts = refreshAttempts.get(refreshToken)

  if (!attempts) {
    refreshAttempts.set(refreshToken, { count: 1, lastAttempt: now })
    return true
  }

  if (now - attempts.lastAttempt > windowMs) {
    refreshAttempts.set(refreshToken, { count: 1, lastAttempt: now })
    return true
  }

  if (attempts.count >= maxAttempts) {
    return false
  }

  attempts.count++
  attempts.lastAttempt = now
  return true
}

export interface AdminUserResponse {
  id: string
  email: string
  name: string
  role: 'super_admin' | 'admin' | 'operator'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
}

// Set tokens in cookies helper
function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  const { expiresIn, refreshExpiresIn } = getJwtConfig()
  const accessMaxAge = parseExpiry(expiresIn)
  const refreshMaxAge = parseExpiry(refreshExpiresIn)

  res.cookie('adminAccessToken', accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: accessMaxAge
  })

  res.cookie('adminRefreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: refreshMaxAge
  })
}

// Parse JWT expiresIn string to milliseconds
function parseExpiry(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/)
  if (!match) {
    return 2 * 60 * 60 * 1000 // default 2 hours
  }
  const value = parseInt(match[1])
  const unit = match[2]
  switch (unit) {
    case 's': return value * 1000
    case 'm': return value * 60 * 1000
    case 'h': return value * 60 * 60 * 1000
    case 'd': return value * 24 * 60 * 60 * 1000
    default: return 2 * 60 * 60 * 1000
  }
}

// Clear tokens helper
function clearTokenCookies(res: Response) {
  res.clearCookie('adminAccessToken', { path: '/' })
  res.clearCookie('adminRefreshToken', { path: '/' })
}

export async function adminLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      res.status(400).json({
        code: 40001,
        message: 'Invalid credentials',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Check rate limit
    if (!checkLoginRateLimit(email)) {
      res.status(429).json({
        code: 42901,
        message: 'Too many login attempts. Please try again later.',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Find admin by email
    const admin = await adminService.findByEmail(email)
    console.log('[Login] Admin lookup:', { email, found: !!admin })

    // Generic error message - don't reveal if email exists
    if (!admin) {
      res.status(401).json({
        code: 40101,
        message: 'Invalid credentials',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Check if admin is active
    if (admin.status !== 'active') {
      res.status(403).json({
        code: 40301,
        message: 'Account is not active',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Verify password
    console.log('[Login] Password verification:', {
      inputPassword: password,
      storedHash: admin.password.substring(0, 20) + '...',
      inputLength: password.length
    })
    const isValidPassword = await bcrypt.compare(password, admin.password)
    console.log('[Login] Password valid:', isValidPassword)
    if (!isValidPassword) {
      res.status(401).json({
        code: 40101,
        message: 'Invalid credentials',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(admin)

    // Return response (exclude password)
    const response: AdminUserResponse = {
      id: admin.id,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      status: admin.status,
      createdAt: admin.createdAt,
      updatedAt: admin.updatedAt
    }

    // Set tokens in httpOnly cookies for security
    setTokenCookies(res, accessToken, refreshToken)

    res.json({
      code: 0,
      message: 'success',
      data: {
        accessToken, // Keep for API clients that need it
        refreshToken,
        user: response
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Admin login error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

// ============================================
// Token Refresh Endpoint (NEW - Task 1)
// ============================================
export async function adminRefreshToken(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.adminRefreshToken || req.body?.refreshToken

    if (!refreshToken) {
      res.status(400).json({
        code: 40002,
        message: 'Refresh token is required',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Check rate limit for refresh attempts
    if (!checkRefreshRateLimit(refreshToken)) {
      res.status(429).json({
        code: 42902,
        message: 'Too many refresh attempts. Please try again later.',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Check if token is blacklisted
    const isBlacklisted = await tokenBlacklistService.isBlacklisted(refreshToken)
    if (isBlacklisted) {
      res.status(401).json({
        code: 40103,
        message: 'Token has been revoked',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Verify refresh token
    let decoded: { adminId: string }
    try {
      const { secret } = getJwtConfig()
      decoded = jwt.verify(refreshToken, secret) as { adminId: string }
    } catch (error) {
      res.status(401).json({
        code: 40102,
        message: 'Invalid or expired refresh token',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Get admin
    const admin = await adminService.findById(decoded.adminId)
    if (!admin || admin.status !== 'active') {
      res.status(401).json({
        code: 40103,
        message: 'Admin not found or inactive',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Blacklist the old refresh token (rotation)
    await tokenBlacklistService.blacklist(refreshToken, 30 * 24 * 60 * 60 * 1000) // 30 days TTL

    // Generate new tokens
    const { accessToken: newAccessToken, refreshToken: newRefreshToken } = generateTokens(admin)

    // Set new tokens
    setTokenCookies(res, newAccessToken, newRefreshToken)

    res.json({
      code: 0,
      message: 'success',
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Token refresh error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

// ============================================
// Logout Endpoint (UPDATED - Task 2)
// ============================================
export async function adminLogout(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.adminRefreshToken || req.body?.refreshToken

    // Blacklist the refresh token
    if (refreshToken) {
      await tokenBlacklistService.blacklist(refreshToken, 30 * 24 * 60 * 60 * 1000)
    }

    // Clear cookies
    clearTokenCookies(res)

    res.json({
      code: 0,
      message: 'success',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Logout error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

// ============================================
// Change Password Endpoint (NEW - Task 5)
// ============================================
export async function adminChangePassword(req: Request, res: Response): Promise<void> {
  try {
    const adminId = (req as any).adminId
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        code: 40003,
        message: 'Current password and new password are required',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Validate new password strength
    const passwordValidation = adminService.validatePasswordStrength(newPassword)
    if (!passwordValidation.valid) {
      res.status(400).json({
        code: 40004,
        message: passwordValidation.message,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Get admin
    const admin = await adminService.findById(adminId)
    if (!admin) {
      res.status(404).json({
        code: 40401,
        message: 'Admin not found',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, admin.password)
    if (!isValidPassword) {
      res.status(401).json({
        code: 40101,
        message: 'Current password is incorrect',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await adminService.update(adminId, { password: newPasswordHash })

    // Blacklist all existing refresh tokens for this admin
    await tokenBlacklistService.blacklistByAdmin(adminId, 30 * 24 * 60 * 60 * 1000)

    // Clear cookies
    clearTokenCookies(res)

    res.json({
      code: 0,
      message: 'Password changed successfully. Please login again.',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

export async function getAdminProfile(req: Request, res: Response): Promise<void> {
  try {
    // Admin ID is extracted from JWT by middleware
    const adminId = (req as any).adminId

    const admin = await adminService.findById(adminId)
    if (!admin) {
      res.status(404).json({
        code: 40401,
        message: 'Admin not found',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'success',
      data: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        status: admin.status,
        createdAt: admin.createdAt,
        updatedAt: admin.updatedAt
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get admin profile error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Internal server error',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}
