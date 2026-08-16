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
 * 获取用户信息（ISV profile）
 * @returns 用户信息
 */
export function fetchGetUserInfo() {
  return request.get<any>({
    url: '/isv/profile'
  })
}

/**
 * ISV 登录
 */
export function fetchISVLogin(params: any) {
  return request.post<any>({ url: '/isv/auth/login', data: params })
}

/**
 * 获取 ISV 用户信息
 */
export function fetchISVUserInfo() {
  return request.get<any>({ url: '/isv/profile' })
}

/**
 * 获取 ISV 信息
 */
export function fetchISVInfo() {
  return request.get<any>({ url: '/isv/info' })
}

/**
 * ISV 注册
 */
export function fetchISVRegister(params: any) {
  return request.post<any>({ url: '/isv/auth/register', data: params })
}

/**
 * ISV 忘记密码
 */
export function fetchISVForgotPassword(params: { email: string }) {
  return request.post<any>({ url: '/isv/auth/forgot-password', data: params })
}

/**
 * ISV 重置密码
 */
export function fetchISVResetPassword(params: { token: string; password: string }) {
  return request.post<any>({ url: '/isv/auth/reset-password', data: params })
}