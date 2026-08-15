import request from '@/utils/http'

/**
 * 统计分析 API
 * 后端路径: /admin/stats
 */

/** API 统计概要 */
export function fetchAPIStatsSummary() {
  return request.get<any>({ url: '/admin/stats/api/summary' })
}

/** Top 应用 */
export function fetchAPITopApps() {
  return request.get<any>({ url: '/admin/stats/api/top-apps' })
}

/** 响应时间趋势 */
export function fetchAPIResponseTimeTrend() {
  return request.get<any>({ url: '/admin/stats/api/response-times' })
}

/** 错误趋势 */
export function fetchAPIErrorTrend() {
  return request.get<any>({ url: '/admin/stats/api/errors' })
}

/** 收入概要 */
export function fetchRevenueSummary() {
  return request.get<any>({ url: '/admin/stats/revenue/summary' })
}

/** 收入趋势 */
export function fetchRevenueTrends() {
  return request.get<any>({ url: '/admin/stats/revenue/trends' })
}

/** 按开发者收入 */
export function fetchRevenueByDeveloper() {
  return request.get<any>({ url: '/admin/stats/revenue/by-developer' })
}