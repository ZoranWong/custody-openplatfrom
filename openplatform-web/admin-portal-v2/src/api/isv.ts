import request from '@/utils/http'

/**
 * 获取 ISV 状态
 * @param id ISV ID
 */
export function fetchISVStatus(id: string) {
  return request.get<any>({ url: `/api/v1/admin/isv/${id}/status` })
}

/**
 * 激活 ISV
 * @param id ISV ID
 */
export function fetchActivateISV(id: string) {
  return request.post<any>({ url: `/api/v1/admin/isv/${id}/activate` })
}

/**
 * 暂停 ISV
 * @param id ISV ID
 * @param reason 暂停原因
 */
export function fetchSuspendISV(id: string, reason?: string) {
  return request.post<any>({ url: `/api/v1/admin/isv/${id}/suspend`, params: { reason } })
}

/**
 * 封禁 ISV
 * @param id ISV ID
 * @param reason 封禁原因
 */
export function fetchBanISV(id: string, reason: string) {
  return request.post<any>({ url: `/api/v1/admin/isv/${id}/ban`, params: { reason } })
}

/**
 * 获取 ISV 状态历史
 * @param id ISV ID
 */
export function fetchISVStatusHistory(id: string) {
  return request.get<any>({ url: `/api/v1/admin/isv/${id}/status/history` })
}