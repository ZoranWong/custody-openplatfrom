/**
 * ISV Owner Authentication Controller
 * Handles ISV Owner/Developer login and profile management
 * Separate from Platform Admin authentication
 */

import { Request, Response } from 'express'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'
import jwt, { SignOptions } from 'jsonwebtoken'
import bcrypt from 'bcrypt'
import { isvUserService, isvService, isvApplicationService } from '../../services/isv-user.service'
import { getEnvOrDefault } from '../../utils/env'

// Get JWT config from environment or defaults
function getJwtConfig() {
  const secret = getEnvOrDefault('JWT_SECRET', 'isv-secret-key-change-in-production')
  const expiresIn = getEnvOrDefault('ISV_JWT_EXPIRES_IN', '24h') as string & { __brand: 'ExpiresIn' }
  return { secret, expiresIn }
}

// Generate token
export function generateToken(payload: { userId: string; isvDeveloperId: string; isvId: string; email: string; role: string }) {
  const { secret, expiresIn } = getJwtConfig()
  return jwt.sign(payload, secret, { expiresIn } as SignOptions)
}

// Verify token
export function verifyToken(token: string): { userId: string; isvDeveloperId: string; isvId: string; email: string; role: string } | null {
  try {
    const { secret } = getJwtConfig()
      return jwt.verify(token, secret) as { userId: string; isvDeveloperId: string; isvId: string; email: string; role: string }
  } catch {
    return null
  }
}

// ============================================
// ISV Owner Registration
// ============================================

export async function register(req: Request, res: Response): Promise<void> {
  try {
    const {
      email,
      password,
      legalName,
      registrationNumber,
      jurisdiction,
      dateOfIncorporation,
      registeredAddress,
      website,
      uboInfo
    } = req.body

    // Validate UBO info
    if (!uboInfo || !Array.isArray(uboInfo) || uboInfo.length === 0) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_INVALID_FORMAT,
        message: 'At least one UBO is required'
      })
      return
    }

    // Check if email already exists
    const existingUser = await isvUserService.getUserByEmail(email)
    if (existingUser) {
      res.status(HttpCodes.CONFLICT).json({
        code: BusinessCodes.CONFLICT_DUPLICATE,
        message: 'Email already registered'
      })
      return
    }

    // Create ISV company
    const passwordHash = await bcrypt.hash(password, 10)
    const isv = await isvService.createISV({
      email,
      passwordHash,
      legalName,
      registrationNumber,
      jurisdiction,
      dateOfIncorporation,
      registeredAddress,
      website,
      uboInfo
    })

    // Create ISV owner user
    const result = await isvUserService.registerOwner({
        isvDeveloperId: isv.id,
      email,
      password,
      name: legalName
    })

    if (!result.success || !result.user) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_BUSINESS_RULE,
        message: result.error || 'Failed to create user'
      })
      return
    }

    const user = result.user

    // Generate token
    const token = generateToken({
      userId: user.id as string,
      isvDeveloperId: user.isvDeveloperId as string,
      isvId: isv.id,
      email: user.email as string,
      role: user.role as string
    })

    res.status(HttpCodes.CREATED).json({
      code: 0,
      message: 'Registration successful',
      data: {
        accessToken: token,
        user
      }
    })
  } catch (error) {
    console.error('ISV registration error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

// ============================================
// ISV Owner Login
// ============================================

export async function ownerLogin(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    // Find user by email first to get isvId
    const userByEmail = await isvUserService.getUserByEmail(email)
    if (!userByEmail) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Invalid email or password'
      })
      return
    }

      const result = await isvUserService.login(userByEmail.isvDeveloperId, email, password)

    if (!result.success) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_CREDENTIALS,
        message: result.error || 'Login failed'
      })
      return
    }

    const token = generateToken({
      userId: result.user!.id as string,
      isvDeveloperId: result.user!.isvDeveloperId as string,
      isvId: result.user!.isvDeveloperId as string,
      email: result.user!.email as string,
      role: result.user!.role as string
    })

    res.json({
      code: 0,
      message: 'Login successful',
      data: {
        accessToken: token,
        user: result.user
      }
    })
  } catch (error) {
    console.error('ISV login error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

// ============================================
// ISV Owner Logout
// ============================================

export async function logout(req: Request, res: Response): Promise<void> {
  try {
    // In a real implementation, you would:
    // 1. Blacklist the current token
    // 2. Clear any server-side session data
    // For now, just return success as the client will remove the token

    res.json({
      code: 0,
      message: 'Logout successful'
    })
  } catch (error) {
    console.error('ISV logout error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

// ============================================
// Get Owner Profile
// ============================================

export async function getProfile(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Authentication required'
      })
      return
    }

    const user = await isvUserService.getUserById(isvUser.userId)
    if (!user) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'User not found'
      })
      return
    }

    const { passwordHash: _, ...userData } = user
    res.json({
      code: 0,
      message: 'Success',
      data: { user: userData }
    })
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

// ============================================
// Update Owner Profile
// ============================================

export async function updateProfile(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Authentication required'
      })
      return
    }

    const { name, phone } = req.body
    const user = await isvUserService.updateUser(isvUser.userId, { name, phone })

    if (!user) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'User not found'
      })
      return
    }

    const { passwordHash: _, ...userData } = user
    res.json({
      code: 0,
      message: 'Profile updated successfully',
      data: { user: userData }
    })
  } catch (error) {
    console.error('Update profile error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

// ============================================
// Get ISV Info
// ============================================

export async function getISVInfo(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Authentication required'
      })
      return
    }

    const isv = await isvService.getISVById(isvUser.isvDeveloperId)
    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'ISV not found'
      })
      return
    }

    res.json({
      code: 0,
      message: 'Success',
      data: { isv }
    })
  } catch (error) {
    console.error('Get ISV info error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

// ============================================
// Get My Applications
// ============================================

export async function getMyApplications(req: Request, res: Response): Promise<void> {
  try {
    const isvUser = (req as any).isvUser
    if (!isvUser) {
      res.status(HttpCodes.UNAUTHORIZED).json({
        code: BusinessCodes.AUTH_INVALID_CREDENTIALS,
        message: 'Authentication required'
      })
      return
    }

    const apps = await isvApplicationService.getApplicationsByISV(isvUser.isvDeveloperId)
    res.json({
      code: 0,
      message: 'Success',
      data: { list: apps, total: apps.length }
    })
  } catch (error) {
    console.error('Get applications error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Internal server error'
    })
  }
}

export default {
  ownerLogin,
  register,
  getProfile,
  updateProfile,
  getISVInfo,
  getMyApplications,
  generateToken,
  verifyToken
}
