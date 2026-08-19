import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

function normalizeEmail(value) {
  if (typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

export async function POST(request) {
  try {
    const body = await request.json();
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = normalizeEmail(body?.email);
    const contact = typeof body?.contact === "string" ? body.contact.trim() : "";

    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const existing = await prisma.leader.findFirst({
      where: {
        deletedAt: null,
        email,
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        promoteCode: true,
      },
    });

    if (existing) {
      return NextResponse.json({ leader: existing, reused: true });
    }

    const leader = await prisma.leader.create({
      data: {
        name,
        email,
        contact: contact || null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        promoteCode: true,
      },
    });

    return NextResponse.json({ leader, reused: false }, { status: 201 });
  } catch (error) {
    console.error("Public leader creation error", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A leader with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to create leader" },
      { status: 500 }
    );
  }
}
