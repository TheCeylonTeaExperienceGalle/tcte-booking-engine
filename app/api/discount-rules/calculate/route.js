import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST - Calculate discount based on selected sessions
export async function POST(request) {
  try {
    const body = await request.json();
    const { programId, sessionIds, sessionTypeSelections } = body;

    // Validation
    if (!programId) {
      return NextResponse.json(
        { error: "Program ID is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json({
        originalTotal: 0,
        discountAmount: 0,
        finalTotal: 0,
        appliedRule: null,
        message: "No sessions selected",
      });
    }

    // Parse session IDs to integers
    const parsedSessionIds = sessionIds.map((id) => parseInt(id, 10)).filter((id) => !isNaN(id));

    // Fetch sessions with their types
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

    // Calculate original total based on session prices or session type prices
    let originalTotal = 0;
    const priceBreakdown = [];

    for (const session of sessions) {
      let sessionPrice = session.specialPrice ?? session.price ?? 0;
      let priceSource = "session";
      let selectedTypeName = null;

      // Check if a session type is selected for this session
      const selectedTypeId = sessionTypeSelections?.[session.id];

      if (selectedTypeId) {
        const sessionType = session.sessionTypes.find(
          (st) => st.id === parseInt(selectedTypeId, 10)
        );
        if (sessionType) {
          sessionPrice += sessionType.specialPrice ?? sessionType.price ?? 0;
          priceSource = "session + sessionType";
          selectedTypeName = sessionType.name;
        }
      }

      originalTotal += sessionPrice;
      priceBreakdown.push({
        sessionId: session.id,
        sessionName: session.name,
        sessionTypeId: selectedTypeId ? parseInt(selectedTypeId, 10) : null,
        sessionTypeName: selectedTypeName,
        price: sessionPrice,
        priceSource,
      });
    }

    // Fetch discount rules for this program
    const discountRules = await prisma.discountRule.findMany({
      where: {
        programId: parseInt(programId, 10),
        isActive: true,
        deletedAt: null,
      },
      orderBy: { priority: "desc" },
    });

    // Find the best matching discount rule
    let appliedRule = null;
    let discountAmount = 0;

    const sortedSelectedIds = [...parsedSessionIds].sort((a, b) => a - b);

    for (const rule of discountRules) {
      const ruleSessionIds = JSON.parse(rule.sessionIds || "[]").sort((a, b) => a - b);

      // Check if selected sessions exactly match the rule's session combination
      const isExactMatch =
        ruleSessionIds.length === sortedSelectedIds.length &&
        ruleSessionIds.every((id, idx) => id === sortedSelectedIds[idx]);

      if (isExactMatch) {
        // Calculate discount amount
        if (rule.discountType === "PERCENTAGE") {
          discountAmount = (originalTotal * rule.discountValue) / 100;
        } else {
          // FIXED_AMOUNT - Treat as the final discounted price (target price)
          // Discount = Base Price - Final Price
          discountAmount = Math.max(0, originalTotal - rule.discountValue);
        }

        appliedRule = {
          id: rule.id,
          name: rule.name,
          description: rule.description,
          discountType: rule.discountType,
          discountValue: rule.discountValue,
          sessionIds: ruleSessionIds,
        };
        break; // Use the first matching rule (highest priority)
      }
    }

    // Subtract the discount amount from the original total
    const finalTotal = Math.max(0, originalTotal - discountAmount);

    return NextResponse.json({
      originalTotal,
      discountAmount,
      finalTotal,
      appliedRule,
      priceBreakdown,
      message: appliedRule
        ? `Rule "${appliedRule.name}" applied`
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
