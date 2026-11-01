import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

export const dynamic = "force-dynamic";

function checkAdminAuth(request) {
  const authHeader =
    request.headers.get("Authorization") ||
    request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return { error: "Missing authorization token", status: 401 };
  }
  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyAccessToken(token);
    const roleName =
      typeof decoded?.role === "string" ? decoded.role : decoded?.role?.name;
    if (!roleName || roleName.toLowerCase() !== "admin") {
      return { error: "Forbidden: Admin access required", status: 403 };
    }
    return { decoded };
  } catch (err) {
    return { error: "Invalid or expired token", status: 401 };
  }
}

export async function GET(request) {
  try {
    const auth = checkAdminAuth(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get("active") === "true";

    const where = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const roles = await prisma.role.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json({ roles });
  } catch (error) {
    console.error("Get roles error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = checkAdminAuth(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { name, permissions } = body;

    if (!name) {
      return NextResponse.json({ error: "Role name is required" }, { status: 400 });
    }

    const existingRole = await prisma.role.findUnique({
      where: { name: name.trim() },
    });

    if (existingRole) {
      return NextResponse.json({ error: "Role name must be unique" }, { status: 409 });
    }

    const newRole = await prisma.role.create({
      data: {
        name: name.trim(),
        permissions: permissions || {},
      },
      include: {
        _count: {
          select: { users: true }
        }
      }
    });

    return NextResponse.json({ success: true, role: newRole });
  } catch (error) {
    console.error("Create role error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
