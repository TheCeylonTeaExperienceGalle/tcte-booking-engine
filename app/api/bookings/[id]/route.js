import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  buildDateRange,
  getSessionAvailability,
  lockSessions,
} from "@/lib/availability";
import { requirePermission } from "@/lib/auth";

class HttpError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.status = status;
  }
}

export async function GET(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "bookings", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id } = await params;
    const bookingId = Number.parseInt(id, 10);
    if (!bookingId) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        leader: true,
        items: {
          include: {
            session: {
              include: {
                program: {
                  include: {
                    location: true,
                  },
                },
              },
            },
            customer: true,
            sessionType: true,
          },
        },
        payment: true,
        commission: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    return NextResponse.json({ booking });
  } catch (error) {
    console.error("Error fetching booking:", error);
    return NextResponse.json(
      { error: "Failed to fetch booking" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "bookings-edit", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to edit bookings" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const bookingId = Number.parseInt(id, 10);
    if (!bookingId) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const payload = await request.json();
    const {
      leaderId,
      bookedDate,
      additionalNotes,
      selections,
      payment = {},
      status: targetStatus,
    } = payload;

    if (!bookedDate) {
      return NextResponse.json({ error: "Booked date is required" }, { status: 400 });
    }
    if (!Array.isArray(selections) || selections.length === 0) {
      return NextResponse.json({ error: "At least one selection is required" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId, deletedAt: null },
      include: {
        payment: true,
        items: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const rawDateStr = typeof bookedDate === "string" ? bookedDate.split("T")[0] : "";
    const bookingDate = rawDateStr ? new Date(`${rawDateStr}T00:00:00.000Z`) : new Date(bookedDate);
    if (Number.isNaN(bookingDate.getTime())) {
      return NextResponse.json({ error: "Invalid bookedDate provided" }, { status: 400 });
    }

    const bookingRange = buildDateRange(bookingDate);
    if (!bookingRange) {
      return NextResponse.json({ error: "Unable to normalize bookedDate" }, { status: 400 });
    }

    // Resolve leader (Travel Agent or Direct Contact)
    let leader = null;
    const parsedLeaderId = leaderId ? Number(leaderId) : null;
    if (parsedLeaderId && !Number.isNaN(parsedLeaderId) && parsedLeaderId > 0) {
      leader = await prisma.leader.findFirst({
        where: { id: parsedLeaderId, role: "LEADER", deletedAt: null },
      });
      if (!leader) {
        return NextResponse.json({ error: "Travel Agent not found" }, { status: 404 });
      }
    } else {
      // Direct booking: resolve direct profile (role: USER)
      const primaryGuest = selections?.[0]?.customers?.[0] || {};
      const directName = (primaryGuest.name || "Direct Guest").trim();
      const directEmail = (primaryGuest.email || "direct-booking@reviva.internal").trim().toLowerCase();
      const directContact = (primaryGuest.phone || null)?.trim() || null;

      leader = await prisma.leader.findFirst({
        where: { email: directEmail, role: "USER", deletedAt: null },
      });

      if (!leader) {
        const existingAny = await prisma.leader.findFirst({
          where: { email: directEmail },
        });
        const contactEmail = existingAny
          ? `direct-${Date.now()}-${directEmail}`
          : directEmail;

        leader = await prisma.leader.create({
          data: {
            name: directName,
            email: contactEmail,
            contact: directContact,
            role: "USER",
            status: "ACTIVE",
          },
        });
      }
    }

    const resolvedLeaderId = leader.id;

    // Load sessions for validation and pricing
    const uniqueSessionIds = Array.from(new Set(selections.map((s) => s.sessionId)));
    const dbSessions = await prisma.session.findMany({
      where: { id: { in: uniqueSessionIds }, deletedAt: null },
      include: {
        sessionTypes: { where: { deletedAt: null } },
        program: { select: { id: true, title: true, price: true } },
      },
    });

    const sessionMap = new Map();
    dbSessions.forEach((s) => sessionMap.set(s.id, s));

    // Calculate prices
    const priceItems = calculatePrice(selections, sessionMap);
    const subtotal = priceItems.reduce((acc, item) => acc + item.total, 0);

    const finalTotalAmount = payment.full_payment_price != null 
      ? Number(payment.full_payment_price) 
      : (payment.amount != null ? Number(payment.amount) : subtotal);
    const paymentType = payment.paymentType || booking.paymentType || "Full";
    
    // Balance calculation based on paymentType & paid amount
    let paidAmount;
    let balance;
    if (paymentType === "Full") {
      paidAmount = finalTotalAmount;
      balance = 0;
    } else {
      paidAmount = payment.paidAmount != null 
        ? Number(payment.paidAmount) 
        : (payment.amount != null ? Number(payment.amount) : (finalTotalAmount - booking.balance));
      balance = Math.max(0, finalTotalAmount - paidAmount);
    }

    const newStatus = targetStatus || (balance === 0 && booking.status === "PENDING" ? "CONFIRMED" : booking.status);

    // Run transaction with serializable isolation
    await prisma.$transaction(
      async (tx) => {
        // 1. Remove existing booking items so old seats are released
        await tx.bookingItem.deleteMany({
          where: { bookingId },
        });

        // 2. Validate availability for new selections
        await validateAvailability(tx, bookingRange, selections, sessionMap);

        // 3. Create customer records for attendees
        const selectionCustomerIds = await createCustomerRecords(tx, resolvedLeaderId, selections);

        // 4. Create new booking items
        await createBookingItems(tx, bookingId, bookingDate, selections, selectionCustomerIds);

        // 5. Update Payment Record
        if (booking.paymentId) {
          let updatedTxnId = payment.transactionId || booking.payment?.transactionId || null;
          if ((!updatedTxnId || updatedTxnId.startsWith("TEST-")) && paidAmount > 0) {
            updatedTxnId = await generateNextTransactionId(tx);
          }
          await tx.payment.update({
            where: { id: booking.paymentId },
            data: {
              amount: paidAmount,
              status: balance === 0 ? "SUCCESS" : (paidAmount > 0 ? "SUCCESS" : booking.payment?.status),
              method: payment.method || booking.payment?.method || null,
              transactionId: updatedTxnId,
            },
          });
        }

        // 6. Update Booking Record
        await tx.booking.update({
          where: { id: bookingId },
          data: {
            leaderId: resolvedLeaderId,
            bookedDate: bookingDate,
            paymentType,
            amount: finalTotalAmount,
            balance,
            status: newStatus,
            additionalNotes: additionalNotes ?? booking.additionalNotes,
          },
        });

        // 7. Update Commission (party size across sessions)
        const sessionSeatsMap = new Map();
        for (const sel of selections) {
          const sId = sel.sessionId;
          sessionSeatsMap.set(sId, (sessionSeatsMap.get(sId) || 0) + (sel.seatsRequested || 1));
        }
        const totalSeats = sessionSeatsMap.size > 0 ? Math.max(...sessionSeatsMap.values()) : 0;
        await tx.commission.deleteMany({ where: { bookingId } });
        await createCommissionRecord(tx, bookingId, resolvedLeaderId, totalSeats, finalTotalAmount);

        // 8. Log Booking History
        await tx.bookingHistory.create({
          data: {
            bookingId,
            action: "UPDATED",
            previousDate: booking.bookedDate,
            newDate: bookingDate,
            previousStatus: booking.status,
            newStatus: newStatus,
            reason: "Booking details updated by administrator",
          },
        });
      },
      {
        isolationLevel: "Serializable",
        timeout: 15000,
      }
    );

    return NextResponse.json({
      success: true,
      bookingId,
      message: "Booking updated successfully",
    });
  } catch (error) {
    console.error("Booking update failed:", error);
    const status = error.status || 500;
    return NextResponse.json(
      { error: error.message || "Failed to update booking" },
      { status }
    );
  }
}

function calculatePrice(selections, sessionMap) {
  return selections.map((selection) => {
    const session = sessionMap.get(selection.sessionId);
    if (!session) {
      throw new HttpError(`Session ${selection.sessionId} not found`);
    }

    const sessionBasePrice = session.specialPrice ?? session.price ?? 0;
    let sessionTypePrice = 0;

    if (selection.sessionTypeId) {
      const sessionType = session.sessionTypes.find(
        (type) => type.id === selection.sessionTypeId
      );
      if (!sessionType) {
        throw new HttpError(
          `Session type ${selection.sessionTypeId} does not belong to session ${selection.sessionId}`
        );
      }
      sessionTypePrice = sessionType.specialPrice ?? sessionType.price ?? 0;
    }

    const unitPrice = sessionBasePrice + sessionTypePrice;
    const total = unitPrice * selection.seatsRequested;

    return {
      sessionId: selection.sessionId,
      sessionTypeId: selection.sessionTypeId ?? null,
      unitPrice,
      seatsRequested: selection.seatsRequested,
      total,
    };
  });
}

async function validateAvailability(tx, bookingRange, selections, sessionMap) {
  const sessionTotals = new Map();
  for (const selection of selections) {
    const current = sessionTotals.get(selection.sessionId) || 0;
    sessionTotals.set(selection.sessionId, current + selection.seatsRequested);
  }

  const sessionIds = Array.from(sessionTotals.keys());
  if (sessionIds.length === 0) {
    throw new HttpError("No sessions supplied for availability validation");
  }

  await lockSessions(tx, sessionIds);
  const availabilityMap = await getSessionAvailability(
    tx,
    sessionIds,
    bookingRange
  );

  for (const [sessionId, totalSeatsRequested] of sessionTotals) {
    const session = sessionMap.get(sessionId);
    const availability = availabilityMap.get(sessionId);
    if (!availability) {
      throw new HttpError(`Availability could not be derived for session ${sessionId}`);
    }

    if (availability.available < totalSeatsRequested) {
      const sessionName = session ? session.name : `Session ${sessionId}`;
      throw new HttpError(
        `Not enough seats remaining for ${sessionName}. Available: ${availability.available}, Requested: ${totalSeatsRequested}`,
        409
      );
    }
  }
}

async function createCustomerRecords(tx, leaderId, selections) {
  const selectionCustomerIds = [];

  for (const selection of selections) {
    const { seatsRequested, customers } = selection;

    if (Array.isArray(customers) && customers.length > 0) {
      const customerIds = [];
      for (const customerData of customers) {
        if (!customerData?.name || !customerData?.email) {
          continue;
        }

        const createdCustomer = await tx.customer.create({
          data: {
            leaderId,
            name: customerData.name,
            email: customerData.email,
            phone: customerData.phone ?? null,
            nic: customerData.nic ?? null,
          },
        });
        customerIds.push(createdCustomer.id);
      }
      selectionCustomerIds.push(customerIds);
    } else {
      selectionCustomerIds.push([]);
    }
  }

  return selectionCustomerIds;
}

async function createBookingItems(
  tx,
  bookingId,
  bookedDate,
  selections,
  selectionCustomerIds
) {
  for (let index = 0; index < selections.length; index += 1) {
    const selection = selections[index];
    const customerIds = selectionCustomerIds[index] || [];

    if (customerIds.length === 0) {
      for (let s = 0; s < (selection.seatsRequested || 1); s += 1) {
        await tx.bookingItem.create({
          data: {
            bookingId,
            sessionId: selection.sessionId,
            sessionTypeId: selection.sessionTypeId ?? null,
            quantity: 1,
            customerId: null,
            date: bookedDate,
          },
        });
      }
      continue;
    }

    for (const customerId of customerIds) {
      await tx.bookingItem.create({
        data: {
          bookingId,
          sessionId: selection.sessionId,
          sessionTypeId: selection.sessionTypeId ?? null,
          quantity: 1,
          customerId,
          date: bookedDate,
        },
      });
    }
  }
}

async function createCommissionRecord(tx, bookingId, leaderId, totalSeats, bookingAmount) {
  const leader = await tx.leader.findFirst({
    where: { id: leaderId, deletedAt: null },
    select: { role: true, promoteCode: true },
  });

  if (!leader || leader.role !== "LEADER" || !leader.promoteCode) {
    return null;
  }

  const commissionRule = await tx.commissionRule.findFirst({
    where: {
      deletedAt: null,
      isActive: true,
      minSeats: { lte: totalSeats },
      OR: [
        { maxSeats: { gte: totalSeats } },
        { maxSeats: null },
      ],
    },
    orderBy: { minSeats: "desc" },
  });

  if (!commissionRule) {
    return null;
  }

  const commissionAmount = (bookingAmount * commissionRule.commissionRate) / 100;

  return await tx.commission.create({
    data: {
      bookingId,
      leaderId,
      totalSeats,
      bookingAmount,
      commissionRate: commissionRule.commissionRate,
      commissionAmount,
      paymentStatus: "PENDING",
    },
  });
}

async function generateNextTransactionId(tx) {
  const latestTxn = await tx.payment.findFirst({
    where: {
      transactionId: { startsWith: "TXN-" },
    },
    orderBy: { transactionId: "desc" },
    select: { transactionId: true },
  });

  let maxNum = 0;
  if (latestTxn?.transactionId) {
    const match = latestTxn.transactionId.match(/^TXN-(\d+)$/i);
    if (match) {
      maxNum = parseInt(match[1], 10);
    }
  }

  const nextNum = maxNum + 1;
  return `TXN-${String(nextNum).padStart(6, "0")}`;
}
