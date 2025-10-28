import { PrismaClient, type Prisma } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Reduce noisy SQL logs by default. Enable full query logs only when
// PRISMA_LOG_QUERIES=1 is set in the environment.
const logLevels: Prisma.LogLevel[] =
  process.env.PRISMA_LOG_QUERIES === '1' ? ['query', 'warn', 'error'] : ['warn', 'error']

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: logLevels })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
