import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString && process.env.NODE_ENV === 'production') {
  throw new Error('FATAL CONFIGURATION ERROR: DATABASE_URL environment variable is required in production.')
}

const resolvedConnectionString = connectionString || 'postgresql://admin:secure_password_here@localhost:5432/durga_lodge?sslmode=disable'
const isLocalhost = resolvedConnectionString.includes('localhost') || resolvedConnectionString.includes('127.0.0.1') || resolvedConnectionString.includes('sslmode=disable')

const pool = new Pool({
  connectionString: resolvedConnectionString,
  ssl: isLocalhost ? false : { rejectUnauthorized: false },
  max: process.env.NODE_ENV === 'production' ? 10 : 5,
  connectionTimeoutMillis: 5000,
})
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
