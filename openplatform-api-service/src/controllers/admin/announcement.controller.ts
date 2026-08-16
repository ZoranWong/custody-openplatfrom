import { Request, Response } from 'express'
import { getAnnouncementRepository } from '../../repositories/repository.factory'
import { HttpCodes } from '../../enums/http-codes.enum'
import { BusinessCodes } from '../../enums/business-codes.enum'

// GET /admin/announcements
export async function getAnnouncements(req: Request, res: Response): Promise<void> {
  try {
    const { page = '1', pageSize = '10', status, type } = req.query
    const repo = getAnnouncementRepository()
    const where: any = {}
    if (status) where.status = status as string
    if (type) where.type = type as string
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
    console.error('Get announcements error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to get announcements',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// POST /admin/announcements
export async function createAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const { title, content, type, status } = req.body
    if (!title || !content) {
      res.status(HttpCodes.BAD_REQUEST).json({
        code: BusinessCodes.PARAM_REQUIRED,
        message: 'Title and content are required',
        data: null,
        trace_id: req.headers['x-trace-id'] as string || '',
      })
      return
    }
    const repo = getAnnouncementRepository()
    const announcement = await repo.create({
      title,
      content,
      type: type || 'system',
      status: status || 'draft',
    } as any)
    res.json({
      code: 0,
      message: 'Success',
      data: announcement,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Create announcement error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to create announcement',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// PUT /admin/announcements/:id
export async function updateAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const { title, content, type, status } = req.body
    const repo = getAnnouncementRepository()
    const announcement = await repo.update(req.params.id, {
      title,
      content,
      type,
      status,
    })
    res.json({
      code: 0,
      message: 'Success',
      data: announcement,
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Update announcement error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to update announcement',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}

// DELETE /admin/announcements/:id
export async function deleteAnnouncement(req: Request, res: Response): Promise<void> {
  try {
    const repo = getAnnouncementRepository()
    await repo.delete(req.params.id)
    res.json({
      code: 0,
      message: 'Success',
      trace_id: (req as any).context?.traceId || req.headers['x-trace-id'] || '',
    })
  } catch (error) {
    console.error('Delete announcement error:', error)
    res.status(HttpCodes.INTERNAL_SERVER_ERROR).json({
      code: BusinessCodes.SERVER_INTERNAL,
      message: 'Failed to delete announcement',
      data: null,
      trace_id: req.headers['x-trace-id'] as string || '',
    })
  }
}