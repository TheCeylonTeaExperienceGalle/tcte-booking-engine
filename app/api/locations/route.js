import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/locations - List all locations
export async function GET(request) {
  try {
    const authCheck = await requirePermission(request, "locations", "read");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = {
      deletedAt: null,
    };
    if (activeOnly) {
      where.isActive = true;
    }

    const locations = await prisma.location.findMany({
      where,
      include: {
        programs: {
          where: { deletedAt: null },
          include: {
            sessions: {
              where: { deletedAt: null },
              include: {
                bookingItems: {
                  select: { id: true },
                },
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    const enrichedLocations = locations.map((loc) => {
      const programsCount = loc.programs.length;
      let sessionsCount = 0;
      let bookingsCount = 0;

      for (const prog of loc.programs) {
        sessionsCount += prog.sessions.length;
        for (const sess of prog.sessions) {
          bookingsCount += sess.bookingItems.length;
        }
      }

      const hasPriorData =
        programsCount > 0 || sessionsCount > 0 || bookingsCount > 0;

      const { programs, ...cleanLoc } = loc;
      return {
        ...cleanLoc,
        programsCount,
        sessionsCount,
        bookingsCount,
        hasPriorData,
      };
    });

    return NextResponse.json({ locations: enrichedLocations });
  } catch (error) {
    console.error("Get locations error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}

// POST /api/locations - Create a new location
export async function POST(request) {
  try {
    const authCheck = await requirePermission(request, "locations", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const body = await request.json();
    const { name, address, isActive } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const location = await prisma.location.create({
      data: {
        name: name.trim(),
        address: address ? address.trim() : null,
        isActive: isActive !== undefined ? Boolean(isActive) : true,
      },
    });

    return NextResponse.json({ location }, { status: 201 });
  } catch (error) {
    console.error("Create location error:", error);
    return NextResponse.json(
      { error: "Failed to create location" },
      { status: 500 }
    );
  }
}
