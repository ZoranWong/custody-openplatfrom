import request from '@/utils/http'

/**
 * 系统设置 API
 * 后端路径: /admin
 */

/** 管理员列表 */
export function fetchAdmins() {
  return request.get<any>({ url: '/admin/admins' })
}

/** 管理员详情 */
export function fetchAdminById(id: string) {
  return request.get<any>({ url: `/admin/admins/${id}` })
}

/** 创建管理员 */
export function fetchCreateAdmin(params: { email: string; password: string; name: string; role: string }) {
  return request.post<any>({ url: '/admin/admins', params })
}

/** 更新管理员 */
export function fetchUpdateAdmin(id: string, params: { name?: string; role?: string; status?: string }) {
  return request.put<any>({ url: `/admin/admins/${id}`, params })
}

/** 审计日志 */
export function fetchAuditLogs(params: { page?: number; pageSize?: number }) {
  return request.get<any>({ url: '/admin/audit/query', params })
}

/** 审计日志详情 */
export function fetchAuditLogById(id: string) {
  return request.get<any>({ url: `/admin/audit/logs/${id}` })
}

/** 审计日志导出 */
export function fetchAuditLogExport() {
  return request.get<any>({ url: '/admin/audit/export' })
}

/** 审计日志统计 */
export function fetchAuditLogStats() {
  return request.get<any>({ url: '/admin/audit/stats' })
}