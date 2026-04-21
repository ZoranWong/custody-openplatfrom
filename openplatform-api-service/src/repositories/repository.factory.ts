/**
 * Repository Factory
 * Creates repositories with Prisma Client injected
 */

import { getPrismaClient } from '../database/prisma-client'
import {
  IsvDeveloperRepository,
  ISVUserRepository,
  ApplicationRepository,
  EndpointPermissionRepository,
  AdminRepository,
  OauthResourceRepository,
} from './repository.interfaces'
import { IsvDeveloperRepositoryImpl } from './implementations/isv-developer.repository'
import { ISVUserRepositoryImpl } from './implementations/isv-user.repository'
import { ApplicationRepositoryImpl } from './implementations/application.repository'
import { EndpointPermissionRepositoryImpl } from './implementations/permission.repository'
import { AdminRepositoryImpl } from './implementations/admin.repository'
import { OauthResourceRepositoryImpl } from './implementations/authorization.repository'

// Singleton instances
let isvDeveloperRepo: IsvDeveloperRepository | null = null
let isvUserRepo: ISVUserRepository | null = null
let appRepo: ApplicationRepository | null = null
let permissionRepo: EndpointPermissionRepository | null = null
let adminRepo: AdminRepository | null = null
let oauthResourceRepo: OauthResourceRepository | null = null

export function getIsvDeveloperRepository(): IsvDeveloperRepository {
  if (isvDeveloperRepo) return isvDeveloperRepo
  isvDeveloperRepo = new IsvDeveloperRepositoryImpl(getPrismaClient())
  return isvDeveloperRepo
}

export function getISVUserRepository(): ISVUserRepository {
  if (isvUserRepo) return isvUserRepo
  isvUserRepo = new ISVUserRepositoryImpl(getPrismaClient())
  return isvUserRepo
}

export function getApplicationRepository(): ApplicationRepository {
  if (appRepo) return appRepo
  appRepo = new ApplicationRepositoryImpl(getPrismaClient())
  return appRepo
}

export function getEndpointPermissionRepository(): EndpointPermissionRepository {
  if (permissionRepo) return permissionRepo
  permissionRepo = new EndpointPermissionRepositoryImpl(getPrismaClient())
  return permissionRepo
}

export function getAdminRepository(): AdminRepository {
  if (adminRepo) return adminRepo
  adminRepo = new AdminRepositoryImpl(getPrismaClient())
  return adminRepo
}

export function getOauthResourceRepository(): OauthResourceRepository {
  if (oauthResourceRepo) return oauthResourceRepo
  oauthResourceRepo = new OauthResourceRepositoryImpl(getPrismaClient())
  return oauthResourceRepo
}

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
  permissionRepo = null
  adminRepo = null
  oauthResourceRepo = null
}
