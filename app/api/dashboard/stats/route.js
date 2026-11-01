import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request) {
  try {
    const authCheck = await requirePermission(request, "dashboard", "read");
    if (!authCheck.authorized) {
      return NextResponse.json({ error: authCheck.error }, { status: authCheck.status });
    }

    const [
      totalBookings,
      activeCustomers,
      activePrograms,
      revenueResult
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.customer.count({
        where: {
          deletedAt: null,
        },
      }),
      prisma.program.count({
        where: {
          isActive: true,
          deletedAt: null,
        },
      }),
      prisma.payment.aggregate({
        _sum: {
          amount: true,
        },
        where: {
          status: "SUCCESS",
          deletedAt: null,
        },
      }),
    ]);

    const revenue = revenueResult._sum.amount || 0;

    return NextResponse.json({
      totalBookings,
      activeCustomers,
      activePrograms,
      revenue,
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    );
  }
}
