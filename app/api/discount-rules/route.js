import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

// GET - Fetch all discount rules
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const activeOnly = searchParams.get("active") === "true";

    const where = {
      deletedAt: null,
    };

    if (programId) {
      where.programId = parseInt(programId, 10);
    }

    if (activeOnly) {
      where.isActive = true;
    }

    const rules = await prisma.discountRule.findMany({
      where,
      include: {
        program: {
          include: {
            sessions: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: [{ programId: "asc" }, { priority: "desc" }],
    });

    // Parse sessionIds JSON for each rule
    const parsedRules = rules.map((rule) => ({
      ...rule,
      sessionIds: JSON.parse(rule.sessionIds || "[]"),
    }));

    return NextResponse.json({ rules: parsedRules });
  } catch (error) {
    console.error("Error fetching discount rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount rules" },
      { status: 500 }
    );
  }
}

// POST - Create a new discount rule
export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const body = await request.json();
    const {
      programId,
      name,
      description,
      sessionIds,
      discountType = "PERCENTAGE",
      discountValue,
      priority = 0,
      isActive = true,
    } = body;

    // Validation
    if (!programId) {
      return NextResponse.json(
        { error: "Program is required" },
        { status: 400 }
      );
    }

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!Array.isArray(sessionIds) || sessionIds.length === 0) {
      return NextResponse.json(
        { error: "At least one session must be selected" },
        { status: 400 }
      );
    }

    if (discountValue === undefined || discountValue === null || discountValue < 0) {
      return NextResponse.json(
        { error: "Discount value must be a positive number" },
        { status: 400 }
      );
    }

    if (discountType === "PERCENTAGE" && discountValue > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    // Check if program exists
    const program = await prisma.program.findFirst({
      where: { id: parseInt(programId, 10), deletedAt: null },
      include: {
        sessions: { where: { deletedAt: null } },
      },
    });

    if (!program) {
      return NextResponse.json(
        { error: "Program not found" },
        { status: 404 }
      );
    }

    // Validate that all sessionIds belong to the program
    const programSessionIds = program.sessions.map((s) => s.id);
    const invalidSessionIds = sessionIds.filter(
      (id) => !programSessionIds.includes(parseInt(id, 10))
    );

    if (invalidSessionIds.length > 0) {
      return NextResponse.json(
        { error: "Some sessions do not belong to the selected program" },
        { status: 400 }
      );
    }

    // Check for duplicate rule with same session combination
    const existingRules = await prisma.discountRule.findMany({
      where: {
        programId: parseInt(programId, 10),
        deletedAt: null,
        isActive: true,
      },
    });

    const sortedNewIds = [...sessionIds.map((id) => parseInt(id, 10))].sort((a, b) => a - b);
    const isDuplicate = existingRules.some((rule) => {
      const existingIds = JSON.parse(rule.sessionIds || "[]").sort((a, b) => a - b);
      return (
        existingIds.length === sortedNewIds.length &&
        existingIds.every((id, idx) => id === sortedNewIds[idx])
      );
    });

    if (isDuplicate && isActive) {
      return NextResponse.json(
        { error: "A discount rule with the same session combination already exists" },
        { status: 400 }
      );
    }

    const rule = await prisma.discountRule.create({
      data: {
        programId: parseInt(programId, 10),
        name: name.trim(),
        description: description?.trim() || null,
        sessionIds: JSON.stringify(sortedNewIds),
        discountType,
        discountValue,
        priority: parseInt(priority, 10) || 0,
        isActive,
      },
      include: {
        program: {
          include: {
            sessions: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
    });

    return NextResponse.json({
      rule: {
        ...rule,
        sessionIds: sortedNewIds,
      },
      message: "Discount rule created successfully",
    });
  } catch (error) {
    console.error("Error creating discount rule:", error);
    return NextResponse.json(
      { error: "Failed to create discount rule" },
      { status: 500 }
    );
  }
}
