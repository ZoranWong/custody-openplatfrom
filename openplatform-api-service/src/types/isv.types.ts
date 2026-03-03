/**
 * ISV Domain Types
 * Domain models for ISV entities
 */

import { Entity } from '../repositories/storage.adapter'

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
export interface ISVUser extends Entity {
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

// ISV 公司
export interface ISV extends Entity {
  legalName: string
  registrationNumber: string
  jurisdiction: string
  dateOfIncorporation: string
  registeredAddress: string
  website?: string
  kybStatus: 'pending' | 'approved' | 'rejected'
  status: 'active' | 'suspended' | 'banned'
  // UBO information
  uboInfo: UBO[]
  // Status history
  statusHistory?: StatusChange[]
  // KYB related
  kybReviewedAt?: string
  kybReviewedBy?: string
  rejectReason?: string
  // Account suspension/ban related
  suspendReason?: string
  suspendedAt?: string
  suspendedBy?: string
  banReason?: string
  bannedAt?: string
  bannedBy?: string
  createdAt: string
  updatedAt: string
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
export interface Application extends Entity {
  isvId: string
  name: string
  appId: string
  appSecret?: string
  description?: string
  callbackUrl?: string
  type: 'corporate' | 'payment' | 'custody'
  status: 'pending_review' | 'active' | 'inactive' | 'suspended'
  permittedUsers: string[]
  createdAt: string
  updatedAt: string
}
