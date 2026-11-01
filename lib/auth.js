import bcrypt from "bcryptjs";
import { getRefreshTokenCookieMaxAge } from "./jwt";

const SALT_ROUNDS = 10;
const COOKIE_NAME = "refreshToken";

async function resolveCookieStore(store) {
  if (!store) {
    throw new Error("Cookies store is required");
  }
  return store.then ? await store : store;
}

export function getCookieName() {
  return COOKIE_NAME;
}

export async function hashPassword(password) {
  if (!password) {
    throw new Error("Password is required for hashing");
  }
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function comparePassword(password, hash) {
  if (!password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

export async function hashRefreshToken(token) {
  if (!token) {
    throw new Error("Refresh token is required for hashing");
  }
  return bcrypt.hash(token, SALT_ROUNDS);
}

export async function compareRefreshToken(token, hash) {
  if (!token || !hash) {
    return false;
  }
  return bcrypt.compare(token, hash);
}

export async function setRefreshTokenCookie(cookiesStore, token) {
  const cookies = await resolveCookieStore(cookiesStore);
  const maxAge = getRefreshTokenCookieMaxAge();
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge,
    path: "/",
  });
}

export async function clearRefreshTokenCookie(cookiesStore) {
  if (!cookiesStore) {
    return;
  }
  const cookies = await resolveCookieStore(cookiesStore);
  cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
  cookies.delete(COOKIE_NAME);
}

import { verifyAccessToken } from "./jwt";
import prisma from "./prisma";

export function getAuthToken(request) {
  const authHeader =
    request.headers.get("Authorization") ||
    request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return null;
  }
  return authHeader.split(" ")[1];
}

export function checkAdminAuth(request) {
  const token = getAuthToken(request);
  if (!token) {
    return { error: "Missing authorization token", status: 401 };
  }

  try {
    const decoded = verifyAccessToken(token);
    const roleName =
      typeof decoded?.role === "string" ? decoded.role : decoded?.role?.name;
    if (!roleName || roleName.toLowerCase() !== "admin") {
      return { error: "Forbidden: Admin access required", status: 403 };
    }
    return { decoded };
  } catch (err) {
    return { error: "Invalid or expired token", status: 401 };
  }
}

/**
 * Server-side role permission checker.
 * Validates token, checks user and role active status, and verifies module read/write permissions.
 */
export async function requirePermission(request, moduleKey, action = "read") {
  const token = getAuthToken(request);
  if (!token) {
    return { error: "Missing authorization token", status: 401 };
  }

  let decoded;
  try {
    decoded = verifyAccessToken(token);
  } catch (err) {
    return { error: "Invalid or expired token", status: 401 };
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { role: true },
    });

    if (!user || !user.isActive) {
      return { error: "User account deactivated or not found", status: 403 };
    }

    if (user.role && user.role.isActive === false) {
      return { error: "Assigned role has been deactivated", status: 403 };
    }

    // Admins always have full permissions
    const roleName = user.role?.name?.toLowerCase();
    if (roleName === "admin") {
      return { authorized: true, user, role: user.role };
    }

    const permissions = user.role?.permissions || {};
    const modulePerm = permissions[moduleKey];

    // Parent module mapping fallback (e.g. programs falls back to session-settings)
    const parentMap = {
      programs: "session-settings",
      sessions: "session-settings",
      "session-types": "session-settings",
      "discount-rules": "session-settings",
      "commission-rules": "commission",
      "affiliate-earnings": "commission",
      "travel-agents": "leaders",
    };
    const parentKey = parentMap[moduleKey];
    const parentPerm = parentKey ? permissions[parentKey] : null;

    if (action === "write") {
      const hasWrite = Boolean(modulePerm?.write || parentPerm?.write);
      if (!hasWrite) {
        return {
          error: `Forbidden: You do not have write permission for ${moduleKey}`,
          status: 403,
        };
      }
    } else {
      // action === "read"
      const hasRead = Boolean(
        modulePerm?.read ||
          modulePerm?.write ||
          parentPerm?.read ||
          parentPerm?.write
      );
      if (!hasRead) {
        return {
          error: `Forbidden: You do not have read permission for ${moduleKey}`,
          status: 403,
        };
      }
    }

    return { authorized: true, user, role: user.role };
  } catch (err) {
    console.error("requirePermission error:", err);
    return { error: "Internal server error during permission check", status: 500 };
  }
}

