import request from '@/utils/http'

/**
 * 仪表盘 API
 * 后端路径: /admin/dashboard
 */

/** 概览统计 */
export function fetchDashboardStats() {
  return request.get<any>({ url: '/admin/dashboard/stats' })
}

/** 趋势数据 */
export function fetchDashboardTrends() {
  return request.get<any>({ url: '/admin/dashboard/trends' })
}

/** 详细数据 */
export function fetchDashboardDetails() {
  return request.get<any>({ url: '/admin/dashboard/details' })
}

/** 健康状态 */
export function fetchDashboardHealth() {
  return request.get<any>({ url: '/admin/dashboard/health' })
}

/** 刷新数据 */
export function fetchDashboardRefresh() {
  return request.post<any>({ url: '/admin/dashboard/refresh' })
}