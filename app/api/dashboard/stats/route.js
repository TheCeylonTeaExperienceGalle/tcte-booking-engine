import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
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
