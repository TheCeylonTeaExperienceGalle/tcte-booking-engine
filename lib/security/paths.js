/**
 * Explicit API path classification for Proxy and tests.
 * Public matching must be exact. Never use startsWith("/api/booking").
 */

export const API_PATH_CLASS = {
  PUBLIC: "public",
  AUTH: "auth",
  API_KEY: "api-key",
  PROTECTED: "protected",
  UNMATCHED: "unmatched",
};

export function classifyApiPath(pathname) {
  if (typeof pathname !== "string" || !pathname.startsWith("/api")) {
    return API_PATH_CLASS.UNMATCHED;
  }

  if (pathname === "/api/auth" || pathname.startsWith("/api/auth/")) {
    return API_PATH_CLASS.AUTH;
  }

  if (pathname.startsWith("/api/public/")) {
    return API_PATH_CLASS.PUBLIC;
  }

  if (pathname === "/api/booking") {
    return API_PATH_CLASS.PUBLIC;
  }

  if (pathname === "/api/discount-rules/calculate") {
    return API_PATH_CLASS.PUBLIC;
  }

  if (
    pathname === "/api/bookings-report" ||
    pathname.startsWith("/api/bookings-report/")
  ) {
    return API_PATH_CLASS.API_KEY;
  }

  return API_PATH_CLASS.PROTECTED;
}

export function isPublicApiPath(pathname) {
  return classifyApiPath(pathname) === API_PATH_CLASS.PUBLIC;
}

export function skipsJwtAtProxy(pathname) {
  const classification = classifyApiPath(pathname);
  return (
    classification === API_PATH_CLASS.PUBLIC ||
    classification === API_PATH_CLASS.AUTH ||
    classification === API_PATH_CLASS.API_KEY
  );
}

export function shouldApplyPublicRateLimit(pathname) {
  if (pathname.startsWith("/api/public/payhere/")) {
    return false;
  }

  if (pathname === "/api/auth/login") {
    return true;
  }

  return isPublicApiPath(pathname);
}
