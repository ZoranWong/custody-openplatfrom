import request from '@/utils/http'

/**
 * 获取应用列表
 */
export function fetchApplications() {
  return request.get<any>({ url: '/isv/applications' })
}

/**
 * 获取单个应用
 */
export function fetchApplicationById(id: string) {
  return request.get<any>({ url: `/isv/applications/${id}` })
}

/**
 * 创建应用
 */
export function fetchCreateApplication(data: any) {
  return request.post<any>({ url: '/isv/applications', data })
}

/**
 * 更新应用
 */
export function fetchUpdateApplication(id: string, data: any) {
  return request.put<any>({ url: `/isv/applications/${id}`, data })
}

/**
 * 删除应用
 */
export function fetchDeleteApplication(id: string) {
  return request.del<any>({ url: `/isv/applications/${id}` })
}

/**
 * 重新生成应用密钥
 */
export function fetchRegenerateAppSecret(id: string) {
  return request.post<any>({ url: `/isv/applications/${id}/regenerate-secret` })
}