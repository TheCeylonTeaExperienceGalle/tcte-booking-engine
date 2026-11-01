import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "locations", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, address, isActive } = body;

    const existing = await prisma.location.findUnique({
      where: { id: parseInt(id) },
    });
    if (!existing || existing.deletedAt) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const updateData = {};
    if (name !== undefined) {
      if (!name.trim()) {
        return NextResponse.json(
          { error: "Name cannot be empty" },
          { status: 400 }
        );
      }
      updateData.name = name.trim();
    }
    if (address !== undefined) {
      updateData.address = address?.trim() || null;
    }
    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const location = await prisma.location.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    return NextResponse.json({ location });
  } catch (error) {
    console.error("Error updating location:", error);
    return NextResponse.json(
      { error: "Failed to update location" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "locations", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id } = await params;
    const locId = parseInt(id);

    const location = await prisma.location.findUnique({
      where: { id: locId },
      include: {
        programs: {
          include: {
            sessions: {
              include: {
                bookingItems: { select: { id: true } },
              },
            },
          },
        },
      },
    });

    if (!location || location.deletedAt) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Check for prior data (programs, sessions, booking items)
    const programsCount = location.programs.length;
    let sessionsCount = 0;
    let bookingsCount = 0;
    for (const prog of location.programs) {
      sessionsCount += prog.sessions.length;
      for (const sess of prog.sessions) {
        bookingsCount += sess.bookingItems.length;
      }
    }

    if (programsCount > 0 || sessionsCount > 0 || bookingsCount > 0) {
      const details = [];
      if (programsCount > 0) details.push(`${programsCount} program(s)`);
      if (sessionsCount > 0) details.push(`${sessionsCount} session(s)`);
      if (bookingsCount > 0) details.push(`${bookingsCount} booking(s)`);

      return NextResponse.json(
        {
          error: `Cannot delete this location because it has associated data (${details.join(", ")}). Please inactivate it instead to preserve history.`,
          hasPriorData: true,
          priorDataSummary: { programsCount, sessionsCount, bookingsCount },
        },
        { status: 400 }
      );
    }

    // Soft delete if no prior data exists
    await prisma.location.update({
      where: { id: locId },
      data: {
        deletedAt: new Date(),
      },
    });

    return NextResponse.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error deleting location:", error);
    return NextResponse.json(
      { error: "Failed to delete location" },
      { status: 500 }
    );
  }
}
