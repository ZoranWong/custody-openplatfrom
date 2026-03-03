import { Request, Response, NextFunction } from 'express'
import { AuditAction, AuditResult, createAuditLog } from '../services/admin-audit.service'

/**
 * Audit middleware factory - logs all admin actions
 * @param action - The action being performed
 * @param getResource - Function to extract resource ID from request
 */
export function auditMiddleware(
  action: AuditAction,
  getResource?: (req: Request) => string | undefined
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original end function
    const originalEnd = res.end.bind(res)

    let responseBody: any
    let responseSent = false

    // Capture response
    res.end = function (chunk?: any, ...args: any[]): Response {
      responseSent = true
      return originalEnd(chunk, ...args)
    }

    // Proceed to next middleware/route handler
    try {
      await new Promise<void>((resolve, reject) => {
        const stream = res as any
        const originalWrite = stream.write.bind(stream)

        let body = ''
        stream.write = (chunk: any) => {
          body += chunk.toString()
          return originalWrite(chunk)
        }

        next()
        stream.write = originalWrite

        // Wait for response
        res.on('finish', () => {
          resolve()
        })
        res.on('error', reject)

        // Timeout protection
        setTimeout(resolve, 5000)
      })
    } catch (error) {
      // Continue even if there's an error
    }

    // Determine result
    const result = res.statusCode >= 200 && res.statusCode < 400
      ? AuditResult.SUCCESS
      : AuditResult.FAILURE

    // Get admin info from request (set by auth middleware)
    const adminId = (req as any).adminId || 'anonymous'
    const adminEmail = (req as any).adminEmail || 'unknown'
    const adminRole = (req as any).adminRole || 'unknown'

    // Get resource ID
    const resourceId = getResource ? getResource(req) : undefined

    // Create audit log
    await createAuditLog({
      adminId,
      adminEmail,
      adminRole,
      action,
      resource: action,
      resourceId,
      result,
      req,
      errorMessage: result === AuditResult.FAILURE ? 'Operation failed' : undefined
    })

    // Continue response
    if (!responseSent) {
      originalEnd()
    }
  }
}

/**
 * Simple audit middleware that logs action after response
 */
export function simpleAudit(action: AuditAction) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // Store original end
    const originalEnd = res.end.bind(res)

    // Capture response status
    let statusCode = 200

    res.end = function (...args: any[]): Response {
      statusCode = res.statusCode
      return originalEnd(...args)
    }

    await next()

    // Log after response is sent
    const adminId = (req as any).adminId
    const adminEmail = (req as any).adminEmail
    const adminRole = (req as any).adminRole

    if (adminId && adminEmail) {
      const result = statusCode >= 200 && statusCode < 400
        ? AuditResult.SUCCESS
        : AuditResult.FAILURE

      await createAuditLog({
        adminId,
        adminEmail,
        adminRole,
        action,
        resource: action,
        result,
        req
      })
    }
  }
}

/**
 * Middleware to skip auditing for specific paths
 */
export function skipAudit(...paths: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const shouldSkip = paths.some(path => req.path.startsWith(path))
    ;(req as any).skipAudit = shouldSkip
    next()
  }
}

/**
 * Middleware that requires audit logging for the request
 */
export function requireAudit(req: Request, _res: Response, next: NextFunction): void {
  if ((req as any).skipAudit) {
    return next()
  }

  // Mark request as requiring audit
  ;(req as any).requiresAudit = true
  next()
}
