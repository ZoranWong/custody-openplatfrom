/**
 * Extended Repository Interfaces
 * Each interface defines the contract for a repository; implementations
 * live in implementations/ and are wired through the registry in repository.factory.ts
 */

import {
  Prisma,
  Admin,
  IsvDeveloper,
  IsvUser,
  Application,
  OauthResource,
  RefreshToken,
  Subscription,
  ApiLog,
  Ticket,
  TicketReply,
  Order,
  Package,
} from '@prisma/client'

export {
  Admin,
  IsvDeveloper,
  IsvUser,
  Application,
  OauthResource,
  RefreshToken,
  Subscription,
  ApiLog,
  Ticket,
  TicketReply,
  Order,
  Package,
}

// ---------------------------------------------------------------------------
// Core entity repositories (interfaces for Prisma-backed models)
// ---------------------------------------------------------------------------

export interface IsvDeveloperRepository {
  findById(id: string): Promise<IsvDeveloper | null>
  findByEmail(email: string): Promise<IsvDeveloper | null>
  findByRegistrationNumber(registrationNumber: string): Promise<IsvDeveloper | null>
  findByFilters(where: Prisma.IsvDeveloperWhereInput, page?: number, pageSize?: number): Promise<IsvDeveloper[]>
  count(where?: Prisma.IsvDeveloperWhereInput): Promise<number>
  create(data: Prisma.IsvDeveloperCreateInput): Promise<IsvDeveloper>
  update(id: string, data: Prisma.IsvDeveloperUpdateInput): Promise<IsvDeveloper>
  delete(id: string): Promise<IsvDeveloper>
}

export interface ISVUserRepository {
  findById(id: string): Promise<IsvUser | null>
  findByEmail(email: string): Promise<IsvUser | null>
  findByIsvDeveloper(isvDeveloperId: string): Promise<IsvUser[]>
  findByIsvDeveloperAndEmail(isvDeveloperId: string, email: string): Promise<IsvUser | null>
  create(data: Prisma.IsvUserCreateInput): Promise<IsvUser>
  update(id: string, data: Prisma.IsvUserUpdateInput): Promise<IsvUser>
  delete(id: string): Promise<IsvUser>
}

export interface ApplicationRepository {
  findById(id: string): Promise<Application | null>
  findByAppId(appId: string): Promise<Application | null>
  findByIsvDeveloper(isvDeveloperId: string): Promise<Application[]>
  countByDeveloperIds(developerIds: string[]): Promise<Record<string, number>>
  create(data: Prisma.ApplicationCreateInput): Promise<Application>
  update(id: string, data: Prisma.ApplicationUpdateInput): Promise<Application>
  delete(id: string): Promise<Application>
}

export interface AdminRepository {
  findById(id: string): Promise<Admin | null>
  findByEmail(email: string): Promise<Admin | null>
  findByRole(role: string): Promise<Admin[]>
  findActive(): Promise<Admin[]>
  findAll(): Promise<Admin[]>
  create(data: Prisma.AdminCreateInput): Promise<Admin>
  update(id: string, data: Prisma.AdminUpdateInput): Promise<Admin>
  delete(id: string): Promise<Admin>
}

export interface OauthResourceRepository {
  findById(id: string): Promise<OauthResource | null>
  findByAppId(appId: string): Promise<OauthResource[]>
  findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null>
  upsert(data: { appId: string; resourceKey: string | null; authorizedAt?: Date; expiresAt?: Date }): Promise<OauthResource>
  create(data: Prisma.OauthResourceCreateInput): Promise<OauthResource>
  update(id: string, data: Prisma.OauthResourceUpdateInput): Promise<OauthResource>
  delete(id: string): Promise<OauthResource>
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

// ---------------------------------------------------------------------------
// Quota result
// ---------------------------------------------------------------------------

export interface QuotaResult {
  allowed: boolean
  currentUsage: number
  dailyLimit: number
  subscriptionId?: string
}

// ---------------------------------------------------------------------------
// Subscription repository
// ---------------------------------------------------------------------------

export interface SubscriptionRepository {
  findById(id: string): Promise<Subscription | null>
  findByDeveloperId(developerId: string): Promise<Subscription | null>
  findActiveWithPackage(developerId: string): Promise<(Subscription & { package: { dailyApiLimit: number } }) | null>
  findByFilters(where: Prisma.SubscriptionWhereInput, page: number, pageSize: number): Promise<{ list: Subscription[]; total: number }>
  create(data: Prisma.SubscriptionCreateInput): Promise<Subscription>
  update(id: string, data: Prisma.SubscriptionUpdateInput): Promise<Subscription>
  /** Atomically increment daily API usage. Returns whether the increment was allowed. */
  atomicIncrementDailyUsage(developerId: string): Promise<QuotaResult>
  /** Reset all daily API usage counters to 0. Returns count of reset rows. */
  resetAllDailyUsage(): Promise<number>
}

// ---------------------------------------------------------------------------
// ApiLog repository
// ---------------------------------------------------------------------------

export interface ApiLogStats {
  totalCalls: number
  errorCalls: number
  avgResponseTime: number
}

export interface ApiLogDailyBreakdown {
  date: string
  calls: number
  successCount: number
  avgResponseTime: number
}

export interface ApiLogEndpointBreakdown {
  endpoint: string
  method: string
  calls: number
  successCount: number
  successRate: number
  percentage: number
  avgResponseTime: number
  maxResponseTime: number
}

export interface ApiLogRepository {
  create(data: {
    appId: string
    developerId?: string
    subscriptionId?: string
    apiName?: string
    endpoint: string
    method: string
    requestHeaders?: any
    requestBody?: any
    responseStatus?: number
    responseBody?: any
    responseTime?: number
    ipAddress?: string
    userAgent?: string
    isError?: boolean
  }): Promise<ApiLog>
  findRecentErrors(developerId: string, limit?: number): Promise<{ apiName: string; endpoint: string; responseStatus: number; createdAt: string }[]>
  countByDeveloper(developerId: string, startDate?: Date, isError?: boolean): Promise<number>
  countTodaySuccess(developerId: string): Promise<number>
  getStats(developerId: string, startDate: Date): Promise<ApiLogStats>
  getDailyBreakdown(developerId: string, startDate: Date): Promise<ApiLogDailyBreakdown[]>
  getEndpointBreakdown(developerId: string, startDate: Date, totalCalls: number): Promise<ApiLogEndpointBreakdown[]>
  cleanup(retentionDays?: number): Promise<{ count: number }>
  /** Paginated API log query */
  findByDeveloper(developerId: string, page: number, pageSize: number, filters?: { isError?: boolean; apiName?: string; startDate?: Date; endDate?: Date }): Promise<{ list: ApiLog[]; total: number; page: number; pageSize: number }>
}

// ---------------------------------------------------------------------------
// Ticket repository
// ---------------------------------------------------------------------------

export interface TicketRepository {
  findById(id: string): Promise<Ticket | null>
  findByFilters(where: Prisma.TicketWhereInput, page: number, pageSize: number): Promise<{ list: Ticket[]; total: number }>
  create(data: Prisma.TicketCreateInput): Promise<Ticket>
  update(id: string, data: Prisma.TicketUpdateInput): Promise<Ticket>
  createReply(data: Prisma.TicketReplyCreateInput): Promise<TicketReply>
}

// ---------------------------------------------------------------------------
// Order repository
// ---------------------------------------------------------------------------

export interface OrderRepository {
  findById(id: string): Promise<Order | null>
  findByFilters(where: Prisma.OrderWhereInput, page: number, pageSize: number): Promise<{ list: Order[]; total: number }>
  create(data: Prisma.OrderCreateInput): Promise<Order>
  update(id: string, data: Prisma.OrderUpdateInput): Promise<Order>
}

// ---------------------------------------------------------------------------
// Package repository
// ---------------------------------------------------------------------------

export interface PackageRepository {
  findById(id: string): Promise<Package | null>
  findByFilters(where: Prisma.PackageWhereInput, page: number, pageSize: number): Promise<{ list: Package[]; total: number }>
  findByCodeAndStatus(packageCode: string, status: string): Promise<Package | null>
  findByStatus(status: string): Promise<Package[]>
  getMaxVersion(packageCode: string): Promise<number>
  create(data: Prisma.PackageCreateInput): Promise<Package>
  update(id: string, data: Prisma.PackageUpdateInput): Promise<Package>
  delete(id: string): Promise<Package>
}