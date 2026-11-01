import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function PATCH(request, { params }) {
  try {
    const authCheck = await requirePermission(request, "leaders", "write");
    if (!authCheck.authorized) {
      return NextResponse.json(
        { error: authCheck.error },
        { status: authCheck.status }
      );
    }

    const resolvedParams = await params;
    const { id } = resolvedParams;
    if (!id) {
      return NextResponse.json({ error: "Travel Agent ID is required" }, { status: 400 });
    }

    const body = await request.json();
    const { status } = body;

    if (status !== "ACTIVE" && status !== "DEACTIVATED" && status !== "PENDING") {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    const leaderId = parseInt(id, 10);
    if (isNaN(leaderId)) {
      return NextResponse.json({ error: "Invalid Travel Agent ID" }, { status: 400 });
    }

    const existingLeader = await prisma.leader.findUnique({
      where: { id: leaderId },
    });

    if (!existingLeader) {
      return NextResponse.json({ error: "Travel Agent not found" }, { status: 404 });
    }

    const updateData = { status };
    if (status === "ACTIVE" && !existingLeader.promoteCode && existingLeader.role === "LEADER") {
      const prefix = (existingLeader.name || "AGT").substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
      const random = Math.floor(1000 + Math.random() * 9000);
      updateData.promoteCode = `${prefix}${random}`;
    }

    const leader = await prisma.leader.update({
      where: { id: leaderId },
      data: updateData,
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        role: true,
        promoteCode: true,
      }
    });

    return NextResponse.json({ leader });
  } catch (error) {
    console.error("Update leader status error:", error);
    
    if (error.code === 'P2025') {
        return NextResponse.json({ error: "Travel Agent not found" }, { status: 404 });
    }

    return NextResponse.json(
      { error: "Failed to update travel agent status" },
      { status: 500 }
    );
  }
}
