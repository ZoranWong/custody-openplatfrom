/**
 * Prisma Database Client
 * Singleton Prisma client for MySQL database operations
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { logger } from '../utils/logger'

// Global Prisma client instance
let prisma: PrismaClient | null = null

function createDatabaseUrl(): string {
  const host = process.env.DB_HOST || 'localhost'
  const port = process.env.DB_PORT || '3306'
  const database = process.env.DB_NAME || 'cregis-openplatform'
  const username = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''
  if (password) {
    return `mysql://${username}:${encodeURIComponent(password)}@${host}:${port}/${database}`
  }
  return `mysql://${username}@${host}:${port}/${database}`
}

/**
 * Get the singleton Prisma client instance
 * Uses singleton pattern to prevent multiple connections during development hot-reload
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    logger.info('Initializing Prisma client')
    const adapter = new PrismaMariaDb(createDatabaseUrl())
    prisma = new PrismaClient({ adapter })
    logger.info('PrismaClient created successfully')
  }
  return prisma
}

/**
 * Initialize database connection
 * Called during application startup
 */
export async function initializeDatabase(): Promise<void> {
  const client = getPrismaClient()

  try {
    await client.$connect()
    logger.info('Database connected successfully')
  } catch (error) {
    logger.error('Failed to connect to database', {
      error: error instanceof Error ? error.message : String(error)
    })
    throw error
  }
}

/**
 * Disconnect from database
 * Called during application shutdown
 */
export async function disconnectDatabase(): Promise<void> {
  if (prisma) {
    await prisma.$disconnect()
    prisma = null
    logger.info('Database disconnected')
  }
}

/**
 * Database health check cache
 */
let healthCheckCache: { result: boolean; timestamp: number } | null = null
const HEALTH_CHECK_CACHE_TTL = 10000 // 10 seconds

/**
 * Check database connection health (with caching)
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  const now = Date.now()

  if (healthCheckCache && (now - healthCheckCache.timestamp) < HEALTH_CHECK_CACHE_TTL) {
    return healthCheckCache.result
  }

  try {
    const client = getPrismaClient()
    await client.$queryRaw`SELECT 1`
    healthCheckCache = { result: true, timestamp: now }
    return true
  } catch {
    healthCheckCache = { result: false, timestamp: now }
    return false
  }
}

export default {
  getPrismaClient,
  initializeDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
}
