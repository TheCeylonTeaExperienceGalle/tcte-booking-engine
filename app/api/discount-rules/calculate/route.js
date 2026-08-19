import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  calculateBookingPricing,
  PricingError,
  selectionsFromQuotePayload,
} from "@/lib/pricing/booking-pricing";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    const body = await request.json();
    const { programId, sessionIds, sessionTypeSelections, selections } = body;

    if (!programId) {
      return NextResponse.json(
        { error: "Program ID is required" },
        { status: 400 }
      );
    }

    const quoteSelections = selectionsFromQuotePayload({
      sessionIds,
      sessionTypeSelections,
      selections,
    });

    if (quoteSelections.length === 0) {
      return NextResponse.json({
        originalTotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        appliedRule: null,
        message: "No sessions selected",
      });
    }

    const parsedSessionIds = [
      ...new Set(quoteSelections.map((selection) => selection.sessionId)),
    ];

    const sessions = await prisma.session.findMany({
      where: {
        id: { in: parsedSessionIds },
        programId: parseInt(programId, 10),
        deletedAt: null,
      },
      include: {
        sessionTypes: {
          where: { deletedAt: null },
        },
      },
    });

    if (sessions.length === 0) {
      return NextResponse.json({
        originalTotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        appliedRule: null,
        message: "No valid sessions found",
      });
    }

    const sessionMap = new Map(sessions.map((session) => [session.id, session]));

    const discountRules = await prisma.discountRule.findMany({
      where: {
        programId: parseInt(programId, 10),
        isActive: true,
        deletedAt: null,
      },
      orderBy: { priority: "desc" },
    });

    let pricing;
    try {
      pricing = calculateBookingPricing({
        selections: quoteSelections,
        sessionMap,
        discountRules,
        paymentType: "Full",
        provider: "MANUAL",
      });
    } catch (pricingError) {
      const status =
        pricingError instanceof PricingError ? pricingError.status : 400;
      return NextResponse.json(
        { error: pricingError.message },
        { status }
      );
    }

    const priceBreakdown = pricing.lineItems.map((item) => {
      const session = sessionMap.get(item.sessionId);
      const sessionType = item.sessionTypeId
        ? (session?.sessionTypes || []).find(
            (type) => type.id === item.sessionTypeId
          )
        : null;
      return {
        sessionId: item.sessionId,
        sessionName: session?.name,
        sessionTypeId: item.sessionTypeId,
        sessionTypeName: sessionType?.name ?? null,
        price: item.unitPrice,
        seatsRequested: item.seatsRequested,
        lineGross: item.lineGross,
        priceSource: item.addOnPrice
          ? "session + sessionType"
          : "session",
      };
    });

    return NextResponse.json({
      originalTotal: pricing.grossSubtotal,
      discountAmount: pricing.discountAmount,
      finalTotal: pricing.fullTotal,
      appliedRule: pricing.appliedRule,
      priceBreakdown,
      message: pricing.appliedRule
        ? `Rule "${pricing.appliedRule.name}" applied`
        : "No discounts available for this session combination",
    });
  } catch (error) {
    console.error("Error calculating discount:", error);
    return NextResponse.json(
      { error: "Failed to calculate discount" },
      { status: 500 }
    );
  }
}
