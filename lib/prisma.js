import { PrismaClient } from "@prisma/client";

// Reuse the same Prisma instance across hot reloads to avoid exhausting DB connections.
const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = new PrismaClient();
}

const prisma = globalForPrisma.prisma;

export default prisma;
