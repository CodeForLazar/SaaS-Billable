import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/lib/generated/prisma/client';

// In dev, Next.js hot reload re-runs this module on every change. Keeping the client on
// globalThis stops each reload from opening a new connection pool until Postgres runs out.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createPrismaClient() {
   const adapter = new PrismaPg({ connectionString: process.env.TEST_DATABASE_URL });
   return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;
