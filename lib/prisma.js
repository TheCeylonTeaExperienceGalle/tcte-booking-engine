import { createPrismaClient } from "./create-client.mjs";

// Reuse the same Prisma instance across hot reloads to avoid exhausting DB connections.
const globalForPrisma = globalThis;

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = createPrismaClient();
}

const prisma = globalForPrisma.prisma;

export default prisma;
