import { describe, expect, it, vi } from "vitest";
import {
  isJwtCredentialError,
  RefreshAuthError,
  RefreshRotationError,
  rotateRefreshTokenRecord,
} from "../../lib/security/refresh-rotation.js";

function createPrismaMock({ deleteCount = 1, createImpl } = {}) {
  const tx = {
    refreshToken: {
      deleteMany: vi.fn(async () => ({ count: deleteCount })),
      create: vi.fn(
        createImpl ||
          (async (args) => ({
            id: args.data.id,
          }))
      ),
    },
  };
  return {
    tx,
    prisma: {
      $transaction: vi.fn(async (fn) => fn(tx)),
    },
  };
}

describe("refresh token rotation", () => {
  const next = {
    currentTokenId: "old-jti",
    userId: "user-1",
    nextJti: "new-jti",
    hashedNextToken: "hashed",
    expiresAt: new Date("2030-01-01T00:00:00.000Z"),
  };

  it("deletes the old token and creates the replacement in one transaction", async () => {
    const { prisma, tx } = createPrismaMock();
    await rotateRefreshTokenRecord(prisma, next);
    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.refreshToken.deleteMany).toHaveBeenCalledWith({
      where: { id: "old-jti" },
    });
    expect(tx.refreshToken.create).toHaveBeenCalledTimes(1);
  });

  it("rolls back conceptually when create fails after delete", async () => {
    const { prisma } = createPrismaMock({
      createImpl: async () => {
        throw new Error("db down");
      },
    });
    await expect(rotateRefreshTokenRecord(prisma, next)).rejects.toBeInstanceOf(
      RefreshRotationError
    );
  });

  it("treats a second concurrent consume as credential failure, not 503", async () => {
    const { prisma } = createPrismaMock({ deleteCount: 0 });
    await expect(rotateRefreshTokenRecord(prisma, next)).rejects.toMatchObject({
      name: "RefreshAuthError",
      code: "refresh_token_not_found",
      clearCookie: true,
    });
  });

  it("does not clear cookies on rotation/internal failures", () => {
    const rotation = new RefreshRotationError();
    expect(rotation.clearCookie).toBe(false);
    expect(rotation.status).toBe(503);
    const auth = new RefreshAuthError("Token expired", "refresh_token_expired");
    expect(auth.clearCookie).toBe(true);
    expect(auth.status).toBe(401);
  });

  it("classifies JWT credential errors separately from server failures", () => {
    expect(isJwtCredentialError({ name: "TokenExpiredError" })).toBe(true);
    expect(isJwtCredentialError({ name: "JsonWebTokenError" })).toBe(true);
    expect(isJwtCredentialError({ name: "Error" })).toBe(false);
  });
});
