import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { tokenBlacklistService } from '../services/admin-auth.service'
import { getEnvOrDefault } from '../utils/env'
import { HttpCodes } from '../enums/http-codes.enum'
import { BusinessCodes } from '../enums/business-codes.enum'

// Get JWT secret lazily when needed
function getJwtSecret(): string {
  return getEnvOrDefault('JWT_SECRET', 'dev-secret-key-change-in-production')
}

export interface AuthenticatedAdmin {
  adminId: string
  email: string
  role: 'super_admin' | 'admin' | 'operator'
}

// Helper to extract token from header or cookie
function extractToken(req: Request): string | null {
  // First try Authorization header
  const authHeader = req.headers.authorization
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.split(' ')[1]
  }

  // Fallback to cookie
  const cookieToken = req.cookies?.adminAccessToken
  if (cookieToken) {
    return cookieToken
  }

  return null
}

export function adminAuthMiddleware(req: Request, res: Response, next: NextFunction): void {
  const token = extractToken(req)

  if (!token) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'No token provided',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
    return
  }

  // Check if token is blacklisted (Task 3)
  tokenBlacklistService.isBlacklisted(token).then((isBlacklisted) => {
    if (isBlacklisted) {
      // Already blacklisted - send response and RETURN
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
        message: 'Token has been revoked',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, getJwtSecret()) as unknown as AuthenticatedAdmin
      ;(req as any).adminId = decoded.adminId
      ;(req as any).adminEmail = decoded.email
      ;(req as any).adminRole = decoded.role
      next()
    } catch (error) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_SIGNATURE,
        message: 'Invalid or expired token',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
    }
  }).catch((error) => {
    console.error('Auth middleware error:', error)
    // Only send error response if response hasn't been sent
    if (!res.headersSent) {
      res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
        code: BusinessCodes.SERVER_INTERNAL,
        message: 'Internal server error',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
    }
  })
}

export function requireRole(...allowedRoles: ('super_admin' | 'admin' | 'operator')[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const adminRole = (req as any).adminRole

    if (!adminRole || !allowedRoles.includes(adminRole)) {
      res.status(HttpCodes.FORBIDDEN).json({
        code: BusinessCodes.AUTHZ_ACCESS_DENIED,
        message: 'Insufficient permissions',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    next()
  }
}
