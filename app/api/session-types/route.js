import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

// GET /api/session-types - List all session types or filter by sessionId
export async function GET(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    const where = {
      deletedAt: null,
      session: {
        deletedAt: null,
        program: {
          deletedAt: null,
          location: { deletedAt: null },
        },
      },
    };
    if (sessionId) {
      const parsedSessionId = Number.parseInt(sessionId, 10);
      if (Number.isNaN(parsedSessionId)) {
        return NextResponse.json(
          { error: "Invalid sessionId" },
          { status: 400 }
        );
      }
      where.sessionId = parsedSessionId;
    }

    const sessionTypes = await prisma.sessionType.findMany({
      where,
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
      },
      orderBy: {
        createdAt: "asc",
      },
    });

    return NextResponse.json({ sessionTypes });
  } catch (error) {
    console.error("Get session types error:", error);
    return NextResponse.json(
      { error: "Failed to fetch session types" },
      { status: 500 }
    );
  }
}

// POST /api/session-types - Create a new session type
export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const body = await request.json();
    const { sessionId, name, price, specialPrice } = body;

    // Validation
    if (!sessionId || !name || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: sessionId, name, price" },
        { status: 400 }
      );
    }

    if (price < 0) {
      return NextResponse.json(
        { error: "Price must be a positive number" },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: parseInt(sessionId) },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Create session type
    const sessionType = await prisma.sessionType.create({
      data: {
        sessionId: parseInt(sessionId),
        name,
        price: parseFloat(price),
        specialPrice: specialPrice ? parseFloat(specialPrice) : null,
      },
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
      },
    });

    return NextResponse.json({ sessionType }, { status: 201 });
  } catch (error) {
    console.error("Create session type error:", error);
    return NextResponse.json(
      { error: "Failed to create session type" },
      { status: 500 }
    );
  }
}
