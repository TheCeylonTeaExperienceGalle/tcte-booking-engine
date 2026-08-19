import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";
import {
  classifyApiPath,
  API_PATH_CLASS,
  shouldApplyPublicRateLimit,
} from "@/lib/security/paths";

const PUBLIC_RATE_LIMIT_WINDOW_MS = 60_000;
const PUBLIC_RATE_LIMIT_MAX_REQUESTS = 60;

const publicRateLimitStore = new Map();

function resolveClientIdentifier(request) {
  const trustProxy = process.env.TRUST_PROXY === "true";
  if (trustProxy) {
    const forwardedFor =
      request.headers.get("x-forwarded-for") ||
      request.headers.get("X-Forwarded-For") ||
      "";
    const remoteAddress = forwardedFor.split(",")[0]?.trim();
    if (remoteAddress) {
      return remoteAddress;
    }
  }

  const realIp = request.headers.get("x-real-ip") || request.ip;
  return realIp || "anonymous";
}

function applyPublicRateLimit(request) {
  const clientKey = resolveClientIdentifier(request);
  const now = Date.now();

  const existing = publicRateLimitStore.get(clientKey) || {
    count: 0,
    resetAt: now + PUBLIC_RATE_LIMIT_WINDOW_MS,
  };

  if (now > existing.resetAt) {
    existing.count = 0;
    existing.resetAt = now + PUBLIC_RATE_LIMIT_WINDOW_MS;
  }

  existing.count += 1;
  publicRateLimitStore.set(clientKey, existing);

  const remaining = Math.max(
    0,
    PUBLIC_RATE_LIMIT_MAX_REQUESTS - existing.count
  );
  const allowed = existing.count <= PUBLIC_RATE_LIMIT_MAX_REQUESTS;

  return {
    allowed,
    remaining,
    resetAt: existing.resetAt,
  };
}

function rateLimitExceededResponse(rateLimit) {
  const retryAfterSeconds = Math.max(
    1,
    Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
  );

  return NextResponse.json(
    { error: "Too many requests" },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(PUBLIC_RATE_LIMIT_MAX_REQUESTS),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

export function proxy(request) {
  const { pathname } = request.nextUrl;
  const classification = classifyApiPath(pathname);

  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  if (shouldApplyPublicRateLimit(pathname)) {
    const rateLimit = applyPublicRateLimit(request);
    if (!rateLimit.allowed) {
      return rateLimitExceededResponse(rateLimit);
    }
  }

  if (
    classification === API_PATH_CLASS.AUTH ||
    classification === API_PATH_CLASS.PUBLIC ||
    classification === API_PATH_CLASS.API_KEY
  ) {
    return NextResponse.next();
  }

  if (classification !== API_PATH_CLASS.PROTECTED) {
    return NextResponse.next();
  }

  const authorizationHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  try {
    const payload = verifyAccessToken(token);
    const headers = new Headers(request.headers);
    headers.set(
      "x-user",
      JSON.stringify({
        id: payload.userId,
        email: payload.email,
        role: payload.role,
      })
    );

    return NextResponse.next({ request: { headers } });
  } catch (error) {
    const headers = new Headers();
    if (error?.name === "TokenExpiredError") {
      headers.set("X-Auth-Error", "access_token_expired");
    } else {
      headers.set("X-Auth-Error", "unauthorized");
    }

    return NextResponse.json(
      { error: "Unauthorized" },
      {
        status: 401,
        headers,
      }
    );
  }
}

export const config = {
  matcher: ["/api/:path*"],
};
