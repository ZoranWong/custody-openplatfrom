/**
 * Extended Repository Interfaces
 * Add specific query methods for each entity type
 */

import { Repository } from './repository'
import { IsvDeveloper, ISVUser, Application } from '../types/isv.types'
import { AppEnterpriseBinding } from '../types/binding.types'
import { EndpointPermissionConfig } from '../types/permission.types'
import { OauthResource, Authorization } from '../types/authorization.types'

export interface IsvDeveloperRepository extends Repository<IsvDeveloper> {
  findByEmail(email: string): Promise<IsvDeveloper | null>
  findByRegistrationNumber(registrationNumber: string): Promise<IsvDeveloper | null>
}

export interface ISVUserRepository extends Repository<ISVUser> {
  findByEmail(email: string): Promise<ISVUser | null>
  findByIsvDeveloper(isvDeveloperId: string): Promise<ISVUser[]>
  findByIsvDeveloperAndEmail(isvDeveloperId: string, email: string): Promise<ISVUser | null>
}

export interface ApplicationRepository extends Repository<Application> {
  findByAppId(appId: string): Promise<Application | null>
  findByIsvDeveloper(isvDeveloperId: string): Promise<Application[]>
}

export interface BindingRepository extends Repository<AppEnterpriseBinding> {
  findByAppAndEnterprise(appid: string, enterpriseId: string): Promise<AppEnterpriseBinding | null>
  findByAppid(appid: string): Promise<AppEnterpriseBinding[]>
  findByEnterpriseId(enterpriseId: string): Promise<AppEnterpriseBinding[]>
}

export interface EndpointPermissionRepository extends Repository<EndpointPermissionConfig> {
  findByPathAndMethod(path: string, method: string): Promise<EndpointPermissionConfig | null>
}

/**
 * Admin entity interface
 */
export interface Admin {
  id: string
  email: string
  name: string
  password: string
  role: 'super_admin' | 'admin' | 'operator'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
}

/**
 * Admin Repository interface
 */
export interface AdminRepository extends Repository<Admin> {
  findByEmail(email: string): Promise<Admin | null>
  findByRole(role: 'super_admin' | 'admin' | 'operator'): Promise<Admin[]>
  findActive(): Promise<Admin[]>
}

/**
 * OauthResource Repository interface (renamed from AuthorizationRepository)
 */
export interface OauthResourceRepository extends Repository<OauthResource> {
  findById(id: string): Promise<OauthResource | null>
  findByAppId(appId: string): Promise<OauthResource[]>
  findByApp(appId: string): Promise<OauthResource[]>
  findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null>
  upsert(data: Omit<OauthResource, 'id' | 'createdAt' | 'updatedAt' | 'authorizedAt'>): Promise<OauthResource>
}

// Legacy type alias for backward compatibility
export type AuthorizationRepository = OauthResourceRepository
