import request from '@/utils/http'

/**
 * 开发者管理 API
 * 后端路径: /admin/developers
 */

/** 分页列表，支持 status/kybStatus 过滤 */
export function fetchDevelopers(params: {
  page?: number
  pageSize?: number
  status?: string
  kybStatus?: string
}) {
  return request.get<any>({ url: '/admin/developers', params })
}

/** 统计数据 */
export function fetchDeveloperStats() {
  return request.get<any>({ url: '/admin/developers/stats' })
}

/** 详情 */
export function fetchDeveloperById(id: string) {
  return request.get<any>({ url: `/admin/developers/${id}` })
}

/** 审批通过 */
export function fetchApproveDeveloper(id: string) {
  return request.post<any>({ url: `/admin/developers/${id}/approve` })
}

/** 审批拒绝 */
export function fetchRejectDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/admin/developers/${id}/reject`, params: { reason } })
}

/** 封禁 */
export function fetchBanDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/admin/developers/${id}/ban`, params: { reason } })
}

/** 激活 */
export function fetchActivateDeveloper(id: string) {
  return request.post<any>({ url: `/admin/developers/${id}/activate` })
}

/** 冻结 */
export function fetchSuspendDeveloper(id: string) {
  return request.post<any>({ url: `/admin/developers/${id}/suspend` })
}