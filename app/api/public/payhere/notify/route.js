import { NextResponse } from "next/server";
import { createHash } from "crypto";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function md5Upper(value) {
  return createHash("md5").update(String(value)).digest("hex").toUpperCase();
}

function parseNumber(value) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
}

function resolveStatus(statusCode) {
  switch (statusCode) {
    case 2:
      return "SUCCESS";
    case 0:
      return "PENDING";
    case -1:
      return "CANCELED";
    case -2:
    case -3:
    default:
      return "FAILED";
  }
}

export async function POST(request) {
  try {
    const formData = await request.formData();
    const payload = Object.fromEntries(formData.entries());

    const merchantId = payload.merchant_id;
    const orderId = payload.order_id;
    const payhereAmount = payload.payhere_amount;
    const payhereCurrency = payload.payhere_currency;
    const statusCodeRaw = payload.status_code;
    const md5sig = payload.md5sig;

    if (!orderId || !md5sig || !statusCodeRaw) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const statusCode = parseInt(statusCodeRaw, 10);
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET;

    if (!merchantSecret) {
      console.error("PayHere notify missing merchant secret env");
      return NextResponse.json({ received: false }, { status: 500 });
    }

    const localMd5 = md5Upper(
      `${merchantId}${orderId}${payhereAmount}${payhereCurrency}${statusCode}${md5Upper(merchantSecret)}`
    );

    if (localMd5 !== md5sig) {
      console.warn("PayHere signature mismatch", { orderId });
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        provider: "PAYHERE",
      },
      select: {
        id: true,
        method: true,
        metadata: true,
        payhereStatusMsg: true,
        bookings: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!payment) {
      console.warn("PayHere payment not found for order", { orderId });
      return NextResponse.json({ received: true });
    }

    const nextStatus = resolveStatus(statusCode);

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: nextStatus,
        payherePaymentId: payload.payment_id || null,
        payhereStatusCode: parseNumber(statusCodeRaw),
        payhereMd5Sig: md5sig,
        method: payload.method || payment.method,
        payhereStatusMsg: payload.status_message || payment.payhereStatusMsg,
        metadata: {
          ...(payment.metadata ?? {}),
          notification: {
            receivedAt: new Date().toISOString(),
            payload,
          },
        },
      },
    });

    if (payment.bookings.length > 0) {
      const bookingId = payment.bookings[0].id;
      const bookingStatus = nextStatus === "SUCCESS" ? "CONFIRMED" : nextStatus === "PENDING" ? "PENDING" : "CANCELLED";

      await prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: bookingStatus,
          updatedAt: new Date(),
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayHere notify handler error", error);
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
