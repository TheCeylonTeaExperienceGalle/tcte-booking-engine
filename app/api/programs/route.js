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

// GET /api/programs - List all programs
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
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

    const programs = await prisma.program.findMany({
      where,
      include: {
        location: includeLocation,
        _count: {
          select: { sessions: true },
        },
      },
      orderBy: {
        createdAt: "asc",
      },
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
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const body = await request.json();
    const {
      title,
      description,
      startTime,
      endTime,
      locationId,
      seats,
      isActive,
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

    // Create program
    const program = await prisma.program.create({
      data: {
        title,
        description: description || null,
        startTime: parsedStartTime,
        endTime: parsedEndTime,
        locationId: parseInt(locationId),
        seats: parseInt(seats),
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
      include: {
        location: true,
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
