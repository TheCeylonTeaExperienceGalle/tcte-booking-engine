import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  buildDateRange,
  getSessionAvailability,
  lockSessions,
} from "@/lib/availability";
import { requirePermission } from "@/lib/auth";

export async function POST(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "bookings", "write");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

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

    if (action === "mark_paid" || action === "full_payment") {
       await prisma.$transaction(async (tx) => {
         const paidAmount = parseFloat(amount != null ? amount : booking.balance);

         // Update Payment Record
         if (booking.payment) {
           await tx.payment.update({
             where: { id: booking.paymentId },
             data: {
               amount: { increment: paidAmount },
               status: "SUCCESS",
             },
           });
         }

         const newStatus = booking.status === "PENDING" ? "CONFIRMED" : booking.status;

         // Update Booking Record
         await tx.booking.update({
           where: { id: bookingId },
           data: {
             paymentType: "Full",
             balance: 0,
             status: newStatus,
           },
         });

         await tx.bookingHistory.create({
           data: {
             bookingId,
             action: "PAYMENT_COMPLETED",
             reason: reason || `Full payment of USD ${paidAmount} settled via admin panel`,
             previousStatus: booking.status,
             newStatus,
           },
         });
       });

       return NextResponse.json({
         success: true,
         message: "Booking marked as fully paid and confirmed",
       });
    }

    if (action === "installment_payment") {
       const installmentAmount = parseFloat(amount || 0);

       if (isNaN(installmentAmount) || installmentAmount <= 0) {
         return NextResponse.json(
           { error: "Please enter a valid installment amount greater than 0" },
           { status: 400 }
         );
       }

       if (installmentAmount > booking.balance) {
         return NextResponse.json(
           { error: `Payment amount (${installmentAmount}) cannot exceed the remaining balance (${booking.balance})` },
           { status: 400 }
         );
       }

       await prisma.$transaction(async (tx) => {
         const newBalance = Math.max(0, booking.balance - installmentAmount);
         const isFullyPaid = newBalance === 0;
         const newPaymentType = isFullyPaid ? "Full" : "Partial";
         const newStatus = isFullyPaid 
           ? (booking.status === "PENDING" ? "CONFIRMED" : booking.status)
           : booking.status;

         if (booking.payment) {
           await tx.payment.update({
             where: { id: booking.paymentId },
             data: {
               amount: { increment: installmentAmount },
               status: isFullyPaid ? "SUCCESS" : booking.payment.status,
             },
           });
         }

         await tx.booking.update({
           where: { id: bookingId },
           data: {
             balance: newBalance,
             paymentType: newPaymentType,
             status: newStatus,
           },
         });

         await tx.bookingHistory.create({
           data: {
             bookingId,
             action: "INSTALLMENT_PAID",
             reason: reason || `Installment payment of USD ${installmentAmount} recorded. Remaining balance: USD ${newBalance}`,
             previousStatus: booking.status,
             newStatus,
           },
         });
       });

       return NextResponse.json({
         success: true,
         message: `Installment payment of USD ${installmentAmount} recorded successfully`,
       });
    }

    if (action === "update_status") {
       const { newStatus } = body;
       const validStatuses = ["PENDING", "CONFIRMED", "PAID", "CANCELLED"];

       if (!validStatuses.includes(newStatus)) {
         return NextResponse.json(
           { error: `Invalid status. Must be one of: ${validStatuses.join(", ")}` },
           { status: 400 }
         );
       }

       await prisma.$transaction(async (tx) => {
         await tx.booking.update({
           where: { id: bookingId },
           data: { status: newStatus },
         });

         await tx.bookingHistory.create({
           data: {
             bookingId,
             action: "STATUS_CHANGED",
             previousStatus: booking.status,
             newStatus,
             reason: reason || `Status changed from ${booking.status} to ${newStatus} by admin`,
           },
         });
       });

       return NextResponse.json({
         success: true,
         message: `Booking status updated to ${newStatus}`,
       });
    }

    if (action === "reschedule") {
      const editCheck = await requirePermission(request, "bookings-edit", "write");
      if (!editCheck.authorized) {
        return NextResponse.json(
          { error: "Forbidden: You do not have permission to edit or reschedule bookings" },
          { status: 403 }
        );
      }

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
              "Day fully booked / No available seats for this date"
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
      const isPayLater = booking.paymentType === "Later";
      const paidAmount = Math.max(0, (booking.amount || 0) - (booking.balance || 0));
      const requestedRefund = parseFloat(refundAmount || 0);
      const effectiveRefund = isPayLater || paidAmount <= 0 ? 0 : Math.min(paidAmount, isNaN(requestedRefund) ? 0 : requestedRefund);

      await prisma.$transaction(async (tx) => {
        await tx.booking.update({
          where: { id: bookingId },
          data: { status: "CANCELLED" },
        });

        if (effectiveRefund > 0) {
          await tx.refund.create({
            data: {
              bookingId,
              amount: effectiveRefund,
              reason: reason || "Admin processed refund upon cancellation",
              status: "PENDING",
            },
          });
        }

        const cancelReason = isPayLater
          ? (reason ? `${reason} (Pay Later - Refund Amount: USD 0.00)` : "Pay Later reservation cancelled - Refund Amount: USD 0.00")
          : (reason || (effectiveRefund > 0 ? `Cancelled with refund of USD ${effectiveRefund.toFixed(2)}` : "Cancelled without refund"));

        await tx.bookingHistory.create({
          data: {
            bookingId,
            action: "CANCEL",
            previousStatus: booking.status,
            newStatus: "CANCELLED",
            reason: cancelReason,
          },
        });
      });

      return NextResponse.json({
        success: true,
        message: "Booking cancelled successfully",
        refundAmount: effectiveRefund,
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
