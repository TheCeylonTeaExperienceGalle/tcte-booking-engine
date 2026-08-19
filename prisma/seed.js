/* Seed script to insert initial users, locations, programs, sessions, and session types */
// Uses CommonJS to avoid ESM issues since package.json has no "type": "module"
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

function shouldAllowSeed(env = process.env) {
  return !(env.NODE_ENV === "production" && env.ALLOW_SEED !== "true");
}

async function main() {
  if (!shouldAllowSeed()) {
    throw new Error(
      "Refusing to seed in production. Set ALLOW_SEED=true only for an authorized local/test restore."
    );
  }

  // Seed users — local fixtures only. Do not use these accounts in production.
  const users = [
    { email: "admin@example.com", name: "Admin User", role: "admin", password: "Password123!" },
    { email: "leader@example.com", name: "Leader User", role: "user", password: "Password123!" },
    { email: "user@example.com", name: "Regular User", role: "user", password: "Password123!" },
  ];

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: { name: u.name, role: u.role, password: hashed },
      create: { email: u.email, name: u.name, role: u.role, password: hashed },
    });
  }

  // Seed locations
  const locations = [
    { id: 1, name: "Kandy", address: null, createdAt: new Date("2025-12-03T06:16:21.956Z"), updatedAt: new Date("2025-12-03T06:16:21.956Z"), deletedAt: null },
    { id: 2, name: "Colombo", address: null, createdAt: new Date("2025-12-03T06:16:28.160Z"), updatedAt: new Date("2025-12-03T06:16:28.160Z"), deletedAt: null },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: { id: loc.id },
      update: loc,
      create: loc,
    });
  }

  // Seed programs
  const programs = [
    { id: 1, title: "N1", description: null, startTime: new Date("1970-01-01T08:30:00.000Z"), endTime: new Date("1970-01-01T10:30:00.000Z"), locationId: 1, seats: 20, isActive: true, createdAt: new Date("2025-12-03T06:17:22.311Z"), updatedAt: new Date("2025-12-03T06:17:22.311Z"), deletedAt: null },
    { id: 2, title: "N2", description: null, startTime: new Date("1970-01-01T10:30:00.000Z"), endTime: new Date("1970-01-01T00:30:00.000Z"), locationId: 1, seats: 20, isActive: true, createdAt: new Date("2025-12-03T06:18:17.181Z"), updatedAt: new Date("2025-12-03T06:18:17.181Z"), deletedAt: null },
  ];

  for (const prog of programs) {
    await prisma.program.upsert({
      where: { id: prog.id },
      update: prog,
      create: prog,
    });
  }

  // Seed sessions
  const sessions = [
    { id: 1, programId: 1, name: "Plucking", startTime: new Date("1970-01-01T08:30:00.000Z"), endTime: new Date("1970-01-01T09:30:00.000Z"), price: 100, createdAt: new Date("2025-12-03T06:23:04.167Z"), updatedAt: new Date("2025-12-03T06:23:04.167Z"), deletedAt: null },
    { id: 2, programId: 1, name: "Making", startTime: new Date("1970-01-01T09:30:00.000Z"), endTime: new Date("1970-01-01T10:00:00.000Z"), price: null, createdAt: new Date("2025-12-03T06:23:43.761Z"), updatedAt: new Date("2025-12-03T06:23:43.761Z"), deletedAt: null },
    { id: 3, programId: 1, name: "Tasting", startTime: new Date("1970-01-01T10:00:00.000Z"), endTime: new Date("1970-01-01T10:30:00.000Z"), price: null, createdAt: new Date("2025-12-03T06:25:35.809Z"), updatedAt: new Date("2025-12-03T06:25:35.809Z"), deletedAt: null },
    { id: 4, programId: 2, name: "Plucking", startTime: new Date("1970-01-01T08:30:00.000Z"), endTime: new Date("1970-01-01T09:30:00.000Z"), price: 100, createdAt: new Date("2025-12-03T06:23:04.167Z"), updatedAt: new Date("2025-12-03T06:23:04.167Z"), deletedAt: null },
    { id: 5, programId: 2, name: "Making", startTime: new Date("1970-01-01T09:30:00.000Z"), endTime: new Date("1970-01-01T10:00:00.000Z"), price: null, createdAt: new Date("2025-12-03T06:23:43.761Z"), updatedAt: new Date("2025-12-03T06:23:43.761Z"), deletedAt: null },
    { id: 6, programId: 2, name: "Tasting", startTime: new Date("1970-01-01T10:00:00.000Z"), endTime: new Date("1970-01-01T10:30:00.000Z"), price: null, createdAt: new Date("2025-12-03T06:25:35.809Z"), updatedAt: new Date("2025-12-03T06:25:35.809Z"), deletedAt: null },
  ];

  for (const sess of sessions) {
    await prisma.session.upsert({
      where: { id: sess.id },
      update: sess,
      create: sess,
    });
  }

  // Seed session types
  const sessionTypes = [
    { id: 1, sessionId: 2, name: "Black tea", price: 50, createdAt: new Date("2025-12-03T06:31:03.497Z"), updatedAt: new Date("2025-12-03T06:31:03.497Z"), deletedAt: null },
    { id: 2, sessionId: 2, name: "Normal tea", price: 50, createdAt: new Date("2025-12-03T06:31:27.298Z"), updatedAt: new Date("2025-12-03T06:31:27.298Z"), deletedAt: null },
    { id: 3, sessionId: 3, name: "Low", price: 10, createdAt: new Date("2025-12-03T06:31:46.071Z"), updatedAt: new Date("2025-12-03T06:31:46.071Z"), deletedAt: null },
    { id: 4, sessionId: 3, name: "Medeum", price: 20, createdAt: new Date("2025-12-03T06:32:03.278Z"), updatedAt: new Date("2025-12-03T06:32:03.278Z"), deletedAt: null },
    { id: 5, sessionId: 3, name: "High", price: 50, createdAt: new Date("2025-12-03T06:32:14.615Z"), updatedAt: new Date("2025-12-03T06:32:14.615Z"), deletedAt: null },
  ];

  for (const st of sessionTypes) {
    await prisma.sessionType.upsert({
      where: { id: st.id },
      update: st,
      create: st,
    });
  }

  console.log("Seeded all data successfully.");
}

main()
  .then(async () => {
    console.log("Seeded users successfully.");
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seeding failed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
