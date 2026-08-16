import { Request, Response } from 'express'
import { getTicketRepository } from '../../repositories/repository.factory'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

// GET /admin/tickets
export async function getTickets(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', status, type, priority, developerId } = req.query
    const repo = getTicketRepository()
    const where: any = {}
    if (status) where.status = status as string
    if (type) where.type = type as string
    if (priority) where.priority = priority as string
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
        list: list.map(t => ({
          id: t.id,
          developerId: t.developerId,
          title: t.title,
          description: t.description,
          type: t.type,
          priority: t.priority,
          status: t.status,
          replyCount: (t as any).replies?.length || 0,
          createdAt: t.createdAt.toISOString(),
          updatedAt: t.updatedAt.toISOString(),
        })),
        total,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get tickets error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get tickets',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// GET /admin/tickets/:id
export async function getTicketById(req: Request, res: Response): Promise<void> {
  try {
    const repo = getTicketRepository()
    const ticket = await repo.findById(req.params.id)
    if (!ticket) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Ticket not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    res.json({
      code: 0,
      message: 'Success',
      data: {
        id: ticket.id,
        developerId: ticket.developerId,
        title: ticket.title,
        description: ticket.description,
        type: ticket.type,
        priority: ticket.priority,
        status: ticket.status,
        replies: (ticket as any).replies?.map((r: any) => ({
          id: r.id,
          content: r.content,
          isAdmin: r.isAdmin,
          userId: r.userId,
          createdAt: r.createdAt.toISOString(),
        })) || [],
        createdAt: ticket.createdAt.toISOString(),
        updatedAt: ticket.updatedAt.toISOString(),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Get ticket detail error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get ticket detail',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// POST /admin/tickets/:id/reply
export async function addTicketReply(req: Request, res: Response): Promise<void> {
  try {
    const { content } = req.body
    if (!content) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Reply content is required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    const repo = getTicketRepository()
    const ticket = await repo.findById(req.params.id)
    if (!ticket) {
      res.status(HttpCodes.NOT_FOUND).json({
        code: BusinessCodes.NOT_FOUND_RESOURCE,
        message: 'Ticket not found',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    const adminId = (req as any).adminId || 'unknown'
    const reply = await repo.createReply({
      ticket: { connect: { id: req.params.id } },
      content,
      isAdmin: true,
      userId: adminId,
    } as any)

    // Update ticket status to in_progress if it was pending
    if (ticket.status === 'pending') {
      await repo.update(req.params.id, { status: 'in_progress' } as any)
    }

    res.json({
      code: 0,
      message: 'Success',
      data: {
        id: reply.id,
        content: reply.content,
        isAdmin: reply.isAdmin,
        userId: reply.userId,
        createdAt: reply.createdAt.toISOString(),
      },
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Add ticket reply error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to add reply',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// PUT /admin/tickets/:id/status
export async function updateTicketStatus(req: Request, res: Response): Promise<void> {
  try {
    const { status } = req.body
    if (!status) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Status is required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    const repo = getTicketRepository()
    const ticket = await repo.update(req.params.id, { status } as any)
    res.json({
      code: 0,
      message: 'Success',
      data: ticket,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Update ticket status error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to update ticket status',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}