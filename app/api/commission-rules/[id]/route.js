import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

// GET - Fetch a single commission rule
export async function GET(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const ruleId = parseInt(id, 10);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const rule = await prisma.commissionRule.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!rule) {
      return NextResponse.json(
        { error: "Commission rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error fetching commission rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch commission rule" },
      { status: 500 }
    );
  }
}

// PUT - Update a commission rule
export async function PUT(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const ruleId = parseInt(id, 10);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const body = await request.json();
    const { minSeats, maxSeats, commissionRate, isActive } = body;

    // Check if rule exists
    const existingRule = await prisma.commissionRule.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Commission rule not found" },
        { status: 404 }
      );
    }

    // Validation
    if (minSeats !== undefined && minSeats < 1) {
      return NextResponse.json(
        { error: "Minimum seats must be at least 1" },
        { status: 400 }
      );
    }

    const finalMinSeats = minSeats !== undefined ? minSeats : existingRule.minSeats;
    const finalMaxSeats = maxSeats !== undefined ? maxSeats : existingRule.maxSeats;

    if (finalMaxSeats !== null && finalMaxSeats < finalMinSeats) {
      return NextResponse.json(
        { error: "Maximum seats must be greater than or equal to minimum seats" },
        { status: 400 }
      );
    }

    if (commissionRate !== undefined && (commissionRate < 0 || commissionRate > 100)) {
      return NextResponse.json(
        { error: "Commission rate must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Check for overlapping rules (excluding current rule)
    const finalIsActive = isActive !== undefined ? isActive : existingRule.isActive;

    if (finalIsActive) {
      const overlappingRule = await prisma.commissionRule.findFirst({
        where: {
          id: { not: ruleId },
          deletedAt: null,
          isActive: true,
          OR: [
            {
              AND: [
                { minSeats: { lte: finalMinSeats } },
                {
                  OR: [
                    { maxSeats: { gte: finalMinSeats } },
                    { maxSeats: null },
                  ],
                },
              ],
            },
            {
              AND: [
                { minSeats: { lte: finalMaxSeats || 999999 } },
                { minSeats: { gte: finalMinSeats } },
              ],
            },
          ],
        },
      });

      if (overlappingRule) {
        return NextResponse.json(
          { error: "This seat range overlaps with an existing active rule" },
          { status: 400 }
        );
      }
    }

    const updateData = {};
    if (minSeats !== undefined) updateData.minSeats = minSeats;
    if (maxSeats !== undefined) updateData.maxSeats = maxSeats;
    if (commissionRate !== undefined) updateData.commissionRate = commissionRate;
    if (isActive !== undefined) updateData.isActive = isActive;

    const rule = await prisma.commissionRule.update({
      where: { id: ruleId },
      data: updateData,
    });

    return NextResponse.json({ rule });
  } catch (error) {
    console.error("Error updating commission rule:", error);
    return NextResponse.json(
      { error: "Failed to update commission rule" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a commission rule
export async function DELETE(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const ruleId = parseInt(id, 10);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const existingRule = await prisma.commissionRule.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Commission rule not found" },
        { status: 404 }
      );
    }

    await prisma.commissionRule.update({
      where: { id: ruleId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Commission rule deleted successfully" });
  } catch (error) {
    console.error("Error deleting commission rule:", error);
    return NextResponse.json(
      { error: "Failed to delete commission rule" },
      { status: 500 }
    );
  }
}
