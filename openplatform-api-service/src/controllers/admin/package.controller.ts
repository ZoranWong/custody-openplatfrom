import { Request, Response } from 'express'
import { getPackageRepository } from '../../repositories/repository.factory'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

// GET /admin/packages
export async function getPackages(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', status, region } = req.query
    const repo = getPackageRepository()
    const where: any = {}
    if (status) where.status = status as string
    if (region) where.region = region as string
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
    console.error('Get packages error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get packages',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// POST /admin/packages
export async function createPackage(req: Request, res: Response): Promise<void> {
  try {
    const {
      packageCode, name, region, description, features,
      monthlyPrice, yearlyPrice, currency, yearlyDiscount,
      dailyApiLimit, maxApplications, isTrial, status, sortOrder,
    } = req.body
    if (!packageCode || !name) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'packageCode and name are required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    const repo = getPackageRepository()
    const pkg = await repo.create({
      packageCode,
      name,
      region: region || 'CN',
      description: description || null,
      features: features || null,
      monthlyPrice: monthlyPrice || 0,
      yearlyPrice: yearlyPrice || null,
      currency: currency || 'CNY',
      yearlyDiscount: yearlyDiscount || 1.0,
      dailyApiLimit: dailyApiLimit || 1000,
      maxApplications: maxApplications || 1,
      isTrial: isTrial || false,
      status: status || 'active',
      sortOrder: sortOrder || 0,
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
      packageCode, name, region, description, features,
      monthlyPrice, yearlyPrice, currency, yearlyDiscount,
      dailyApiLimit, maxApplications, isTrial, status, sortOrder,
    } = req.body
    const repo = getPackageRepository()
    const pkg = await repo.update(req.params.id, {
      packageCode,
      name,
      region,
      description,
      features,
      monthlyPrice,
      yearlyPrice,
      currency,
      yearlyDiscount,
      dailyApiLimit,
      maxApplications,
      isTrial,
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