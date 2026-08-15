import request from '@/utils/http'
import { apiService } from './api-service'

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

/**
 * ISV 登录
 * @param params ISV 登录参数
 * @returns ISV 登录响应
 */
export function fetchISVLogin(params: Api.Auth.ISVLoginParams) {
  return apiService.login(params)
}

/**
 * 获取 ISV 用户信息
 * @returns ISV 用户信息
 */
export function fetchISVUserInfo() {
  return apiService.getISVProfile()
}

/**
 * 获取 ISV 信息
 * @returns ISV 信息
 */
export function fetchISVInfo() {
  return apiService.getISVInfo()
}

/**
 * ISV 注册
 * @param params 注册参数
 */
export function fetchISVRegister(params: any) {
  return apiService.register(params)
}

/**
 * ISV 忘记密码
 * @param params 参数
 */
export function fetchISVForgotPassword(params: { email: string }) {
  return apiService.forgotPassword(params)
}

/**
 * ISV 重置密码
 * @param params 参数
 */
export function fetchISVResetPassword(params: { token: string; password: string }) {
  return apiService.resetPassword(params)
}
