import { Request, Response, NextFunction } from 'express'

// ============================================
// Admin Rate Limiting Middleware
// ============================================

// Rate limit configuration per endpoint type
interface RateLimitConfig {
  windowMs: number // Time window in milliseconds
  maxRequests: number // Max requests per window
}

interface EndpointConfig {
  [key: string]: RateLimitConfig
}

// Endpoint-specific rate limits
const ENDPOINT_CONFIGS: EndpointConfig = {
  // Authentication endpoints (stricter limits)
  '/api/v1/admin/auth/login': {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 5 // 5 login attempts per minute
  },
  '/api/v1/admin/auth/refresh': {
    windowMs: 60 * 1000,
    maxRequests: 10
  },
  '/api/v1/admin/auth/logout': {
    windowMs: 60 * 1000,
    maxRequests: 20
  },

  // Sensitive operations (stricter limits)
  '/api/v1/admin/auth/password/change': {
    windowMs: 60 * 1000,
    maxRequests: 3
  },

  // ISV management (moderate limits)
  '/api/v1/admin/isv': {
    windowMs: 60 * 1000,
    maxRequests: 30
  },

  // Application management
  '/api/v1/admin/app': {
    windowMs: 60 * 1000,
    maxRequests: 30
  },

  // Dashboard and analytics (more lenient)
  '/api/v1/admin/dashboard': {
    windowMs: 60 * 1000,
    maxRequests: 60
  },

  // Audit log queries (expensive operations)
  '/api/v1/admin/audit': {
    windowMs: 60 * 1000,
    maxRequests: 15
  },

  // Default for unspecified endpoints
  default: {
    windowMs: 60 * 1000,
    maxRequests: 100
  }
}

// In-memory rate limit storage (use Redis in production)
interface RateLimitEntry {
  count: number
  resetTime: number
}

class AdminRateLimitStore {
  private limits: Map<string, RateLimitEntry> = new Map()
  private cleanupInterval: NodeJS.Timeout

  constructor() {
    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000)
  }

  /**
   * Get rate limit for a key
   */
  get(key: string): RateLimitEntry | null {
    const entry = this.limits.get(key)
    if (!entry) return null

    // Check if expired
    if (Date.now() > entry.resetTime) {
      this.limits.delete(key)
      return null
    }

    return entry
  }

  /**
   * Increment rate limit for a key
   */
  increment(key: string, windowMs: number): RateLimitEntry {
    const now = Date.now()
    const entry = this.limits.get(key)

    if (!entry || now > entry.resetTime) {
      // New window
      const newEntry: RateLimitEntry = {
        count: 1,
        resetTime: now + windowMs
      }
      this.limits.set(key, newEntry)
      return newEntry
    }

    // Increment existing window
    entry.count++
    return entry
  }

  /**
   * Check if key is rate limited
   */
  isLimited(key: string, maxRequests: number, windowMs: number): boolean {
    const entry = this.get(key)
    if (!entry) return false
    return entry.count >= maxRequests
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now()
    let removed = 0

    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key)
        removed++
      }
    }

    if (removed > 0) {
      console.log(`[RateLimit] Cleaned up ${removed} expired entries`)
    }
  }

  /**
   * Get current store stats
   */
  getStats(): { totalKeys: number; approximateMemory: string } {
    return {
      totalKeys: this.limits.size,
      approximateMemory: `${(this.limits.size * 100) / 1024} KB`
    }
  }

  /**
   * Shutdown cleanup
   */
  shutdown(): void {
    clearInterval(this.cleanupInterval)
    this.limits.clear()
  }

  /**
   * Reset rate limit for a specific client (public method)
   */
  resetClient(clientId: string): boolean {
    return this.limits.delete(clientId)
  }
}

// Singleton store instance
const rateLimitStore = new AdminRateLimitStore()

/**
 * Get client identifier for rate limiting
 */
function getClientIdentifier(req: Request): string {
  // Try to get admin ID first (authenticated requests)
  const adminId = (req as any).adminId
  if (adminId) {
    return `admin:${adminId}`
  }

  // Fall back to IP for unauthenticated requests
  const forwarded = req.headers['x-forwarded-for']
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded : forwarded[0]).split(',')[0].trim()
    : req.socket?.remoteAddress || req.ip || 'unknown'

  return `ip:${ip}`
}

/**
 * Get rate limit configuration for a request
 */
function getEndpointConfig(req: Request): RateLimitConfig {
  const path = req.path

  // Check for exact match first
  if (ENDPOINT_CONFIGS[path]) {
    return ENDPOINT_CONFIGS[path]
  }

  // Check for prefix match
  for (const [key, config] of Object.entries(ENDPOINT_CONFIGS)) {
    if (path.startsWith(key)) {
      return config
    }
  }

  return ENDPOINT_CONFIGS.default
}

/**
 * Rate limit middleware factory
 * @param options - Optional configuration overrides
 */
export function createRateLimitMiddleware(options?: Partial<RateLimitConfig>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const clientId = getClientIdentifier(req)
    const endpointConfig = getEndpointConfig(req)
    const config = { ...endpointConfig, ...options }

    // Check if already limited
    if (rateLimitStore.isLimited(clientId, config.maxRequests, config.windowMs)) {
      const entry = rateLimitStore.get(clientId)
      const resetTime = entry?.resetTime || Date.now() + config.windowMs
      const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

      res.setHeader('X-RateLimit-Limit', config.maxRequests)
      res.setHeader('X-RateLimit-Remaining', 0)
      res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000))
      res.setHeader('Retry-After', retryAfter)

      res.status(429).json({
        code: 42901,
        message: 'Too many requests. Please try again later.',
        data: {
          retry_after: retryAfter,
          limit: config.maxRequests,
          window_seconds: Math.ceil(config.windowMs / 1000)
        },
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    // Increment counter
    const entry = rateLimitStore.increment(clientId, config.windowMs)

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', config.maxRequests)
    res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count))
    res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000))

    next()
  }
}

/**
 * Stricter rate limit for sensitive operations
 */
export function strictRateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientId = getClientIdentifier(req)
  const config = {
    windowMs: 60 * 1000, // 1 minute
    maxRequests: 3 // Only 3 attempts
  }

  if (rateLimitStore.isLimited(clientId, config.maxRequests, config.windowMs)) {
    const entry = rateLimitStore.get(clientId)
    const resetTime = entry?.resetTime || Date.now() + config.windowMs
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

    res.setHeader('X-RateLimit-Limit', config.maxRequests)
    res.setHeader('X-RateLimit-Remaining', 0)
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000))
    res.setHeader('Retry-After', retryAfter)

    res.status(429).json({
      code: 42902,
      message: 'Rate limit exceeded for sensitive operation',
      data: {
        retry_after: retryAfter,
        operation: 'sensitive'
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
    return
  }

  const entry = rateLimitStore.increment(clientId, config.windowMs)

  res.setHeader('X-RateLimit-Limit', config.maxRequests)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count))
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000))

  next()
}

/**
 * More lenient rate limit for read operations
 */
export function lenientRateLimit(req: Request, res: Response, next: NextFunction): void {
  const clientId = getClientIdentifier(req)
  const config = {
    windowMs: 60 * 1000,
    maxRequests: 200
  }

  if (rateLimitStore.isLimited(clientId, config.maxRequests, config.windowMs)) {
    const entry = rateLimitStore.get(clientId)
    const resetTime = entry?.resetTime || Date.now() + config.windowMs
    const retryAfter = Math.ceil((resetTime - Date.now()) / 1000)

    res.setHeader('X-RateLimit-Limit', config.maxRequests)
    res.setHeader('X-RateLimit-Remaining', 0)
    res.setHeader('X-RateLimit-Reset', Math.ceil(resetTime / 1000))
    res.setHeader('Retry-After', retryAfter)

    res.status(429).json({
      code: 42903,
      message: 'Too many read requests',
      data: {
        retry_after: retryAfter,
        operation: 'read'
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
    return
  }

  const entry = rateLimitStore.increment(clientId, config.windowMs)

  res.setHeader('X-RateLimit-Limit', config.maxRequests)
  res.setHeader('X-RateLimit-Remaining', Math.max(0, config.maxRequests - entry.count))
  res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetTime / 1000))

  next()
}

/**
 * Get rate limit status for a client (without incrementing)
 */
export function getRateLimitStatus(req: Request): {
  limited: boolean
  remaining: number
  resetTime: number
  limit: number
} {
  const clientId = getClientIdentifier(req)
  const endpointConfig = getEndpointConfig(req)

  const entry = rateLimitStore.get(clientId)

  if (!entry) {
    return {
      limited: false,
      remaining: endpointConfig.maxRequests,
      resetTime: Date.now() + endpointConfig.windowMs,
      limit: endpointConfig.maxRequests
    }
  }

  const remaining = Math.max(0, endpointConfig.maxRequests - entry.count)

  return {
    limited: entry.count >= endpointConfig.maxRequests,
    remaining,
    resetTime: entry.resetTime,
    limit: endpointConfig.maxRequests
  }
}

/**
 * Reset rate limit for a specific client (admin use)
 */
export function resetClientRateLimit(clientId: string): boolean {
  return rateLimitStore.resetClient(clientId)
}

/**
 * Get rate limit store statistics
 */
export function getRateLimitStats(): ReturnType<typeof rateLimitStore.getStats> {
  return rateLimitStore.getStats()
}

/**
 * Export store for monitoring
 */
export { rateLimitStore }

/**
 * Shutdown rate limit store (call on server shutdown)
 */
export function shutdownRateLimitStore(): void {
  rateLimitStore.shutdown()
}
