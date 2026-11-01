import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

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

// GET /api/programs/[id] - Get a single program
export async function GET(request, context) {
  try {
    const authCheck = await requirePermission(request, "programs", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid program id" },
        { status: 400 }
      );
    }

    const program = await prisma.program.findFirst({
      where: {
        id,
        deletedAt: null,
        location: { deletedAt: null },
      },
      include: {
        location: true,
        sessions: {
          where: { deletedAt: null },
          include: {
            _count: {
              select: { sessionTypes: true },
            },
            sessionTypes: {
              where: { deletedAt: null },
              orderBy: {
                createdAt: "asc",
              },
            },
          },
          orderBy: {
            createdAt: "asc",
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Get program error:", error);
    return NextResponse.json(
      { error: "Failed to fetch program" },
      { status: 500 }
    );
  }
}

// PUT /api/programs/[id] - Update a program
export async function PUT(request, context) {
  try {
    const authCheck = await requirePermission(request, "programs", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid program id" },
        { status: 400 }
      );
    }
    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      locationId,
      seats,
      price,
      isActive,
      sessions,
    } = body;

    // Check if program exists
    const existingProgram = await prisma.program.findUnique({
      where: { id },
    });

    if (!existingProgram) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
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
    if (seats !== undefined) updateData.seats = Number.parseInt(seats, 10);
    if (price !== undefined) {
      const parsedPrice = Number.parseFloat(price);
      if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json(
          { error: "Price must be a non-negative number" },
          { status: 400 }
        );
      }
      updateData.price = parsedPrice;
    }
    if (isActive !== undefined) updateData.isActive = Boolean(isActive);

    if (locationId !== undefined) {
      // Verify location exists
      const location = await prisma.location.findFirst({
        where: { id: Number.parseInt(locationId, 10), deletedAt: null },
      });
      if (!location) {
        return NextResponse.json(
          { error: "Location not found" },
          { status: 404 }
        );
      }
      updateData.locationId = Number.parseInt(locationId, 10);
    }

    // Synchronize sessions and session types if provided
    if (Array.isArray(sessions)) {
      const currentSessions = await prisma.session.findMany({
        where: { programId: id, deletedAt: null },
        include: { sessionTypes: { where: { deletedAt: null } } },
      });

      const incomingSessionIds = sessions
        .map((s) => (s.id ? parseInt(s.id, 10) : null))
        .filter(Boolean);

      // Soft delete sessions removed by user
      for (const curr of currentSessions) {
        if (!incomingSessionIds.includes(curr.id)) {
          await prisma.session.update({
            where: { id: curr.id },
            data: { deletedAt: new Date() },
          });
        }
      }

      // Process each session
      for (const s of sessions) {
        if (!s.name || !s.startTime || !s.endTime) {
          return NextResponse.json(
            { error: `Each activity/session must have a name, startTime, and endTime` },
            { status: 400 }
          );
        }
        const sStart = parseTimeValue(s.startTime);
        const sEnd = parseTimeValue(s.endTime);
        if (!sStart || !sEnd) {
          return NextResponse.json(
            { error: `Invalid time format for activity: ${s.name}` },
            { status: 400 }
          );
        }
        const sPrice = s.price !== "" && s.price != null ? parseFloat(s.price) : null;
        const sSpecialPrice = s.specialPrice !== "" && s.specialPrice != null ? parseFloat(s.specialPrice) : null;

        let sessionId = s.id ? parseInt(s.id, 10) : null;

        if (sessionId && currentSessions.some((cs) => cs.id === sessionId)) {
          await prisma.session.update({
            where: { id: sessionId },
            data: {
              name: s.name,
              startTime: sStart,
              endTime: sEnd,
              price: sPrice,
              specialPrice: sSpecialPrice,
            },
          });
        } else {
          const createdSession = await prisma.session.create({
            data: {
              programId: id,
              name: s.name,
              startTime: sStart,
              endTime: sEnd,
              price: sPrice,
              specialPrice: sSpecialPrice,
            },
          });
          sessionId = createdSession.id;
        }

        // Synchronize session types for this session
        if (Array.isArray(s.sessionTypes)) {
          const currentTypes = await prisma.sessionType.findMany({
            where: { sessionId, deletedAt: null },
          });

          const incomingTypeIds = s.sessionTypes
            .map((st) => (st.id ? parseInt(st.id, 10) : null))
            .filter(Boolean);

          // Soft delete types removed by user
          for (const currType of currentTypes) {
            if (!incomingTypeIds.includes(currType.id)) {
              await prisma.sessionType.update({
                where: { id: currType.id },
                data: { deletedAt: new Date() },
              });
            }
          }

          // Process each session type
          for (const st of s.sessionTypes) {
            const stPrice = st.price !== "" && st.price != null ? parseFloat(st.price) : 0;
            const stSpecialPrice = st.specialPrice !== "" && st.specialPrice != null ? parseFloat(st.specialPrice) : null;
            const typeId = st.id ? parseInt(st.id, 10) : null;

            if (typeId && currentTypes.some((ct) => ct.id === typeId)) {
              await prisma.sessionType.update({
                where: { id: typeId },
                data: {
                  name: st.name,
                  price: stPrice,
                  specialPrice: stSpecialPrice,
                },
              });
            } else {
              await prisma.sessionType.create({
                data: {
                  sessionId,
                  name: st.name,
                  price: stPrice,
                  specialPrice: stSpecialPrice,
                },
              });
            }
          }
        }
      }
    }

    const program = await prisma.program.update({
      where: { id },
      data: updateData,
      include: {
        location: true,
        sessions: {
          where: { deletedAt: null },
          include: {
            sessionTypes: {
              where: { deletedAt: null },
            },
          },
        },
      },
    });

    return NextResponse.json({ program });
  } catch (error) {
    console.error("Update program error:", error);
    return NextResponse.json(
      { error: "Failed to update program" },
      { status: 500 }
    );
  }
}

// DELETE /api/programs/[id] - Soft delete a program
export async function DELETE(request, context) {
  try {
    const authCheck = await requirePermission(request, "programs", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id: rawId } = await context.params;
    const id = parseId(rawId);

    if (id == null) {
      return NextResponse.json(
        { error: "Invalid program id" },
        { status: 400 }
      );
    }

    const program = await prisma.program.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({
      message: "Program deleted successfully",
      program,
    });
  } catch (error) {
    console.error("Delete program error:", error);
    return NextResponse.json(
      { error: "Failed to delete program" },
      { status: 500 }
    );
  }
}
