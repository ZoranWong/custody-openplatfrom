#!/usr/bin/env tsx
/**
 * Database Seed Script - Initialize Admin User
 * Uses Repository pattern for data access
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts --create-default
 *   npx tsx scripts/seed-admin.ts --email admin@cregis.com --name "Super Admin"
 *
 * Options:
 *   --create-default  Create the default admin user
 *   --email          Admin email (required for custom)
 *   --name           Admin name (required for custom)
 *   --password       Admin password (optional, will prompt if not provided)
 *   --role           admin | operator (default: super_admin)
 *   --list           List all admins
 *   --delete <email> Delete admin by email
 */

import bcrypt from 'bcrypt'

// Import repository - this ensures we use the same data access layer as the app
import { getAdminRepository } from '../repositories/repository.factory'

const DEFAULT_ADMIN = {
  email: 'admin@cregis.com',
  name: 'Super Admin',
  role: 'super_admin' as const,
  password: 'Admin123!'
}

// Validate password strength
function validatePasswordStrength(password: string): { valid: boolean; message: string } {
  if (password.length < 8) {
    return { valid: false, message: 'Password must be at least 8 characters' }
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' }
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' }
  }
  if (!/\d/.test(password)) {
    return { valid: false, message: 'Password must contain at least one number' }
  }
  return { valid: true, message: 'Password is valid' }
}

// Create hashed password
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

// Print admin info (without password)
function printAdminInfo(admin: any): void {
  console.log('\n' + '='.repeat(40))
  console.log('Admin Created Successfully')
  console.log('='.repeat(40))
  console.log(`ID:     ${admin.id}`)
  console.log(`Email:  ${admin.email}`)
  console.log(`Name:   ${admin.name}`)
  console.log(`Role:   ${admin.role}`)
  console.log(`Status: ${admin.status}`)
  console.log(`Created: ${admin.createdAt}`)
}

// Main seed function
async function seedAdmin(options: {
  email?: string
  name?: string
  password?: string
  role?: 'super_admin' | 'admin' | 'operator'
  createDefault?: boolean
}): Promise<void> {
  console.log('='.repeat(50))
  console.log('Cregis Admin Portal - Admin User Seed Script')
  console.log('='.repeat(50))

  const adminRepo = getAdminRepository()

  let email: string
  let name: string
  let password: string
  let role: 'super_admin' | 'admin' | 'operator'

  if (options.createDefault) {
    email = DEFAULT_ADMIN.email
    name = DEFAULT_ADMIN.name
    password = options.password || DEFAULT_ADMIN.password
    role = options.role || DEFAULT_ADMIN.role
  } else if (options.email && options.name) {
    email = options.email
    name = options.name
    password = options.password || DEFAULT_ADMIN.password
    role = options.role || 'super_admin'
  } else {
    console.log('\n📋 Usage:')
    console.log('  npx tsx scripts/seed-admin.ts --create-default')
    console.log('  npx tsx scripts/seed-admin.ts --email admin@company.com --name "Admin"')
    console.log('\n⚙️  Options:')
    console.log('  --create-default   Create default admin user')
    console.log('  --email           Admin email')
    console.log('  --name            Admin name')
    console.log('  --password        Admin password (optional)')
    console.log('  --role            admin | operator (default: super_admin)')
    console.log('  --list            List all admins')
    console.log('  --delete <email>  Delete admin by email')
    return
  }

  // Check if admin already exists by email
  const existingAdmin = await adminRepo.findByEmail(email)
  if (existingAdmin) {
    console.log(`\n⚠️  Admin with email ${email} already exists!`)
    return
  }

  // Validate password
  const passwordValidation = validatePasswordStrength(password)
  if (!passwordValidation.valid) {
    console.log(`\n❌ Password validation failed: ${passwordValidation.message}`)
    return
  }

  try {
    const hashedPassword = await hashPassword(password)

    // Create admin using new repository
    const newAdmin = await adminRepo.create({
      email,
      name,
      password: hashedPassword,
      role,
      status: 'active'
    })

    // Print success
    printAdminInfo(newAdmin)
    console.log('\n✅ Admin user created successfully!')

    console.log('\n📝 Login Credentials:')
    console.log(`   Email:    ${email}`)
    console.log(`   Password: ${password}`)
    console.log('\n⚠️  IMPORTANT: Change the default password after first login!')

  } catch (error) {
    console.error('\n❌ Failed to create admin:', error)
    process.exit(1)
  }
}

// List all admins
async function listAdmins(): Promise<void> {
  console.log('='.repeat(50))
  console.log('Admin Users in Database')
  console.log('='.repeat(50))

  const adminRepo = getAdminRepository()
  const admins = await adminRepo.findAll()

  if (admins.length === 0) {
    console.log('\n📭 No admin users found in database.')
    console.log('Run with --create-default to create the default admin.')
    return
  }

  console.log(`\nTotal admins: ${admins.length}\n`)

  admins.forEach((admin: any, index: number) => {
    console.log(`${index + 1}. ${admin.name}`)
    console.log(`   Email:  ${admin.email}`)
    console.log(`   Role:   ${admin.role}`)
    console.log(`   Status: ${admin.status}`)
    console.log(`   ID:     ${admin.id}`)
    console.log('')
  })
}

// Delete admin by email
async function deleteAdmin(email: string): Promise<void> {
  const adminRepo = getAdminRepository()
  const admin = await adminRepo.findByEmail(email)

  if (!admin) {
    console.log(`\n❌ Admin with email ${email} not found.`)
    return
  }

  await adminRepo.delete(admin.id)
  console.log(`\n✅ Deleted admin: ${admin.name} (${admin.email})`)
}

// Parse command line arguments
function parseArgs(): Record<string, string | boolean> {
  const args: Record<string, string | boolean> = {}
  const argv = process.argv.slice(2)

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]

    if (arg === '--create-default') {
      args.createDefault = true
    } else if (arg === '--list') {
      args.list = true
    } else if (arg === '--delete') {
      args.delete = true
      args.email = argv[++i]
    } else if (arg.startsWith('--')) {
      const key = arg.slice(2)
      args[key] = argv[++i] || true
    }
  }

  return args
}

// Entry point
async function main(): Promise<void> {
  const args = parseArgs()

  if (args.list) {
    await listAdmins()
  } else if (args.delete && args.email) {
    await deleteAdmin(args.email as string)
  } else {
    await seedAdmin({
      email: args.email as string,
      name: args.name as string,
      password: args.password as string,
      role: args.role as 'super_admin' | 'admin' | 'operator',
      createDefault: args.createDefault as boolean
    })
  }
}

main().catch(console.error)
