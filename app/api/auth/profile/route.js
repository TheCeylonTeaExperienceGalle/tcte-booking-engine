import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { comparePassword, hashPassword } from "@/lib/auth";
import { jsonAuthError, requireAuthenticatedUser } from "@/lib/security/auth";

export async function PUT(request) {
  const auth = requireAuthenticatedUser(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const userId = auth.user.id;

    // 2. Parse Payload
    const body = await request.json();
    const { email, currentPassword, newPassword } = body;

    // Simple validation
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Current password is required" },
        { status: 400 }
      );
    }

    // 3. Verify User and Current Password
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
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
    const normalizedEmail = email?.trim().toLowerCase();

    if (normalizedEmail && normalizedEmail !== user.email) {
      // Check if email is already taken
      const existingEmailUser = await prisma.user.findUnique({
        where: { email: normalizedEmail },
      });
      if (existingEmailUser) {
        return NextResponse.json(
          { error: "Email is already in use" },
          { status: 409 }
        );
      }
      updateData.email = normalizedEmail;
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
