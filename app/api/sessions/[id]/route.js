import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

function parseTimeValue(value) {
  if (!value) return null;

  const directDate = new Date(value);
  if (!Number.isNaN(directDate.getTime())) {
    return directDate;
  }

  const timeMatch = value.trim().match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);

  if (timeMatch) {
    const [, hours, minutes, seconds] = timeMatch;
    const parsedHours = Number.parseInt(hours, 10);
    const parsedMinutes = Number.parseInt(minutes || "0", 10);
    const parsedSeconds = Number.parseInt(seconds || "0", 10);

    if (
      Number.isNaN(parsedHours) ||
      Number.isNaN(parsedMinutes) ||
      Number.isNaN(parsedSeconds)
    ) {
      return null;
    }

    return new Date(
      Date.UTC(1970, 0, 1, parsedHours, parsedMinutes, parsedSeconds)
    );
  }

  return null;
}

function parseId(rawId) {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? null : id;
}

// GET /api/sessions/[id] - Get a single session
export async function GET(request, context) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 }
      );
    }

    const session = await prisma.session.findFirst({
      where: {
        id,
        deletedAt: null,
        program: {
          deletedAt: null,
          location: { deletedAt: null },
        },
      },
      include: {
        program: {
          include: {
            location: true,
          },
        },
        sessionTypes: {
          where: { deletedAt: null },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Get session error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session" },
      { status: 500 }
    );
  }
}

// PUT /api/sessions/[id] - Update a session
export async function PUT(request, context) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { name, startTime, endTime, price, specialPrice, programId } = body;

    // Check if session exists
    const existingSession = await prisma.session.findUnique({
      where: { id },
    });

    if (!existingSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (startTime !== undefined) {
      const parsedStart = parseTimeValue(startTime);
      if (!parsedStart) {
        return NextResponse.json(
          { error: "Invalid start time format" },
          { status: 400 }
        );
      }
      updateData.startTime = parsedStart;
    }

    if (endTime !== undefined) {
      const parsedEnd = parseTimeValue(endTime);
      if (!parsedEnd) {
        return NextResponse.json(
          { error: "Invalid end time format" },
          { status: 400 }
        );
      }
      updateData.endTime = parsedEnd;
    }
    if (price !== undefined) {
      if (price === "" || price === null) {
        updateData.price = null;
      } else {
        const parsedPrice = Number.parseFloat(price);
        if (Number.isNaN(parsedPrice)) {
          return NextResponse.json({ error: "Invalid price" }, { status: 400 });
        }
        updateData.price = parsedPrice;
      }
    }

    if (specialPrice !== undefined) {
      if (specialPrice === "" || specialPrice === null) {
        updateData.specialPrice = null;
      } else {
        const parsedSpecialPrice = Number.parseFloat(specialPrice);
        if (Number.isNaN(parsedSpecialPrice)) {
          return NextResponse.json({ error: "Invalid special price" }, { status: 400 });
        }
        updateData.specialPrice = parsedSpecialPrice;
      }
    }

    if (programId !== undefined) {
      // Verify program exists
      const parsedProgramId = Number.parseInt(programId, 10);
      if (Number.isNaN(parsedProgramId)) {
        return NextResponse.json(
          { error: "Invalid program id" },
          { status: 400 }
        );
      }

      const program = await prisma.program.findUnique({
        where: { id: parsedProgramId },
      });
      if (!program) {
        return NextResponse.json(
          { error: "Program not found" },
          { status: 404 }
        );
      }
      updateData.programId = parsedProgramId;
    }

    const session = await prisma.session.update({
      where: { id },
      data: updateData,
      include: {
        program: {
          include: {
            location: true,
          },
        },
      },
    });

    return NextResponse.json({ session });
  } catch (error) {
    console.error("Update session error:", error);
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

// DELETE /api/sessions/[id] - Soft delete a session
export async function DELETE(request, context) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid session id" },
        { status: 400 }
      );
    }

    const session = await prisma.session.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Session deleted successfully",
      session,
    });
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}
