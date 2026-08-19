import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export const dynamic = "force-dynamic";

function resolveDisplayName(leader) {
  if (leader?.name) {
    const trimmed = leader.name.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }
  if (leader?.email) {
    return leader.email;
  }
  return `Leader #${leader?.id}`;
}

export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");

    const where = {
      deletedAt: null,
    };

    if (query) {
      where.OR = [
        { name: { contains: query, mode: "insensitive" } },
        { email: { contains: query, mode: "insensitive" } },
        { promoteCode: { contains: query, mode: "insensitive" } },
      ];
    }

    const leaders = await prisma.leader.findMany({
      where,
      include: {
        _count: {
          select: { customers: true, bookings: true },
        },
      },
      orderBy: [
        { name: "asc" },
        { email: "asc" },
      ],
    });

    const normalized = leaders.map((leader) => ({
      id: leader.id,
      name: leader.name,
      displayName: resolveDisplayName(leader),
      email: leader.email,
      contact: leader.contact,
      promoteCode: leader.promoteCode,
      role: leader.role,
      status: leader.status,
      customersCount: leader._count.customers,
      bookingsCount: leader._count.bookings,
    }));

    return NextResponse.json({ leaders: normalized });
  } catch (error) {
    console.error("Get leaders error", error);
    return NextResponse.json(
      { error: "Failed to fetch leaders" },
      { status: 500 }
    );
  }
}

function generatePromoCode(name) {
    const prefix = name.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, "X");
    const random = Math.floor(1000 + Math.random() * 9000);
    return `${prefix}${random}`;
}

export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const body = await request.json();
    const { name, email, contact, role } = body;

    if (!name || !email) {
      return NextResponse.json(
        { error: "Name and email are required" },
        { status: 400 }
      );
    }

    const existing = await prisma.leader.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    let promoteCode = null;
    if (role === "LEADER") {
        promoteCode = generatePromoCode(name);
    }

    const leader = await prisma.leader.create({
      data: {
        name,
        email,
        contact,
        role: role || "USER",
        promoteCode,
        status: "ACTIVE",
      },
    });

    return NextResponse.json({ leader });
  } catch (error) {
    console.error("Create leader error", error);
    return NextResponse.json(
      { error: "Failed to create leader" },
      { status: 500 }
    );
  }
}
