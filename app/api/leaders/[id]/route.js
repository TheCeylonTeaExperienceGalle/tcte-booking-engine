import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export async function PUT(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "leaders", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);
    const body = await request.json();
    const { role, status, name, email, contact } = body;

    const existingLeader = await prisma.leader.findUnique({
      where: { id },
    });

    if (!existingLeader) {
      return NextResponse.json({ error: "Travel Agent not found" }, { status: 404 });
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
        data.status = status; // Expecting "ACTIVE", "DEACTIVATED", or "PENDING"
        if (status === "DEACTIVATED") {
            data.role = "USER";
            data.promoteCode = null;
        } else if (status === "ACTIVE") {
            const currentRole = data.role || existingLeader.role;
            if (currentRole === "LEADER" && !existingLeader.promoteCode && !data.promoteCode) {
                data.promoteCode = generatePromoCode(data.name || existingLeader.name || "AGT");
            }
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
  try {
    const authCheck = await requirePermission(request, "leaders", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const { id: idParam } = await params;
    const id = parseInt(idParam);

    const existingLeader = await prisma.leader.findUnique({
      where: { id },
    });

    if (!existingLeader) {
      return NextResponse.json({ error: "Travel Agent not found" }, { status: 404 });
    }

    await prisma.leader.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    return NextResponse.json({ message: "Travel Agent deleted successfully" });
  } catch (error) {
    console.error("Delete travel agent error", error);
    return NextResponse.json({ error: "Failed to delete travel agent" }, { status: 500 });
  }
}

function generatePromoCode(name) {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
}
