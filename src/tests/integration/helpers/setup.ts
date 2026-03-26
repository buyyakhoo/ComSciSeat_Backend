import { execSync } from 'node:child_process'
import { PrismaClient } from '../../../generated/prisma/index.js'

let _client: PrismaClient | null = null

export function getPrismaTest(): PrismaClient {
  if (!_client) {
    _client = new PrismaClient({
      datasourceUrl: process.env.DATABASE_URL
    })
  }
  return _client
}

export async function setupTestDatabase() {
  try {
    execSync('npx prisma migrate deploy', {
      env: { ...process.env },
      stdio: 'pipe'
    })
    console.log('✓ Test database migrated')
  } catch (e) {
    console.error('Migration failed:', e)
    throw e
  }
}

export async function cleanDatabase() {
  const prisma = getPrismaTest()
  await prisma.bookings.deleteMany()
  await prisma.class_schedule.deleteMany()
  await prisma.tables.deleteMany()
  await prisma.labs.deleteMany()
  await prisma.users.deleteMany()
}