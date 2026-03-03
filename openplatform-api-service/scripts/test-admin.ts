import { getAdminRepository } from '../src/repositories/repository.factory'
import bcrypt from 'bcrypt'

async function test() {
  const repo = getAdminRepository()

  // Find admin by email
  const admin = await repo.findByEmail('admin@cregis.com')
  console.log('Found admin:', admin ? 'YES' : 'NO')
  if (admin) {
    console.log('Email:', admin.email)
    console.log('Role:', admin.role)
    console.log('Status:', admin.status)

    // Test password
    const isValid = await bcrypt.compare('Admin123!', admin.password)
    console.log('Password valid:', isValid)
  }

  // List all admins
  const all = await repo.findAll()
  console.log('Total admins:', all.length)
}

test()
