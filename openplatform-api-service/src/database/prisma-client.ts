/**
 * Prisma Database Client
 * Singleton Prisma client for MySQL database operations
 * Refactored according to official Prisma documentation:
 * https://www.prisma.io/docs/prisma-orm/quickstart/mysql
 */

import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { logger } from '../utils/logger'
import { getDatabaseConfig, isMySQLEnabled } from '../config/database.config'

// Global Prisma client instance
let prisma: PrismaClient | null = null

/**
 * Get the singleton Prisma client instance
 * Uses singleton pattern to prevent multiple connections during development hot-reload
 * Refactored to match Prisma 7.x documentation
 */
export function getPrismaClient(): PrismaClient {
  if (!prisma) {
    logger.info('Initializing Prisma client')

    // Only create Prisma client if MySQL is enabled
    if (isMySQLEnabled()) {
      const config = getDatabaseConfig()

      // Create adapter according to Prisma documentation
      const adapter = new PrismaMariaDb({
        host: config.host,
        user: config.username,
        password: config.password,
        database: config.database,
        connectionLimit: 10,
      })

      logger.info('Creating PrismaClient with MariaDB adapter (MySQL)')

      prisma = new PrismaClient({ adapter })

      logger.info('PrismaClient created successfully')
    } else {
      throw new Error('MySQL is not enabled. Set STORAGE_TYPE=mysql in environment.')
    }
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
    // Test connection
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
 * Check database connection health
 */
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    const client = getPrismaClient()
    await client.$queryRaw`SELECT 1`
    return true
  } catch {
    return false
  }
}

export default {
  getPrismaClient,
  initializeDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
}
