/* One-time Railway STAGING catalog + demo admin bootstrap.
 * Not prisma/seed.js. Never run against production.
 *
 * Required:
 *   DATABASE_URL
 *   STAGING_BOOTSTRAP=true
 *   STAGING_ADMIN_PASSWORD  (>=12 chars, not a known default)
 * Optional:
 *   STAGING_ADMIN_EMAIL     (default owner-demo@example.invalid)
 */

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const SALT_ROUNDS = 10;
const STAGING_LOCATION_ID = 8001;
const STAGING_EXPERIENCE_PROGRAM_ID = 8001;
const STAGING_TASTING_PROGRAM_ID = 8002;
const STAGING_MORNING_SESSION_ID = 8001;
const STAGING_AFTERNOON_SESSION_ID = 8002;
const STAGING_TASTING_TYPE_ID = 8001;

const DEFAULT_ADMIN_EMAIL = "owner-demo@example.invalid";
const LEADER_EMAIL = "staging-leader@example.invalid";

const FORBIDDEN_PASSWORDS = new Set([
  "password123!",
  "password123",
  "password",
  "admin",
  "admin123",
  "changeme",
  "staging",
  "staging123456",
  "letmein",
  "qwerty123456",
]);

function timeUtc(hours, minutes = 0) {
  return new Date(Date.UTC(1970, 0, 1, hours, minutes, 0));
}

function assertSafePassword(password) {
  if (!password || typeof password !== "string") {
    throw new Error("STAGING_ADMIN_PASSWORD is required");
  }
  if (password.length < 12) {
    throw new Error("STAGING_ADMIN_PASSWORD must be at least 12 characters");
  }
  if (FORBIDDEN_PASSWORDS.has(password.toLowerCase())) {
    throw new Error("STAGING_ADMIN_PASSWORD is a known/default value");
  }
  if (/password/i.test(password)) {
    throw new Error("STAGING_ADMIN_PASSWORD must not contain the word password");
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("STAGING_ADMIN_PASSWORD must include letters and numbers");
  }
}

function assertSafeEmail(email) {
  if (!email.endsWith("@example.invalid")) {
    throw new Error("STAGING_ADMIN_EMAIL must use the @example.invalid domain");
  }
}

function databaseUrlIsPresent() {
  const raw = process.env.DATABASE_URL;
  return typeof raw === "string" && raw.trim().length > 0;
}

async function upsertLocation(prisma) {
  return prisma.location.upsert({
    where: { id: STAGING_LOCATION_ID },
    update: { name: "Galle", address: "Galle, Sri Lanka (demo)", deletedAt: null },
    create: {
      id: STAGING_LOCATION_ID,
      name: "Galle",
      address: "Galle, Sri Lanka (demo)",
    },
  });
}

async function upsertProgram(prisma, { id, title, description, start, end, locationId }) {
  return prisma.program.upsert({
    where: { id },
    update: {
      title,
      description,
      startTime: start,
      endTime: end,
      locationId,
      seats: 12,
      isActive: true,
      deletedAt: null,
    },
    create: {
      id,
      title,
      description,
      startTime: start,
      endTime: end,
      locationId,
      seats: 12,
      isActive: true,
    },
  });
}

async function upsertSession(prisma, { id, programId, name, start, end, price }) {
  return prisma.session.upsert({
    where: { id },
    update: {
      programId,
      name,
      startTime: start,
      endTime: end,
      price,
      deletedAt: null,
    },
    create: {
      id,
      programId,
      name,
      startTime: start,
      endTime: end,
      price,
    },
  });
}

async function main() {
  if (process.env.STAGING_BOOTSTRAP !== "true") {
    throw new Error("Refusing to run. Set STAGING_BOOTSTRAP=true");
  }
  if (!databaseUrlIsPresent()) {
    throw new Error("DATABASE_URL is not set");
  }

  const adminEmail = (
    process.env.STAGING_ADMIN_EMAIL || DEFAULT_ADMIN_EMAIL
  )
    .trim()
    .toLowerCase();
  assertSafeEmail(adminEmail);
  assertSafePassword(process.env.STAGING_ADMIN_PASSWORD);

  const passwordHash = await bcrypt.hash(
    process.env.STAGING_ADMIN_PASSWORD,
    SALT_ROUNDS
  );

  const prisma = new PrismaClient();
  try {
    const admin = await prisma.user.upsert({
      where: { email: adminEmail },
      update: {
        name: "TCTE Staging Owner",
        role: "admin",
        password: passwordHash,
      },
      create: {
        email: adminEmail,
        name: "TCTE Staging Owner",
        role: "admin",
        password: passwordHash,
      },
    });

    const leader = await prisma.leader.upsert({
      where: { email: LEADER_EMAIL },
      update: {
        name: "Staging Demo Leader",
        contact: "0000000000",
        promoteCode: "STAGINGDEMO",
        role: "LEADER",
        status: "ACTIVE",
        deletedAt: null,
      },
      create: {
        name: "Staging Demo Leader",
        email: LEADER_EMAIL,
        contact: "0000000000",
        promoteCode: "STAGINGDEMO",
        role: "LEADER",
        status: "ACTIVE",
      },
    });

    const location = await upsertLocation(prisma);

    const experience = await upsertProgram(prisma, {
      id: STAGING_EXPERIENCE_PROGRAM_ID,
      title: "Tea Experience Demo",
      description: "Synthetic staging program for owner review. Not a live offering.",
      start: timeUtc(10, 0),
      end: timeUtc(12, 0),
      locationId: location.id,
    });

    const tasting = await upsertProgram(prisma, {
      id: STAGING_TASTING_PROGRAM_ID,
      title: "Tea Tasting Demo",
      description: "Synthetic staging tasting program for owner review.",
      start: timeUtc(14, 0),
      end: timeUtc(16, 0),
      locationId: location.id,
    });

    const morning = await upsertSession(prisma, {
      id: STAGING_MORNING_SESSION_ID,
      programId: experience.id,
      name: "10:00 AM",
      start: timeUtc(10, 0),
      end: timeUtc(12, 0),
      price: 85,
    });

    const afternoon = await upsertSession(prisma, {
      id: STAGING_AFTERNOON_SESSION_ID,
      programId: tasting.id,
      name: "2:00 PM",
      start: timeUtc(14, 0),
      end: timeUtc(16, 0),
      price: 40,
    });

    await prisma.sessionType.upsert({
      where: { id: STAGING_TASTING_TYPE_ID },
      update: {
        sessionId: afternoon.id,
        name: "Standard tasting flight (demo)",
        price: 15,
        deletedAt: null,
      },
      create: {
        id: STAGING_TASTING_TYPE_ID,
        sessionId: afternoon.id,
        name: "Standard tasting flight (demo)",
        price: 15,
      },
    });

    const [userCount, locationCount, programCount, sessionCount, customerCount, bookingCount, paymentCount] =
      await Promise.all([
        prisma.user.count(),
        prisma.location.count({ where: { deletedAt: null } }),
        prisma.program.count({ where: { deletedAt: null } }),
        prisma.session.count({ where: { deletedAt: null } }),
        prisma.customer.count(),
        prisma.booking.count(),
        prisma.payment.count(),
      ]);

    console.log("STAGING_BOOTSTRAP_OK");
    console.log(`ADMIN_EMAIL=${admin.email}`);
    console.log(`ADMIN_ROLE=${admin.role}`);
    console.log(`LEADER_EMAIL=${leader.email}`);
    console.log(`LOCATION=${location.name}`);
    console.log(`PROGRAMS=${experience.title}|${tasting.title}`);
    console.log(`SESSIONS=${morning.name}|${afternoon.name}`);
    console.log(`COUNTS users=${userCount} locations=${locationCount} programs=${programCount} sessions=${sessionCount} customers=${customerCount} bookings=${bookingCount} payments=${paymentCount}`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("STAGING_BOOTSTRAP_FAILED", error.message);
  process.exit(1);
});
