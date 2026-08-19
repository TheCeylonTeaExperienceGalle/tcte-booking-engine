import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";
import prisma from "@/lib/prisma";
import {
  generateAccessToken,
  generateRefreshToken,
  getRefreshTokenExpiryDate,
  verifyRefreshToken,
} from "@/lib/jwt";
import {
  clearRefreshTokenCookie,
  compareRefreshToken,
  hashRefreshToken,
  setRefreshTokenCookie,
} from "@/lib/auth";

function buildErrorResponse(message, code, status = 401) {
  return NextResponse.json(
    { error: message, code },
    {
      status,
      headers: {
        "X-Auth-Error": code,
      },
    }
  );
}

export async function POST() {
  const cookieStore = await cookies();
  const refreshToken = cookieStore.get("refreshToken")?.value;

  if (!refreshToken) {
    return buildErrorResponse("No refresh token", "refresh_token_missing");
  }

  try {
    const decoded = verifyRefreshToken(refreshToken);
    const tokenRecord = await prisma.refreshToken.findUnique({
      where: { id: decoded.jti },
    });

    if (!tokenRecord) {
      await clearRefreshTokenCookie(cookieStore);
      return buildErrorResponse("Token not found", "refresh_token_not_found");
    }

    const matches = await compareRefreshToken(
      refreshToken,
      tokenRecord.hashedToken
    );
    if (!matches) {
      await clearRefreshTokenCookie(cookieStore);
      return buildErrorResponse("Invalid token", "refresh_token_mismatch");
    }

    if (tokenRecord.revoked) {
      await clearRefreshTokenCookie(cookieStore);
      return buildErrorResponse("Token revoked", "refresh_token_revoked");
    }

    if (tokenRecord.expiresAt <= new Date()) {
      await clearRefreshTokenCookie(cookieStore);
      return buildErrorResponse("Token expired", "refresh_token_expired");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      await clearRefreshTokenCookie(cookieStore);
      return buildErrorResponse("User not found", "user_not_found", 404);
    }

    // Token rotation: delete the old token and mint a brand new pair.
    await prisma.refreshToken.delete({ where: { id: tokenRecord.id } });

    const nextJti = randomUUID();
    const nextRefreshToken = generateRefreshToken(user.id, nextJti);
    const hashedNextToken = await hashRefreshToken(nextRefreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await prisma.refreshToken.create({
      data: {
        id: nextJti,
        hashedToken: hashedNextToken,
        userId: user.id,
        expiresAt,
      },
    });

    await setRefreshTokenCookie(cookieStore, nextRefreshToken);

    const accessToken = generateAccessToken(user.id, user.email, user.role);

    return NextResponse.json(
      { accessToken },
      {
        headers: {
          "X-Auth-Status": "token_refreshed",
        },
      }
    );
  } catch (error) {
    console.error("Refresh error", error);
    await clearRefreshTokenCookie(cookieStore);
    return buildErrorResponse("Invalid token", "refresh_token_invalid");
  }
}
