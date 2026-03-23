/**
 * Developer Controller
 * Handles developer/IsvDeveloper management APIs for admin portal
 */

import { Request, Response } from 'express'
import { getIsvDeveloperRepository } from '../repositories/repository.factory'
import { IsvDeveloper, StatusChange } from '../types/isv.types'

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

// Add status change to history
async function addStatusHistory(
  isvId: string,
  type: 'status' | 'kyb_status',
  fromStatus: string,
  toStatus: string,
  operator: string,
  reason?: string
): Promise<void> {
  const isvRepo = getIsvDeveloperRepository()
  const isv = await isvRepo.findById(isvId) as IsvDeveloper | null

  if (!isv) return

  const history: StatusChange = {
    id: generateId(),
    isvId,
    type,
    fromStatus,
    toStatus,
    reason,
    operatedBy: operator,
    operatedAt: new Date().toISOString()
  }

  const currentHistory = (isv as any).statusHistory || []
  await isvRepo.update(isvId, {
    statusHistory: [...currentHistory, history]
  })
}

// Developer list response interface
interface DeveloperListItem {
  id: string
  legalName: string
  registrationNumber?: string
  jurisdiction?: string
  contactEmail: string
  status: string
  kybStatus: string
  createdAt: string
}

// Format IsvDeveloper to developer item
function formatDeveloperItem(isv: IsvDeveloper, contactEmail?: string): DeveloperListItem {
  return {
    id: isv.id,
    legalName: isv.legalName,
    registrationNumber: isv.registrationNumber,
    jurisdiction: isv.jurisdiction,
    contactEmail: contactEmail || '',
    status: isv.status,
    kybStatus: isv.kybStatus,
    createdAt: isv.createdAt
  }
}

/**
 * GET /admin/developers
 * Get list of developers with pagination and filtering
 */
export async function getDevelopers(req: Request, res: Response): Promise<void> {
  try {
    const {
      page = '1',
      pageSize = '10',
      status,
      kybStatus
    } = req.query

    const isvRepo = getIsvDeveloperRepository()

    // Get all IsvDevelopers
    const allIsvDevelopers = await isvRepo.findAll() as IsvDeveloper[]

    // Apply filters
    let filteredIsvDevelopers = allIsvDevelopers
    if (status) {
      filteredIsvDevelopers = filteredIsvDevelopers.filter(isv => isv.status === status)
    }
    if (kybStatus) {
      filteredIsvDevelopers = filteredIsvDevelopers.filter(isv => isv.kybStatus === kybStatus)
    }

    // Sort by createdAt descending
    filteredIsvDevelopers.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Pagination
    const pageNum = parseInt(page as string, 10)
    const size = parseInt(pageSize as string, 10)
    const start = (pageNum - 1) * size
    const paginatedIsvDevelopers = filteredIsvDevelopers.slice(start, start + size)

    // Format response
    const list = paginatedIsvDevelopers.map(isv => formatDeveloperItem(isv))

    res.json({
      code: 0,
      data: {
        list,
        total: filteredIsvDevelopers.length,
        page: pageNum,
        pageSize: size
      }
    })
  } catch (error) {
    console.error('Failed to get developers:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get developers'
    })
  }
}

/**
 * GET /admin/developers/:id
 * Get developer detail by ID
 */
export async function getDeveloperById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    // Get contact email from IsvDeveloper user if available
    // For now, use a placeholder or try to get from related data
    const contactEmail = (isv as any).contactEmail || ''

    res.json({
      code: 0,
      data: {
        ...formatDeveloperItem(isv, contactEmail),
        contactPhone: (isv as any).contactPhone || '',
        website: isv.website || '',
        kybReviewedBy: (isv as any).kybReviewedBy || '',
        kybReviewedAt: (isv as any).kybReviewedAt || '',
        dateOfIncorporation: isv.dateOfIncorporation,
        registeredAddress: isv.registeredAddress,
        uboInfo: isv.uboInfo || [],
        updatedAt: isv.updatedAt
      }
    })
  } catch (error) {
    console.error('Failed to get developer detail:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get developer detail'
    })
  }
}

/**
 * POST /admin/developers/:id/approve
 * Approve developer KYB
 */
export async function approveDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const adminEmail = (req as any).user?.email || 'admin@cregis.com'

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    if (isv.kybStatus === 'approved') {
      res.status(400).json({
        code: 400,
        message: 'Developer is already approved'
      })
      return
    }

    const oldKybStatus = isv.kybStatus
    const oldStatus = isv.status

    // Update KYB status
    await isvRepo.update(id, {
      kybStatus: 'approved',
      kybReviewedAt: new Date().toISOString(),
      kybReviewedBy: adminEmail,
      status: 'active',
      updatedAt: new Date().toISOString()
    })

    // Add to history
    await addStatusHistory(id, 'kyb_status', oldKybStatus, 'approved', adminEmail)
    await addStatusHistory(id, 'status', oldStatus, 'active', adminEmail, 'KYB approved')

    res.json({
      code: 0,
      message: 'Developer approved successfully'
    })
  } catch (error) {
    console.error('Failed to approve developer:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to approve developer'
    })
  }
}

/**
 * POST /admin/developers/:id/reject
 * Reject developer KYB
 */
export async function rejectDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body
    const adminEmail = (req as any).user?.email || 'admin@cregis.com'

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        code: 400,
        message: 'Rejection reason is required'
      })
      return
    }

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    if (isv.kybStatus === 'rejected') {
      res.status(400).json({
        code: 400,
        message: 'Developer is already rejected'
      })
      return
    }

    const oldKybStatus = isv.kybStatus
    const oldStatus = isv.status

    // Update KYB status
    await isvRepo.update(id, {
      kybStatus: 'rejected',
      kybReviewedAt: new Date().toISOString(),
      kybReviewedBy: adminEmail,
      rejectReason: reason.trim(),
      status: 'suspended',
      updatedAt: new Date().toISOString()
    })

    // Add to history
    await addStatusHistory(id, 'kyb_status', oldKybStatus, 'rejected', adminEmail, reason.trim())
    await addStatusHistory(id, 'status', oldStatus, 'suspended', adminEmail, reason.trim())

    res.json({
      code: 0,
      message: 'Developer rejected successfully'
    })
  } catch (error) {
    console.error('Failed to reject developer:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to reject developer'
    })
  }
}

/**
 * POST /admin/developers/:id/activate
 * Activate developer account
 */
export async function activateDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const adminEmail = (req as any).user?.email || 'admin@cregis.com'

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    if (isv.status === 'active') {
      res.status(400).json({
        code: 400,
        message: 'Developer is already active'
      })
      return
    }

    const oldStatus = isv.status

    await isvRepo.update(id, {
      status: 'active',
      updatedAt: new Date().toISOString()
    })

    // Add to history
    await addStatusHistory(id, 'status', oldStatus, 'active', adminEmail)

    res.json({
      code: 0,
      message: 'Developer activated successfully'
    })
  } catch (error) {
    console.error('Failed to activate developer:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to activate developer'
    })
  }
}

/**
 * POST /admin/developers/:id/suspend
 * Suspend developer account
 */
export async function suspendDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body
    const adminEmail = (req as any).user?.email || 'admin@cregis.com'

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    if (isv.status === 'suspended') {
      res.status(400).json({
        code: 400,
        message: 'Developer is already suspended'
      })
      return
    }

    const oldStatus = isv.status
    const suspendReason = reason?.trim() || ''

    await isvRepo.update(id, {
      status: 'suspended',
      suspendReason: suspendReason,
      suspendedAt: new Date().toISOString(),
      suspendedBy: adminEmail,
      updatedAt: new Date().toISOString()
    })

    // Add to history
    await addStatusHistory(id, 'status', oldStatus, 'suspended', adminEmail, suspendReason || 'Suspended by admin')

    res.json({
      code: 0,
      message: 'Developer suspended successfully'
    })
  } catch (error) {
    console.error('Failed to suspend developer:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to suspend developer'
    })
  }
}

/**
 * POST /admin/developers/:id/ban
 * Ban developer account
 */
export async function banDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body
    const adminEmail = (req as any).user?.email || 'admin@cregis.com'

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      res.status(400).json({
        code: 400,
        message: 'Ban reason is required'
      })
      return
    }

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    if (isv.status === 'banned') {
      res.status(400).json({
        code: 400,
        message: 'Developer is already banned'
      })
      return
    }

    const oldStatus = isv.status
    const banReason = reason.trim()

    await isvRepo.update(id, {
      status: 'banned',
      banReason: banReason,
      bannedAt: new Date().toISOString(),
      bannedBy: adminEmail,
      updatedAt: new Date().toISOString()
    })

    // Add to history
    await addStatusHistory(id, 'status', oldStatus, 'banned', adminEmail, banReason)

    res.json({
      code: 0,
      message: 'Developer banned successfully'
    })
  } catch (error) {
    console.error('Failed to ban developer:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to ban developer'
    })
  }
}

/**
 * GET /admin/developers/:id/history
 * Get developer status change history
 */
export async function getDeveloperHistory(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id) as IsvDeveloper | null

    if (!isv) {
      res.status(404).json({
        code: 404,
        message: 'Developer not found'
      })
      return
    }

    const history = (isv as any).statusHistory || []

    // Sort by operatedAt descending (newest first)
    history.sort((a: StatusChange, b: StatusChange) =>
      new Date(b.operatedAt).getTime() - new Date(a.operatedAt).getTime()
    )

    res.json({
      code: 0,
      data: history
    })
  } catch (error) {
    console.error('Failed to get developer history:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get developer history'
    })
  }
}

/**
 * GET /admin/developers/stats
 * Get developer statistics
 */
export async function getDeveloperStats(req: Request, res: Response): Promise<void> {
  try {
    const isvRepo = getIsvDeveloperRepository()
    const allIsvDevelopers = await isvRepo.findAll() as IsvDeveloper[]

    // Count by status
    const statusCounts: Record<string, number> = {
      active: 0,
      suspended: 0,
      banned: 0,
      pending: 0
    }

    // Count by KYB status
    const kybStatusCounts: Record<string, number> = {
      approved: 0,
      pending: 0,
      rejected: 0
    }

    let totalApproved = 0
    let totalRejected = 0

    for (const isv of allIsvDevelopers) {
      // Status counts
      if (statusCounts[isv.status] !== undefined) {
        statusCounts[isv.status]++
      }

      // KYB status counts
      if (kybStatusCounts[isv.kybStatus] !== undefined) {
        kybStatusCounts[isv.kybStatus]++
      }

      // For approval rate calculation
      if (isv.kybStatus === 'approved') {
        totalApproved++
      }
      if (isv.kybStatus === 'rejected') {
        totalRejected++
      }
    }

    const total = allIsvDevelopers.length
    const reviewed = totalApproved + totalRejected
    const approvalRate = reviewed > 0 ? Math.round((totalApproved / reviewed) * 100) : 0

    res.json({
      code: 0,
      data: {
        total,
        byStatus: statusCounts,
        byKYBStatus: kybStatusCounts,
        approvalRate,
        pendingReview: statusCounts.pending + kybStatusCounts.pending
      }
    })
  } catch (error) {
    console.error('Failed to get developer stats:', error)
    res.status(500).json({
      code: 500,
      message: 'Failed to get developer stats'
    })
  }
}
