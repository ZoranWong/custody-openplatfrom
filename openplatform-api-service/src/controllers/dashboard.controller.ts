import { Request, Response } from 'express'
import { dashboardStatsService, DashboardStatsResponse, DashboardTrendResponse, DashboardDetailStatsResponse } from '../services/dashboard-stats.service'

// ============================================
// Dashboard Statistics Controller
// ============================================

/**
 * GET /admin/dashboard/stats
 * Get platform overview statistics
 */
export async function getDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = await dashboardStatsService.getStats()

    const response: DashboardStatsResponse = {
      totalDevelopers: stats.totalDevelopers,
      totalApplications: stats.totalApplications,
      pendingKYBReviews: stats.pendingKYBReviews,
      apiCalls: {
        today: stats.apiCallsToday,
        thisWeek: stats.apiCallsThisWeek,
        thisMonth: stats.apiCallsThisMonth
      },
      errorRate: stats.errorRate,
      lastUpdated: stats.lastUpdated
    }

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Failed to get dashboard statistics',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/dashboard/trends
 * Get trend data for charts
 */
export async function getDashboardTrends(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '7')

    if (days < 1 || days > 30) {
      res.status(400).json({
        code: 40001,
        message: 'Days parameter must be between 1 and 30',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const [apiCalls, errorRate] = await Promise.all([
      dashboardStatsService.getApiCallsTrend(days),
      dashboardStatsService.getErrorRateTrend(days)
    ])

    const response: DashboardTrendResponse = {
      apiCalls,
      errorRate
    }

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get dashboard trends error:', error)
    res.status(500).json({
      code: 50002,
      message: 'Failed to get dashboard trends',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/dashboard/details
 * Get detailed statistics for dashboard
 */
export async function getDashboardDetails(req: Request, res: Response): Promise<void> {
  try {
    const [developerStats, applicationStats, topApps] = await Promise.all([
      dashboardStatsService.getDeveloperStats(),
      dashboardStatsService.getApplicationStats(),
      dashboardStatsService.getTopApplications(10)
    ])

    const response: DashboardDetailStatsResponse = {
      developers: developerStats,
      applications: applicationStats,
      topApplications: topApps
    }

    res.json({
      code: 0,
      message: 'Success',
      data: response,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get dashboard details error:', error)
    res.status(500).json({
      code: 50003,
      message: 'Failed to get dashboard details',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * POST /admin/dashboard/refresh
 * Force refresh dashboard cache
 */
export async function refreshDashboardStats(req: Request, res: Response): Promise<void> {
  try {
    await dashboardStatsService.invalidateCache()

    res.json({
      code: 0,
      message: 'Dashboard statistics refreshed successfully',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Refresh dashboard stats error:', error)
    res.status(500).json({
      code: 50004,
      message: 'Failed to refresh dashboard statistics',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/dashboard/health
 * Get dashboard service health
 */
export async function getDashboardHealth(req: Request, res: Response): Promise<void> {
  try {
    const health = dashboardStatsService.getHealth()

    res.json({
      code: 0,
      message: 'Success',
      data: health,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get dashboard health error:', error)
    res.status(500).json({
      code: 50005,
      message: 'Failed to get dashboard health',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}
