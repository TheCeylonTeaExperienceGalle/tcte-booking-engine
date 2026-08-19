import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

// GET - Fetch commission summary for all leaders
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build date filter for commissions
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      if (startDate) {
        dateFilter.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        dateFilter.createdAt.lte = new Date(endDate);
      }
    }

    // Get all leaders with role LEADER and their commission stats
    const leaders = await prisma.leader.findMany({
      where: {
        deletedAt: null,
        role: "LEADER",
        promoteCode: { not: null },
      },
      include: {
        commissions: {
          where: {
            ...dateFilter,
            booking: {
              status: "CONFIRMED",
            },
          },
          select: {
            id: true,
            commissionAmount: true,
            paymentStatus: true,
            paidAmount: true,
            totalSeats: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            bookings: true,
            customers: true,
          },
        },
      },
      orderBy: { name: "asc" },
    });

    // Calculate summary for each leader
    const leaderSummaries = leaders.map((leader) => {
      const totalCommission = leader.commissions.reduce(
        (sum, c) => sum + c.commissionAmount,
        0
      );
      const paidCommission = leader.commissions
        .filter((c) => c.paymentStatus === "PAID")
        .reduce((sum, c) => sum + (c.paidAmount || c.commissionAmount), 0);
      const pendingCommission = leader.commissions
        .filter((c) => c.paymentStatus === "PENDING")
        .reduce((sum, c) => sum + c.commissionAmount, 0);
      const partiallyPaidCommission = leader.commissions
        .filter((c) => c.paymentStatus === "PARTIALLY_PAID")
        .reduce((sum, c) => sum + c.commissionAmount - (c.paidAmount || 0), 0);
      const totalSeatsReferred = leader.commissions.reduce(
        (sum, c) => sum + c.totalSeats,
        0
      );

      return {
        id: leader.id,
        name: leader.name,
        email: leader.email,
        promoteCode: leader.promoteCode,
        contact: leader.contact,
        status: leader.status,
        totalBookings: leader._count.bookings,
        totalCustomers: leader._count.customers,
        totalCommissions: leader.commissions.length,
        totalSeatsReferred,
        totalCommission,
        paidCommission,
        pendingCommission: pendingCommission + partiallyPaidCommission,
        unpaidCommission: totalCommission - paidCommission,
      };
    });

    // Overall summary
    const overallSummary = {
      totalLeaders: leaderSummaries.length,
      totalCommissionAmount: leaderSummaries.reduce(
        (sum, l) => sum + l.totalCommission,
        0
      ),
      totalPaidAmount: leaderSummaries.reduce(
        (sum, l) => sum + l.paidCommission,
        0
      ),
      totalPendingAmount: leaderSummaries.reduce(
        (sum, l) => sum + l.pendingCommission,
        0
      ),
      totalSeatsReferred: leaderSummaries.reduce(
        (sum, l) => sum + l.totalSeatsReferred,
        0
      ),
    };

    return NextResponse.json({
      leaders: leaderSummaries,
      summary: overallSummary,
    });
  } catch (error) {
    console.error("Error fetching leader commissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch leader commissions" },
      { status: 500 }
    );
  }
}
