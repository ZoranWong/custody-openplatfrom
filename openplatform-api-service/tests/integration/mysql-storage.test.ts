/**
 * MySQL Storage Integration Tests
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest'

// Set environment variables before importing
process.env.STORAGE_TYPE = 'mysql'
process.env.DB_HOST = 'localhost'
process.env.DB_PORT = '3306'
process.env.DB_NAME = 'cregis_openplatform'
process.env.DB_USER = 'root'
process.env.DB_PASSWORD = ''

import { MySQLStorageAdapter } from '../../src/repositories/mysql-storage.adapter'
import { initializeDatabase, disconnectDatabase } from '../../src/database/prisma-client'

describe('MySQL Storage Adapter Integration Tests', () => {
  let adapter: MySQLStorageAdapter

  beforeAll(async () => {
    // Initialize database connection
    await initializeDatabase()
    adapter = new MySQLStorageAdapter('developers')
  })

  afterAll(async () => {
    await disconnectDatabase()
  })

  describe('CRUD Operations', () => {
    it('should insert a new developer', async () => {
      const developer = await adapter.insert({
        email: 'test@example.com',
        passwordHash: 'hashed_password',
        name: 'Test User',
        company: 'Test Company',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      expect(developer).toBeDefined()
      expect(developer.id).toBeDefined()
      expect(developer.email).toBe('test@example.com')
    })

    it('should find developer by id', async () => {
      const inserted = await adapter.insert({
        email: 'findtest@example.com',
        passwordHash: 'hashed_password',
        name: 'Find Test',
        company: 'Test Company',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const found = await adapter.findById(inserted.id)
      expect(found).toBeDefined()
      expect(found?.email).toBe('findtest@example.com')
    })

    it('should update developer', async () => {
      const inserted = await adapter.insert({
        email: 'updatetest@example.com',
        passwordHash: 'hashed_password',
        name: 'Update Test',
        company: 'Test Company',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const updated = await adapter.update(inserted.id, { name: 'Updated Name' })
      expect(updated?.name).toBe('Updated Name')
    })

    it('should delete developer', async () => {
      const inserted = await adapter.insert({
        email: 'deletetest@example.com',
        passwordHash: 'hashed_password',
        name: 'Delete Test',
        company: 'Test Company',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const deleted = await adapter.delete(inserted.id)
      expect(deleted).toBe(true)

      const found = await adapter.findById(inserted.id)
      expect(found).toBeNull()
    })

    it('should find developers by condition', async () => {
      await adapter.insert({
        email: 'search1@example.com',
        passwordHash: 'hashed_password',
        name: 'Search 1',
        company: 'Company A',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      await adapter.insert({
        email: 'search2@example.com',
        passwordHash: 'hashed_password',
        name: 'Search 2',
        company: 'Company A',
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      })

      const results = await adapter.findMany({ company: 'Company A' })
      expect(results.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Connection Pool', () => {
    it('should handle multiple concurrent operations', async () => {
      const promises = Array(10).fill(null).map((_, i) =>
        adapter.insert({
          email: `concurrent${i}@example.com`,
          passwordHash: 'hashed_password',
          name: `Concurrent ${i}`,
          company: 'Test Company',
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      )

      const results = await Promise.all(promises)
      expect(results).toHaveLength(10)
    })
  })
})
