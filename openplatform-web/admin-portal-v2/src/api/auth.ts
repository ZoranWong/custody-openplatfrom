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
    // showSuccessMessage: true // 显示成功消息
    // showErrorMessage: false // 不显示错误消息
  })
}

/**
 * 获取用户信息
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request.get<Api.Auth.UserInfo>({
    url: '/api/user/info'
    // 自定义请求头
    // headers: {
    //   'X-Custom-Header': 'your-custom-value'
    // }
  })
}

// ============================================
// Admin Auth APIs
// ============================================

/**
 * Admin 登录
 * @param params 登录参数
 */
export function fetchAdminLogin(params: { email: string; password: string }) {
  return request.post<any>({ url: '/api/v1/admin/auth/login', params })
}

/**
 * Admin 刷新 Token
 * @param params 刷新参数
 */
export function fetchAdminRefreshToken(params: { refreshToken: string }) {
  return request.post<any>({ url: '/api/v1/admin/auth/refresh', params })
}

/**
 * Admin 登出
 */
export function fetchAdminLogout() {
  return request.post<any>({ url: '/api/v1/admin/auth/logout' })
}

/**
 * 获取 Admin 用户信息
 */
export function fetchAdminGetUserInfo() {
  return request.get<any>({ url: '/api/v1/admin/profile' })
}

/**
 * Admin 修改密码
 * @param params 修改密码参数
 */
export function fetchAdminChangePassword(params: { currentPassword: string; newPassword: string }) {
  return request.post<any>({ url: '/api/v1/admin/auth/change-password', params })
}
