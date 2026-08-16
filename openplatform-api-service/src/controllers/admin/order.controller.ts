import { Request, Response } from 'express'
import { getOrderRepository } from '../../repositories/repository.factory'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

// GET /admin/orders
export async function getOrders(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', status, developerId } = req.query
    const repo = getOrderRepository()
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
        list: list.map(o => ({
          id: o.id,
          developerId: o.developerId,
          packageId: o.packageId,
          subscriptionId: o.subscriptionId,
          developerName: (o as any).subscription?.developer?.legalName || '',
          developerEmail: (o as any).subscription?.developer?.email || '',
          packageName: (o as any).subscription?.package?.name || '',
          packageCode: (o as any).subscription?.package?.packageCode || '',
          period: o.period,
          amount: o.amount,
          currency: o.currency,
          status: o.status,
          createdAt: o.createdAt.toISOString(),
          paidAt: o.paidAt ? o.paidAt.toISOString() : null,
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get orders error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get orders',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}