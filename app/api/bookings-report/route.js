import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

const API_KEY = process.env.BOOKINGS_REPORT_API_KEY;

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}

function isAuthorized(request) {
  if (!API_KEY) {
    console.error("BOOKINGS_REPORT_API_KEY is not configured");
    return false;
  }

  const authHeader = request.headers.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");

  return scheme === "Bearer" && token === API_KEY;
}

export async function GET(request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
      },
      select: {
        id: true,
        leaderId: true,
        paymentType: true,
        amount: true,
        balance: true,
        paymentId: true,
        status: true,
        createdAt: true,
        payment: {
          select: {
            amount: true,
            orderId: true,
          },
        },
        leader: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Transform the response to flatten the payment fields
    const formattedBookings = bookings.map((booking) => ({
      id: booking.id,
      leaderId: booking.leaderId,
      type: booking.paymentType,
      amount: booking.amount,
      balance: booking.balance,
      payment_id: booking.paymentId,
      status: booking.status,
      createdAt: booking.createdAt,
      payment_amount: booking.payment?.amount || null,
      order_id: booking.payment?.orderId || null,
      leader: booking.leader,
    }));

    return NextResponse.json({
      success: true,
      count: formattedBookings.length,
      bookings: formattedBookings,
    });
  } catch (error) {
    console.error("Error fetching bookings report:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch bookings report" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  if (!isAuthorized(request)) {
    return unauthorizedResponse();
  }

  try {
    const body = await request.json();
    const { order_id, status } = body;

    if (!order_id) {
      return NextResponse.json(
        { success: false, error: "order_id is required" },
        { status: 400 }
      );
    }

    // Find the payment by order_id
    const payment = await prisma.payment.findUnique({
      where: { orderId: order_id },
    });

    if (!payment) {
      return NextResponse.json(
        { success: false, error: "Payment not found for the given order_id" },
        { status: 404 }
      );
    }

    // Find the booking associated with this payment
    const booking = await prisma.booking.findFirst({
      where: { paymentId: payment.id, deletedAt: null },
    });

    if (!booking) {
      return NextResponse.json(
        { success: false, error: "Booking not found for this payment" },
        { status: 404 }
      );
    }

    // Check if payment is successful
    if (status !== "TRUE") {
      return NextResponse.json({
        success: false,
        error: "Payment status is not successful",
        status: status,
      });
    }

    // Store the current balance before updating
    const previousBalance = booking.balance;

    if (previousBalance <= 0) {
      return NextResponse.json({
        success: false,
        error: "No balance to settle. Booking already fully paid.",
      });
    }

    // Generate a new order_id for the POS payment
    const posOrderId = `POS-${order_id}-${Date.now().toString(36).toUpperCase()}`;

    // Transaction: Update booking and create POS payment
    const result = await prisma.$transaction(async (tx) => {
      // Update booking: set paymentType to Full and balance to 0
      const updatedBooking = await tx.booking.update({
        where: { id: booking.id },
        data: {
          paymentType: "Full",
          balance: 0,
        },
      });

      // Create a new payment record for the balance amount (POS payment)
      const posPayment = await tx.payment.create({
        data: {
          provider: "MANUAL",
          status: "SUCCESS",
          amount: previousBalance,
          currency: payment.currency || "USD",
          method: "POS Payment",
          orderId: posOrderId,
          transactionId: `POS-TXN-${Date.now()}`,
        },
      });

      return { updatedBooking, posPayment };
    });

    return NextResponse.json({
      success: true,
      message: "Payment completed successfully. Booking is now fully paid.",
      booking: {
        id: result.updatedBooking.id,
        paymentType: result.updatedBooking.paymentType,
        amount: result.updatedBooking.amount,
        balance: result.updatedBooking.balance,
        previousBalance: previousBalance,
      },
      posPayment: {
        id: result.posPayment.id,
        order_id: result.posPayment.orderId,
        amount: result.posPayment.amount,
        currency: result.posPayment.currency,
        method: result.posPayment.method,
        status: result.posPayment.status,
        createdAt: result.posPayment.createdAt,
      },
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { success: false, error: "Failed to process payment" },
      { status: 500 }
    );
  }
}
