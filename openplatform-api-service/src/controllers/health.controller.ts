import { Request, Response } from 'express'
import { dashboardStatsService, HealthStatsSummary, ServiceHealth, ResourceUsage, HealthHistory } from '../services/dashboard-stats.service'

// ============================================
// Health Statistics Controller (B.3.3)
// ============================================

/**
 * GET /admin/health/status
 * Get overall health status summary
 */
export async function getHealthStatus(req: Request, res: Response): Promise<void> {
  try {
    const summary = await dashboardStatsService.getHealthStatsSummary()

    res.json({
      code: 0,
      message: 'Success',
      data: summary,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get health status error:', error)
    res.status(500).json({
      code: 50001,
      message: 'Failed to get health status',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/health/services
 * Get service-level health status
 */
export async function getServicesHealth(req: Request, res: Response): Promise<void> {
  try {
    const services = await dashboardStatsService.getAllServicesHealth()

    res.json({
      code: 0,
      message: 'Success',
      data: services,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get services health error:', error)
    res.status(500).json({
      code: 50002,
      message: 'Failed to get services health',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/health/resources
 * Get resource usage metrics
 */
export async function getResourceUsage(req: Request, res: Response): Promise<void> {
  try {
    const resources = await dashboardStatsService.getResourceUsage()

    res.json({
      code: 0,
      message: 'Success',
      data: resources,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get resource usage error:', error)
    res.status(500).json({
      code: 50003,
      message: 'Failed to get resource usage',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/health/history
 * Get historical health data
 */
export async function getHealthHistory(req: Request, res: Response): Promise<void> {
  try {
    const hours = parseInt((req.query.hours as string) || '24')

    if (hours < 1 || hours > 168) {
      res.status(400).json({
        code: 40001,
        message: 'Hours parameter must be between 1 and 168 (7 days)',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const history = await dashboardStatsService.getHealthHistory(hours)

    res.json({
      code: 0,
      message: 'Success',
      data: history,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get health history error:', error)
    res.status(500).json({
      code: 50004,
      message: 'Failed to get health history',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * GET /admin/health/service/:serviceId
 * Get detailed health for a specific service
 */
export async function getServiceDetail(req: Request, res: Response): Promise<void> {
  try {
    const { serviceId } = req.params

    // Validate serviceId format (alphanumeric, dashes, underscores only)
    const SERVICE_ID_REGEX = /^[a-zA-Z0-9_-]+$/
    if (!serviceId || !SERVICE_ID_REGEX.test(serviceId)) {
      res.status(400).json({
        code: 40002,
        message: 'Invalid service ID format',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    const allServices = await dashboardStatsService.getAllServicesHealth()
    const service = allServices.find(s => s.serviceId === serviceId)

    if (!service) {
      res.status(404).json({
        code: 40401,
        message: 'Service not found',
        data: null,
        trace_id: (req.headers['x-trace-id'] as string) || ''
      })
      return
    }

    res.json({
      code: 0,
      message: 'Success',
      data: service,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Get service detail error:', error)
    res.status(500).json({
      code: 50005,
      message: 'Failed to get service detail',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}

/**
 * POST /admin/health/refresh
 * Force refresh health data
 */
export async function refreshHealthData(req: Request, res: Response): Promise<void> {
  try {
    // Force refresh by regenerating data
    const [summary, services, resources] = await Promise.all([
      dashboardStatsService.getHealthStatsSummary(),
      dashboardStatsService.getAllServicesHealth(),
      dashboardStatsService.getResourceUsage()
    ])

    res.json({
      code: 0,
      message: 'Health data refreshed successfully',
      data: {
        summary,
        services,
        resources
      },
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  } catch (error) {
    console.error('Refresh health data error:', error)
    res.status(500).json({
      code: 50006,
      message: 'Failed to refresh health data',
      data: null,
      trace_id: (req.headers['x-trace-id'] as string) || ''
    })
  }
}
