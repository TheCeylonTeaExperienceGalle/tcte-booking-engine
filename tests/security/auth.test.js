import { describe, expect, it } from "vitest";
import { generateAccessToken } from "../../lib/jwt.js";
import {
  requireAdmin,
  requireAuthenticatedUser,
} from "../../lib/security/auth.js";

function requestWithAuth(token) {
  const headers = new Headers();
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return new Request("http://127.0.0.1/api/bookings", { headers });
}

describe("route authorization helpers", () => {
  it("returns 401 for anonymous requests", () => {
    const result = requireAuthenticatedUser(requestWithAuth(null));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 401 for a malformed token", () => {
    const result = requireAuthenticatedUser(requestWithAuth("not-a-jwt"));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 401 for a token with the wrong signature", () => {
    const token = generateAccessToken("user-1", "user@example.test", "user");
    const tampered = `${token.slice(0, -4)}abcd`;
    const result = requireAuthenticatedUser(requestWithAuth(tampered));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 401 for an expired token", () => {
    const previous = process.env.JWT_ACCESS_EXPIRY;
    process.env.JWT_ACCESS_EXPIRY = "0s";
    const token = generateAccessToken("user-1", "user@example.test", "user");
    process.env.JWT_ACCESS_EXPIRY = previous;
    const result = requireAuthenticatedUser(requestWithAuth(token));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);
  });

  it("returns 403 when a normal user calls an admin helper", () => {
    const token = generateAccessToken("user-1", "user@example.test", "user");
    const result = requireAdmin(requestWithAuth(token));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  it("returns 403 when role is missing", () => {
    const token = generateAccessToken("user-1", "user@example.test", undefined);
    const result = requireAdmin(requestWithAuth(token));
    expect(result.ok).toBe(false);
    expect(result.status).toBe(403);
  });

  it("allows an admin token through", () => {
    const token = generateAccessToken("admin-1", "admin@example.test", "admin");
    const result = requireAdmin(requestWithAuth(token));
    expect(result.ok).toBe(true);
    expect(result.user.id).toBe("admin-1");
    expect(result.user.role).toBe("admin");
  });
});
