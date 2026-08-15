import { Request, Response } from 'express'
import { Prisma } from '@prisma/client'
import { getDeveloperApplicationRepository } from '../../repositories/repository.factory'
import { getDeveloperAuditRepository } from '../../repositories/repository.factory'
import { getPrismaClient } from '../../database/prisma-client'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

// GET /admin/applications
export async function getApplications(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', status, keyword } = req.query
    const repo = getDeveloperApplicationRepository()
    const where: Prisma.DeveloperApplicationWhereInput = {}
    if (status) where.status = status as string
    if (keyword) {
      where.OR = [
        { legalName: { contains: keyword as string } },
        { email: { contains: keyword as string } },
      ]
    }
    const { list, total } = await repo.findByFilters(
      where,
      parseInt(page as string),
      parseInt(pageSize as string)
    )
    res.json({
      code: 0,
      message: 'Success',
      data: {
        list: list.map((a) => ({
          id: a.id,
          email: a.email,
          legalName: a.legalName,
          registrationNumber: a.registrationNumber,
          jurisdiction: a.jurisdiction,
          status: a.status,
          createdAt: a.createdAt.toISOString(),
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get applications error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get applications',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// GET /admin/applications/stats
export async function getApplicationStats(req: Request, res: Response): Promise<void> {
  try {
    const repo = getDeveloperApplicationRepository()
    const [pending, approved, rejected] = await Promise.all([
      repo.count({ status: 'pending' }),
      repo.count({ status: 'approved' }),
      repo.count({ status: 'rejected' }),
    ])
    res.json({
      code: 0,
      message: 'Success',
      data: {
        pending,
        approved,
        rejected,
        total: pending + approved + rejected,
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get application stats error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get application stats',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// GET /admin/applications/:id
export async function getApplicationById(req: Request, res: Response): Promise<void> {
  try {
    const repo = getDeveloperApplicationRepository()
    const app = await repo.findById(req.params.id)
    if (!app) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found',
        data: null,
        trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
      })
      return
    }
    const { passwordHash, ...safeApp } = app
    res.json({
      code: 0,
      message: 'Success',
      data: {
        ...safeApp,
        createdAt: app.createdAt.toISOString(),
        updatedAt: app.updatedAt.toISOString(),
        reviewedAt: app.reviewedAt?.toISOString() || null,
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get application by ID error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// POST /admin/applications/:id/approve
export async function approveApplication(req: Request, res: Response): Promise<void> {
  try {
    const appRepo = getDeveloperApplicationRepository()
    const app = await appRepo.findById(req.params.id)
    if (!app) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    if (app.status !== 'pending') {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_BUSINESS_RULE,
        message: 'Application has already been processed',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }

    const adminId = (req as any).adminId || 'unknown'
    const adminEmail = (req as any).adminEmail || 'unknown'

    // Use a transaction to ensure all three operations succeed or fail atomically
    const prisma = getPrismaClient()
    const developer = await prisma.$transaction(async (tx) => {
      // Create IsvDeveloper record
      const devData: Prisma.IsvDeveloperCreateInput = {
        email: app.email,
        passwordHash: app.passwordHash,
        legalName: app.legalName,
        registrationNumber: app.registrationNumber,
        jurisdiction: app.jurisdiction,
        dateOfIncorporation: app.dateOfIncorporation,
        registeredAddress: app.registeredAddress,
        website: app.website,
        uboInfo: app.uboInfo ?? undefined,
        kybStatus: 'approved',
        kybReviewedAt: new Date(),
        kybReviewedBy: adminEmail,
        status: 'active',
      }
      const dev = await tx.isvDeveloper.create({ data: devData })

      // Update application status
      const appUpdateData: Prisma.DeveloperApplicationUpdateInput = {
        status: 'approved',
        reviewedAt: new Date(),
        reviewedBy: adminId,
        developerId: dev.id,
      }
      await tx.developerApplication.update({
        where: { id: app.id },
        data: appUpdateData,
      })

      // Write audit log
      const auditData: Prisma.DeveloperAuditCreateInput = {
        developerId: dev.id,
        action: 'approve',
        adminId,
        adminEmail,
        previousStatus: 'pending',
        newStatus: 'approved',
      }
      await tx.developerAudit.create({ data: auditData })

      return dev
    })

    res.json({
      code: 0,
      message: 'Application approved, developer created',
      data: {
        applicationId: app.id,
        developerId: developer.id,
      },
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  } catch (error) {
    console.error('Approve application error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to approve application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// POST /admin/applications/:id/reject
export async function rejectApplication(req: Request, res: Response): Promise<void> {
  try {
    const appRepo = getDeveloperApplicationRepository()
    const app = await appRepo.findById(req.params.id)
    if (!app) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Application not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    if (app.status !== 'pending') {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_BUSINESS_RULE,
        message: 'Application has already been processed',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }

    const { reason } = req.body
    if (!reason) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Rejection reason is required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }

    const adminId = (req as any).adminId || 'unknown'
    await appRepo.update(app.id, {
      status: 'rejected',
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectReason: reason,
    })

    const adminEmail = (req as any).adminEmail || 'unknown'

    // Write audit log
    const auditRepo = getDeveloperAuditRepository()
    const auditData: Prisma.DeveloperAuditCreateInput = {
      developerId: app.id,
      action: 'reject',
      reason,
      adminId,
      adminEmail,
      previousStatus: 'pending',
      newStatus: 'rejected',
    }
    await auditRepo.create(auditData)

    res.json({
      code: 0,
      message: 'Application rejected',
      data: {
        applicationId: app.id,
        status: 'rejected',
      },
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  } catch (error) {
    console.error('Reject application error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to reject application',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}