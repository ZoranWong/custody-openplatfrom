/**
 * Database Connection Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  getPrismaClient,
  initializeDatabase,
  disconnectDatabase,
  checkDatabaseHealth,
} from '../../../src/database/prisma-client'

// Mock PrismaClient
const mockPrismaClient = {
  $connect: vi.fn().mockResolvedValue(undefined),
  $disconnect: vi.fn().mockResolvedValue(undefined),
  $queryRaw: vi.fn().mockResolvedValue([]),
}

// Mock PrismaMariaDb adapter
const mockAdapter = {
  name: 'prisma-mariadb-adapter',
}

vi.mock('@prisma/client', () => ({
  PrismaClient: vi.fn().mockImplementation(() => mockPrismaClient),
}))

vi.mock('@prisma/adapter-mariadb', () => ({
  PrismaMariaDb: vi.fn().mockImplementation(() => mockAdapter),
}))

// Mock database config
vi.mock('../../../src/config/database.config', () => ({
  getDatabaseUrl: vi.fn().mockReturnValue('mysql://root:@localhost:3306/cregis_openplatform'),
  getDatabaseConfig: vi.fn().mockReturnValue({
    host: 'localhost',
    port: 3306,
    database: 'cregis_openplatform',
    username: 'root',
    password: '',
  }),
  isMySQLEnabled: vi.fn().mockReturnValue(true),
}))

// Mock logger
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}))

describe('Prisma Database Client', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the prisma module for each test
    vi.resetModules()
  })

  afterEach(async () => {
    await disconnectDatabase()
  })

  describe('getPrismaClient', () => {
    it('should return a PrismaClient instance', () => {
      const client = getPrismaClient()
      expect(client).toBeDefined()
      expect(client).toHaveProperty('$connect')
      expect(client).toHaveProperty('$disconnect')
    })

    it('should return the same instance (singleton)', () => {
      const client1 = getPrismaClient()
      const client2 = getPrismaClient()
      expect(client1).toBe(client2)
    })
  })

  describe('initializeDatabase', () => {
    it('should connect to database successfully', async () => {
      await expect(initializeDatabase()).resolves.not.toThrow()
      expect(mockPrismaClient.$connect).toHaveBeenCalled()
    })

    it('should throw error on connection failure', async () => {
      mockPrismaClient.$connect.mockRejectedValueOnce(new Error('Connection failed'))
      await expect(initializeDatabase()).rejects.toThrow('Connection failed')
    })
  })

  describe('disconnectDatabase', () => {
    it('should disconnect without error', async () => {
      // First get a client to initialize
      getPrismaClient()
      await expect(disconnectDatabase()).resolves.not.toThrow()
      expect(mockPrismaClient.$disconnect).toHaveBeenCalled()
    })

    it('should handle disconnect when not connected', async () => {
      // Call disconnect without connecting first
      await expect(disconnectDatabase()).resolves.not.toThrow()
    })
  })

  describe('checkDatabaseHealth', () => {
    it('should return true when database is healthy', async () => {
      const result = await checkDatabaseHealth()
      expect(result).toBe(true)
      expect(mockPrismaClient.$queryRaw).toHaveBeenCalled()
    })

    it('should return false when database is unhealthy', async () => {
      mockPrismaClient.$queryRaw.mockRejectedValueOnce(new Error('Database error'))
      const result = await checkDatabaseHealth()
      expect(result).toBe(false)
    })
  })
})
