/**
 * Database Configuration
 */

export function getDatabaseUrl(): string {
  const protocol = process.env.DB_PROTOCOL || 'mysql'
  const host = process.env.DB_HOST || 'localhost'
  const port = process.env.DB_PORT || '3306'
  const database = process.env.DB_NAME || 'cregis-openplatform'
  const username = process.env.DB_USER || 'root'
  const password = process.env.DB_PASSWORD || ''

  if (password) {
    return `${protocol}://${username}:${password}@${host}:${port}/${database}`
  }
  return `${protocol}://${username}@${host}:${port}/${database}`
}

export function isDatabaseConfigured(): boolean {
  return !!(process.env.DB_HOST && process.env.DB_NAME)
}
