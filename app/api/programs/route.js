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

// GET /api/programs - List all programs
export async function GET(request) {
  try {
    const authCheck = await requirePermission(request, "programs", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const includeLocation = searchParams.get("includeLocation") === "true";
    const isActiveParam = searchParams.get("isActive");

    const where = {
      deletedAt: null,
      location: { deletedAt: null },
    };
    if (isActiveParam !== null) {
      where.isActive = isActiveParam === "true";
    }

    const programsData = await prisma.program.findMany({
      where,
      include: {
        location: includeLocation,
        discountRules: {
          where: { isActive: true },
        },
        sessions: {
          include: {
            bookingItems: {
              where: {
                booking: {
                  status: { in: ['PAID', 'CONFIRMED'] },
                },
              },
              select: {
                quantity: true,
              },
            },
          },
        },
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    const programs = programsData.map((program) => {
      const totalBookedSeats = program.sessions.reduce((acc, session) => {
        return acc + session.bookingItems.reduce((sum, item) => sum + item.quantity, 0);
      }, 0);
      
      const { sessions, ...programWithoutSessions } = program;
      return {
        ...programWithoutSessions,
        totalBookedSeats,
      };
    });

    return NextResponse.json({ programs });
  } catch (error) {
    console.error("Get programs error:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}

// POST /api/programs - Create a new program
export async function POST(request) {
  try {
    const authCheck = await requirePermission(request, "programs", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
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

    // Validation
    if (
      !title ||
      !startTime ||
      !endTime ||
      !locationId ||
      seats === undefined
    ) {
      return NextResponse.json(
        {
          error:
            "Missing required fields: title, startTime, endTime, locationId, seats",
        },
        { status: 400 }
      );
    }

    if (seats < 0) {
      return NextResponse.json(
        { error: "Seats must be a positive number" },
        { status: 400 }
      );
    }

    const parsedPrice = Number.parseFloat(price ?? "0");
    if (Number.isNaN(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 }
      );
    }

    // Verify location exists
    const location = await prisma.location.findFirst({
      where: {
        id: parseInt(locationId, 10),
        deletedAt: null,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);

    if (!parsedStartTime || !parsedEndTime) {
      return NextResponse.json(
        { error: "Invalid start or end time format" },
        { status: 400 }
      );
    }

    // Prepare sessions if any
    let sessionsToCreate = undefined;
    if (Array.isArray(sessions) && sessions.length > 0) {
      sessionsToCreate = [];
      for (const s of sessions) {
        if (!s.name || !s.startTime || !s.endTime) {
          return NextResponse.json(
            { error: "Each session must have a name, startTime, and endTime" },
            { status: 400 }
          );
        }
        const sStart = parseTimeValue(s.startTime);
        const sEnd = parseTimeValue(s.endTime);
        if (!sStart || !sEnd) {
          return NextResponse.json(
            { error: `Invalid time format for session: ${s.name}` },
            { status: 400 }
          );
        }
        const sessionPayload = {
          name: s.name,
          startTime: sStart,
          endTime: sEnd,
          price: s.price !== "" && s.price != null ? parseFloat(s.price) : null,
          specialPrice: s.specialPrice !== "" && s.specialPrice != null ? parseFloat(s.specialPrice) : null,
        };

        if (Array.isArray(s.sessionTypes) && s.sessionTypes.length > 0) {
          sessionPayload.sessionTypes = {
            create: s.sessionTypes.map(st => ({
              name: st.name,
              price: st.price ? parseFloat(st.price) : 0,
              specialPrice: st.specialPrice ? parseFloat(st.specialPrice) : null,
            }))
          };
        }

        sessionsToCreate.push(sessionPayload);
      }
    }

    // Create program
    const program = await prisma.program.create({
      data: {
        title,
        description: description || null,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        locationId: parseInt(locationId),
        seats: parseInt(seats),
        price: parsedPrice,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
        ...(sessionsToCreate && {
          sessions: {
            create: sessionsToCreate
          }
        })
      },
      include: {
        location: true,
        sessions: {
          include: {
            sessionTypes: true,
          }
        },
      },
    });

    return NextResponse.json({ program }, { status: 201 });
  } catch (error) {
    console.error("Create program error:", error);
    return NextResponse.json(
      { error: "Failed to create program" },
      { status: 500 }
    );
  }
}
