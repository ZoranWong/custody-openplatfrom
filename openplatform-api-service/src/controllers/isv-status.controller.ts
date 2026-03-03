import { Request, Response } from 'express'
import { kybReviewService, KYBStatus, ISVStatus, type ISVStatusAction, type ISVStatusHistoryItem } from '../services/kyb-review.service'

// ============================================
// Types for request/body parameters
// ============================================

interface StatusActionBody {
  status: string
  reason?: string
}

interface ISVStatusResponse {
  id: string
  developerId: string
  companyName: string
  email: string
  status: ISVStatus
  kybStatus: string
  createdAt: string
  updatedAt: string
  statusHistory: ISVStatusHistoryItem[]
}

// ============================================
// ISV Status Controller
// ============================================

/**
 * GET /admin/isv/:id/status
 * Get ISV status details
 */
export async function getISVStatus(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const isv = kybReviewService.getISVById(id)

    if (!isv) {
      res.status(404).json({
        code: 40401,
        message: 'ISV account not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    const response: ISVStatusResponse = {
      id: isv.id,
      developerId: isv.developerId,
      companyName: isv.companyName,
      email: isv.email,
      status: isv.status,
      kybStatus: isv.kybStatus,
      createdAt: isv.createdAt,
      updatedAt: isv.updatedAt,
      statusHistory: isv.statusHistory
    }

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get ISV status error:', error)
    res.status(500).json({
      code: 50020,
      message: 'Failed to get ISV status',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * POST /admin/isv/:id/activate
 * Activate a suspended or banned ISV
 */
export async function activateISV(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body as StatusActionBody
    const adminId = req.headers['x-admin-id'] as string || 'unknown'

    // Validate status is valid
    const action: ISVStatusAction = {
      status: ISVStatus.ACTIVE,
      reason
    }

    const result = kybReviewService.changeISVStatus(id, adminId, action)

    if (!result.success) {
      res.status(400).json({
        code: 40021,
        message: result.error || 'Failed to activate ISV',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'ISV activated successfully',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Activate ISV error:', error)
    res.status(500).json({
      code: 50021,
      message: 'Failed to activate ISV',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * POST /admin/isv/:id/suspend
 * Suspend an active ISV
 */
export async function suspendISV(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body as StatusActionBody
    const adminId = req.headers['x-admin-id'] as string || 'unknown'

    const action: ISVStatusAction = {
      status: ISVStatus.SUSPENDED,
      reason
    }

    const result = kybReviewService.changeISVStatus(id, adminId, action)

    if (!result.success) {
      res.status(400).json({
        code: 40022,
        message: result.error || 'Failed to suspend ISV',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'ISV suspended successfully',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Suspend ISV error:', error)
    res.status(500).json({
      code: 50022,
      message: 'Failed to suspend ISV',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * POST /admin/isv/:id/ban
 * Ban an active or suspended ISV (requires reason)
 */
export async function banISV(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body as StatusActionBody
    const adminId = req.headers['x-admin-id'] as string || 'unknown'

    if (!reason) {
      res.status(400).json({
        code: 40023,
        message: 'Ban reason is required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    const action: ISVStatusAction = {
      status: ISVStatus.BANNED,
      reason
    }

    const result = kybReviewService.changeISVStatus(id, adminId, action)

    if (!result.success) {
      res.status(400).json({
        code: 40024,
        message: result.error || 'Failed to ban ISV',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'ISV banned successfully',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Ban ISV error:', error)
    res.status(500).json({
      code: 50023,
      message: 'Failed to ban ISV',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * GET /admin/isv/:id/status/history
 * Get ISV status change history
 */
export async function getISVStatusHistory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const history = kybReviewService.getISVStatusHistory(id)

    res.json({
      code: 0,
      message: 'Success',
      data: history,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get ISV status history error:', error)
    res.status(500).json({
      code: 50024,
      message: 'Failed to get ISV status history',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}
