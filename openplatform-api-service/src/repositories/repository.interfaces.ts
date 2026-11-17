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
  findByResourceKey(resourceKey: string): Promise<OauthResource | null>
  findByAppId(appId: string): Promise<OauthResource[]>
  findByAppAndResource(appId: string, resourceKey: string): Promise<OauthResource | null>
  upsert(data: { appId: string; resourceKey: string; authorizedAt?: Date; expiresAt?: Date }): Promise<OauthResource>
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
  findActiveWithPackage(developerId: string): Promise<(Subscription & { package: { dailyApiLimit: number; logRetention: number } }) | null>
  /** Active package log_retention_days per developer, for the given ids only. */
  findActiveLogRetention(developerIds: string[]): Promise<Map<string, number>>
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

/**
 * Daily snapshot row — compact aggregate of one day's API logs.
 * Built before raw logs are deleted so that long-period trends remain queryable.
 */
export interface ApiLogDailySnapshot {
  date: string          // YYYY-MM-DD
  developerId: string
  totalCalls: number
  errorCalls: number
  avgResponseTime: number
  p95ResponseTime: number
  totalBytes: number
  topEndpoints: Array<{ endpoint: string; calls: number; errorRate: number }>
  createdAt: string
}

/** Endpoint-level daily aggregate row. */
export interface ApiLogEndpointDailyRow {
  date: string          // YYYY-MM-DD
  endpoint: string
  method: string
  calls: number
  errorCalls: number
  totalBytes: number
  avgResponseTime: number
  maxResponseTime: number
}

/** Monthly snapshot row — compact aggregate of one month's API logs. */
export interface ApiLogMonthlySnapshot {
  month: string         // YYYY-MM
  totalCalls: number
  errorCalls: number
  totalBytes: number
  avgResponseTime: number
}

/** Per-day aggregate computed directly from raw logs (day not yet snapshotted). */
export interface ApiLogRawDayAggregate {
  date: string          // YYYY-MM-DD
  calls: number
  errorCalls: number
  totalBytes: number
  avgResponseTime: number
}

export interface ApiLogRepository {
  create(data: {
    appId?: string
    developerId?: string
    subscriptionId?: string
    apiName?: string
    endpoint: string
    method: string
    traceId?: string
    requestHeaders?: any
    requestBody?: any
    responseStatus?: number
    responseBody?: any
    responseTime?: number
    ipAddress?: string
    userAgent?: string
    sdkName?: string
    sdkVersion?: string
    sdkLanguage?: string
    requestBytes?: number
    responseBytes?: number
    isError?: boolean
  }): Promise<ApiLog>
  findRecentErrors(developerId: string, limit?: number): Promise<{ apiName: string; endpoint: string; responseStatus: number; createdAt: string }[]>
  countByDeveloper(developerId: string, startDate?: Date, isError?: boolean): Promise<number>
  countTodaySuccess(developerId: string): Promise<number>
  getStats(developerId: string, startDate: Date): Promise<ApiLogStats>
  getDailyBreakdown(developerId: string, startDate: Date): Promise<ApiLogDailyBreakdown[]>
  getEndpointBreakdown(developerId: string, startDate: Date, totalCalls: number): Promise<ApiLogEndpointBreakdown[]>
  cleanup(retentionDays?: number): Promise<{ count: number }>
  /** Aggregate one day of raw logs for a developer into the daily snapshot + endpoint daily table. */
  rollupDay(developerId: string, date: string): Promise<{ calls: number; errors: number }>
  /** Insert-or-update a precomputed daily snapshot (used by tests and backfills). */
  upsertDailySnapshot(snapshot: ApiLogDailySnapshot): Promise<void>
  /** Read daily snapshots in [startDay, endDay] inclusive. */
  getDailySnapshotsBetween(developerId: string, startDay: string, endDay: string): Promise<ApiLogDailySnapshot[]>
  /** Read endpoint-daily rows in [startDay, endDay] inclusive. */
  getEndpointDailyBetween(developerId: string, startDay: string, endDay: string): Promise<ApiLogEndpointDailyRow[]>
  /** Aggregate raw logs for one developer over a day range (today's slice). */
  aggregateRawRange(developerId: string, startIso: Date, endIso: Date): Promise<{ calls: number; errorCalls: number; totalBytes: number; avgResponseTime: number; callbackCalls: number; byEndpoint: ApiLogEndpointDailyRow[]; byDay: ApiLogRawDayAggregate[] }>
  /** Count outbound callback-push rows in [startIso, endIso). */
  countCallbackLogsBetween(developerId: string, startIso: Date, endIso: Date): Promise<number>
  /** Roll daily snapshots of a month into the monthly table, then delete those daily rows. */
  rollupMonth(developerId: string, month: string): Promise<number>
  /** Read monthly snapshots in [startMonth, endMonth] inclusive. */
  getMonthlySnapshotsBetween(developerId: string, startMonth: string, endMonth: string): Promise<ApiLogMonthlySnapshot[]>
  /** Delete raw rows with no developer id older than `day` (YYYY-MM-DD, exclusive). */
  deleteUnassignedRawBefore(day: string): Promise<{ count: number }>
  /** Delete raw rows of one developer older than `day` (YYYY-MM-DD, exclusive). */
  deleteRawBeforeForDeveloper(developerId: string, day: string): Promise<{ count: number }>
  /** Delete raw rows of one developer for exactly one day (YYYY-MM-DD). */
  deleteRawForDay(developerId: string, date: string): Promise<{ count: number }>
  /** Distinct days holding raw rows for a developer, oldest first (YYYY-MM-DD). */
  listRawDaysForDeveloper(developerId: string): Promise<string[]>
  /** Distinct days holding raw rows for any developer, oldest first (YYYY-MM-DD). */
  listDaysWithRawLogs(): Promise<string[]>
  /** Whether any daily snapshot exists for the developer+day. */
  hasDailySnapshot(developerId: string, date: string): Promise<boolean>
  /** List developer ids that have raw rows in the given day. */
  listDevelopersWithRawLogs(date: string): Promise<string[]>
  /** Number of raw rows one developer holds on the given day. */
  countRawForDeveloper(developerId: string, date: string): Promise<number>
  /** Number of API-call raw rows (callback pushes excluded) one developer holds on the given day. */
  countApiCallRawForDeveloper(developerId: string, date: string): Promise<number>
  /** List developer ids that still have daily snapshots in the given month (YYYY-MM). */
  listDevelopersWithDailySnapshots(month: string): Promise<string[]>
  /** Retain only the last N days of daily snapshots / endpoint rows; returns deleted counts. */
  pruneDailyOlderThan(day: string): Promise<{ snapshots: number; endpoints: number }>
  /** Delete monthly snapshots older than the given month. */
  pruneMonthlyOlderThan(month: string): Promise<number>
  /** Paginated API log query */
  findByDeveloper(developerId: string, page: number, pageSize: number, filters?: { isError?: boolean; apiName?: string; startDate?: Date; endDate?: Date; traceId?: string; developerId?: string; category?: 'api' | 'callback' }): Promise<{ list: ApiLog[]; total: number; page: number; pageSize: number }>
  /** Single API log by id */
  findById(id: string): Promise<ApiLog | null>
  /** Upsert alert settings for a developer. */
  upsertAlertSetting(data: { developerId: string; alertEmail: string | null; enabled: boolean; windowSeconds: number; errorThreshold: number; cooldownSeconds: number; logRetentionDays: number }): Promise<void>
  /** Paginated alert events for a developer. */
  getAlertEvents(developerId: string, page: number, pageSize: number): Promise<{ list: any[]; total: number; page: number; pageSize: number }>
  /** List alert settings — all, or only enabled ones. */
  listAlertSettings(enabledOnly?: boolean): Promise<Array<{ developerId: string; alertEmail: string | null; enabled: boolean; windowSeconds: number; errorThreshold: number; cooldownSeconds: number; logRetentionDays: number }>>
  /** Developer ids of every stored alert setting. */
  listAlertSettingDevelopers(): Promise<string[]>
  /** Raw log retention days for one developer (defaults to the platform default). */
  getLogRetentionDays(developerId: string): Promise<number>
  /** Get the cooldown end time for a developer (from latest alert event). */
  getAlertCooldownEnd(developerId: string): Promise<Date>
  /** Count errors and total calls in a time window. */
  countErrorsInWindow(developerId: string, start: Date, end: Date): Promise<Array<{ errorCount: number; totalCount: number }>>
  /** Find recent errors in a time window. */
  findRecentErrorsInWindow(developerId: string, start: Date, end: Date, limit: number): Promise<any[]>
  /** Create an alert event record. */
  createAlertEvent(data: { developerId: string; windowEnd: Date; errorCount: number; totalCount: number; sampleErrors: unknown[]; sent: boolean }): Promise<void>
  /** Mark an alert event as sent. */
  markAlertSent(developerId: string, windowEnd: Date): Promise<void>
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