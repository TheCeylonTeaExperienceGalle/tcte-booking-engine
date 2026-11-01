import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { clearRefreshTokenCookie } from "@/lib/auth";
import { verifyAccessToken } from "@/lib/jwt";

export async function POST(request) {
  const authHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";
  const cookieStore = await cookies();

  if (!authHeader.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Authorization header missing" },
      { status: 401 }
    );
  }

  const token = authHeader.replace("Bearer ", "").trim();

  try {
    const payload = verifyAccessToken(token);

    await prisma.refreshToken.updateMany({
      where: { userId: payload.userId },
      data: { revoked: true },
    });

    await clearRefreshTokenCookie(cookieStore);

    return NextResponse.json({ message: "Logged out from all devices" });
  } catch (error) {
    console.error("Logout-all error", error);
    return NextResponse.json(
      { error: "Invalid or expired access token" },
      { status: 401 }
    );
  }
}
