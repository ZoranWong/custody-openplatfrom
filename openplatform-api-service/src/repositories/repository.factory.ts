/**
 * Repository Factory
 * Creates repositories with Prisma Client injected
 */

import { getPrismaClient } from '../database/prisma-client'
import {
  IsvDeveloperRepository,
  ISVUserRepository,
  ApplicationRepository,
  AdminRepository,
  OauthResourceRepository,
  RefreshTokenRepository,
} from './repository.interfaces'
import { IsvDeveloperRepositoryImpl } from './implementations/isv-developer.repository'
import { ISVUserRepositoryImpl } from './implementations/isv-user.repository'
import { ApplicationRepositoryImpl } from './implementations/application.repository'
import { AdminRepositoryImpl } from './implementations/admin.repository'
import { OauthResourceRepositoryImpl } from './implementations/authorization.repository'
import { RefreshTokenRepositoryImpl } from './implementations/refresh-token.repository'
import { DeveloperApplicationRepositoryImpl } from './implementations/developer-application.repository'
import { DeveloperAuditRepositoryImpl } from './implementations/developer-audit.repository'
import { AnnouncementRepositoryImpl } from './implementations/announcement.repository'

// Singleton instances
let isvDeveloperRepo: IsvDeveloperRepository | null = null
let isvUserRepo: ISVUserRepository | null = null
let appRepo: ApplicationRepository | null = null
let adminRepo: AdminRepository | null = null
let oauthResourceRepo: OauthResourceRepository | null = null
let refreshTokenRepo: RefreshTokenRepository | null = null
let developerApplicationRepo: DeveloperApplicationRepositoryImpl | null = null
let developerAuditRepo: DeveloperAuditRepositoryImpl | null = null
let announcementRepo: AnnouncementRepositoryImpl | null = null

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

export function getRefreshTokenRepository(): RefreshTokenRepository {
  if (refreshTokenRepo) return refreshTokenRepo
  refreshTokenRepo = new RefreshTokenRepositoryImpl(getPrismaClient())
  return refreshTokenRepo
}

export function getDeveloperApplicationRepository(): DeveloperApplicationRepositoryImpl {
  if (developerApplicationRepo) return developerApplicationRepo
  developerApplicationRepo = new DeveloperApplicationRepositoryImpl(getPrismaClient())
  return developerApplicationRepo
}

export function getDeveloperAuditRepository(): DeveloperAuditRepositoryImpl {
  if (developerAuditRepo) return developerAuditRepo
  developerAuditRepo = new DeveloperAuditRepositoryImpl(getPrismaClient())
  return developerAuditRepo
}

export function getAnnouncementRepository(): AnnouncementRepositoryImpl {
  if (announcementRepo) return announcementRepo
  announcementRepo = new AnnouncementRepositoryImpl(getPrismaClient())
  return announcementRepo
}

/**
 * Reset all repository instances (for testing)
 */
export function resetRepositories(): void {
  isvDeveloperRepo = null
  isvUserRepo = null
  appRepo = null
  adminRepo = null
  oauthResourceRepo = null
  refreshTokenRepo = null
  developerApplicationRepo = null
  developerAuditRepo = null
  announcementRepo = null
}
