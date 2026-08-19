export function createBookingPrismaMock() {
  const state = {
    bookings: [],
    payments: [],
    customers: [],
    items: [],
    commissions: [],
    nextBookingId: 1,
    nextPaymentId: 1,
    nextCustomerId: 1,
    nextItemId: 1,
    nextCommissionId: 1,
  };

  function cloneState() {
    return {
      bookings: state.bookings.map((row) => ({ ...row })),
      payments: state.payments.map((row) => ({ ...row })),
      customers: state.customers.map((row) => ({ ...row })),
      items: state.items.map((row) => ({ ...row })),
      commissions: state.commissions.map((row) => ({ ...row })),
      nextBookingId: state.nextBookingId,
      nextPaymentId: state.nextPaymentId,
      nextCustomerId: state.nextCustomerId,
      nextItemId: state.nextItemId,
      nextCommissionId: state.nextCommissionId,
    };
  }

  function restoreState(snapshot) {
    state.bookings.splice(0, state.bookings.length, ...snapshot.bookings);
    state.payments.splice(0, state.payments.length, ...snapshot.payments);
    state.customers.splice(0, state.customers.length, ...snapshot.customers);
    state.items.splice(0, state.items.length, ...snapshot.items);
    state.commissions.splice(
      0,
      state.commissions.length,
      ...snapshot.commissions
    );
    state.nextBookingId = snapshot.nextBookingId;
    state.nextPaymentId = snapshot.nextPaymentId;
    state.nextCustomerId = snapshot.nextCustomerId;
    state.nextItemId = snapshot.nextItemId;
    state.nextCommissionId = snapshot.nextCommissionId;
  }

  const teaStart = new Date("2026-08-20T08:00:00.000Z");
  const teaEnd = new Date("2026-08-20T10:00:00.000Z");
  const tastingStart = new Date("2026-08-20T10:30:00.000Z");
  const tastingEnd = new Date("2026-08-20T12:00:00.000Z");

  const sessions = [
    {
      id: 1,
      programId: 1,
      startTime: teaStart,
      endTime: teaEnd,
      price: 70,
      specialPrice: null,
      deletedAt: null,
      sessionTypes: [],
      program: { id: 1, seats: 20, deletedAt: null },
    },
    {
      id: 2,
      programId: 2,
      startTime: tastingStart,
      endTime: tastingEnd,
      price: 70,
      specialPrice: null,
      deletedAt: null,
      sessionTypes: [],
      program: { id: 2, seats: 20, deletedAt: null },
    },
  ];

  const leader = {
    id: 1,
    name: "Demo Leader",
    email: "leader@example.invalid",
    contact: "+94000000000",
    deletedAt: null,
    role: "USER",
    promoteCode: null,
  };

  let locked = Promise.resolve();
  async function serialize(work) {
    const previous = locked;
    let release;
    locked = new Promise((resolve) => {
      release = resolve;
    });
    await previous;
    try {
      return await work();
    } finally {
      release();
    }
  }

  function findBookingByAttempt(checkoutAttemptId) {
    const booking = state.bookings.find(
      (row) => row.checkoutAttemptId === checkoutAttemptId
    );
    if (!booking) {
      return null;
    }
    const payment = state.payments.find((row) => row.id === booking.paymentId);
    return { ...booking, payment };
  }

  const tx = {
    async $queryRawUnsafe() {
      return sessions.map((session) => ({ id: session.id }));
    },
    session: {
      async findMany({ where }) {
        const ids = where?.id?.in || [];
        return sessions
          .filter((session) => ids.includes(session.id))
          .map((session) => ({
            id: session.id,
            program: session.program,
          }));
      },
    },
    bookingItem: {
      async groupBy() {
        return [];
      },
      async create({ data }) {
        const row = { id: state.nextItemId++, ...data };
        state.items.push(row);
        return row;
      },
    },
    payment: {
      async create({ data }) {
        const row = { id: state.nextPaymentId++, ...data };
        state.payments.push(row);
        return row;
      },
    },
    booking: {
      async create({ data }) {
        if (
          data.checkoutAttemptId &&
          state.bookings.some(
            (row) => row.checkoutAttemptId === data.checkoutAttemptId
          )
        ) {
          const error = new Error("Unique constraint failed");
          error.code = "P2002";
          error.meta = { target: ["checkoutAttemptId"] };
          throw error;
        }
        const row = { id: state.nextBookingId++, ...data };
        state.bookings.push(row);
        return row;
      },
    },
    customer: {
      async create({ data }) {
        const row = { id: state.nextCustomerId++, ...data };
        state.customers.push(row);
        return row;
      },
    },
    leader: {
      async findFirst({ where }) {
        if (where?.id === leader.id && where?.deletedAt === null) {
          return {
            role: leader.role,
            promoteCode: leader.promoteCode,
          };
        }
        return null;
      },
    },
    commissionRule: {
      async findFirst() {
        return null;
      },
    },
    commission: {
      async create({ data }) {
        const row = { id: state.nextCommissionId++, ...data };
        state.commissions.push(row);
        return row;
      },
    },
  };

  const prisma = {
    leader: {
      async findFirst({ where }) {
        if (where?.id === leader.id && where?.deletedAt === null) {
          return {
            id: leader.id,
            name: leader.name,
            email: leader.email,
            contact: leader.contact,
          };
        }
        return null;
      },
    },
    session: {
      async findMany({ where }) {
        const ids = where?.id?.in || [];
        return sessions.filter((session) => ids.includes(session.id)).map(
          (session) => ({
            id: session.id,
            programId: session.programId,
            startTime: session.startTime,
            endTime: session.endTime,
            price: session.price,
            specialPrice: session.specialPrice,
            sessionTypes: session.sessionTypes,
          })
        );
      },
    },
    discountRule: {
      async findMany() {
        return [];
      },
    },
    booking: {
      async findUnique({ where }) {
        if (where?.checkoutAttemptId) {
          return findBookingByAttempt(where.checkoutAttemptId);
        }
        return null;
      },
    },
    payment: {
      async update() {
        return null;
      },
    },
    $transaction(work) {
      return serialize(async () => {
        const snapshot = cloneState();
        try {
          return await work(tx);
        } catch (error) {
          restoreState(snapshot);
          throw error;
        }
      });
    },
    _state: state,
  };

  function reset() {
    state.bookings.length = 0;
    state.payments.length = 0;
    state.customers.length = 0;
    state.items.length = 0;
    state.commissions.length = 0;
    state.nextBookingId = 1;
    state.nextPaymentId = 1;
    state.nextCustomerId = 1;
    state.nextItemId = 1;
    state.nextCommissionId = 1;
    locked = Promise.resolve();
  }

  return { prisma, state, reset };
}
