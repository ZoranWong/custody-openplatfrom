/**
 * ISV Domain Types
 * Domain models for ISV entities
 */

// ISV Developer (主账号)
export interface IsvDeveloper {
  id: string
  email: string
  passwordHash?: string
  legalName: string
  registrationNumber?: string
  jurisdiction?: string
  dateOfIncorporation?: string
  registeredAddress?: string
  website?: string
  uboInfo?: UBO[]
  kybStatus: 'pending' | 'approved' | 'rejected'
  status: 'active' | 'suspended' | 'deleted' | 'banned'
  kybReviewedAt?: string
  kybReviewedBy?: string
  statusHistory?: StatusChange[]
  rejectReason?: string
  suspendReason?: string
  suspendedAt?: string
  suspendedBy?: string
  bannedAt?: string
  bannedBy?: string
  banReason?: string
  createdAt: string
  updatedAt: string
}

// ISV 角色类型
export enum ISVUserRole {
  OWNER = 'owner',
  DEVELOPER = 'developer'
}

// ISV 用户状态
export enum ISVUserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

// ISV 用户
export interface ISVUser {
  id: string
  isvDeveloperId: string
  isvId: string
  email: string
  password?: string
  name: string
  phone?: string
  role: ISVUserRole
  status: ISVUserStatus
  allowedApplications: string[]
  createdAt: string
  updatedAt: string
}

// 状态变更类型
export type StatusChangeType = 'status' | 'kyb_status'

// 状态变更记录
export interface StatusChange {
  id: string
  isvId: string
  type: StatusChangeType
  fromStatus: string
  toStatus: string
  reason?: string
  operatedBy: string
  operatedAt: string
}

// UBO 信息
export interface UBO {
  name: string
  idType: 'passport' | 'national_id'
  idNumber: string
  nationality: string
  phone: string
}

// Application
export interface Application {
  id: string
  isvDeveloperId: string
  name: string
  appSecret?: string
  description?: string
  callbackUrl?: string | null
  type: 'corporate' | 'payment' | 'custody'
  status: 'pending_review' | 'active' | 'inactive' | 'suspended'
  permittedUsers: string[]
  createdAt: string
  updatedAt: string
}
