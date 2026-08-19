import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

// GET - Fetch a single discount rule
export async function GET(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const ruleId = parseInt(id, 10);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    const rule = await prisma.discountRule.findFirst({
      where: { id: ruleId, deletedAt: null },
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

    if (!rule) {
      return NextResponse.json(
        { error: "Discount rule not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      rule: {
        ...rule,
        sessionIds: JSON.parse(rule.sessionIds || "[]"),
      },
    });
  } catch (error) {
    console.error("Error fetching discount rule:", error);
    return NextResponse.json(
      { error: "Failed to fetch discount rule" },
      { status: 500 }
    );
  }
}

// PUT - Update a discount rule
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
    const {
      programId,
      name,
      description,
      sessionIds,
      discountType,
      discountValue,
      priority,
      isActive,
    } = body;

    // Check if rule exists
    const existingRule = await prisma.discountRule.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Discount rule not found" },
        { status: 404 }
      );
    }

    // Validation
    if (name !== undefined && name.trim() === "") {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (sessionIds !== undefined && (!Array.isArray(sessionIds) || sessionIds.length === 0)) {
      return NextResponse.json(
        { error: "At least one session must be selected" },
        { status: 400 }
      );
    }

    if (discountValue !== undefined && discountValue < 0) {
      return NextResponse.json(
        { error: "Discount value must be a positive number" },
        { status: 400 }
      );
    }

    const finalDiscountType = discountType || existingRule.discountType;
    const finalDiscountValue = discountValue !== undefined ? discountValue : existingRule.discountValue;

    if (finalDiscountType === "PERCENTAGE" && finalDiscountValue > 100) {
      return NextResponse.json(
        { error: "Percentage discount cannot exceed 100%" },
        { status: 400 }
      );
    }

    // If sessionIds are being updated, validate they belong to the program
    const finalProgramId = programId !== undefined ? parseInt(programId, 10) : existingRule.programId;

    if (sessionIds !== undefined) {
      const program = await prisma.program.findFirst({
        where: { id: finalProgramId, deletedAt: null },
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
    }

    // Check for duplicate rule with same session combination (excluding current rule)
    const finalIsActive = isActive !== undefined ? isActive : existingRule.isActive;
    const sortedNewIds = sessionIds
      ? [...sessionIds.map((id) => parseInt(id, 10))].sort((a, b) => a - b)
      : JSON.parse(existingRule.sessionIds || "[]");

    if (finalIsActive) {
      const existingRules = await prisma.discountRule.findMany({
        where: {
          id: { not: ruleId },
          programId: finalProgramId,
          deletedAt: null,
          isActive: true,
        },
      });

      const isDuplicate = existingRules.some((rule) => {
        const existingIds = JSON.parse(rule.sessionIds || "[]").sort((a, b) => a - b);
        return (
          existingIds.length === sortedNewIds.length &&
          existingIds.every((id, idx) => id === sortedNewIds[idx])
        );
      });

      if (isDuplicate) {
        return NextResponse.json(
          { error: "A discount rule with the same session combination already exists" },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData = {};
    if (programId !== undefined) updateData.programId = finalProgramId;
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (sessionIds !== undefined) updateData.sessionIds = JSON.stringify(sortedNewIds);
    if (discountType !== undefined) updateData.discountType = discountType;
    if (discountValue !== undefined) updateData.discountValue = discountValue;
    if (priority !== undefined) updateData.priority = parseInt(priority, 10) || 0;
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedRule = await prisma.discountRule.update({
      where: { id: ruleId },
      data: updateData,
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
        ...updatedRule,
        sessionIds: JSON.parse(updatedRule.sessionIds || "[]"),
      },
      message: "Discount rule updated successfully",
    });
  } catch (error) {
    console.error("Error updating discount rule:", error);
    return NextResponse.json(
      { error: "Failed to update discount rule" },
      { status: 500 }
    );
  }
}

// DELETE - Soft delete a discount rule
export async function DELETE(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const ruleId = parseInt(id, 10);

    if (isNaN(ruleId)) {
      return NextResponse.json({ error: "Invalid rule ID" }, { status: 400 });
    }

    // Check if rule exists
    const existingRule = await prisma.discountRule.findFirst({
      where: { id: ruleId, deletedAt: null },
    });

    if (!existingRule) {
      return NextResponse.json(
        { error: "Discount rule not found" },
        { status: 404 }
      );
    }

    // Soft delete
    await prisma.discountRule.update({
      where: { id: ruleId },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Discount rule deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting discount rule:", error);
    return NextResponse.json(
      { error: "Failed to delete discount rule" },
      { status: 500 }
    );
  }
}
