import { Request, Response } from 'express'
import { dashboardStatsService, RevenueStatsSummary, RevenueByDeveloper, RevenueTrend, RevenueForecast } from '../services/dashboard-stats.service'

// ============================================
// Revenue Statistics Controller (B.3.2)
// ============================================

/**
 * GET /admin/stats/revenue/summary
 * Get revenue statistics summary
 */
export async function getRevenueSummary(req: Request, res: Response): Promise<void> {
  try {
    const summary = await dashboardStatsService.getRevenueStatsSummary()

    res.json({
      code: 0,
      message: 'Success',
      data: summary,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get revenue summary error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Failed to get revenue summary',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/stats/revenue/by-developer
 * Get revenue breakdown by developer
 */
export async function getRevenueByDeveloper(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt((req.query.limit as string) || '10')
    const timeRange = (req.query.timeRange as string) || '7d'

    if (limit < 1 || limit > 100) {
      res.status(400).json({
        code: 40001,
        message: 'Limit must be between 1 and 100',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    if (!['24h', '7d', '30d', '90d'].includes(timeRange)) {
      res.status(400).json({
        code: 40002,
        message: 'Invalid timeRange. Must be one of: 24h, 7d, 30d, 90d',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const revenueByDeveloper = await dashboardStatsService.getRevenueByDeveloper(limit)

    res.json({
      code: 0,
      message: 'Success',
      data: revenueByDeveloper,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get revenue by developer error:', error)
    res.status(500).json({
      code: 50002,
      message: 'Failed to get revenue by developer',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/stats/revenue/trends
 * Get revenue trends
 */
export async function getRevenueTrends(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '7')

    if (days < 1 || days > 90) {
      res.status(400).json({
        code: 40003,
        message: 'Days parameter must be between 1 and 90',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const trendData = await dashboardStatsService.getRevenueTrend(days)

    res.json({
      code: 0,
      message: 'Success',
      data: trendData,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get revenue trends error:', error)
    res.status(500).json({
      code: 50003,
      message: 'Failed to get revenue trends',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/stats/revenue/forecast
 * Get revenue forecast
 */
export async function getRevenueForecast(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '7')

    if (days < 1 || days > 30) {
      res.status(400).json({
        code: 40004,
        message: 'Days parameter must be between 1 and 30',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const forecastData = await dashboardStatsService.getRevenueForecast(days)

    res.json({
      code: 0,
      message: 'Success',
      data: forecastData,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get revenue forecast error:', error)
    res.status(500).json({
      code: 50004,
      message: 'Failed to get revenue forecast',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/stats/revenue/developer/:developerId
 * Get detailed revenue for a specific developer
 */
export async function getDeveloperRevenueDetail(req: Request, res: Response): Promise<void> {
  try {
    const { developerId } = req.params

    if (!developerId) {
      res.status(400).json({
        code: 40005,
        message: 'Developer ID is required',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    // Get developer's revenue data
    const revenueByDev = await dashboardStatsService.getRevenueByDeveloper(100)
    const developerData = revenueByDev.find(d => d.developerId === developerId)

    if (!developerData) {
      res.status(404).json({
        code: 40401,
        message: 'Developer not found',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'Success',
      data: developerData,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get developer revenue detail error:', error)
    res.status(500).json({
      code: 50005,
      message: 'Failed to get developer revenue detail',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/stats/revenue/export
 * Export revenue statistics to CSV
 */
export async function exportRevenueStats(req: Request, res: Response): Promise<void> {
  try {
    const timeRange = (req.query.timeRange as string) || '7d'

    if (!['24h', '7d', '30d', '90d'].includes(timeRange)) {
      res.status(400).json({
        code: 40006,
        message: 'Invalid timeRange. Must be one of: 24h, 7d, 30d, 90d',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const csv = await dashboardStatsService.exportRevenueStatsToCSV(timeRange)

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename=revenue-stats-${timeRange}.csv`)

    res.send(csv)
  } catch (error) {
    console.error('Export revenue stats error:', error)
    res.status(500).json({
      code: 50006,
      message: 'Failed to export revenue statistics',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}
