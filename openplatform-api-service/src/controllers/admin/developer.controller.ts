/**
 * Developer Controller
 * Handles developer/IsvDeveloper management APIs for admin portal
 */

import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { getIsvDeveloperRepository, getISVUserRepository } from '../../repositories/repository.factory'
import { IsvDeveloper } from '../../repositories/repository.interfaces'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

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

    // Build where clause
    const where: Prisma.IsvDeveloperWhereInput = {}
    if (status) where.status = status as string
    if (kybStatus) where.kybStatus = kybStatus as string

    const pageNum = parseInt(page as string, 10)
    const size = parseInt(pageSize as string, 10)

    // Get paginated results
    const [allIsvDevelopers, total] = await Promise.all([
      isvRepo.findByFilters(where, pageNum, size),
      isvRepo.count(where),
    ])

    const list = allIsvDevelopers.map(isv => ({
      id: isv.id,
      legalName: isv.legalName,
      registrationNumber: isv.registrationNumber,
      jurisdiction: isv.jurisdiction,
      contactEmail: isv.email,
      status: isv.status,
      kybStatus: isv.kybStatus,
      createdAt: isv.createdAt.toISOString(),
    }))

    res.json({
      code: 0,
      data: {
        list,
        total,
        page: pageNum,
        pageSize: size,
      },
    })
  } catch (error) {
    console.error('Failed to get developers:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get developers',
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
    const isv = await isvRepo.findById(id)

    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Developer not found',
      })
      return
    }

    res.json({
      code: 0,
      data: {
        id: isv.id,
        email: isv.email,
        legalName: isv.legalName,
        registrationNumber: isv.registrationNumber,
        jurisdiction: isv.jurisdiction,
        dateOfIncorporation: isv.dateOfIncorporation,
        registeredAddress: isv.registeredAddress,
        website: isv.website,
        uboInfo: isv.uboInfo,
        status: isv.status,
        kybStatus: isv.kybStatus,
        kybReviewedAt: isv.kybReviewedAt,
        kybReviewedBy: isv.kybReviewedBy,
        createdAt: isv.createdAt.toISOString(),
        updatedAt: isv.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Failed to get developer detail:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get developer detail',
    })
  }
}

/**
 * GET /admin/developers/:id/users
 * Get users belonging to a developer
 */
export async function getDeveloperUsers(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const userRepo = getISVUserRepository()
    const users = await userRepo.findByIsvDeveloper(id)

    res.json({
      code: 0,
      data: users.map(u => ({
        id: u.id,
        email: u.email,
        name: u.name,
        phone: u.phone,
        role: u.role,
        status: u.status,
        createdAt: u.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Failed to get developer users:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get developer users',
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
    const adminEmail = (req as any).adminEmail || 'unknown'

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id)

    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Developer not found' })
      return
    }

    if (isv.kybStatus === 'approved') {
      res.status(HttpCodes.BAD_REQUEST).json({ code: BusinessCodes.PARAM_REQUIRED, message: 'Developer is already approved' })
      return
    }

    await isvRepo.update(id, {
      kybStatus: 'approved',
      kybReviewedAt: new Date(),
      kybReviewedBy: adminEmail,
      status: 'active',
    })

    res.json({ code: 0, message: 'Developer approved successfully' })
  } catch (error) {
    console.error('Failed to approve developer:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to approve developer' })
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
    const adminEmail = (req as any).adminEmail || 'unknown'

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id)

    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Developer not found' })
      return
    }

    if (isv.kybStatus === 'rejected') {
      res.status(HttpCodes.BAD_REQUEST).json({ code: BusinessCodes.PARAM_REQUIRED, message: 'Developer is already rejected' })
      return
    }

    await isvRepo.update(id, {
      kybStatus: 'rejected',
      kybReviewedAt: new Date(),
      kybReviewedBy: adminEmail,
      status: 'suspended',
    })

    res.json({ code: 0, message: 'Developer rejected successfully' })
  } catch (error) {
    console.error('Failed to reject developer:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to reject developer' })
  }
}

/**
 * POST /admin/developers/:id/activate
 */
export async function activateDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id)

    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Developer not found' })
      return
    }

    if (isv.status === 'active') {
      res.status(HttpCodes.BAD_REQUEST).json({ code: BusinessCodes.PARAM_REQUIRED, message: 'Developer is already active' })
      return
    }

    await isvRepo.update(id, { status: 'active' })

    res.json({ code: 0, message: 'Developer activated successfully' })
  } catch (error) {
    console.error('Failed to activate developer:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to activate developer' })
  }
}

/**
 * POST /admin/developers/:id/suspend
 */
export async function suspendDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id)

    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Developer not found' })
      return
    }

    if (isv.status === 'suspended') {
      res.status(HttpCodes.BAD_REQUEST).json({ code: BusinessCodes.PARAM_REQUIRED, message: 'Developer is already suspended' })
      return
    }

    await isvRepo.update(id, { status: 'suspended' })

    res.json({ code: 0, message: 'Developer suspended successfully' })
  } catch (error) {
    console.error('Failed to suspend developer:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to suspend developer' })
  }
}

/**
 * POST /admin/developers/:id/ban
 */
export async function banDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params
    const { reason } = req.body

    const isvRepo = getIsvDeveloperRepository()
    const isv = await isvRepo.findById(id)

    if (!isv) {
      res.status(HttpCodes.NOT_FOUND).json({ code: BusinessCodes.NOT_FOUND_RESOURCE, message: 'Developer not found' })
      return
    }

    if (isv.status === 'banned') {
      res.status(HttpCodes.BAD_REQUEST).json({ code: BusinessCodes.PARAM_REQUIRED, message: 'Developer is already banned' })
      return
    }

    await isvRepo.update(id, { status: 'banned' })

    res.json({ code: 0, message: 'Developer banned successfully' })
  } catch (error) {
    console.error('Failed to ban developer:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to ban developer' })
  }
}

/**
 * GET /admin/developers/stats
 * Get developer statistics
 */
export async function getDeveloperStats(req: Request, res: Response): Promise<void> {
  try {
    const isvRepo = getIsvDeveloperRepository()

    const [total, allDevelopers] = await Promise.all([
      isvRepo.count({}),
      isvRepo.findByFilters({}),
    ])

    // Use groupBy-style aggregation from the fetched data
    const statusCounts: Record<string, number> = { active: 0, suspended: 0, banned: 0, deleted: 0 }
    const kybStatusCounts: Record<string, number> = { approved: 0, pending: 0, rejected: 0 }

    for (const isv of allDevelopers) {
      if (statusCounts[isv.status] !== undefined) statusCounts[isv.status]++
      if (kybStatusCounts[isv.kybStatus] !== undefined) kybStatusCounts[isv.kybStatus]++
    }

    const approvalRate = (kybStatusCounts.approved + kybStatusCounts.rejected) > 0
      ? Math.round((kybStatusCounts.approved / (kybStatusCounts.approved + kybStatusCounts.rejected)) * 100)
      : 0

    res.json({
      code: 0,
      data: {
        total,
        byStatus: statusCounts,
        byKYBStatus: kybStatusCounts,
        approvalRate,
        pendingReview: kybStatusCounts.pending,
      },
    })
  } catch (error) {
    console.error('Failed to get developer stats:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({ code: BusinessCodes.SERVER_INTERNAL, message: 'Failed to get developer stats' })
  }
}
