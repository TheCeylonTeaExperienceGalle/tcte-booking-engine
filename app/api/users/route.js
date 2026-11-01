import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
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

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: {
          select: {
            id: true,
            name: true,
          }
        },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Get users error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = checkAdminAuth(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const body = await request.json();
    const { name, email, username, password, roleId } = body;
    const userIdentifier = (username || email)?.trim().toLowerCase();

    if (!userIdentifier || !password || !name || !roleId) {
      return NextResponse.json(
        { error: "Name, username, password, and role are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters" },
        { status: 400 }
      );
    }

    const parsedRoleId = parseInt(roleId, 10);
    const role = await prisma.role.findUnique({
      where: { id: parsedRoleId },
    });

    if (!role || role.isActive === false) {
      return NextResponse.json(
        { error: "Cannot assign an inactive or non-existent role" },
        { status: 400 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: userIdentifier },
    });
    if (existingUser) {
      return NextResponse.json({ error: "Username is already in use" }, { status: 409 });
    }

    const hashedPassword = await hashPassword(password);
    
    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: userIdentifier,
        password: hashedPassword,
        roleId: parsedRoleId, 
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: {
          select: { id: true, name: true }
        },
        createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "User created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Create user error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
