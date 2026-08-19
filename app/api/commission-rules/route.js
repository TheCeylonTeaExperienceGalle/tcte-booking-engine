import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

// GET - Fetch all commission rules
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = {
      deletedAt: null,
    };

    if (activeOnly) {
      where.isActive = true;
    }

    const rules = await prisma.commissionRule.findMany({
      where,
      orderBy: { minSeats: "asc" },
    });

    return NextResponse.json({ rules });
  } catch (error) {
    console.error("Error fetching commission rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch commission rules" },
      { status: 500 }
    );
  }
}

// POST - Create a new commission rule
export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const body = await request.json();
    const { minSeats, maxSeats, commissionRate, isActive = true } = body;

    // Validation
    if (minSeats === undefined || minSeats === null || minSeats < 1) {
      return NextResponse.json(
        { error: "Minimum seats must be at least 1" },
        { status: 400 }
      );
    }

    if (maxSeats !== null && maxSeats !== undefined && maxSeats < minSeats) {
      return NextResponse.json(
        { error: "Maximum seats must be greater than or equal to minimum seats" },
        { status: 400 }
      );
    }

    if (commissionRate === undefined || commissionRate === null || commissionRate < 0 || commissionRate > 100) {
      return NextResponse.json(
        { error: "Commission rate must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Check for overlapping rules
    const overlappingRule = await prisma.commissionRule.findFirst({
      where: {
        deletedAt: null,
        isActive: true,
        OR: [
          // New rule's range overlaps with existing rule
          {
            AND: [
              { minSeats: { lte: minSeats } },
              {
                OR: [
                  { maxSeats: { gte: minSeats } },
                  { maxSeats: null },
                ],
              },
            ],
          },
          {
            AND: [
              { minSeats: { lte: maxSeats || 999999 } },
              { minSeats: { gte: minSeats } },
            ],
          },
        ],
      },
    });

    if (overlappingRule && isActive) {
      return NextResponse.json(
        { error: "This seat range overlaps with an existing active rule" },
        { status: 400 }
      );
    }

    const rule = await prisma.commissionRule.create({
      data: {
        minSeats,
        maxSeats: maxSeats || null,
        commissionRate,
        isActive,
      },
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error creating commission rule:", error);
    return NextResponse.json(
      { error: "Failed to create commission rule" },
      { status: 500 }
    );
  }
}
