import request from '@/utils/http'

/**
 * 系统监控 API
 * 后端路径: /admin/health
 */

/** 系统状态 */
export function fetchHealthStatus() {
  return request.get<any>({ url: '/admin/health/status' })
}

/** 服务列表 */
export function fetchServicesHealth() {
  return request.get<any>({ url: '/admin/health/services' })
}

/** 资源使用 */
export function fetchResourceUsage() {
  return request.get<any>({ url: '/admin/health/resources' })
}

/** 健康历史 */
export function fetchHealthHistory() {
  return request.get<any>({ url: '/admin/health/history' })
}

/** 刷新健康数据 */
export function fetchHealthRefresh() {
  return request.post<any>({ url: '/admin/health/refresh' })
}