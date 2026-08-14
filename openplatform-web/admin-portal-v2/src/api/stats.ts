import request from '@/utils/http'

/**
 * 获取 API 统计摘要
 */
export function fetchAPIStatsSummary() {
  return request.get<any>({ url: '/api/v1/admin/stats/api/summary' })
}

/**
 * 获取收入统计摘要
 */
export function fetchRevenueSummary() {
  return request.get<any>({ url: '/api/v1/admin/stats/revenue/summary' })
}

/**
 * 获取收入趋势
 */
export function fetchRevenueTrends() {
  return request.get<any>({ url: '/api/v1/admin/stats/revenue/trends' })
}

/**
 * 获取健康状态
 */
export function fetchHealthStatus() {
  return request.get<any>({ url: '/api/v1/admin/health/status' })
}