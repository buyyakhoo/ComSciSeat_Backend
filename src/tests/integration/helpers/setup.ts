import { execSync } from 'node:child_process'
import { PrismaClient } from '../../../generated/prisma/index.js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../../.env.test') })

let _client: PrismaClient | null = null

export function getPrismaTest(): PrismaClient {
  if (!_client) {
    const databaseUrl = process.env.DATABASE_URL
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is not defined in .env.test')
    }
    if (databaseUrl.includes('supabase')) {
      throw new Error('Tests must use local test database from .env.test, not Supabase')
    }
    _client = new PrismaClient({
      datasourceUrl: databaseUrl
    })
  }
  return _client
}

export async function setupTestDatabase() {
  try {
    // Create tables if they don't exist
    execSync('npx prisma db push --skip-generate', {
      env: { ...process.env },
      encoding: 'utf-8'
    })
    console.log('✓ Test database schema pushed')

    // Then clean data
    await cleanDatabase()
    console.log('✓ Test database cleaned')
  } catch (e: any) {
    console.error('Database setup failed:')
    console.error('message:', e.message)
    throw e
  }
}

export async function cleanDatabase() {
  const prisma = getPrismaTest()
  try {
    await prisma.bookings.deleteMany()
    await prisma.class_schedule.deleteMany()
    await prisma.tables.deleteMany()
    await prisma.labs.deleteMany()
    await prisma.users.deleteMany()
  } catch (e: any) {
    if (!e.message.includes('does not exist')) {
      throw e
    }
  }
}