import request from '@/utils/http'

/**
 * 获取待审核 KYB 列表
 */
export function fetchKYBPending() {
  return request.get<any>({ url: '/api/v1/admin/kyb/pending' })
}

/**
 * 获取 KYB 列表
 * @param params 查询参数
 */
export function fetchKYBList(params: { status?: string; page?: number; limit?: number }) {
  return request.get<any>({ url: '/api/v1/admin/kyb', params })
}

/**
 * 获取 KYB 详情
 * @param id KYB ID
 */
export function fetchKYBDetail(id: string) {
  return request.get<any>({ url: `/api/v1/admin/kyb/${id}` })
}

/**
 * 获取 KYB 统计
 */
export function fetchKYBStats() {
  return request.get<any>({ url: '/api/v1/admin/kyb/stats' })
}

/**
 * 获取 KYB 历史记录
 * @param params 查询参数
 */
export function fetchKYBHistory(params: any) {
  return request.get<any>({ url: '/api/v1/admin/kyb/history', params })
}