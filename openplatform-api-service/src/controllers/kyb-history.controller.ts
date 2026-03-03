import { Request, Response } from 'express'
import { kybReviewService, KYBStatus, type HistoryFilters, type KYBHistoryItem } from '../services/kyb-review.service'

// ============================================
// Types for request/query parameters
// ============================================

interface HistoryQueryParams {
  status?: string
  startDate?: string
  endDate?: string
  search?: string
  page?: string
  limit?: string
  sortBy?: 'reviewedAt' | 'submittedAt'
  sortOrder?: 'asc' | 'desc'
}

interface KYBHistoryListResponse {
  id: string
  companyName: string
  reviewerId: string
  decision: string
  comments?: string
  reviewedAt: string
  submittedAt: string
}

interface KYBPaginatedHistoryResponse {
  items: KYBHistoryListResponse[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ============================================
// KYB History Controller
// ============================================

/**
 * GET /admin/kyb/history
 * List KYB history with filters and pagination
 */
export async function getKYBHistory(req: Request, res: Response): Promise<void> {
  try {
    const query = req.query as HistoryQueryParams

    // Parse pagination parameters
    const page = query.page ? parseInt(query.page) : 1
    const limit = query.limit ? parseInt(query.limit) : 20

    // Build filters
    const filters: HistoryFilters = {
      status: query.status as KYBStatus | undefined,
      startDate: query.startDate,
      endDate: query.endDate,
      search: query.search,
      page,
      limit,
      sortBy: query.sortBy,
      sortOrder: query.sortOrder
    }

    // Get history applications
    const result = kybReviewService.getHistoryApplications(filters)

    // Apply pagination
    const startIndex = (page - 1) * limit
    const endIndex = startIndex + limit
    const paginatedItems = result.items.slice(startIndex, endIndex)

    const response: KYBHistoryListResponse[] = paginatedItems.map(item => ({
      id: item.id,
      companyName: item.companyName,
      reviewerId: item.reviewerId,
      decision: item.decision,
      comments: item.comments,
      reviewedAt: item.reviewedAt,
      submittedAt: item.submittedAt
    }))

    res.json({
      code: 0,
      message: 'Success',
      data: {
        items: response,
        total: result.total,
        page,
        limit,
        totalPages: Math.ceil(result.total / limit)
      },
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  } catch (error) {
    console.error('Get KYB history error:', error)
    res.status(500).json({
      code: 50010,
      message: 'Failed to get KYB history',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}

/**
 * GET /admin/kyb/history/:id
 * Get KYB history application detail
 */
export async function getKYBHistoryById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const application = kybReviewService.getHistoryApplicationById(id)

    if (!application) {
      res.status(404).json({
        code: 40402,
        message: 'KYB history application not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || ''
      })
      return
    }

    const response = {
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
    console.error('Get KYB history by ID error:', error)
    res.status(500).json({
      code: 50011,
      message: 'Failed to get KYB history application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || ''
    })
  }
}
