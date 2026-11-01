import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";

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
    const roleId = parseInt(id, 10);

    const body = await request.json();
    const { name, permissions, isActive } = body;

    const role = await prisma.role.findUnique({ where: { id: roleId } });
    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    if (role.name === "admin" && (name && name !== "admin" || isActive === false)) {
      return NextResponse.json({ error: "Cannot deactivate or rename the built-in admin role" }, { status: 403 });
    }

    if (name && name.trim().toLowerCase() !== role.name.toLowerCase()) {
      const existing = await prisma.role.findUnique({
        where: { name: name.trim() }
      });
      if (existing && existing.id !== roleId) {
        return NextResponse.json({ error: "Role name must be unique" }, { status: 409 });
      }
    }

    const data = {};
    if (name) data.name = name.trim();
    if (permissions !== undefined) data.permissions = permissions;
    if (isActive !== undefined) data.isActive = Boolean(isActive);

    const updatedRole = await prisma.role.update({
      where: { id: roleId },
      data,
      include: { _count: { select: { users: true } } }
    });

    return NextResponse.json({ success: true, role: updatedRole });
  } catch (error) {
    console.error("Update role error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const auth = checkAdminAuth(request);
    if (auth.error) return NextResponse.json({ error: auth.error }, { status: auth.status });

    const { params } = context;
    const { id } = await params;
    const roleId = parseInt(id, 10);

    const role = await prisma.role.findUnique({
      where: { id: roleId },
      include: { _count: { select: { users: true } } }
    });

    if (!role) {
      return NextResponse.json({ error: "Role not found" }, { status: 404 });
    }
    
    if (role.name === "admin") {
      return NextResponse.json({ error: "Cannot deactivate the built-in admin role" }, { status: 403 });
    }

    // Never hard-delete existing roles; deactivate instead
    await prisma.role.update({
      where: { id: roleId },
      data: { isActive: false }
    });

    return NextResponse.json({ success: true, message: "Role deactivated successfully" });
  } catch (error) {
    console.error("Deactivate role error", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
