/**
 * ISV Authentication Middleware
 * Verifies ISV Owner/Developer tokens
 */

import { Request, Response, NextFunction } from 'express'
import { HttpCodes } from '../enums/http-codes.enum'
import { BusinessCodes } from '../enums/business-codes.enum'
import { verifyToken } from '../controllers/isv/isv-auth.controller'
import { isvUserService } from '../services/isv-user.service'

export interface ISVAuthRequest extends Request {
  isvUser?: {
    userId: string
    isvDeveloperId: string
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
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_MISSING_HEADERS,
      message: 'Authorization header required'
    })
    return
  }

  const token = authHeader.substring(7)
  const payload = verifyToken(token)

  if (!payload) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_INVALID_SIGNATURE,
      message: 'Invalid or expired token'
    })
    return
  }

  // Verify user still exists and is active
  const user = await isvUserService.getUserById(payload.userId)
  if (!user) {
    res.status(HttpCodes.UNAUTHORIZED).json({
      code: BusinessCodes.AUTH_TIMESTAMP_EXPIRED_OR_INVALID_TOKEN,
      message: 'User not found'
    })
    return
  }

  if (user.status === 'suspended') {
    res.status(HttpCodes.FORBIDDEN).json({
      code: BusinessCodes.AUTHZ_ACCESS_DENIED,
      message: 'Account is suspended'
    })
    return
  }

  // Attach user info to request
  req.isvUser = {
    userId: payload.userId,
    isvDeveloperId: payload.isvDeveloperId,
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
    res.status(HttpCodes.FORBIDDEN).json({
      code: BusinessCodes.AUTHZ_PERMISSION_DENIED,
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
