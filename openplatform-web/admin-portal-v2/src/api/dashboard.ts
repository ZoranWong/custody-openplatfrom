import request from '@/utils/http'

/**
 * 获取仪表盘统计
 */
export function fetchDashboardStats() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/stats' })
}

/**
 * 获取仪表盘趋势
 */
export function fetchDashboardTrends() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/trends' })
}

/**
 * 获取仪表盘详情
 */
export function fetchDashboardDetails() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/details' })
}

/**
 * 获取仪表盘健康状态
 */
export function fetchDashboardHealth() {
  return request.get<any>({ url: '/api/v1/admin/dashboard/health' })
}