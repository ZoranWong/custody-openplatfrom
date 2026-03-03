/**
 * Resource Validation Middleware
 * Validates developer identity and signature for custody message forwarding
 *
 * Request format:
 * {
 *   basic: { appId, resourceKey, timestamp, nonce, signature, data },
 *   business: { ... }
 * }
 */

import { Request, Response, NextFunction } from 'express'
import * as crypto from 'crypto'
import { getPrismaClient } from '../database/prisma-client'
import { getAuthorizationService } from '../services/resource-authorization.service'
import { logger } from '../utils/logger'

/**
 * Mask sensitive information for logging
 * - signature: show first 4 and last 4 characters
 * - password/appSecret: never log
 * - token: show first 8 characters
 */
function maskValue(value: string | undefined, prefixLen: number = 4, suffixLen: number = 4): string {
  if (!value) return '***'
  if (value.length <= prefixLen + suffixLen) return '***'
  return `${value.substring(0, prefixLen)}***${value.substring(value.length - suffixLen)}`
}

/**
 * Mask signature for logging - show first 4 and last 4 characters
 */
function maskSignature(signature: string): string {
  return maskValue(signature, 4, 4)
}

/**
 * Get or generate trace ID for the request
 */
function getTraceId(req: Request): string {
  return (req.headers['x-trace-id'] as string) ||
    `val_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

/**
 * Send error response with trace_id
 */
function sendErrorResponse(res: Response, statusCode: number, code: number, message: string, req: Request): void {
  res.status(statusCode).json({
    code,
    message,
    trace_id: getTraceId(req),
  })
}

/**
 * Extended Request interface for resource validation
 */
export interface ResourceValidationRequest extends Request {
  developerContext?: {
    appId: string
    appName: string
    appStatus: string
    appSecret: string
    developerId: string
    developerEmail: string
    developerName: string
    developerCompany: string
  }
  resourceKey?: string
  businessData?: Record<string, unknown>
  authorizationId?: string
  userId?: string
}

/**
 * Basic info structure from request
 * All fields are required
 */
interface BasicInfo {
  appId: string
  resourceKey: string
  timestamp: number
  nonce: string
  signature: string
}

/**
 * Error codes for resource validation
 */
export enum ResourceValidationErrorCode {
  MISSING_BASIC = 40101,
  INVALID_APPID_FORMAT = 40102,
  APP_NOT_FOUND = 40103,
  APP_NOT_ACTIVE = 40104,
  DEVELOPER_NOT_ACTIVE = 40105,
  MISSING_SIGNATURE = 40106,
  INVALID_TIMESTAMP = 40107,
  INVALID_SIGNATURE = 40108,
  DUPLICATE_NONCE = 40109,
  INVALID_RESOURCE_KEY = 40110,
}

/**
 * In-memory nonce cache for replay attack prevention
 */
class NonceCache {
  private cache: Map<string, number> = new Map()
  private ttl: number

  constructor(ttlSeconds: number = 3600) {
    this.ttl = ttlSeconds * 1000
  }

  private getKey(appId: string, nonce: string): string {
    return `${appId}:${nonce}`
  }

  async isDuplicate(appId: string, nonce: string): Promise<boolean> {
    const key = this.getKey(appId, nonce)
    return this.cache.has(key)
  }

  async record(appId: string, nonce: string): Promise<void> {
    const key = this.getKey(appId, nonce)
    this.cache.set(key, Date.now())

    // Cleanup old entries periodically
    if (this.cache.size > 10000) {
      const now = Date.now()
      for (const [k, v] of this.cache.entries()) {
        if (now - v > this.ttl) {
          this.cache.delete(k)
        }
      }
    }
  }
}

// Default nonce cache instance
const defaultNonceCache = new NonceCache()

/**
 * Extract basic info from request
 * Request format: { basic: { appId, resourceKey, timestamp, nonce, signature }, business: { ... } }
 * All parameters must be in body.basic
 */
function extractBasicInfo(req: Request): BasicInfo | null {
  const body = req.body as Record<string, unknown> | undefined

  if (!body) {
    return null
  }

  // Extract from body.basic
  const bodyBasic = body.basic as Record<string, unknown> | undefined

  if (bodyBasic?.appId && bodyBasic.resourceKey && bodyBasic.timestamp && bodyBasic.nonce && bodyBasic.signature) {
    return {
      appId: String(bodyBasic.appId),
      resourceKey: String(bodyBasic.resourceKey),
      timestamp: Number(bodyBasic.timestamp),
      nonce: String(bodyBasic.nonce),
      signature: String(bodyBasic.signature),
    }
  }

  return null
}

/**
 * Extract business data from request
 * Request format: { basic: { ... }, business: { ... } }
 */
function extractBusinessData(req: Request): Record<string, unknown> | null {
  const body = req.body as Record<string, unknown> | undefined

  if (!body?.business || typeof body.business !== 'object') {
    return null
  }

  return body.business as Record<string, unknown>
}

/**
 * Validate appId format (UUID)
 */
function isValidAppIdFormat(appId: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(appId)
}

/**
 * Sort object keys recursively for consistent JSON serialization
 */
function sortObjectKeys(obj: Record<string, unknown>): Record<string, unknown> {
  if (obj === null || typeof obj !== 'object') {
    return obj as Record<string, unknown>
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortObjectKeys(item as Record<string, unknown>)) as unknown as Record<string, unknown>
  }

  const sorted: Record<string, unknown> = {}
  const keys = Object.keys(obj).sort()

  for (const key of keys) {
    sorted[key] = sortObjectKeys((obj as Record<string, unknown>)[key] as Record<string, unknown>)
  }

  return sorted
}

/**
 * Calculate MD5 of sorted business JSON string
 */
function calculateBusinessMd5(businessData: Record<string, unknown> | null): string {
  if (!businessData || Object.keys(businessData).length === 0) {
    return crypto.createHash('md5').update('').digest('hex')
  }

  const sorted = sortObjectKeys(businessData)
  const jsonString = JSON.stringify(sorted)
  return crypto.createHash('md5').update(jsonString).digest('hex')
}

/**
 * Build signature string: appId + resourceKey + timestamp + nonce + md5(business)
 */
function buildSignatureString(basic: BasicInfo, businessMd5: string): string {
  return basic.appId + basic.resourceKey + basic.timestamp + basic.nonce + businessMd5
}

/**
 * Verify signature using MD5(appSecret + appId + resourceKey + timestamp + nonce + md5(business))
 */
function verifyMd5Signature(
  appSecret: string,
  signature: string,
  basic: BasicInfo,
  businessData: Record<string, unknown> | null
): boolean {
  const businessMd5 = calculateBusinessMd5(businessData)
  const signString = buildSignatureString(basic, businessMd5)
  const expectedSignature = crypto
    .createHash('md5')
    .update(appSecret + signString)
    .digest('hex')

  // Check length before timing-safe comparison
  if (signature.length !== expectedSignature.length) {
    return false
  }

  // Timing-safe comparison
  return crypto.timingSafeEqual(
    Buffer.from(signature, 'utf8'),
    Buffer.from(expectedSignature, 'utf8')
  )
}

/**
 * Validate timestamp is within acceptable range
 */
function isTimestampValid(timestamp: number, windowSeconds: number = 300): boolean {
  const currentTime = Math.floor(Date.now() / 1000)
  const timeDiff = Math.abs(currentTime - timestamp)
  return timeDiff <= windowSeconds
}

/**
 * Configuration for resource validation middleware
 */
export interface ResourceValidationConfig {
  /**
   * Paths to exclude from validation
   */
  excludePaths?: string[]

  /**
   * Timestamp validation window in seconds (default: 300 = 5 minutes)
   */
  timestampWindow?: number

  /**
   * Nonce cache instance for replay prevention
   */
  nonceCache?: NonceCache

  /**
   * Whether to require resourceKey validation
   */
  requireResourceKey?: boolean
}

/**
 * Create resource validation middleware
 * Validates developer identity and signature for custody message forwarding
 */
export function createResourceValidationMiddleware(config?: ResourceValidationConfig) {
  const excludePaths = config?.excludePaths ?? ['/health', '/ready', '/metrics']
  const timestampWindow = config?.timestampWindow ?? 300
  const nonceCache = config?.nonceCache ?? defaultNonceCache
  const requireResourceKey = config?.requireResourceKey ?? false

  return async (
    req: ResourceValidationRequest,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    // Skip excluded paths
    if (excludePaths.some(path => req.path.startsWith(path))) {
      return next()
    }

    // Only allow POST method
    if (req.method !== 'POST') {
      sendErrorResponse(res, 405, 40501, 'Method not allowed. Only POST is supported.', req)
      return
    }

    // Extract basic info
    const basic = extractBasicInfo(req)

    if (!basic) {
      sendErrorResponse(res, 400, ResourceValidationErrorCode.MISSING_BASIC,
        'Missing or incomplete basic info in request body. Required format: { basic: { appId, resourceKey, timestamp, nonce, signature }, business: { ... } }', req)
      return
    }

    // Validate appId format
    if (!isValidAppIdFormat(basic.appId)) {
      sendErrorResponse(res, 401, ResourceValidationErrorCode.INVALID_APPID_FORMAT, 'Invalid appId format', req)
      return
    }

    // Validate timestamp is within acceptable range
    if (!isTimestampValid(basic.timestamp!, timestampWindow)) {
      // Log timestamp validation failure
      logger.warn('Timestamp validation failed', {
        type: 'audit',
        event: 'timestamp_validation_failed',
        appId: basic.appId,
        resourceKey: basic.resourceKey,
        timestamp: basic.timestamp,
        nonce: basic.nonce,
        reason: 'timestamp_out_of_range',
        trace_id: getTraceId(req),
      })
      res.status(401).json({
        code: ResourceValidationErrorCode.INVALID_TIMESTAMP,
        message: 'Invalid or expired timestamp',
        trace_id: getTraceId(req),
      })
      return
    }

    try {
      const prisma = getPrismaClient()

      // Query Application table to verify appId exists and is active
      const application = await prisma.application.findUnique({
        where: { id: basic.appId },
        include: {
          developer: {
            select: {
              id: true,
              email: true,
              name: true,
              company: true,
              status: true
            }
          }
        }
      })

      // Verify application exists
      if (!application) {
        sendErrorResponse(res, 401, ResourceValidationErrorCode.APP_NOT_FOUND, 'Invalid appId: application not found', req)
        return
      }

      // Verify application status
      if (application.status !== 'active') {
        sendErrorResponse(res, 401, ResourceValidationErrorCode.APP_NOT_ACTIVE, 'Application is not active', req)
        return
      }

      // Verify developer status
      if (application.developer.status !== 'active') {
        sendErrorResponse(res, 401, ResourceValidationErrorCode.DEVELOPER_NOT_ACTIVE, 'Developer account is not active', req)
        return
      }

      // Verify resourceKey authorization using ResourceAuthorizationService
      const authService = getAuthorizationService()
      const authResult = await authService.checkAuthorization(
        basic.appId,
        basic.resourceKey
      )

      if (!authResult.authorized) {
        res.status(403).json({
          code: ResourceValidationErrorCode.INVALID_RESOURCE_KEY,
          message: authResult.errorMessage || 'Resource key not authorized for this application',
          trace_id: getTraceId(req),
        })
        return
      }

      // Store authorization details in request context
      req.authorizationId = authResult.authorizationId
      req.userId = authResult.userId

      // Check for nonce replay
      const isDuplicate = await nonceCache.isDuplicate(basic.appId, basic.nonce)
      if (isDuplicate) {
        sendErrorResponse(res, 401, ResourceValidationErrorCode.DUPLICATE_NONCE, 'Duplicate nonce detected', req)
        return
      }

      // Extract business data for signature verification
      const businessData = extractBusinessData(req)

      // Verify signature
      const isValidSignature = verifyMd5Signature(
        application.appSecret,
        basic.signature,
        basic,
        businessData
      )

      if (!isValidSignature) {
        // Log signature verification failure with masked signature
        logger.warn('Signature verification failed', {
          type: 'audit',
          event: 'signature_verification_failed',
          appId: basic.appId,
          resourceKey: basic.resourceKey,
          timestamp: basic.timestamp,
          nonce: basic.nonce,
          signature: maskSignature(basic.signature),
          reason: 'signature_mismatch',
          trace_id: getTraceId(req),
        })
        res.status(401).json({
          code: ResourceValidationErrorCode.INVALID_SIGNATURE,
          message: 'Invalid signature',
          trace_id: getTraceId(req),
        })
        return
      }

      // Record nonce for replay prevention
      await nonceCache.record(basic.appId, basic.nonce)

      // Validate resourceKey if required
      if (requireResourceKey && !basic.resourceKey) {
        sendErrorResponse(res, 403, ResourceValidationErrorCode.INVALID_RESOURCE_KEY, 'Resource key is required', req)
        return
      }

      // Attach developer context and resource info to request
      req.developerContext = {
        appId: application.id,
        appName: application.appName,
        appStatus: application.status,
        appSecret: application.appSecret,
        developerId: application.developer.id,
        developerEmail: application.developer.email,
        developerName: application.developer.name || '',
        developerCompany: application.developer.company || ''
      }

      req.resourceKey = basic.resourceKey
      req.businessData = extractBusinessData(req) ?? undefined

      next()
    } catch (error) {
      logger.error('Resource validation error', {
        type: 'error',
        event: 'resource_validation_error',
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        trace_id: getTraceId(req),
      })
      sendErrorResponse(res, 500, 50001, 'Internal server error during validation', req)
    }
  }
}

/**
 * Default resource validation middleware instance
 */
export const resourceValidationMiddleware = createResourceValidationMiddleware()

/**
 * Require resource key validation (use after resourceValidationMiddleware)
 */
export function requireResourceKey(
  req: ResourceValidationRequest,
  res: Response,
  next: NextFunction
): void {
  if (!req.resourceKey) {
    sendErrorResponse(res, 403, ResourceValidationErrorCode.INVALID_RESOURCE_KEY, 'Resource key is required', req)
    return
  }
  next()
}

export default {
  createResourceValidationMiddleware,
  resourceValidationMiddleware,
  requireResourceKey,
  NonceCache
}
