import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

function readBearerToken(request) {
  const authorizationHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return null;
  }

  const token = authorizationHeader.slice("Bearer ".length).trim();
  return token.length > 0 ? token : null;
}

export function unauthorizedResult() {
  return { ok: false, status: 401, error: "Unauthorized" };
}

export function forbiddenResult() {
  return { ok: false, status: 403, error: "Forbidden" };
}

export function jsonAuthError(auth) {
  return NextResponse.json(
    { error: auth?.error || "Unauthorized" },
    { status: auth?.status || 401 }
  );
}

/**
 * Verifies the Bearer access token again in the route handler.
 * Does not trust client-supplied x-user headers.
 */
export function requireAuthenticatedUser(request) {
  const token = readBearerToken(request);
  if (!token) {
    return unauthorizedResult();
  }

  try {
    const payload = verifyAccessToken(token);
    if (!payload?.userId || payload.type !== "access") {
      return unauthorizedResult();
    }

    return {
      ok: true,
      user: {
        id: payload.userId,
        email: payload.email || null,
        role: payload.role || null,
      },
    };
  } catch {
    return unauthorizedResult();
  }
}

/**
 * Authenticated administrator. Missing/unknown roles have no privilege.
 */
export function requireAdmin(request) {
  const auth = requireAuthenticatedUser(request);
  if (!auth.ok) {
    return auth;
  }

  if (auth.user.role !== "admin") {
    return forbiddenResult();
  }

  return auth;
}
