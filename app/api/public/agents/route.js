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

function generatePromoCode(name) {
  const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${random}`;
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
    });

    if (existing) {
      if (existing.status === "PENDING") {
        return NextResponse.json(
          { error: "Your registration has already been submitted and is pending admin verification." },
          { status: 400 }
        );
      }
      if (existing.status === "DEACTIVATED") {
        return NextResponse.json(
          { error: "This agent account has been locked. Please contact support." },
          { status: 403 }
        );
      }
      if (existing.role === "LEADER" && existing.promoteCode) {
         return NextResponse.json({ leader: existing, reused: true });
      } else {
         return NextResponse.json(
          { error: "Email already in use." },
          { status: 409 }
        );
      }
    }

    const promoteCode = generatePromoCode(name);

    const leader = await prisma.leader.create({
      data: {
        name,
        email,
        contact: contact || null,
        role: "LEADER",
        promoteCode: promoteCode,
        status: "PENDING",
      },
      select: {
        id: true,
        name: true,
        email: true,
        contact: true,
        promoteCode: true,
        status: true,
      },
    });

    return NextResponse.json(
      {
        leader,
        reused: false,
        pending: true,
        message: "Registration submitted successfully! Your account is pending admin verification."
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Public agent creation error", error);

    if (error?.code === "P2002") {
      return NextResponse.json(
        { error: "A leader with this email already exists" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: "Failed to register agent" },
      { status: 500 }
    );
  }
}
