/**
 * Repository Factory
 * Creates repositories with storage adapter injected based on configuration
 */

import { StorageDriver, StorageAdapter } from './storage.adapter'
import { FileStorageAdapter, MemoryStorageAdapter } from './file-storage.adapter'
import { MySQLStorageAdapter } from './mysql-storage.adapter'
import { EntityBase } from './repository'
import { ISVUserRepository } from './repository.interfaces'
import { IsvDeveloperRepository } from './repository.interfaces'
import { ApplicationRepository } from './repository.interfaces'
import { BindingRepository } from './repository.interfaces'
import { EndpointPermissionRepository } from './repository.interfaces'
import { AdminRepository } from './repository.interfaces'
import { OauthResourceRepository } from './repository.interfaces'
import { ISVUserRepositoryImpl } from './implementations/isv-user.repository'
import { IsvDeveloperRepositoryImpl } from './implementations/isv-developer.repository'
import { ApplicationRepositoryImpl } from './implementations/application.repository'
import { BindingRepositoryImpl } from './implementations/binding.repository'
import { EndpointPermissionRepositoryImpl } from './implementations/permission.repository'
import { AdminRepositoryImpl } from './implementations/admin.repository'
import { OauthResourceRepositoryImpl } from './implementations/authorization.repository'

// Singleton instances
let isvDeveloperRepo: IsvDeveloperRepository | null = null
let isvUserRepo: ISVUserRepository | null = null
let appRepo: ApplicationRepository | null = null
let bindingRepo: BindingRepository | null = null
let permissionRepo: EndpointPermissionRepository | null = null
let adminRepo: AdminRepository | null = null
let oauthResourceRepo: OauthResourceRepository | null = null

/**
 * Create storage adapter based on driver
 */
function createAdapter(tableName: string): StorageAdapter {
  const driver = (process.env.STORAGE_TYPE as StorageDriver) || 'file'

  if (driver === 'mysql') {
    return new MySQLStorageAdapter(tableName)
  }

  if (driver === 'file') {
    return new FileStorageAdapter(tableName)
  }

  return new MemoryStorageAdapter(tableName)
}

/**
 * Get IsvDeveloper repository instance
 */
export function getIsvDeveloperRepository(): IsvDeveloperRepository {
  if (isvDeveloperRepo) return isvDeveloperRepo
  isvDeveloperRepo = new IsvDeveloperRepositoryImpl(createAdapter('isv_developer'))
  return isvDeveloperRepo
}

/**
 * Get ISV User repository instance
 */
export function getISVUserRepository(): ISVUserRepository {
  if (isvUserRepo) return isvUserRepo
  isvUserRepo = new ISVUserRepositoryImpl(createAdapter('isv_users'))
  return isvUserRepo
}

/**
 * Get Application repository instance
 */
export function getApplicationRepository(): ApplicationRepository {
  if (appRepo) return appRepo
  appRepo = new ApplicationRepositoryImpl(createAdapter('applications'))
  return appRepo
}

/**
 * Get Binding repository instance
 */
export function getBindingRepository(): BindingRepository {
  if (bindingRepo) return bindingRepo
  bindingRepo = new BindingRepositoryImpl(createAdapter('bindings'))
  return bindingRepo
}

/**
 * Get Endpoint Permission repository instance
 */
export function getEndpointPermissionRepository(): EndpointPermissionRepository {
  if (permissionRepo) return permissionRepo
  permissionRepo = new EndpointPermissionRepositoryImpl(createAdapter('endpoint_permissions'))
  return permissionRepo
}

/**
 * Get Admin repository instance
 */
export function getAdminRepository(): AdminRepository {
  if (adminRepo) return adminRepo
  adminRepo = new AdminRepositoryImpl(createAdapter('admins'))
  return adminRepo
}

/**
 * Get OauthResource repository instance (renamed from AuthorizationRepository)
 */
export function getOauthResourceRepository(): OauthResourceRepository {
  if (oauthResourceRepo) return oauthResourceRepo
  oauthResourceRepo = new OauthResourceRepositoryImpl(createAdapter('oauth_resources'))
  return oauthResourceRepo
}

/**
 * Get Authorization repository instance (legacy alias)
 */
export function getAuthorizationRepository(): OauthResourceRepository {
  return getOauthResourceRepository()
}

/**
 * Reset all repository instances (for testing)
 */
export function resetRepositories(): void {
  isvDeveloperRepo = null
  isvUserRepo = null
  appRepo = null
  bindingRepo = null
  permissionRepo = null
  adminRepo = null
  oauthResourceRepo = null
}
