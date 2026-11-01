import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import {
  buildDateRange,
  getSessionAvailability,
} from "@/lib/availability";
import { isSessionPastInColombo } from "@/lib/dateUtils";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get("date");
    const locationParam = searchParams.get("locationId");

    let range = null;
    if (dateParam) {
      range = buildDateRange(dateParam);
      if (!range) {
        return NextResponse.json(
          { error: "Invalid date" },
          { status: 400 }
        );
      }
    }

    const where = {
      deletedAt: null,
      isActive: true,
      location: { deletedAt: null, isActive: true },
    };

    if (locationParam && locationParam !== "all") {
      const locId = Number(locationParam);
      if (!Number.isNaN(locId)) {
        where.locationId = locId;
      }
    }

    const programs = await prisma.program.findMany({
      where,
      include: {
        location: true,
        sessions: {
          where: { deletedAt: null },
          orderBy: { startTime: "asc" },
          include: {
            sessionTypes: {
              where: { deletedAt: null },
              orderBy: { createdAt: "asc" },
            },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    if (programs.length === 0) {
      return NextResponse.json({ programs });
    }

    const sessionIds = [];
    for (const program of programs) {
      for (const session of program.sessions) {
        sessionIds.push(session.id);
      }
    }

    let availabilityMap = new Map();
    if (range && sessionIds.length > 0) {
      availabilityMap = await getSessionAvailability(
        prisma,
        sessionIds,
        range
      );
    }

    const normalizedPrograms = programs
      .map((program) => {
        const parsedCapacity =
          typeof program.seats === "number"
            ? program.seats
            : Number.parseInt(program.seats ?? "", 10);
        const safeCapacity = Number.isNaN(parsedCapacity)
          ? null
          : Math.max(0, parsedCapacity);

        const futureSessions = program.sessions.filter(
          (session) => !dateParam || !isSessionPastInColombo(dateParam, session.startTime)
        );

        const sessions = futureSessions.map((session) => {
          const availabilityRecord = availabilityMap.get(session.id) || null;
          const rawAvailable = availabilityRecord?.available ?? safeCapacity;
          const parsedAvailable = Number.parseInt(String(rawAvailable ?? ""), 10);
          const safeAvailable = Number.isNaN(parsedAvailable)
            ? safeCapacity ?? null
            : Math.max(0, parsedAvailable);
          const reservedSeats = availabilityRecord?.reserved ?? 0;

          return {
            ...session,
            availabilityForDate: {
              availableSeats: safeAvailable,
              capacity: safeCapacity,
              reservedSeats,
              source: range ? "booking_items" : "capacity",
            },
          };
        });

        return {
          ...program,
          sessions,
        };
      })
      .filter((program) => program.sessions.length > 0);

    return NextResponse.json({ programs: normalizedPrograms });
  } catch (error) {
    console.error("Public programs fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch programs" },
      { status: 500 }
    );
  }
}
