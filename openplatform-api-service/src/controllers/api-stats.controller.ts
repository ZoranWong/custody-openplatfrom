/**
 * API Stats Controller
 * Handles API call statistics and metrics
 */

import { Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

interface APIStats {
  date: string
  endpoint: string
  method: string
  calls: number
  avgResponseTime: number
  errors: number
}

const apiStats: APIStats[] = []

function initMockData() {
  if (apiStats.length > 0) return

  const endpoints = [
    '/api/v1/wallet/balance',
    '/api/v1/wallet/transfer',
    '/api/v1/transaction/history',
    '/api/v1/webhook/callback',
    '/api/v1/auth/token'
  ]
  const methods = ['GET', 'POST', 'PUT', 'DELETE']

  for (let i = 29; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toISOString().split('T')[0]

    for (const endpoint of endpoints) {
      for (const method of methods) {
        const calls = Math.floor(Math.random() * 10000) + 1000
        const avgResponseTime = Math.floor(Math.random() * 500) + 50
        const errors = Math.floor(calls * (Math.random() * 0.05))

        apiStats.push({ date: dateStr, endpoint, method, calls, avgResponseTime, errors })
      }
    }
  }
}

initMockData()

export async function getOverview(req: Request, res: Response): Promise<void> {
  try {
    const today = new Date().toISOString().split('T')[0]
    const todayStats = apiStats.filter(s => s.date === today)
    const totalCallsToday = todayStats.reduce((sum, s) => sum + s.calls, 0)
    const avgResponseTimeToday = todayStats.length > 0
      ? Math.round(todayStats.reduce((sum, s) => sum + s.avgResponseTime, 0) / todayStats.length)
      : 0
    const errorsToday = todayStats.reduce((sum, s) => sum + s.errors, 0)
    const errorRateToday = totalCallsToday > 0 ? (errorsToday / totalCallsToday) * 100 : 0

    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    const weekAgoStr = weekAgo.toISOString().split('T')[0]
    const weekStats = apiStats.filter(s => s.date >= weekAgoStr)
    const totalCallsWeek = weekStats.reduce((sum, s) => sum + s.calls, 0)
    const avgResponseTimeWeek = weekStats.length > 0
      ? Math.round(weekStats.reduce((sum, s) => sum + s.avgResponseTime, 0) / weekStats.length)
      : 0

    const monthAgo = new Date()
    monthAgo.setDate(monthAgo.getDate() - 30)
    const monthAgoStr = monthAgo.toISOString().split('T')[0]
    const monthStats = apiStats.filter(s => s.date >= monthAgoStr)
    const totalCallsMonth = monthStats.reduce((sum, s) => sum + s.calls, 0)
    const avgResponseTimeMonth = monthStats.length > 0
      ? Math.round(monthStats.reduce((sum, s) => sum + s.avgResponseTime, 0) / monthStats.length)
      : 0

    const uniqueEndpoints = new Set(apiStats.map(s => s.endpoint)).size

    res.json({
      code: 0,
      data: {
        today: { calls: totalCallsToday, avgResponseTime: avgResponseTimeToday, errorRate: Math.round(errorRateToday * 100) / 100 },
        thisWeek: { calls: totalCallsWeek, avgResponseTime: avgResponseTimeWeek },
        thisMonth: { calls: totalCallsMonth, avgResponseTime: avgResponseTimeMonth },
        uniqueEndpoints
      },
      trace_id: req.headers['x-trace-id'] as string || uuidv4()
    })
  } catch (error) {
    res.status(500).json({ code: 50001, message: 'Failed to get API overview', trace_id: req.headers['x-trace-id'] as string })
  }
}

export async function getTopApplications(req: Request, res: Response): Promise<void> {
  try {
    const limit = parseInt((req.query.limit as string) || '10')
    const topApps = [
      { appId: 'app-001', appName: 'TechCorp Exchange', calls: 125000, errorRate: 0.02 },
      { appId: 'app-002', appName: 'CryptoPay Platform', calls: 98000, errorRate: 0.05 },
      { appId: 'app-003', appName: 'DeFi Wallet', calls: 87600, errorRate: 0.08 },
      { appId: 'app-004', appName: 'NFT Marketplace', calls: 65400, errorRate: 0.03 },
      { appId: 'app-005', appName: 'Enterprise Trading', calls: 54300, errorRate: 0.01 },
      { appId: 'app-006', appName: 'GameFi Gateway', calls: 43200, errorRate: 0.12 },
      { appId: 'app-007', appName: 'Staking Service', calls: 32100, errorRate: 0.04 },
      { appId: 'app-008', appName: 'DAO Tools', calls: 21800, errorRate: 0.06 },
      { appId: 'app-009', appName: 'Analytics Dashboard', calls: 15500, errorRate: 0.02 },
      { appId: 'app-010', appName: 'Trading Bot', calls: 12400, errorRate: 0.15 }
    ].slice(0, limit)

    res.json({ code: 0, data: topApps, trace_id: req.headers['x-trace-id'] as string || uuidv4() })
  } catch (error) {
    res.status(500).json({ code: 50002, message: 'Failed to get top applications', trace_id: req.headers['x-trace-id'] as string })
  }
}

export async function getResponseTimeTrend(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '7')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const dailyStats: Record<string, { totalTime: number; count: number }> = {}
    for (const stat of apiStats) {
      if (stat.date >= startDateStr && stat.date <= endDateStr) {
        if (!dailyStats[stat.date]) dailyStats[stat.date] = { totalTime: 0, count: 0 }
        dailyStats[stat.date].totalTime += stat.avgResponseTime * stat.calls
        dailyStats[stat.date].count += stat.calls
      }
    }

    const trend: { date: string; avgResponseTime: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const stats = dailyStats[dateStr]
      trend.push({ date: dateStr, avgResponseTime: stats ? Math.round(stats.totalTime / stats.count) : Math.floor(Math.random() * 200) + 100 })
    }

    res.json({ code: 0, data: trend, trace_id: req.headers['x-trace-id'] as string || uuidv4() })
  } catch (error) {
    res.status(500).json({ code: 50003, message: 'Failed to get response time trend', trace_id: req.headers['x-trace-id'] as string })
  }
}

export async function getErrorRateTrend(req: Request, res: Response): Promise<void> {
  try {
    const days = parseInt((req.query.days as string) || '7')
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(endDate.getDate() - days)
    const startDateStr = startDate.toISOString().split('T')[0]
    const endDateStr = endDate.toISOString().split('T')[0]

    const dailyStats: Record<string, { errors: number; total: number }> = {}
    for (const stat of apiStats) {
      if (stat.date >= startDateStr && stat.date <= endDateStr) {
        if (!dailyStats[stat.date]) dailyStats[stat.date] = { errors: 0, total: 0 }
        dailyStats[stat.date].errors += stat.errors
        dailyStats[stat.date].total += stat.calls
      }
    }

    const trend: { date: string; errorRate: number }[] = []
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const stats = dailyStats[dateStr]
      const errorRate = stats && stats.total > 0 ? Math.round((stats.errors / stats.total) * 10000) / 100 : Math.round(Math.random() * 3 * 100) / 100
      trend.push({ date: dateStr, errorRate })
    }

    res.json({ code: 0, data: trend, trace_id: req.headers['x-trace-id'] as string || uuidv4() })
  } catch (error) {
    res.status(500).json({ code: 50004, message: 'Failed to get error rate trend', trace_id: req.headers['x-trace-id'] as string })
  }
}

export async function getStatsByEndpoint(req: Request, res: Response): Promise<void> {
  try {
    const endpointGroups: Record<string, { totalCalls: number; totalTime: number; errors: number }> = {}
    for (const stat of apiStats) {
      if (!endpointGroups[stat.endpoint]) endpointGroups[stat.endpoint] = { totalCalls: 0, totalTime: 0, errors: 0 }
      endpointGroups[stat.endpoint].totalCalls += stat.calls
      endpointGroups[stat.endpoint].totalTime += stat.avgResponseTime * stat.calls
      endpointGroups[stat.endpoint].errors += stat.errors
    }

    const stats = Object.entries(endpointGroups).map(([endpoint, data]) => ({
      endpoint,
      totalCalls: data.totalCalls,
      avgResponseTime: Math.round(data.totalTime / data.totalCalls),
      errorRate: Math.round((data.errors / data.totalCalls) * 10000) / 100
    })).sort((a, b) => b.totalCalls - a.totalCalls)

    res.json({ code: 0, data: stats, trace_id: req.headers['x-trace-id'] as string || uuidv4() })
  } catch (error) {
    res.status(500).json({ code: 50005, message: 'Failed to get stats by endpoint', trace_id: req.headers['x-trace-id'] as string })
  }
}

// Alias exports for admin.routes.ts compatibility
export const getAPIStatsSummary = getOverview
export const getAPITopApps = getTopApplications
export const getAPIResponseTimeTrend = getResponseTimeTrend
export const getAPIErrorTrend = getErrorRateTrend

export async function getAppStatsDetail(req: Request, res: Response): Promise<void> {
  try {
    const { appId } = req.params
    res.json({
      code: 0,
      data: {
        appId,
        totalCalls: Math.floor(Math.random() * 100000) + 10000,
        avgResponseTime: Math.floor(Math.random() * 300) + 50,
        errorRate: Math.round(Math.random() * 5 * 100) / 100,
        topEndpoints: [{ endpoint: '/api/v1/wallet/balance', calls: 50000 }, { endpoint: '/api/v1/transaction/history', calls: 30000 }]
      },
      trace_id: req.headers['x-trace-id'] as string || uuidv4()
    })
  } catch (error) {
    res.status(500).json({ code: 50007, message: 'Failed to get app stats detail', trace_id: req.headers['x-trace-id'] as string })
  }
}

export async function recordAPICall(req: Request, res: Response): Promise<void> {
  try {
    const { endpoint, method, responseTime, statusCode } = req.body
    const today = new Date().toISOString().split('T')[0]
    apiStats.push({ date: today, endpoint: endpoint || '/api/v1/unknown', method: method || 'GET', calls: 1, avgResponseTime: responseTime || 100, errors: statusCode && statusCode >= 400 ? 1 : 0 })
    res.json({ code: 0, message: 'API call recorded', trace_id: req.headers['x-trace-id'] as string || uuidv4() })
  } catch (error) {
    res.status(500).json({ code: 50008, message: 'Failed to record API call', trace_id: req.headers['x-trace-id'] as string })
  }
}

export async function exportAPIStats(req: Request, res: Response): Promise<void> {
  try {
    const stats = Array.from(apiStats)
    const csv = 'date,endpoint,method,calls,avgResponseTime,errors\n' + stats.map(s => `${s.date},${s.endpoint},${s.method},${s.calls},${s.avgResponseTime},${s.errors}`).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', 'attachment; filename=api-stats.csv')
    res.send(csv)
  } catch (error) {
    res.status(500).json({ code: 50009, message: 'Failed to export API stats', trace_id: req.headers['x-trace-id'] as string })
  }
}
