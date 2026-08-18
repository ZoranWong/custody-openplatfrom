/**
 * Database client provider.
 *
 * All repository implementations import getClient() from here.
 * By default it returns the singleton PrismaClient.
 *
 * During a runTransaction() callback, getClient() returns the transaction
 * client (tx) instead — via AsyncLocalStorage so concurrent call chains
 * are isolated.
 */

import { AsyncLocalStorage } from 'async_hooks';
import { getPrismaClient } from '../database/prisma-client';
import { PrismaClient } from '@prisma/client';

const defaultClient = getPrismaClient();

export const txStorage = new AsyncLocalStorage<PrismaClient>();

/**
 * Returns the active Prisma client.
 * Inside a runTransaction callback → transaction client (tx).
 * Otherwise → default singleton PrismaClient.
 */
export function getClient(): PrismaClient {
  return txStorage.getStore() ?? defaultClient;
}

export function resetClient() {
  // no-op: AsyncLocalStorage is self-cleaning
}
