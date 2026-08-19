import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  buildDateRange,
  getSessionAvailability,
  lockSessions,
} from "@/lib/availability";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export async function POST(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const bookingId = Number.parseInt(id, 10);
    const body = await request.json();
    const { action, newDate, reason, refundAmount, amount } = body;

    if (!bookingId) {
      return NextResponse.json({ error: "Invalid booking ID" }, { status: 400 });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        items: true,
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (action === "mark_paid") {
       await prisma.$transaction(async (tx) => {
         const paidAmount = parseFloat(amount || 0);

         // Update Payment Record (add amount)
         if (booking.payment) {
           await tx.payment.update({
             where: { id: booking.paymentId },
             data: {
               amount: { increment: paidAmount },
               status: "SUCCESS", // Or confirm transaction if handling partials differently
             },
           });
         }

         // Update Booking Record
         await tx.booking.update({
           where: { id: bookingId },
           data: {
             paymentType: "Full",
             balance: 0,
             status: booking.status === "PENDING" ? "CONFIRMED" : booking.status,
           },
         });

         await tx.bookingHistory.create({
           data: {
             bookingId,
             action: "PAYMENT_COMPLETED",
             reason: `Manual payment of ${paidAmount} recorded via admin panel`,
             previousStatus: booking.status,
             newStatus: booking.status === "PENDING" ? "CONFIRMED" : booking.status,
           },
         });
       });

       return NextResponse.json({
         success: true,
         message: "Booking marked as fully paid",
       });
    }

    if (action === "reschedule") {
      if (!newDate) {
        return NextResponse.json({ error: "New date is required" }, { status: 400 });
      }

      const targetDate = new Date(newDate);
      if (Number.isNaN(targetDate.getTime())) {
        return NextResponse.json({ error: "Invalid new date" }, { status: 400 });
      }

      const targetRange = buildDateRange(targetDate);
      if (!targetRange) {
        return NextResponse.json(
          { error: "Unable to normalize the provided date" },
          { status: 400 }
        );
      }

      const normalizedTargetDate = targetRange.rangeStart;
      const oldDate = new Date(booking.bookedDate);
      const sessionTotals = new Map();

      for (const item of booking.items) {
        const quantity = item.quantity ?? 1;
        const current = sessionTotals.get(item.sessionId) || 0;
        sessionTotals.set(item.sessionId, current + quantity);
      }

      await prisma.$transaction(async (tx) => {
        const sessionIds = Array.from(sessionTotals.keys());
        await lockSessions(tx, sessionIds);
        const availabilityMap = await getSessionAvailability(
          tx,
          sessionIds,
          targetRange
        );

        for (const [sessionId, seatsNeeded] of sessionTotals) {
          const availability = availabilityMap.get(sessionId);
          if (!availability || availability.available < seatsNeeded) {
            const validationError = new Error(
              `Not enough seats for session ${sessionId} on ${newDate}`
            );
            validationError.status = 400;
            throw validationError;
          }
        }

        await tx.booking.update({
          where: { id: bookingId },
          data: { bookedDate: normalizedTargetDate },
        });

        await tx.bookingItem.updateMany({
          where: { bookingId },
          data: { date: normalizedTargetDate },
        });

        await tx.bookingHistory.create({
          data: {
            bookingId,
            action: "RESCHEDULE",
            previousDate: oldDate,
            newDate: normalizedTargetDate,
            reason,
            previousStatus: booking.status,
            newStatus: booking.status,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Booking rescheduled successfully",
      });
    }

    if (action === "cancel") {
      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
        });

        if (refundAmount && refundAmount > 0) {
          await tx.refund.create({
            data: {
              bookingId,
              amount: parseFloat(refundAmount),
              reason,
              status: "PENDING",
            },
          });
        }

        await tx.bookingHistory.create({
          data: {
            bookingId,
            action: "CANCEL",
            previousStatus: booking.status,
            newStatus: "CANCELLED",
            reason,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Booking cancelled successfully",
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error managing booking:", error);
    const status = error?.status ?? 500;
    const message =
      status >= 500
        ? "Internal server error"
        : error?.message || "Unable to manage booking";
    return NextResponse.json({ error: message }, { status });
  }
}
