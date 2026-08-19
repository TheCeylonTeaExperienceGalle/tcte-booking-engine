import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

// GET - Fetch all commissions with filtering options
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const leaderId = searchParams.get("leaderId");
    const status = searchParams.get("status");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    const where = {
      booking: {
        status: "CONFIRMED",
      },
    };

    if (leaderId) {
      where.leaderId = parseInt(leaderId, 10);
    }

    if (status && ["PENDING", "PAID", "PARTIALLY_PAID"].includes(status)) {
      where.paymentStatus = status;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate);
      }
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            promoteCode: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookedDate: true,
            status: true,
            amount: true,
            items: {
              select: {
                id: true,
                quantity: true,
                session: {
                  select: {
                    name: true,
                    program: {
                      select: {
                        title: true,
                        location: {
                          select: {
                            name: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    // Calculate summary statistics
    const summary = {
      totalCommissions: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + c.commissionAmount, 0),
      pendingAmount: commissions
        .filter((c) => c.paymentStatus === "PENDING")
        .reduce((sum, c) => sum + c.commissionAmount, 0),
      paidAmount: commissions
        .filter((c) => c.paymentStatus === "PAID")
        .reduce((sum, c) => sum + (c.paidAmount || c.commissionAmount), 0),
    };

    return NextResponse.json({ commissions, summary });
  } catch (error) {
    console.error("Error fetching commissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch commissions" },
      { status: 500 }
    );
  }
}
