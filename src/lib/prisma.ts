import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use local schema for development
const prismaClient = process.env.NODE_ENV === 'development' 
  ? new PrismaClient({
      datasources: {
        db: {
          url: "file:./prisma/dev.db"
        }
      }
    })
  : new PrismaClient()

export const prisma = globalForPrisma.prisma ?? prismaClient

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
