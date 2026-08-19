const ACTIVE_BOOKING_STATUSES = ["PENDING", "PAID", "CONFIRMED"];

export function buildDateRange(dateInput) {
  const baseDate = dateInput instanceof Date ? dateInput : new Date(dateInput);
  if (Number.isNaN(baseDate.getTime())) {
    return null;
  }

  const rangeStart = new Date(
    Date.UTC(
      baseDate.getUTCFullYear(),
      baseDate.getUTCMonth(),
      baseDate.getUTCDate()
    )
  );

  const rangeEnd = new Date(rangeStart);
  rangeEnd.setUTCDate(rangeEnd.getUTCDate() + 1);

  return { rangeStart, rangeEnd };
}

export async function lockSessions(tx, sessionIds = []) {
  const uniqueIds = Array.from(new Set(sessionIds))
    .filter((value) => typeof value === "number" && !Number.isNaN(value))
    .sort((a, b) => a - b); // Sort to prevent deadlocks

  if (uniqueIds.length === 0) {
    return;
  }

  const placeholders = uniqueIds.map(() => "?").join(", ");
  // Use NOWAIT to fail fast if lock cannot be acquired, or use lock timeout
  const sql = `SELECT id FROM sessions WHERE id IN (${placeholders}) FOR UPDATE`;
  await tx.$queryRawUnsafe(sql, ...uniqueIds);
}

export async function getSessionAvailability(tx, sessionIds = [], range) {
  if (!range || !(range?.rangeStart instanceof Date) || !(range?.rangeEnd instanceof Date)) {
    throw new Error("Invalid date range supplied to getSessionAvailability");
  }

  const uniqueIds = Array.from(new Set(sessionIds)).filter(
    (value) => typeof value === "number" && !Number.isNaN(value)
  );

  if (uniqueIds.length === 0) {
    return new Map();
  }

  const sessions = await tx.session.findMany({
    where: {
      id: { in: uniqueIds },
      deletedAt: null,
      program: { deletedAt: null },
    },
    select: {
      id: true,
      program: {
        select: {
          id: true,
          seats: true,
        },
      },
    },
  });

  if (sessions.length !== uniqueIds.length) {
    throw new Error("One or more sessions could not be found for availability calculation");
  }

  const capacityMap = new Map();
  for (const session of sessions) {
    const rawSeats = session.program?.seats;
    if (rawSeats === null || rawSeats === undefined) {
      throw new Error(`Seats not configured for program ${session.program?.id ?? "unknown"}`);
    }

    capacityMap.set(session.id, Math.max(Number(rawSeats) || 0, 0));
  }

  const reservations = await tx.bookingItem.groupBy({
    by: ["sessionId"],
    where: {
      sessionId: { in: uniqueIds },
      date: {
        gte: range.rangeStart,
        lt: range.rangeEnd,
      },
      booking: {
        deletedAt: null,
        status: { in: ACTIVE_BOOKING_STATUSES },
      },
    },
    _sum: {
      quantity: true,
    },
  });

  const reservedMap = new Map();
  for (const reservation of reservations) {
    reservedMap.set(reservation.sessionId, reservation._sum.quantity || 0);
  }

  const availabilityMap = new Map();
  for (const sessionId of uniqueIds) {
    const capacity = capacityMap.get(sessionId) ?? 0;
    const reserved = reservedMap.get(sessionId) ?? 0;
    const available = Math.max(capacity - reserved, 0);

    availabilityMap.set(sessionId, {
      sessionId,
      capacity,
      reserved,
      available,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
      source: "booking_items",
    });
  }

  return availabilityMap;
}

export { ACTIVE_BOOKING_STATUSES };
