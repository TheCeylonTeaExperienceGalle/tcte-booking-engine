import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { clearRefreshTokenCookie } from "@/lib/auth";
import { verifyRefreshToken } from "@/lib/jwt";

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    return NextResponse.json({ message: "Logged out successfully" });
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);

    await prisma.refreshToken
      .update({
        where: { id: decoded.jti },
        data: { revoked: true },
      })
      .catch(() => null);
  } catch (error) {
    console.error("Logout error", error);
  } finally {
    await clearRefreshTokenCookie(cookieStore);
  }

  return NextResponse.json({ message: "Logged out successfully" });
}
