/**
 * OauthResource Types
 * Defines entities and interfaces for OAuth resource authorization management
 */

/**
 * OauthResource status - 授权状态
 */
export type OauthResourceStatus = 'active' | 'revoked' | 'expired';

/**
 * OauthResource entity - OAuth资源授权实体
 * Represents a third-party platform's authorization to access custody platform resources
 */
export interface OauthResource {
  id: string;
  appId: string;
  resourceKey?: string;
  permissions?: string[];
  authorizedAt: string;
  expiresAt?: string;
  status: OauthResourceStatus;
  createdAt: string;
  updatedAt: string;
}

/**
 * OauthResource create input - 创建授权输入
 */
export interface CreateOauthResourceInput {
  appId: string;
  resourceKey?: string;
  permissions?: string[];
  expiresAt?: string;
}

/**
 * OauthResource update input - 更新授权输入
 */
export interface UpdateOauthResourceInput {
  resourceKey?: string;
  expiresAt?: string;
  status?: OauthResourceStatus;
}

/**
 * OauthResource response - 授权响应
 */
export interface OauthResourceResponse {
  authorizationId: string;
  createdAt: string;
  updatedAt?: string;
}

/**
 * Request body for creating authorization - 创建授权请求体
 * Contains base request info and business data
 */
export interface CreateAuthorizationRequest {
  // Base request info (基础信息)
  appId: string;
  timestamp: number;
  nonce: string;
  signature: string;

  // Business data (业务信息)
  resourceKey: string;
  permissions: string[];
  expiresAt?: string;
}

// Legacy type aliases for backward compatibility
export type Authorization = OauthResource;
export type AuthorizationStatus = OauthResourceStatus;
export type CreateAuthorizationInput = CreateOauthResourceInput;
export type UpdateAuthorizationInput = UpdateOauthResourceInput;
export type AuthorizationResponse = OauthResourceResponse;
