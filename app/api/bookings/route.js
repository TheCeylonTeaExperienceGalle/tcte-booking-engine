import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authCheck = await requirePermission(request, "bookings", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const { searchParams } = new URL(request.url);
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const status = searchParams.get("status");
    const source = searchParams.get("source");
    const search = searchParams.get("search");

    const where = {
      deletedAt: null,
    };

    if (start && end) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      where.bookedDate = {
        gte: startDate,
        lte: endDate,
      };
    } else if (start) {
      const startDate = new Date(start);
      startDate.setHours(0, 0, 0, 0);
      where.bookedDate = {
        gte: startDate,
      };
    } else if (end) {
      const endDate = new Date(end);
      endDate.setHours(23, 59, 59, 999);
      where.bookedDate = {
        lte: endDate,
      };
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (source && source !== "ALL") {
      where.source = source.toUpperCase();
    }

    if (search && search.trim()) {
      const q = search.trim();
      where.OR = [
        { payment: { orderId: { contains: q } } },
        { payment: { transactionId: { contains: q } } },
        { leader: { name: { contains: q } } },
        { leader: { email: { contains: q } } },
        {
          items: {
            some: {
              customer: {
                OR: [
                  { name: { contains: q } },
                  { email: { contains: q } },
                  { phone: { contains: q } },
                  { nic: { contains: q } },
                ],
              },
            },
          },
        },
      ];
      const parsedId = parseInt(q, 10);
      if (!isNaN(parsedId)) {
        where.OR.push({ id: parsedId });
      }
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
                    location: true,
                  },
                },
              },
            },
            customer: true,
            sessionType: true,
          },
        },
        payment: true,
      },
      orderBy: [
        { bookedDate: "desc" },
        { id: "desc" },
      ],
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
