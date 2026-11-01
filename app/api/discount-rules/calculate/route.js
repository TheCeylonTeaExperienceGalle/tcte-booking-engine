import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

// POST - Calculate discount based on selected sessions
export async function POST(request) {
  try {
    const body = await request.json();
    const { programId, programIds, sessionIds, sessionTypeSelections } = body;

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
    const parsedSessionIds = sessionIds
      .map((id) => parseInt(id, 10))
      .filter((id) => !isNaN(id));

    // Fetch sessions across all selected programs
    const sessions = await prisma.session.findMany({
      where: {
        id: { in: parsedSessionIds },
        deletedAt: null,
      },
      include: {
        sessionTypes: {
          where: { deletedAt: null },
        },
        program: {
          select: { id: true, title: true },
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

    // Resolve all program IDs represented by the selected sessions or explicitly provided
    const targetProgramIds = new Set(sessions.map((s) => s.programId));
    if (programId) targetProgramIds.add(parseInt(programId, 10));
    if (Array.isArray(programIds)) {
      programIds.forEach((pid) => targetProgramIds.add(parseInt(pid, 10)));
    }

    // Fetch discount rules across all relevant programs
    const discountRules = await prisma.discountRule.findMany({
      where: {
        programId: { in: Array.from(targetProgramIds) },
        isActive: true,
        deletedAt: null,
      },
      orderBy: { priority: "desc" },
    });

    // Group sessions by programId
    const programSessionsMap = new Map();
    for (const session of sessions) {
      const pId = session.programId;
      if (!programSessionsMap.has(pId)) {
        programSessionsMap.set(pId, []);
      }
      programSessionsMap.get(pId).push(session);
    }

    let totalDiscountAmount = 0;
    const appliedRules = [];

    for (const [pId, progSessions] of programSessionsMap.entries()) {
      const progSessionIds = progSessions.map((s) => s.id);
      const programRules = discountRules.filter((r) => r.programId === pId);

      const matchingRules = [];
      for (const rule of programRules) {
        let ruleSessionIds = [];
        try {
          ruleSessionIds = (
            typeof rule.sessionIds === "string"
              ? JSON.parse(rule.sessionIds || "[]")
              : rule.sessionIds || []
          )
            .map((id) => parseInt(id, 10))
            .filter((id) => !isNaN(id));
        } catch {
          ruleSessionIds = [];
        }

        if (
          ruleSessionIds.length > 0 &&
          ruleSessionIds.every((id) => progSessionIds.includes(id))
        ) {
          matchingRules.push({
            rule,
            sessionIds: ruleSessionIds,
            requiredSessionCount: ruleSessionIds.length,
            discountValue: rule.discountValue,
            priority: rule.priority || 0,
          });
        }
      }

      // Sort: priority DESC, requiredSessionCount DESC (more specific combos like Combo II beat Combo I), discountValue DESC
      matchingRules.sort((a, b) => {
        if (b.priority !== a.priority) return b.priority - a.priority;
        if (b.requiredSessionCount !== a.requiredSessionCount)
          return b.requiredSessionCount - a.requiredSessionCount;
        return b.discountValue - a.discountValue;
      });

      if (matchingRules.length > 0) {
        const best = matchingRules[0];
        let progOriginalTotal = 0;
        for (const s of progSessions) {
          let sPrice = s.specialPrice ?? s.price ?? 0;
          const sTypeId = sessionTypeSelections?.[s.id];
          if (sTypeId) {
            const st = s.sessionTypes.find((t) => t.id === parseInt(sTypeId, 10));
            if (st) sPrice += st.specialPrice ?? st.price ?? 0;
          }
          progOriginalTotal += sPrice;
        }

        let ruleDiscount = 0;
        if (best.rule.discountType === "PERCENTAGE") {
          ruleDiscount = (progOriginalTotal * best.rule.discountValue) / 100;
        } else if (best.rule.discountType === "FIXED_AMOUNT") {
          ruleDiscount = Math.min(best.rule.discountValue, progOriginalTotal);
        }

        totalDiscountAmount += ruleDiscount;
        appliedRules.push({
          id: best.rule.id,
          name: best.rule.name,
          description: best.rule.description,
          discountType: best.rule.discountType,
          discountValue: best.rule.discountValue,
          calculatedDiscount: ruleDiscount,
          sessionIds: best.sessionIds,
          programId: pId,
          programTitle: progSessions[0]?.program?.title || "",
        });
      }
    }

    const primaryAppliedRule = appliedRules[0] || null;
    const combinedRuleName = appliedRules.map((r) => r.name).join(" + ");
    const finalTotal = Math.max(0, originalTotal - totalDiscountAmount);

    return NextResponse.json({
      originalTotal,
      discountAmount: totalDiscountAmount,
      finalTotal,
      appliedRule: primaryAppliedRule
        ? {
            ...primaryAppliedRule,
            name: combinedRuleName,
            discountValue: totalDiscountAmount,
          }
        : null,
      appliedRules,
      priceBreakdown,
      message:
        appliedRules.length > 0
          ? `Rule "${combinedRuleName}" applied`
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
