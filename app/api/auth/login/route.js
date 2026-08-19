import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
} from "@/lib/jwt";
import {
  comparePassword,
  hashRefreshToken,
  setRefreshTokenCookie,
} from "@/lib/auth";

export async function POST(request) {
  const cookieStore = await cookies();

  try {
    const body = await request.json().catch(() => null);
    const email = body?.email?.trim().toLowerCase();
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Fetch the user and verify credentials without leaking which check failed.
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, password: true, role: true, name: true },
    });
    const isValid = user
      ? await comparePassword(password, user.password)
      : false;

    if (!user || !isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    if (!user.id || !user.email) {
      console.error("User record missing required fields");
      return NextResponse.json(
        { error: "User record is incomplete" },
        { status: 500 }
      );
    }

    const normalizedEmail = user.email.trim().toLowerCase();

    // Generate both tokens up front so we can rotate them atomically.
    const accessToken = generateAccessToken(
      user.id,
      normalizedEmail,
      user.role
    );
    const jti = randomUUID();
    const refreshToken = generateRefreshToken(user.id, jti);
    const hashedRefresh = await hashRefreshToken(refreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await prisma.refreshToken.create({
      data: {
        id: jti,
        hashedToken: hashedRefresh,
        userId: user.id,
        expiresAt,
      },
    });

    await setRefreshTokenCookie(cookieStore, refreshToken);

    return NextResponse.json({
      accessToken,
      user: {
        id: user.id,
        email: normalizedEmail,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login error", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
