import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

// GET - Fetch a single commission record
export async function GET(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const commissionId = parseInt(id, 10);

    if (isNaN(commissionId)) {
      return NextResponse.json(
        { error: "Invalid commission ID" },
        { status: 400 }
      );
    }

    const commission = await prisma.commission.findUnique({
      where: { id: commissionId },
      include: {
        leader: {
          select: {
            id: true,
            name: true,
            email: true,
            promoteCode: true,
            contact: true,
          },
        },
        booking: {
          select: {
            id: true,
            bookedDate: true,
            status: true,
            amount: true,
            balance: true,
            paymentType: true,
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
        },
      },
    });

    if (!commission) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ commission });
  } catch (error) {
    console.error("Error fetching commission:", error);
    return NextResponse.json(
      { error: "Failed to fetch commission" },
      { status: 500 }
    );
  }
}

// PUT - Update commission payment status
export async function PUT(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id } = await params;
    const commissionId = parseInt(id, 10);

    if (isNaN(commissionId)) {
      return NextResponse.json(
        { error: "Invalid commission ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { paymentStatus, paidAmount, notes } = body;

    // Validate the commission exists
    const existingCommission = await prisma.commission.findUnique({
      where: { id: commissionId },
    });

    if (!existingCommission) {
      return NextResponse.json(
        { error: "Commission not found" },
        { status: 404 }
      );
    }

    // Validate payment status
    const validStatuses = ["PENDING", "PAID", "PARTIALLY_PAID"];
    if (paymentStatus && !validStatuses.includes(paymentStatus)) {
      return NextResponse.json(
        { error: "Invalid payment status" },
        { status: 400 }
      );
    }

    // Build update data
    const updateData = {};

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;

      if (paymentStatus === "PAID") {
        updateData.paidAt = new Date();
        updateData.paidAmount = paidAmount || existingCommission.commissionAmount;
      } else if (paymentStatus === "PARTIALLY_PAID") {
        if (!paidAmount || paidAmount <= 0) {
          return NextResponse.json(
            { error: "Paid amount is required for partial payments" },
            { status: 400 }
          );
        }
        if (paidAmount >= existingCommission.commissionAmount) {
          return NextResponse.json(
            { error: "Paid amount must be less than commission amount for partial payment" },
            { status: 400 }
          );
        }
        updateData.paidAt = new Date();
        updateData.paidAmount = paidAmount;
      } else if (paymentStatus === "PENDING") {
        updateData.paidAt = null;
        updateData.paidAmount = null;
      }
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    const commission = await prisma.commission.update({
      where: { id: commissionId },
      data: updateData,
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
          },
        },
      },
    });

    return NextResponse.json({ commission });
  } catch (error) {
    console.error("Error updating commission:", error);
    return NextResponse.json(
      { error: "Failed to update commission" },
      { status: 500 }
    );
  }
}
