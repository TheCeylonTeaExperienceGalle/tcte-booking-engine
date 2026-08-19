import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");

    const where = {
      deletedAt: null,
    };

    if (start && end) {
      where.bookedDate = {
        gte: new Date(start),
        lte: new Date(end),
      };
    }

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        leader: true,
        items: {
          include: {
            session: {
              include: {
                program: {
                  include: {
                    location: true
                  }
                }
              }
            },
            customer: true,
            sessionType: true
          }
        },
        payment: true
      },
      orderBy: {
        bookedDate: 'desc'
      }
    });

    return NextResponse.json({ bookings });
  } catch (error) {
    console.error("Error fetching bookings:", error);
    return NextResponse.json(
      { error: "Failed to fetch bookings" },
      { status: 500 }
    );
  }
}
