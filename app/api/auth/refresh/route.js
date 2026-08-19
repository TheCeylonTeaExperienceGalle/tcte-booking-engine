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
import {
  isJwtCredentialError,
  RefreshAuthError,
  RefreshRotationError,
  rotateRefreshTokenRecord,
} from "@/lib/security/refresh-rotation";

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
      throw new RefreshAuthError("Token not found", "refresh_token_not_found");
    }

    const matches = await compareRefreshToken(
      refreshToken,
      tokenRecord.hashedToken
    );
    if (!matches) {
      throw new RefreshAuthError("Invalid token", "refresh_token_mismatch");
    }

    if (tokenRecord.revoked) {
      throw new RefreshAuthError("Token revoked", "refresh_token_revoked");
    }

    if (tokenRecord.expiresAt <= new Date()) {
      throw new RefreshAuthError("Token expired", "refresh_token_expired");
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });
    if (!user) {
      throw new RefreshAuthError("User not found", "user_not_found", {
        status: 404,
      });
    }

    const nextJti = randomUUID();
    const nextRefreshToken = generateRefreshToken(user.id, nextJti);
    const hashedNextToken = await hashRefreshToken(nextRefreshToken);
    const expiresAt = getRefreshTokenExpiryDate();

    await rotateRefreshTokenRecord(prisma, {
      currentTokenId: tokenRecord.id,
      userId: user.id,
      nextJti,
      hashedNextToken,
      expiresAt,
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
    if (error instanceof RefreshAuthError) {
      if (error.clearCookie) {
        await clearRefreshTokenCookie(cookieStore);
      }
      return buildErrorResponse(error.message, error.code, error.status);
    }

    if (error instanceof RefreshRotationError) {
      console.error("Refresh rotation failed");
      return buildErrorResponse("Unable to refresh session", error.code, 503);
    }

    if (isJwtCredentialError(error)) {
      await clearRefreshTokenCookie(cookieStore);
      return buildErrorResponse("Invalid token", "refresh_token_invalid");
    }

    console.error("Refresh error");
    return buildErrorResponse(
      "Unable to refresh session",
      "refresh_internal_error",
      503
    );
  }
}
