import { NextResponse } from "next/server";
import { verifyAccessToken } from "@/lib/jwt";

const PUBLIC_RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute window
const PUBLIC_RATE_LIMIT_MAX_REQUESTS = 300; // Generous limit for normal user browsing and interactions
const CALC_RATE_LIMIT_MAX_REQUESTS = 600; // Extra generous limit for calculation endpoints

const publicRateLimitStore = new Map();

function isPublicApiPath(pathname) {
  return (
    pathname.startsWith("/api/public/") ||
    pathname === "/api/booking" ||
    pathname.startsWith("/api/booking/") ||
    pathname.startsWith("/api/availability") ||
    pathname.startsWith("/api/discount-rules/calculate")
  );
}

function resolveClientIdentifier(request) {
  const forwardedFor =
    request.headers.get("x-forwarded-for") ||
    request.headers.get("X-Forwarded-For") ||
    "";
  const remoteAddress = forwardedFor.split(",")[0]?.trim();
  if (remoteAddress) {
    return remoteAddress;
  }

  const realIp = request.headers.get("x-real-ip") || request.ip;
  if (realIp) return realIp;

  // For localhost / development environments, isolate by user-agent or host
  const userAgent = request.headers.get("user-agent") || "unknown-agent";
  return `local-${userAgent.slice(0, 30)}`;
}

function applyPublicRateLimit(request, pathname) {
  const isCalculation = pathname.startsWith("/api/discount-rules/calculate");
  const maxRequests = isCalculation ? CALC_RATE_LIMIT_MAX_REQUESTS : PUBLIC_RATE_LIMIT_MAX_REQUESTS;
  const storeKey = `${resolveClientIdentifier(request)}:${isCalculation ? "calc" : "general"}`;
  const now = Date.now();

  const existing = publicRateLimitStore.get(storeKey) || {
    count: 0,
    resetAt: now + PUBLIC_RATE_LIMIT_WINDOW_MS,
  };

  if (now > existing.resetAt) {
    existing.count = 0;
    existing.resetAt = now + PUBLIC_RATE_LIMIT_WINDOW_MS;
  }

  existing.count += 1;
  publicRateLimitStore.set(storeKey, existing);

  const remaining = Math.max(0, maxRequests - existing.count);
  const allowed = existing.count <= maxRequests;

  return {
    allowed,
    remaining,
    maxRequests,
    resetAt: existing.resetAt,
  };
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  if (!pathname.startsWith("/api") || pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  const isPublic = isPublicApiPath(pathname);

  if (request.method === "OPTIONS") {
    return NextResponse.next();
  }

  if (isPublic) {
    const rateLimit = applyPublicRateLimit(request, pathname);

    if (!rateLimit.allowed) {
      const retryAfterSeconds = Math.max(
        1,
        Math.ceil((rateLimit.resetAt - Date.now()) / 1000)
      );

      const headers = new Headers({
        "Retry-After": String(retryAfterSeconds),
        "X-RateLimit-Limit": String(rateLimit.maxRequests),
        "X-RateLimit-Remaining": "0",
      });

      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers,
        }
      );
    }

    const remainingHeader = Math.max(0, rateLimit.remaining).toString();
    return NextResponse.next({
      headers: new Headers({
        "X-RateLimit-Limit": String(rateLimit.maxRequests),
        "X-RateLimit-Remaining": remainingHeader,
      }),
    });
  }

  const authorizationHeader =
    request.headers.get("authorization") ||
    request.headers.get("Authorization") ||
    "";

  if (!authorizationHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const token = authorizationHeader.replace("Bearer ", "").trim();

  // Allow external report API key bypass if configured
  const reportApiKey = process.env.BOOKINGS_REPORT_API_KEY;
  if (pathname === "/api/bookings-report" && reportApiKey && token === reportApiKey) {
    return NextResponse.next();
  }

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
    console.error("Proxy auth error", error);

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
