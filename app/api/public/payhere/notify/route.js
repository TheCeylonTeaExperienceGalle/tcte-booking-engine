import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  amountsMatch,
  bookingStatusFromPaymentStatus,
  canTransitionPaymentStatus,
  computePayHereSignature,
  currenciesMatch,
  merchantsMatch,
  resolvePayHerePaymentStatus,
  sanitizeNotifyMetadata,
  signaturesMatch,
} from "@/lib/security/payhere";

export const dynamic = "force-dynamic";

function parseNumber(value) {
  const numeric = Number(value);
  return Number.isNaN(numeric) ? null : numeric;
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
    const configuredMerchantId = process.env.PAYHERE_MERCHANT_ID;

    if (!merchantSecret || !configuredMerchantId) {
      console.error("PayHere notify missing merchant configuration");
      return NextResponse.json({ received: false }, { status: 500 });
    }

    if (!merchantsMatch(merchantId, configuredMerchantId)) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const localMd5 = computePayHereSignature({
      merchantId,
      orderId,
      amount: payhereAmount,
      currency: payhereCurrency,
      statusCode,
      merchantSecret,
    });

    if (!signaturesMatch(localMd5, md5sig)) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        orderId,
        provider: "PAYHERE",
      },
      select: {
        id: true,
        status: true,
        amount: true,
        currency: true,
        method: true,
        metadata: true,
        payhereStatusMsg: true,
        bookings: {
          select: {
            id: true,
            status: true,
          },
        },
      },
    });

    if (!payment) {
      return NextResponse.json({ received: true });
    }

    if (!amountsMatch(payhereAmount, payment.amount)) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    if (!currenciesMatch(payhereCurrency, payment.currency)) {
      return NextResponse.json({ received: false }, { status: 400 });
    }

    const nextStatus = resolvePayHerePaymentStatus(statusCode);

    if (!canTransitionPaymentStatus(payment.status, nextStatus)) {
      return NextResponse.json({ received: true });
    }

    const bookingStatus = bookingStatusFromPaymentStatus(nextStatus);

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: nextStatus,
          payherePaymentId: payload.payment_id || null,
          payhereStatusCode: parseNumber(statusCodeRaw),
          payhereMd5Sig: md5sig,
          method: payload.method || payment.method,
          payhereStatusMsg: payload.status_message || payment.payhereStatusMsg,
          metadata: sanitizeNotifyMetadata(payment.metadata, payload),
        },
      });

      if (payment.bookings.length > 0) {
        await tx.booking.update({
          where: { id: payment.bookings[0].id },
          data: {
            status: bookingStatus,
            updatedAt: new Date(),
          },
        });
      }
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayHere notify handler error");
    return NextResponse.json({ received: false }, { status: 500 });
  }
}
