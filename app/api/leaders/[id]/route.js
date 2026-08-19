import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export async function PUT(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { role, status, name, email, contact } = body;

    const existingLeader = await prisma.leader.findUnique({
      where: { id },
    });

    if (!existingLeader) {
      return NextResponse.json({ error: "Leader not found" }, { status: 404 });
    }

    const data = {};
    if (name !== undefined) data.name = name;
    if (email !== undefined) data.email = email;
    if (contact !== undefined) data.contact = contact;

    // Handle Role Change
    if (role) {
        data.role = role; // Expecting "USER" or "LEADER"
        if (role === "LEADER" && existingLeader.role !== "LEADER") {
            // Generate Promo Code if not exists
            if (!existingLeader.promoteCode) {
                const code = generatePromoCode(existingLeader.name || "USER");
                data.promoteCode = code;
            }
        } else if (role === "USER") {
             data.promoteCode = null;
        }
    }

    // Handle Status Change
    if (status) {
        data.status = status; // Expecting "ACTIVE" or "DEACTIVATED"
        if (status === "DEACTIVATED") {
            data.role = "USER";
            data.promoteCode = null;
        }
    }

    const updatedLeader = await prisma.leader.update({
        where: { id },
        data,
    });

    return NextResponse.json({ leader: updatedLeader });

  } catch (error) {
    console.error("Update leader error", error);
    return NextResponse.json({ error: "Failed to update leader" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const existingLeader = await prisma.leader.findUnique({
      where: { id },
    });

    if (!existingLeader) {
      return NextResponse.json({ error: "Leader not found" }, { status: 404 });
    }

    await prisma.leader.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Leader deleted successfully" });
  } catch (error) {
    console.error("Delete leader error", error);
    return NextResponse.json({ error: "Failed to delete leader" }, { status: 500 });
  }
}

function generatePromoCode(name) {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
}
