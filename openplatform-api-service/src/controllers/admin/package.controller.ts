import { Request, Response } from 'express'
import { getPackageRepository } from '../../repositories/repository.factory'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

const VALID_PACKAGE_CODES = ['TRIAL', 'BASIC', 'PROFESSIONAL', 'ENTERPRISE']

// GET /admin/packages/active
export async function getActivePackages(req: Request, res: Response): Promise<void> {
  try {
    const repo = getPackageRepository()
    const packages = await repo.findByStatus('active')
    res.json({
      code: 0,
      message: 'Success',
      data: packages,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get active packages error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get active packages',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// GET /admin/packages/history
export async function getPackageHistory(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', packageCode } = req.query
    const repo = getPackageRepository()
    const where: any = { status: 'inactive' }
    if (packageCode) where.packageCode = packageCode as string
    const { list, total } = await repo.findByFilters(
      where,
      parseInt(page as string),
      parseInt(pageSize as string)
    )
    res.json({
      code: 0,
      message: 'Success',
      data: {
        list,
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get package history error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get package history',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// POST /admin/packages
export async function createPackage(req: Request, res: Response): Promise<void> {
  try {
    const {
      packageCode, name, description, features,
      monthlyPrice, yearlyPrice, yearlyDiscount,
      dailyApiLimit, maxApplications, isTrial,
      webhook, customDomain, whiteLabel, sla, ipWhitelist, autoRenew,
      logRetention, supportLevel,
    } = req.body

    if (!packageCode || !VALID_PACKAGE_CODES.includes(packageCode)) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Invalid package type. Must be one of: TRIAL, BASIC, PROFESSIONAL, ENTERPRISE',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }

    if (!name) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'name is required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }

    const repo = getPackageRepository()

    // Deactivate all active packages of the same type
    const existingActive = await repo.findByCodeAndStatus(packageCode, 'active')
    if (existingActive) {
      await repo.update(existingActive.id, { status: 'inactive' } as any)
    }

    // Get the max version for this type and increment
    const maxVersion = await repo.getMaxVersion(packageCode)

    const pkg = await repo.create({
      packageCode,
      name,
      description: description || null,
      features: features || null,
      monthlyPrice: monthlyPrice || 0,
      yearlyPrice: yearlyPrice || null,
      yearlyDiscount: yearlyDiscount || 1.0,
      dailyApiLimit: dailyApiLimit || 1000,
      maxApplications: maxApplications || 1,
      isTrial: isTrial || false,
      webhook: webhook || false,
      customDomain: customDomain || false,
      whiteLabel: whiteLabel || false,
      sla: sla || false,
      ipWhitelist: ipWhitelist || false,
      autoRenew: autoRenew || false,
      logRetention: logRetention || 30,
      supportLevel: supportLevel || 'community',
      status: 'active',
      version: maxVersion + 1,
      sortOrder: 0,
    } as any)

    res.json({
      code: 0,
      message: 'Success',
      data: pkg,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Create package error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to create package',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// PUT /admin/packages/:id
export async function updatePackage(req: Request, res: Response): Promise<void> {
  try {
    const {
      packageCode, name, description, features,
      monthlyPrice, yearlyPrice, yearlyDiscount,
      dailyApiLimit, maxApplications, isTrial, status, sortOrder,
      webhook, customDomain, whiteLabel, sla, ipWhitelist, autoRenew,
      logRetention, supportLevel,
    } = req.body
    const repo = getPackageRepository()
    const pkg = await repo.update(req.params.id, {
      packageCode,
      name,
      description,
      features,
      monthlyPrice,
      yearlyPrice,
      yearlyDiscount,
      dailyApiLimit,
      maxApplications,
      isTrial,
      webhook,
      customDomain,
      whiteLabel,
      sla,
      ipWhitelist,
      autoRenew,
      logRetention,
      supportLevel,
      status,
      sortOrder,
    } as any)
    res.json({
      code: 0,
      message: 'Success',
      data: pkg,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Update package error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to update package',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// DELETE /admin/packages/:id
export async function deletePackage(req: Request, res: Response): Promise<void> {
  try {
    const repo = getPackageRepository()
    await repo.delete(req.params.id)
    res.json({
      code: 0,
      message: 'Success',
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Delete package error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to delete package',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}