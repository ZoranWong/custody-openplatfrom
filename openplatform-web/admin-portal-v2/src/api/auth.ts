import request from '@/utils/http'

/**
 * 登录
 * @param params 登录参数
 * @returns 登录响应
 */
export function fetchLogin(params: Api.Auth.LoginParams) {
  return request.post<Api.Auth.LoginResponse>({
    url: '/api/auth/login',
    params
  })
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request.get<Api.Auth.UserInfo>({
    url: '/api/user/info'
  })
}

// ============================================
// Admin Auth APIs
// ============================================

/**
 * Admin 登录
 */
export function fetchAdminLogin(params: { email: string; password: string }) {
  return request.post<any>({ url: '/admin/auth/login', params })
}

/**
 * Admin 刷新 Token
 */
export function fetchAdminRefreshToken(params: { refreshToken: string }) {
  return request.post<any>({ url: '/admin/auth/refresh', params })
}

/**
 * Admin 登出
 */
export function fetchAdminLogout() {
  return request.post<any>({ url: '/admin/auth/logout' })
}

/**
 * Admin 获取用户信息
 */
export function fetchAdminGetUserInfo() {
  return request.get<any>({ url: '/admin/profile' })
}

/**
 * Admin 修改密码
 */
export function fetchAdminChangePassword(params: { currentPassword: string; newPassword: string }) {
  return request.post<any>({ url: '/admin/auth/change-password', params })
}
