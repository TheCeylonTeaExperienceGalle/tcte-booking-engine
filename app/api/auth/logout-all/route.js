import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import prisma from "@/lib/prisma";
import { clearRefreshTokenCookie } from "@/lib/auth";
import { jsonAuthError, requireAuthenticatedUser } from "@/lib/security/auth";

export async function POST(request) {
  const auth = requireAuthenticatedUser(request);
  if (!auth.ok) return jsonAuthError(auth);

  const cookieStore = await cookies();

  try {
    await prisma.refreshToken.updateMany({
      where: { userId: auth.user.id },
      data: { revoked: true },
    });

    await clearRefreshTokenCookie(cookieStore);

    return NextResponse.json({ message: "Logged out from all devices" });
  } catch (error) {
    console.error("Logout-all error");
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }
}
