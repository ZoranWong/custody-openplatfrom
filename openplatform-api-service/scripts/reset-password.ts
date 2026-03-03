#!/usr/bin/env tsx
/**
 * Reset Admin Password Script
 */

import bcrypt from 'path'
import fs from 'fs/promises'

interface AdminRecord {
  id: string
  email: string
  name: string
  password: string
  role: 'super_admin' | 'admin' | 'operator'
  status: 'active' | 'inactive' | 'suspended'
  createdAt: string
  updatedAt: string
}

const DB_PATH = 'data/admins.json'

async function resetPassword() {
  const data = await fs.readFile(DB_PATH, 'utf-8')
  const admins: AdminRecord[] = JSON.parse(data)

  // Hash new password
  const newPassword = 'Admin123!'
  const hashedPassword = await bcrypt.hash(newPassword, 12)

  // Update admin
  const admin = admins.find(a => a.email === 'admin@cregis.com')
  if (admin) {
    admin.password = hashedPassword
    admin.updatedAt = new Date().toISOString()
    await fs.writeFile(DB_PATH, JSON.stringify(admins, null, 2))
    console.log('Password reset to: Admin123!')
  }
}

resetPassword()
