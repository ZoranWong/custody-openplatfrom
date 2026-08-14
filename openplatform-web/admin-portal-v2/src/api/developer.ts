import request from '@/utils/http'

/**
 * 获取开发者列表
 * @param params 查询参数
 */
export function fetchDevelopers(params: { page?: number; pageSize?: number; status?: string; kybStatus?: string }) {
  return request.get<any>({ url: '/api/v1/admin/developers', params })
}

/**
 * 获取开发者详情
 * @param id 开发者 ID
 */
export function fetchDeveloperById(id: string) {
  return request.get<any>({ url: `/api/v1/admin/developers/${id}` })
}

/**
 * 获取开发者统计
 */
export function fetchDeveloperStats() {
  return request.get<any>({ url: '/api/v1/admin/developers/stats' })
}

/**
 * 审核通过开发者
 * @param id 开发者 ID
 */
export function fetchApproveDeveloper(id: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/approve` })
}

/**
 * 驳回开发者
 * @param id 开发者 ID
 * @param reason 驳回原因
 */
export function fetchRejectDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/reject`, params: { reason } })
}

/**
 * 封禁开发者
 * @param id 开发者 ID
 * @param reason 封禁原因
 */
export function fetchBanDeveloper(id: string, reason: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/ban`, params: { reason } })
}

/**
 * 激活开发者
 * @param id 开发者 ID
 */
export function fetchActivateDeveloper(id: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/activate` })
}

/**
 * 暂停开发者
 * @param id 开发者 ID
 */
export function fetchSuspendDeveloper(id: string) {
  return request.post<any>({ url: `/api/v1/admin/developers/${id}/suspend` })
}