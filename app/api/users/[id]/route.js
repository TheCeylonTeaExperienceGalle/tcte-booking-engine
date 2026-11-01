import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { hashPassword } from "@/lib/auth";

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

export async function PUT(request, context) {
  try {
    const auth = checkAdminAuth(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { params } = context;
    const { id } = await params;

    const body = await request.json();
    const { name, username, email, roleId, isActive } = body;

    const data = {};
    if (name !== undefined) data.name = name ? name.trim() : "";
    if (roleId !== undefined) {
      const parsedRoleId = parseInt(roleId, 10);
      const role = await prisma.role.findUnique({ where: { id: parsedRoleId } });
      if (!role || role.isActive === false) {
        return NextResponse.json({ error: "Cannot assign an inactive or non-existent role" }, { status: 400 });
      }
      data.roleId = parsedRoleId;
    }
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const newIdentifier = (username || email)?.trim().toLowerCase();
    if (newIdentifier) {
      const existingUser = await prisma.user.findFirst({
        where: {
          email: newIdentifier,
          NOT: { id }
        }
      });
      if (existingUser) {
        return NextResponse.json({ error: "Username is already in use" }, { status: 409 });
      }
      data.email = newIdentifier;
    }

    if (body.password && typeof body.password === "string" && body.password.trim().length >= 6) {
      data.password = await hashPassword(body.password.trim());
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: "No fields to update" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        role: {
          select: { id: true, name: true }
        },
      }
    });

    return NextResponse.json({ success: true, user: updatedUser });
  } catch (error) {
    console.error("Update user error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = checkAdminAuth(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { params } = context;
    const { id } = await params;

    // Prevent deleting yourself
    if (auth.decoded.userId === id) {
      return NextResponse.json({ error: "You cannot delete yourself" }, { status: 400 });
    }

    await prisma.user.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ success: true, message: "User deactivated successfully" });
  } catch (error) {
    console.error("Delete user error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
