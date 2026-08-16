import { Request, Response } from 'express'
import { getSubscriptionRepository } from '../../repositories/repository.factory'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

// GET /admin/subscriptions
export async function getSubscriptions(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', status, developerId } = req.query
    const repo = getSubscriptionRepository()
    const where: any = {}
    if (status) where.status = status as string
    if (developerId) where.developerId = developerId as string
    const { list, total } = await repo.findByFilters(
      where,
      parseInt(page as string),
      parseInt(pageSize as string)
    )
    res.json({
      code: 0,
      message: 'Success',
      data: {
        list: list.map(s => ({
          id: s.id,
          developerId: s.developerId,
          developerName: (s as any).developer?.legalName || '',
          developerEmail: (s as any).developer?.email || '',
          packageId: s.packageId,
          packageName: (s as any).package?.name || '',
          packageCode: (s as any).package?.packageCode || '',
          status: s.status,
          startDate: s.startDate,
          endDate: s.endDate,
          autoRenew: s.autoRenew,
          billingCycle: s.billingCycle,
          dailyApiUsage: s.dailyApiUsage,
          createdAt: s.createdAt.toISOString(),
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get subscriptions error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get subscriptions',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// GET /admin/subscriptions/:id
export async function getSubscriptionById(req: Request, res: Response): Promise<void> {
  try {
    const repo = getSubscriptionRepository()
    const subscription = await repo.findById(req.params.id)
    if (!subscription) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Subscription not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    res.json({
      code: 0,
      message: 'Success',
      data: {
        id: subscription.id,
        developerId: subscription.developerId,
        developerName: (subscription as any).developer?.legalName || '',
        developerEmail: (subscription as any).developer?.email || '',
        packageId: subscription.packageId,
        packageName: (subscription as any).package?.name || '',
        packageCode: (subscription as any).package?.packageCode || '',
        monthlyPrice: (subscription as any).package?.monthlyPrice,
        yearlyPrice: (subscription as any).package?.yearlyPrice,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew,
        billingCycle: subscription.billingCycle,
        dailyApiUsage: subscription.dailyApiUsage,
        createdAt: subscription.createdAt.toISOString(),
        updatedAt: subscription.updatedAt.toISOString(),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get subscription detail error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get subscription detail',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// GET /admin/developers/:id/subscription
export async function getDeveloperSubscription(req: Request, res: Response): Promise<void> {
  try {
    const repo = getSubscriptionRepository()
    const subscription = await repo.findByDeveloperId(req.params.id)
    res.json({
      code: 0,
      message: 'Success',
      data: subscription ? {
        id: subscription.id,
        packageId: subscription.packageId,
        packageName: (subscription as any).package?.name || '',
        packageCode: (subscription as any).package?.packageCode || '',
        monthlyPrice: (subscription as any).package?.monthlyPrice,
        yearlyPrice: (subscription as any).package?.yearlyPrice,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate,
        autoRenew: subscription.autoRenew,
        billingCycle: subscription.billingCycle,
        dailyApiUsage: subscription.dailyApiUsage,
        createdAt: subscription.createdAt.toISOString(),
      } : null,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get developer subscription error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get developer subscription',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}