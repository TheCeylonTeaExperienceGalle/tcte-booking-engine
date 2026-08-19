import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  API_PATH_CLASS,
  classifyApiPath,
  isPublicApiPath,
  shouldApplyPublicRateLimit,
  skipsJwtAtProxy,
} from "../../lib/security/paths.js";

describe("API path classification", () => {
  it("treats the public checkout route as public", () => {
    expect(classifyApiPath("/api/booking")).toBe(API_PATH_CLASS.PUBLIC);
    expect(isPublicApiPath("/api/booking")).toBe(true);
    expect(skipsJwtAtProxy("/api/booking")).toBe(true);
  });

  it("does not treat /api/booking/anything as public (no child checkout routes)", () => {
    expect(classifyApiPath("/api/booking/anything")).toBe(API_PATH_CLASS.PROTECTED);
    expect(isPublicApiPath("/api/booking/anything")).toBe(false);
  });

  it("regresses booking vs bookings", () => {
    expect(isPublicApiPath("/api/booking")).toBe(true);
    expect(isPublicApiPath("/api/bookings")).toBe(false);
    expect(classifyApiPath("/api/bookings")).toBe(API_PATH_CLASS.PROTECTED);
    expect(classifyApiPath("/api/bookings/1/manage")).toBe(API_PATH_CLASS.PROTECTED);
    expect(skipsJwtAtProxy("/api/bookings")).toBe(false);
    expect(skipsJwtAtProxy("/api/bookings/1/manage")).toBe(false);
  });

  it("does not classify bookings-report as /api/booking", () => {
    expect(isPublicApiPath("/api/bookings-report")).toBe(false);
    expect(classifyApiPath("/api/bookings-report")).toBe(API_PATH_CLASS.API_KEY);
    expect(skipsJwtAtProxy("/api/bookings-report")).toBe(true);
  });

  it("keeps intended public routes public", () => {
    expect(classifyApiPath("/api/public/programs")).toBe(API_PATH_CLASS.PUBLIC);
    expect(classifyApiPath("/api/public/payhere/notify")).toBe(API_PATH_CLASS.PUBLIC);
    expect(classifyApiPath("/api/discount-rules/calculate")).toBe(API_PATH_CLASS.PUBLIC);
  });

  it("protects admin APIs", () => {
    for (const pathname of [
      "/api/programs",
      "/api/leaders",
      "/api/commissions",
      "/api/customers",
      "/api/sessions",
      "/api/locations",
      "/api/dashboard/stats",
    ]) {
      expect(classifyApiPath(pathname)).toBe(API_PATH_CLASS.PROTECTED);
      expect(skipsJwtAtProxy(pathname)).toBe(false);
    }
  });

  it("does not rate-limit PayHere notify", () => {
    expect(shouldApplyPublicRateLimit("/api/public/payhere/notify")).toBe(false);
    expect(shouldApplyPublicRateLimit("/api/booking")).toBe(true);
    expect(shouldApplyPublicRateLimit("/api/auth/login")).toBe(true);
  });

  it("does not use a startsWith(/api/booking) prefix in Proxy source", () => {
    const source = readFileSync(path.join(process.cwd(), "proxy.js"), "utf8");
    expect(source).not.toMatch(/startsWith\(["']\/api\/booking["']\)/);
  });
});
