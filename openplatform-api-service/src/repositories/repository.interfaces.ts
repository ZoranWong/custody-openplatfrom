/**
 * Extended Repository Interfaces
 * Each interface extends Prisma-generated model types for type safety
 */

import {
  Prisma,
  Admin,
  IsvDeveloper,
  IsvUser,
  Application,
  OauthResource,
  RefreshToken,
} from '@prisma/client'

export {
  Admin,
  IsvDeveloper,
  IsvUser,
  Application,
  OauthResource,
  RefreshToken,
}

export interface IsvDeveloperRepository {
  findById(id: string): Promise<IsvDeveloper | null>
  findByEmail(email: string): Promise<IsvDeveloper | null>
  findByRegistrationNumber(registrationNumber: string): Promise<IsvDeveloper | null>
  findByFilters(where: Prisma.IsvDeveloperWhereInput, page?: number, pageSize?: number): Promise<IsvDeveloper[]>
  count(where?: Prisma.IsvDeveloperWhereInput): Promise<number>
  create(data: Prisma.IsvDeveloperCreateInput): Promise<IsvDeveloper>
  update(id: string, data: Prisma.IsvDeveloperUpdateInput): Promise<IsvDeveloper>
  delete(id: string): Promise<boolean>
}

export interface ISVUserRepository {
  findById(id: string): Promise<IsvUser | null>
  findByEmail(email: string): Promise<IsvUser | null>
  findByIsvDeveloper(isvDeveloperId: string): Promise<IsvUser[]>
  findByIsvDeveloperAndEmail(isvDeveloperId: string, email: string): Promise<IsvUser | null>
  create(data: Prisma.IsvUserCreateInput): Promise<IsvUser>
  update(id: string, data: Prisma.IsvUserUpdateInput): Promise<IsvUser>
  delete(id: string): Promise<boolean>
}

export interface ApplicationRepository {
  findById(id: string): Promise<Application | null>
  findByAppId(appId: string): Promise<Application | null>
  findByIsvDeveloper(isvDeveloperId: string): Promise<Application[]>
  countByDeveloperIds(developerIds: string[]): Promise<Record<string, number>>
  create(data: Prisma.ApplicationCreateInput): Promise<Application>
  update(id: string, data: Prisma.ApplicationUpdateInput): Promise<Application>
  delete(id: string): Promise<boolean>
}

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>
  findByEmail(email: string): Promise<Admin | null>
  findByRole(role: string): Promise<Admin[]>
  findActive(): Promise<Admin[]>
  findAll(): Promise<Admin[]>
  create(data: Prisma.AdminCreateInput): Promise<Admin>
  update(id: string, data: Prisma.AdminUpdateInput): Promise<Admin>
  delete(id: string): Promise<boolean>
}

export interface OauthResourceRepository {
  findById(id: string): Promise<OauthResource | null>
  findByAppId(appId: string): Promise<OauthResource[]>
  findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null>
  upsert(data: { appId: string; resourceKey: string | null; authorizedAt?: Date; expiresAt?: Date }): Promise<OauthResource>
  create(data: Prisma.OauthResourceCreateInput): Promise<OauthResource>
  update(id: string, data: Prisma.OauthResourceUpdateInput): Promise<OauthResource>
  delete(id: string): Promise<boolean>
}

export interface RefreshTokenRepository {
  create(record: {
    jti: string
    appid: string
    user_id: string
    expires_at: bigint
    revoked: boolean
    replaced_by_jti: string | null
    created_at: bigint
    last_used_at: bigint | null
  }): Promise<RefreshToken>
  findByJti(jti: string): Promise<RefreshToken | null>
  findByAppid(appid: string): Promise<RefreshToken[]>
  revoke(jti: string): Promise<boolean>
  markReplaced(jti: string, replacedByJti: string): Promise<boolean>
  deleteExpired(): Promise<number>
}
