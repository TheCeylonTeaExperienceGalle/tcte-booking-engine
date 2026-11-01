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

// GET /api/sessions - List all sessions or filter by programId
export async function GET(request) {
  try {
    const authCheck = await requirePermission(request, "sessions", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get("programId");
    const includeTypes = searchParams.get("includeTypes") === "true";

    const where = {
      deletedAt: null,
      program: {
        deletedAt: null,
        location: { deletedAt: null },
      },
    };
    if (programId) {
      const parsedProgramId = Number.parseInt(programId, 10);
      if (Number.isNaN(parsedProgramId)) {
        return NextResponse.json(
          { error: "Invalid programId" },
          { status: 400 }
        );
      }
      where.programId = parsedProgramId;
    }

    const include = {
      program: {
        include: {
          location: true,
        },
      },
      _count: {
        select: { sessionTypes: true },
      },
    };

    if (includeTypes) {
      include.sessionTypes = {
        where: {
          deletedAt: null,
        },
        orderBy: {
          createdAt: "asc",
        },
      };
    }

    const sessions = await prisma.session.findMany({
      where,
      include,
      orderBy: {
        startTime: "asc",
      },
    });

    return NextResponse.json({ sessions });
  } catch (error) {
    console.error("Get sessions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create a new session
export async function POST(request) {
  try {
    const authCheck = await requirePermission(request, "sessions", "write");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const body = await request.json();
    const { programId, name, startTime, endTime, price, specialPrice, sessionTypes } = body;

    // Validation
    if (!programId || !name || !startTime || !endTime) {
      return NextResponse.json(
        {
          error: "Missing required fields: programId, name, startTime, endTime",
        },
        { status: 400 }
      );
    }

    // Verify program exists
    const program = await prisma.program.findUnique({
      where: { id: parseInt(programId) },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Create session
    const parsedStartTime = parseTimeValue(startTime);
    const parsedEndTime = parseTimeValue(endTime);

    if (!parsedStartTime || !parsedEndTime) {
      return NextResponse.json(
        { error: "Invalid start or end time format" },
        { status: 400 }
      );
    }

    const data = {
      programId: parseInt(programId),
      name,
      startTime: parsedStartTime,
      endTime: parsedEndTime,
      price: price ? parseFloat(price) : null,
      specialPrice: specialPrice ? parseFloat(specialPrice) : null,
    };

    if (sessionTypes && Array.isArray(sessionTypes) && sessionTypes.length > 0) {
      data.sessionTypes = {
        create: sessionTypes.map((type) => ({
          name: type.name,
          price: type.price ? parseFloat(type.price) : 0,
          specialPrice: type.specialPrice ? parseFloat(type.specialPrice) : null,
        })),
      };
    }

    const session = await prisma.session.create({
      data,
      include: {
        program: {
          include: {
            location: true,
          },
        },
        sessionTypes: true,
      },
    });

    return NextResponse.json({ session }, { status: 201 });
  } catch (error) {
    console.error("Create session error:", error);
    return NextResponse.json(
      { error: "Failed to create session" },
      { status: 500 }
    );
  }
}
