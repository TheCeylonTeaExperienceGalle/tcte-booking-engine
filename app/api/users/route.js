import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { jsonAuthError, requireAdmin } from "@/lib/security/auth";

export async function POST(request) {
  const auth = requireAdmin(request);
  if (!auth.ok) return jsonAuthError(auth);

  try {
    const body = await request.json();
    const { name, email, password } = body;

    if (!email || !password || !name) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters" },
          { status: 400 }
        );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 3. Check for existing user
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email is already in use" },
        { status: 409 }
      );
    }

    // 4. Create User
    const hashedPassword = await hashPassword(password);

    // Default to creating an admin user as requested ("give admin added")
    // Or we could pass a role in body, but for now assuming admin creation.
    const newUser = await prisma.user.create({
      data: {
        name,
        email: normalizedEmail,
        password: hashedPassword,
        role: "admin",
      },
      select: {
          id: true,
          name: true,
          email: true,
          role: true,
          createdAt: true
      }
    });

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: newUser,
    });
  } catch (error) {
    console.error("Create user error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
