import { Request, Response } from 'express'
import { kybReviewService, KYBStatus } from '../services/kyb-review.service'

// ============================================
// Types for request bodies
// ============================================

interface ReviewRequestBody {
  status: string
  comment?: string
}

interface ReviewResponse {
  id: string
  timestamp: string
  adminId: string
  action: string
  details?: string
}

interface KYBApplicationResponse {
  id: string
  developerId: string
  companyName: string
  registrationNumber: string
  businessLicenseUrl: string
  uboInfo: Array<{
    name: string
    nationality: string
    ownershipPercentage: number
    position: string
    documentUrl?: string
  }>
  companyStructure: Array<{
    entityName: string
    relationship: string
    ownershipPercentage: number
  }>
  contactInfo: {
    name: string
    email: string
    phone: string
    position: string
  }
  submittedAt: string
  status: string
  reviewerId?: string
  reviewerComment?: string
  reviewedAt?: string
  auditTrail: ReviewResponse[]
}

interface KYBPendingListResponse {
  id: string
  companyName: string
  registrationNumber: string
  submittedAt: string
  status: string
}

interface KYBStatsResponse {
  pending: number
  approved: number
  rejected: number
  pendingInfo: number
}

// ============================================
// KYB Review Controller
// ============================================

/**
 * GET /admin/kyb/pending
 * List all pending KYB applications
 */
export async function getPendingKYB(req: Request, res: Response): Promise<void> {
  try {
    const applications = kybReviewService.getPendingApplications()

    const response: KYBPendingListResponse[] = applications.map(app => ({
      id: app.id,
      companyName: app.companyName,
      registrationNumber: app.registrationNumber,
      submittedAt: app.submittedAt,
      status: app.status
    }))

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get pending KYB error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Failed to get pending KYB applications',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * GET /admin/kyb
 * List all KYB applications with pagination
 */
export async function getAllKYB(req: Request, res: Response): Promise<void> {
  try {
    const statusFilter = req.query.status as string | undefined
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 20

    let applications = kybReviewService.getAllApplications()

    // Apply status filter if provided
    if (statusFilter && Object.values(KYBStatus).includes(statusFilter as KYBStatus)) {
      applications = applications.filter(app => app.status === statusFilter)
    }

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedApps = applications.slice(startIndex, endIndex)

    const response: KYBPendingListResponse[] = paginatedApps.map(app => ({
      id: app.id,
      companyName: app.companyName,
      registrationNumber: app.registrationNumber,
      submittedAt: app.submittedAt,
      status: app.status
    }))

    res.json({
      code: 0,
      message: 'Success',
      data: {
        items: response,
        total: applications.length,
        page,
        limit,
        totalPages: Math.ceil(applications.length / limit)
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get all KYB error:', error)
    res.status(500).json({
      code: 50002,
      message: 'Failed to get KYB applications',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * GET /admin/kyb/:id
 * Get KYB application details
 */
export async function getKYBById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const application = kybReviewService.getApplicationById(id)

    if (!application) {
      res.status(404).json({
        code: 40401,
        message: 'KYB application not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    const response: KYBApplicationResponse = {
      id: application.id,
      developerId: application.developerId,
      companyName: application.companyName,
      registrationNumber: application.registrationNumber,
      businessLicenseUrl: application.businessLicenseUrl,
      uboInfo: application.uboInfo,
      companyStructure: application.companyStructure,
      contactInfo: application.contactInfo,
      submittedAt: application.submittedAt,
      status: application.status,
      reviewerId: application.reviewerId,
      reviewerComment: application.reviewerComment,
      reviewedAt: application.reviewedAt,
      auditTrail: application.auditTrail.map(entry => ({
        id: entry.id,
        timestamp: entry.timestamp,
        adminId: entry.adminId,
        action: entry.action,
        details: entry.details
      }))
    }

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get KYB by ID error:', error)
    res.status(500).json({
      code: 50003,
      message: 'Failed to get KYB application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * POST /admin/kyb/:id/approve
 * Approve a KYB application
 */
export async function approveKYB(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const adminId = (req as any).adminId || 'unknown'
    const body = req.body as ReviewRequestBody

    const result = kybReviewService.reviewApplication(id, adminId, {
      status: KYBStatus.APPROVED,
      comment: body.comment
    })

    if (!result.success) {
      res.status(400).json({
        code: 40001,
        message: result.error || 'Failed to approve KYB application',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'KYB application approved successfully',
      data: {
        id: result.application!.id,
        status: result.application!.status,
        reviewedAt: result.application!.reviewedAt
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Approve KYB error:', error)
    res.status(500).json({
      code: 50004,
      message: 'Failed to approve KYB application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * POST /admin/kyb/:id/reject
 * Reject a KYB application
 */
export async function rejectKYB(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const adminId = (req as any).adminId || 'unknown'
    const body = req.body as ReviewRequestBody

    if (!body.comment || body.comment.trim().length === 0) {
      res.status(400).json({
        code: 40002,
        message: 'Rejection reason is required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    const result = kybReviewService.reviewApplication(id, adminId, {
      status: KYBStatus.REJECTED,
      comment: body.comment
    })

    if (!result.success) {
      res.status(400).json({
        code: 40001,
        message: result.error || 'Failed to reject KYB application',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'KYB application rejected',
      data: {
        id: result.application!.id,
        status: result.application!.status,
        reviewedAt: result.application!.reviewedAt
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Reject KYB error:', error)
    res.status(500).json({
      code: 50005,
      message: 'Failed to reject KYB application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * POST /admin/kyb/:id/request-info
 * Request additional information from applicant
 */
export async function requestInfoKYB(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const adminId = (req as any).adminId || 'unknown'
    const body = req.body as ReviewRequestBody

    const result = kybReviewService.reviewApplication(id, adminId, {
      status: KYBStatus.PENDING_INFO,
      comment: body.comment
    })

    if (!result.success) {
      res.status(400).json({
        code: 40001,
        message: result.error || 'Failed to request additional information',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'Additional information requested',
      data: {
        id: result.application!.id,
        status: result.application!.status,
        reviewedAt: result.application!.reviewedAt
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Request info KYB error:', error)
    res.status(500).json({
      code: 50006,
      message: 'Failed to request additional information',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * GET /admin/kyb/stats
 * Get KYB statistics
 */
export async function getKYBStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = kybReviewService.getStats()

    const response: KYBStatsResponse = {
      pending: stats.pending,
      approved: stats.approved,
      rejected: stats.rejected,
      pendingInfo: stats.pendingInfo
    }

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get KYB stats error:', error)
    res.status(500).json({
      code: 50007,
      message: 'Failed to get KYB statistics',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}
