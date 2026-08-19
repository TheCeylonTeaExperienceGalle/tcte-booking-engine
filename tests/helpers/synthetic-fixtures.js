import bcrypt from "bcryptjs";

export const SYNTHETIC = {
  adminEmail: "security-admin@example.invalid",
  userEmail: "security-user@example.invalid",
  customerName: "Security Test Customer",
  customerEmail: "security-customer@example.invalid",
  leaderEmail: "security-leader@example.invalid",
  programTitle: "Security Test Tea Experience",
  sessionName: "Security Test Session",
  orderId: "SECURITY-TEST-ORDER-001",
  notes: "SECURITY-TEST-BOOKING-001",
  amount: 100,
  currency: "USD",
};

export async function upsertSyntheticSecurityFixtures(prisma, password) {
  if (!password || password.length < 12) {
    throw new Error("Synthetic fixture password must be at least 12 characters");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email: SYNTHETIC.adminEmail },
    update: { role: "admin", password: passwordHash, name: "Security Test Admin" },
    create: {
      email: SYNTHETIC.adminEmail,
      name: "Security Test Admin",
      role: "admin",
      password: passwordHash,
    },
  });

  const user = await prisma.user.upsert({
    where: { email: SYNTHETIC.userEmail },
    update: { role: "user", password: passwordHash, name: "Security Test User" },
    create: {
      email: SYNTHETIC.userEmail,
      name: "Security Test User",
      role: "user",
      password: passwordHash,
    },
  });

  const leader = await prisma.leader.upsert({
    where: { email: SYNTHETIC.leaderEmail },
    update: { name: "Security Test Leader", deletedAt: null },
    create: {
      name: "Security Test Leader",
      email: SYNTHETIC.leaderEmail,
      contact: "0000000000",
      promoteCode: "SECURITYTEST",
    },
  });

  const location = await prisma.location.upsert({
    where: { id: 9001 },
    update: { name: "Security Test Location", deletedAt: null },
    create: { id: 9001, name: "Security Test Location" },
  });

  const program = await prisma.program.upsert({
    where: { id: 9001 },
    update: {
      title: SYNTHETIC.programTitle,
      locationId: location.id,
      deletedAt: null,
      isActive: true,
    },
    create: {
      id: 9001,
      title: SYNTHETIC.programTitle,
      startTime: new Date("1970-01-01T08:30:00.000Z"),
      endTime: new Date("1970-01-01T10:30:00.000Z"),
      locationId: location.id,
      seats: 20,
      isActive: true,
    },
  });

  const session = await prisma.session.upsert({
    where: { id: 9001 },
    update: {
      name: SYNTHETIC.sessionName,
      programId: program.id,
      deletedAt: null,
      price: SYNTHETIC.amount,
    },
    create: {
      id: 9001,
      programId: program.id,
      name: SYNTHETIC.sessionName,
      startTime: new Date("1970-01-01T08:30:00.000Z"),
      endTime: new Date("1970-01-01T10:30:00.000Z"),
      price: SYNTHETIC.amount,
    },
  });

  const customer = await prisma.customer.findFirst({
    where: { email: SYNTHETIC.customerEmail, deletedAt: null },
  });

  const customerRecord =
    customer ||
    (await prisma.customer.create({
      data: {
        leaderId: leader.id,
        name: SYNTHETIC.customerName,
        email: SYNTHETIC.customerEmail,
        phone: "0000000000",
        nic: "TEST000000V",
      },
    }));

  const payment = await prisma.payment.upsert({
    where: { orderId: SYNTHETIC.orderId },
    update: {
      status: "PENDING",
      amount: SYNTHETIC.amount,
      currency: SYNTHETIC.currency,
      provider: "PAYHERE",
      deletedAt: null,
    },
    create: {
      provider: "PAYHERE",
      status: "PENDING",
      amount: SYNTHETIC.amount,
      currency: SYNTHETIC.currency,
      orderId: SYNTHETIC.orderId,
    },
  });

  let booking = await prisma.booking.findFirst({
    where: { additionalNotes: SYNTHETIC.notes },
  });

  if (!booking) {
    booking = await prisma.booking.create({
      data: {
        leaderId: leader.id,
        bookedDate: new Date("2030-01-15T00:00:00.000Z"),
        paymentType: "Full",
        amount: SYNTHETIC.amount,
        balance: SYNTHETIC.amount,
        paymentId: payment.id,
        status: "PENDING",
        additionalNotes: SYNTHETIC.notes,
        items: {
          create: {
            sessionId: session.id,
            customerId: customerRecord.id,
            date: new Date("2030-01-15T00:00:00.000Z"),
            quantity: 1,
          },
        },
      },
    });
  } else {
    booking = await prisma.booking.update({
      where: { id: booking.id },
      data: {
        status: "PENDING",
        paymentId: payment.id,
        amount: SYNTHETIC.amount,
        balance: SYNTHETIC.amount,
        deletedAt: null,
      },
    });
  }

  return { admin, user, leader, location, program, session, customer: customerRecord, payment, booking };
}
