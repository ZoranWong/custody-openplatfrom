/**
 * Database Configuration
 * Prisma database configuration for different environments
 */

export interface DatabaseConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
}

export interface PoolConfig {
  min: number
  max: number
  acquireTimeoutMillis: number
  idleTimeoutMillis: number
}

/**
 * Get database URL from environment variables
 * Format: mysql://username:password@host:port/database
 */
export function getDatabaseUrl(): string {
  const protocol = process.env.DB_PROTOCOL || 'mysql'
  const host = process.env.DB_HOST || 'localhost'
  const port = process.env.DB_PORT || '3306'
  const database = process.env.DB_NAME || 'cregis_openplatform'
  const username = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''

  // Handle empty password correctly in URL format
  if (password) {
    return `${protocol}://${username}:${password}@${host}:${port}/${database}`
  }
  return `${protocol}://${username}@${host}:${port}/${database}`
}

/**
 * Get database configuration from environment variables
 */
export function getDatabaseConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    database: process.env.DB_NAME || 'cregis_openplatform',
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  }
}

/**
 * Check if MySQL storage is enabled
 */
export function isMySQLEnabled(): boolean {
  return process.env.STORAGE_TYPE === 'mysql'
}

/**
 * Check if database is configured
 */
export function isDatabaseConfigured(): boolean {
  const url = getDatabaseUrl()
  return url.includes('localhost') || url.includes('/')
}
