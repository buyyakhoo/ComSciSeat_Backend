import { PrismaClient } from '../../generated/prisma/index.js';

const rawUrl = process.env.DATABASE_URL
if (!rawUrl) throw new Error('DATABASE_URL is not set')

// Switch to Supabase transaction mode (port 6543) + connection pool limit
const transactionUrl = rawUrl
  .replace(':5432/', ':6543/')
const finalUrl = transactionUrl.includes('?')
  ? transactionUrl + '&connection_limit=3&pgbouncer=true'
  : transactionUrl + '?connection_limit=3&pgbouncer=true'

process.env.DATABASE_URL = finalUrl

export const prisma = new PrismaClient({
  log: ['error'],
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await prisma.$disconnect();
  process.exit(0);
});

console.log('Prisma Client initialized');