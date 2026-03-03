/**
 * ISV Authentication Middleware
 * Verifies ISV Owner/Developer tokens
 */

import { Request, Response, NextFunction } from 'express'
import { verifyToken } from '../controllers/isv-auth.controller'
import { isvUserService } from '../services/isv-user.service'

export interface ISVAuthRequest extends Request {
  isvUser?: {
    userId: string
    isvId: string
    email: string
    role: string
  }
}

/**
 * ISV Authentication middleware (async)
 */
export async function isvAuth(req: ISVAuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      code: 40101,
      message: 'Authorization header required'
    })
    return
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    res.status(401).json({
      code: 40102,
      message: 'Invalid or expired token'
    })
    return
  }

  // Verify user still exists and is active
  const user = await isvUserService.getUserById(payload.userId)
  if (!user) {
    res.status(401).json({
      code: 40103,
      message: 'User not found'
    })
    return
  }

  if (user.status === 'suspended') {
    res.status(403).json({
      code: 40301,
      message: 'Account is suspended'
    })
    return
  }

  // Attach user info to request
  req.isvUser = {
    userId: payload.userId,
    isvId: payload.isvId,
    email: payload.email,
    role: payload.role
  }

  next()
}

/**
 * Owner-only middleware
 */
export function requireOwner(req: ISVAuthRequest, res: Response, next: NextFunction): void {
  if (req.isvUser?.role !== 'owner') {
    res.status(403).json({
      code: 40302,
      message: 'Owner access required'
    })
    return
  }
  next()
}

export default {
  isvAuth,
  requireOwner
}
