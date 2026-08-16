#!/usr/bin/env tsx
/**
 * Database Seed Script - Initialize Package Types
 * Creates 4 fixed package types: TRIAL, BASIC, PROFESSIONAL, ENTERPRISE
 *
 * Usage:
 *   npx tsx scripts/seed-packages.ts
 *
 * Note: Only seeds packages if the table is empty
 */

import 'dotenv/config'
import { getPackageRepository } from '../src/repositories/repository.factory'

const PACKAGE_SEEDS = [
  {
    packageCode: 'TRIAL',
    name: '体验版',
    description: '免费试用30天，体验平台基本功能',
    features: ['每日1000次API调用', '1个应用', '社区支持', '30天有效期'],
    monthlyPrice: 0,
    yearlyPrice: 0,
    yearlyDiscount: 1.0,
    dailyApiLimit: 1000,
    maxApplications: 1,
    isTrial: true,
    webhook: false,
    customDomain: false,
    whiteLabel: false,
    sla: false,
    ipWhitelist: false,
    autoRenew: false,
    logRetention: 7,
    supportLevel: 'community',
    status: 'active',
    version: 1,
    sortOrder: 0,
  },
  {
    packageCode: 'BASIC',
    name: '基础版',
    description: '适合个人开发者和小团队',
    features: ['每日50,000次API调用', '3个应用', '邮件支持', 'API日志保留30天'],
    monthlyPrice: 299.00,
    yearlyPrice: 2990.00,
    yearlyDiscount: 0.83,
    dailyApiLimit: 50000,
    maxApplications: 3,
    isTrial: false,
    webhook: false,
    customDomain: false,
    whiteLabel: false,
    sla: false,
    ipWhitelist: false,
    autoRenew: false,
    logRetention: 30,
    supportLevel: 'email',
    status: 'active',
    version: 1,
    sortOrder: 1,
  },
  {
    packageCode: 'PROFESSIONAL',
    name: '中小企业版',
    description: '适合中小企业，功能更全面',
    features: [
      '每日200,000次API调用',
      '10个应用',
      '优先技术支持',
      'Webhook支持',
      'API日志保留90天',
    ],
    monthlyPrice: 999.00,
    yearlyPrice: 9990.00,
    yearlyDiscount: 0.83,
    dailyApiLimit: 200000,
    maxApplications: 10,
    isTrial: false,
    webhook: true,
    customDomain: false,
    whiteLabel: false,
    sla: false,
    ipWhitelist: false,
    autoRenew: false,
    logRetention: 90,
    supportLevel: 'priority',
    status: 'active',
    version: 1,
    sortOrder: 2,
  },
  {
    packageCode: 'ENTERPRISE',
    name: '金融服务大型企业版',
    description: '为大型金融机构提供定制化服务',
    features: [
      '每日1,000,000次API调用',
      '不限应用数',
      '专属技术支持',
      '自定义限流策略',
      'Webhook支持',
      'SLA保障',
      'API日志保留180天',
      'IP白名单',
    ],
    monthlyPrice: 4999.00,
    yearlyPrice: 49990.00,
    yearlyDiscount: 0.83,
    dailyApiLimit: 1000000,
    maxApplications: 999,
    isTrial: false,
    webhook: true,
    customDomain: true,
    whiteLabel: true,
    sla: true,
    ipWhitelist: true,
    autoRenew: true,
    logRetention: 180,
    supportLevel: 'dedicated',
    status: 'active',
    version: 1,
    sortOrder: 3,
  },
]

async function seedPackages(): Promise<void> {
  console.log('='.repeat(50))
  console.log('Cregis Admin Portal - Package Seed Script')
  console.log('='.repeat(50))

  const repo = getPackageRepository()

  // Check if packages already exist
  const existing = await repo.findByFilters({}, 1, 1)
  if (existing.total > 0) {
    console.log(`\n⚠️  Found ${existing.total} existing packages. Skipping seed.`)
    console.log('To re-seed, first delete all packages from the database.')
    return
  }

  console.log('\nSeeding 4 package types...\n')

  for (const seed of PACKAGE_SEEDS) {
    try {
      const pkg = await repo.create(seed as any)
      console.log(`✅ Created: ${pkg.name} (${pkg.packageCode}) v${pkg.version}`)
    } catch (error) {
      console.error(`❌ Failed to create ${seed.packageCode}:`, error)
    }
  }

  console.log('\n✅ Package seeding completed!')
}

seedPackages().catch(console.error)