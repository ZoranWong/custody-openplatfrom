import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { tokenBlacklistService } from '../services/admin-auth.service'
import { getEnvOrDefault } from '../utils/env'

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
    res.status(401).json({
      code: 40101,
      message: 'No token provided',
      trace_id: req.headers['x-trace-id'] as string || ''
    })
    return
  }

  // Check if token is blacklisted (Task 3)
  tokenBlacklistService.isBlacklisted(token).then((isBlacklisted) => {
    if (isBlacklisted) {
      // Already blacklisted - send response and RETURN
      res.status(401).json({
        code: 40103,
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
      res.status(401).json({
        code: 40102,
        message: 'Invalid or expired token',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
    }
  }).catch((error) => {
    console.error('Auth middleware error:', error)
    // Only send error response if response hasn't been sent
    if (!res.headersSent) {
      res.status(500).json({
        code: 50001,
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
      res.status(403).json({
        code: 40301,
        message: 'Insufficient permissions',
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    next()
  }
}
