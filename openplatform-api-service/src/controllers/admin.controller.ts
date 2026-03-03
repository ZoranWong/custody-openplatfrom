import { Request, Response } from 'express'
import { Router } from 'express'
import { auditLogService, AuditAction, AuditResult } from '../services/admin-audit.service'
import { skipAudit } from '../middleware/admin-audit.middleware'
import { adminAuthMiddleware } from '../middleware/admin-auth.middleware'
import { requireSuperAdmin } from '../middleware/admin-permission.middleware'

const router = Router()

// Skip audit for audit query endpoints (avoid infinite loop)
router.use(skipAudit('/query', '/export', '/stats'))

// Get audit logs with filters (super_admin only)
router.get('/query', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const {
      adminId,
      action,
      resource,
      resourceId,
      result,
      startDate,
      endDate,
      limit,
      offset
    } = req.query

    const { logs, total } = await auditLogService.query({
      adminId: adminId as string,
      action: action as AuditAction,
      resource: resource as string,
      resourceId: resourceId as string,
      result: result as AuditResult,
      startDate: startDate as string,
      endDate: endDate as string,
      limit: limit ? parseInt(limit as string) : 100,
      offset: offset ? parseInt(offset as string) : 0
    })

    res.json({
      code: 0,
      message: 'Success',
      data: {
        logs,
        total,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0
      },
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    res.status(500).json({
      code: 50001,
      message: 'Failed to query audit logs',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
})

// Get single audit log by ID (super_admin only)
router.get('/logs/:id', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params

    const log = await auditLogService.getById(id)

    if (!log) {
      res.status(404).json({
        code: 40401,
        message: 'Audit log not found',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'Success',
      data: log,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    res.status(500).json({
      code: 50002,
      message: 'Failed to get audit log',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
})

// Export audit logs (super_admin only)
router.get('/export', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate, format } = req.query

    if (!startDate || !endDate) {
      res.status(400).json({
        code: 40001,
        message: 'startDate and endDate are required',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const output = await auditLogService.export({
      startDate: startDate as string,
      endDate: endDate as string,
      format: (format as 'json' | 'csv') || 'csv'
    })

    const filename = `audit-logs-${startDate}-${endDate}.${(format as 'json' | 'csv') || 'csv'}`

    res.setHeader('Content-Type', format === 'json' ? 'application/json' : 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)

    res.send(output)
  } catch (error) {
    res.status(500).json({
      code: 50003,
      message: 'Failed to export audit logs',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
})

// Get audit service stats (super_admin only)
router.get('/stats', adminAuthMiddleware, requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const stats = await auditLogService.getStats()

    res.json({
      code: 0,
      message: 'Success',
      data: stats,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    res.status(500).json({
      code: 50004,
      message: 'Failed to get audit stats',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
})

export default router
