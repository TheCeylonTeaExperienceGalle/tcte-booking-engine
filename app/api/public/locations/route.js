import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/public/locations - List all active locations for public booking
export async function GET() {
  try {
    const locations = await prisma.location.findMany({
      where: {
        deletedAt: null,
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        address: true,
      },
    });

    return NextResponse.json({ locations });
  } catch (error) {
    console.error("Public locations fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
}
