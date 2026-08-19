import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

function parseId(rawId) {
  const id = Number.parseInt(rawId, 10);
  return Number.isNaN(id) ? null : id;
}

// GET /api/session-types/[id] - Get a single session type
export async function GET(request, context) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid session type id" },
        { status: 400 }
      );
    }

    const sessionType = await prisma.sessionType.findFirst({
      where: {
        id,
        deletedAt: null,
        session: {
          deletedAt: null,
          program: {
            deletedAt: null,
            location: { deletedAt: null },
          },
        },
      },
      include: {
        session: {
          include: {
            program: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    });

    if (!sessionType) {
      return NextResponse.json(
        { error: "Session type not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ sessionType });
  } catch (error) {
    console.error("Get session type error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session type" },
      { status: 500 }
    );
  }
}

// PUT /api/session-types/[id] - Update a session type
export async function PUT(request, context) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid session type id" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const { name, price, specialPrice, sessionId } = body;

    // Check if session type exists
    const existingSessionType = await prisma.sessionType.findUnique({
      where: { id },
    });

    if (!existingSessionType) {
      return NextResponse.json(
        { error: "Session type not found" },
        { status: 404 }
      );
    }

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (price !== undefined) {
      const parsedPrice = Number.parseFloat(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: "Price must be a positive number" },
          { status: 400 }
        );
      }
      updateData.price = parsedPrice;
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

    if (sessionId !== undefined) {
      // Verify session exists
      const parsedSessionId = Number.parseInt(sessionId, 10);
      if (Number.isNaN(parsedSessionId)) {
        return NextResponse.json(
          { error: "Invalid session id" },
          { status: 400 }
        );
      }

      const session = await prisma.session.findUnique({
        where: { id: parsedSessionId },
      });
      if (!session) {
        return NextResponse.json(
          { error: "Session not found" },
          { status: 404 }
        );
      }
      updateData.sessionId = parsedSessionId;
    }

    const sessionType = await prisma.sessionType.update({
      where: { id },
      data: updateData,
      include: {
        session: {
          include: {
            program: {
              include: {
                location: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ sessionType });
  } catch (error) {
    console.error("Update session type error:", error);
    return NextResponse.json(
      { error: "Failed to update session type" },
      { status: 500 }
    );
  }
}

// DELETE /api/session-types/[id] - Soft delete a session type
export async function DELETE(request, context) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid session type id" },
        { status: 400 }
      );
    }

    const sessionType = await prisma.sessionType.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Session type deleted successfully",
      sessionType,
    });
  } catch (error) {
    console.error("Delete session type error:", error);
    return NextResponse.json(
      { error: "Failed to delete session type" },
      { status: 500 }
    );
  }
}
