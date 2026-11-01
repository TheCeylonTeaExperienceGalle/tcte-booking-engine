import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { verifyAccessToken } from "@/lib/jwt";
import { comparePassword, hashPassword } from "@/lib/auth";

export async function GET(request) {
  try {
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        isActive: true,
        role: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { error: "Account deactivated or not found" },
        { status: 403 }
      );
    }

    if (user.role && user.role.isActive === false) {
      return NextResponse.json(
        { error: "Assigned role is deactivated" },
        { status: 403 }
      );
    }

    // Role-based profile permissions
    const roleName = user.role?.name?.toLowerCase();
    if (roleName !== "admin") {
      const perms = user.role?.permissions || {};
      const profilePerm = perms.profile;
      if (profilePerm && profilePerm.read === false && profilePerm.write === false) {
        return NextResponse.json(
          { error: "Profile access is restricted for your role" },
          { status: 403 }
        );
      }
    }

    return NextResponse.json({ user });
  } catch (error) {
    console.error("Profile GET error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(request) {
  try {
    // 1. Authenticate Request
    const authHeader = request.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing authorization token" },
        { status: 401 }
      );
    }
    const token = authHeader.split(" ")[1];

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const userId = decoded.userId;

    // 2. Parse Payload
    const body = await request.json();
    const { name, email, username, currentPassword, newPassword } = body;

    // Simple validation
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }

    // 3. Verify User and Current Password
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Check role permission for profile modification
    const roleName = user.role?.name?.toLowerCase();
    if (roleName !== "admin") {
      const perms = user.role?.permissions || {};
      const profilePerm = perms.profile;
      if (profilePerm && profilePerm.write === false) {
        return NextResponse.json(
          { error: "Profile modification is not permitted for your role" },
          { status: 403 }
        );
      }
    }

    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password
    );

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Incorrect current password" },
        { status: 403 }
      );
    }

    // 4. Prepare updates
    const updateData = {};
    if (name !== undefined) {
      updateData.name = name.trim();
    }

    const normalizedIdentifier = (username || email)?.trim().toLowerCase();

    if (normalizedIdentifier && normalizedIdentifier !== user.email) {
      // Check if username/email is already taken
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: normalizedIdentifier },
      });
      if (existingEmailUser) {
        return NextResponse.json(
          { error: "Username is already in use" },
          { status: 409 }
        );
      }
      updateData.email = normalizedIdentifier;
    }

    if (newPassword) {
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "New password must be at least 6 characters" },
          { status: 400 }
        );
      }
      updateData.password = await hashPassword(newPassword);
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ message: "No changes requested" });
    }

    // 5. Update user
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Profile updated successfully",
      user: updatedUser,
    });
  } catch (error) {
    console.error("Profile update error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
