import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { buildDateRange, getSessionAvailability } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionIdParam = searchParams.get("sessionId");
    const dateParam = searchParams.get("date");

    if (!sessionIdParam || !dateParam) {
      return NextResponse.json(
        { error: "sessionId and date are required" },
        { status: 400 }
      );
    }

    const sessionId = Number.parseInt(sessionIdParam, 10);
    if (Number.isNaN(sessionId)) {
      return NextResponse.json(
        { error: "Invalid sessionId" },
        { status: 400 }
      );
    }

    const range = buildDateRange(dateParam);
    if (!range) {
      return NextResponse.json(
        { error: "Invalid date" },
        { status: 400 }
      );
    }

    const availabilityMap = await getSessionAvailability(
      prisma,
      [sessionId],
      range
    );

    const derived = availabilityMap.get(sessionId) || null;
    const availability = derived
      ? {
          id: `${sessionId}-${range.rangeStart.toISOString()}`,
          sessionId,
          availableSeats: derived.available,
          capacity: derived.capacity,
          reservedSeats: derived.reserved,
          date: derived.rangeStart,
          createdAt: derived.rangeStart,
          updatedAt: new Date(),
          deletedAt: null,
          source: derived.source,
        }
      : null;

    return NextResponse.json({ availability });
  } catch (error) {
    console.error("Get availability error", error);
    return NextResponse.json(
      { error: "Failed to fetch availability" },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Manual availability overrides are no longer supported" },
    { status: 410 }
  );
}
