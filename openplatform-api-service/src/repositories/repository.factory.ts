/**
 * Repository Factory
 *
 * Two responsibilities:
 * 1. Registry — all repositories registered once, lazily instantiated
 * 2. Transaction — runTransaction() swaps the shared client during the
 *    callback so all repositories automatically participate
 *
 * Adding a repository: one line in the registry below.
 */

import { getClient, resetClient } from './db-client';
import { txStorage } from './db-client';
import {
  IsvDeveloperRepository,
  ISVUserRepository,
  ApplicationRepository,
  AdminRepository,
  OauthResourceRepository,
  RefreshTokenRepository,
  SubscriptionRepository,
  ApiLogRepository,
  TicketRepository,
  OrderRepository,
  PackageRepository,
} from './repository.interfaces';
import { IsvDeveloperRepositoryImpl } from './implementations/isv-developer.repository'
import { ISVUserRepositoryImpl } from './implementations/isv-user.repository'
import { ApplicationRepositoryImpl } from './implementations/application.repository'
import { AdminRepositoryImpl } from './implementations/admin.repository'
import { OauthResourceRepositoryImpl } from './implementations/authorization.repository'
import { RefreshTokenRepositoryImpl } from './implementations/refresh-token.repository'
import { DeveloperApplicationRepositoryImpl } from './implementations/developer-application.repository'
import { DeveloperAuditRepositoryImpl } from './implementations/developer-audit.repository'
import { AnnouncementRepositoryImpl } from './implementations/announcement.repository'
import { PackageRepositoryImpl } from './implementations/package.repository'
import { SubscriptionRepositoryImpl } from './implementations/subscription.repository'
import { OrderRepositoryImpl } from './implementations/order.repository'
import { TicketRepositoryImpl } from './implementations/ticket.repository'
import { ApiLogRepositoryImpl } from './implementations/api-log.repository'
import { getPrismaClient } from '../database/prisma-client';

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

type RepositoryKey =
  | 'isvDeveloper'
  | 'isvUser'
  | 'application'
  | 'admin'
  | 'oauthResource'
  | 'refreshToken'
  | 'developerApplication'
  | 'developerAudit'
  | 'announcement'
  | 'package'
  | 'subscription'
  | 'order'
  | 'ticket'
  | 'apiLog';

interface RegistryEntry {
  factory: () => any;
  instance: any | null;
}

const registry = new Map<RepositoryKey, RegistryEntry>();

// -- registration (one line per repository) ---------------------------------

registry.set('isvDeveloper', {
  factory: () => new IsvDeveloperRepositoryImpl(),
  instance: null,
});
registry.set('isvUser', {
  factory: () => new ISVUserRepositoryImpl(),
  instance: null,
});
registry.set('application', {
  factory: () => new ApplicationRepositoryImpl(),
  instance: null,
});
registry.set('admin', {
  factory: () => new AdminRepositoryImpl(),
  instance: null,
});
registry.set('oauthResource', {
  factory: () => new OauthResourceRepositoryImpl(),
  instance: null,
});
registry.set('refreshToken', {
  factory: () => new RefreshTokenRepositoryImpl(),
  instance: null,
});
registry.set('developerApplication', {
  factory: () => new DeveloperApplicationRepositoryImpl(),
  instance: null,
});
registry.set('developerAudit', {
  factory: () => new DeveloperAuditRepositoryImpl(),
  instance: null,
});
registry.set('announcement', {
  factory: () => new AnnouncementRepositoryImpl(),
  instance: null,
});
registry.set('package', {
  factory: () => new PackageRepositoryImpl(),
  instance: null,
});
registry.set('subscription', {
  factory: () => new SubscriptionRepositoryImpl(),
  instance: null,
});
registry.set('order', {
  factory: () => new OrderRepositoryImpl(),
  instance: null,
});
registry.set('ticket', {
  factory: () => new TicketRepositoryImpl(),
  instance: null,
});
registry.set('apiLog', {
  factory: () => new ApiLogRepositoryImpl(),
  instance: null,
});

// ---------------------------------------------------------------------------
// Generic accessor
// ---------------------------------------------------------------------------

function getRepository<T>(key: RepositoryKey): T {
  const entry = registry.get(key);
  if (!entry) throw new Error(`Repository "${key}" not registered`);
  if (!entry.instance) {
    entry.instance = entry.factory();
  }
  return entry.instance as T;
}

// ---------------------------------------------------------------------------
// Backward-compatible named exports
// ---------------------------------------------------------------------------

export const getIsvDeveloperRepository = () =>
  getRepository<IsvDeveloperRepository>('isvDeveloper');
export const getISVUserRepository = () =>
  getRepository<ISVUserRepository>('isvUser');
export const getApplicationRepository = () =>
  getRepository<ApplicationRepository>('application');
export const getAdminRepository = () => getRepository<AdminRepository>('admin');
export const getOauthResourceRepository = () =>
  getRepository<OauthResourceRepository>('oauthResource');
export const getAuthorizationRepository = () => getOauthResourceRepository(); // alias
export const getRefreshTokenRepository = () =>
  getRepository<RefreshTokenRepository>('refreshToken');
export const getDeveloperApplicationRepository = () =>
  getRepository<DeveloperApplicationRepositoryImpl>('developerApplication');
export const getDeveloperAuditRepository = () =>
  getRepository<DeveloperAuditRepositoryImpl>('developerAudit');
export const getAnnouncementRepository = () =>
  getRepository<AnnouncementRepositoryImpl>('announcement');
export const getSubscriptionRepository = () =>
  getRepository<SubscriptionRepository>('subscription');
export const getOrderRepository = () => getRepository<OrderRepository>('order');
export const getTicketRepository = () =>
  getRepository<TicketRepository>('ticket');
export const getApiLogRepository = () =>
  getRepository<ApiLogRepository>('apiLog');
export const getPackageRepository = () =>
  getRepository<PackageRepository>('package');

// ---------------------------------------------------------------------------
// Transaction support
// ---------------------------------------------------------------------------

/**
 * Execute a callback within a database transaction.
 *
 * During the callback, getClient() returns the transaction client, so all
 * repository operations automatically participate in the same transaction.
 * The active client is restored when the callback completes (or fails).
 */
export async function runTransaction<T>(fn: () => Promise<T>): Promise<T> {
  const client = getPrismaClient();
  return await client.$transaction((tx: any) => {
    return txStorage.run(tx, () => fn())
  })
}

// ---------------------------------------------------------------------------
// Testing
// ---------------------------------------------------------------------------

export function resetRepositories(): void {
  for (const entry of registry.values()) {
    entry.instance = null;
  }
  resetClient();
}