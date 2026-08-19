export class RefreshAuthError extends Error {
  constructor(message, code, { status = 401, clearCookie = true } = {}) {
    super(message);
    this.name = "RefreshAuthError";
    this.code = code;
    this.status = status;
    this.clearCookie = clearCookie;
  }
}

export class RefreshRotationError extends Error {
  constructor(message = "Failed to rotate refresh token") {
    super(message);
    this.name = "RefreshRotationError";
    this.code = "refresh_rotation_failed";
    this.status = 503;
    this.clearCookie = false;
  }
}

export function isJwtCredentialError(error) {
  const name = error?.name || "";
  return (
    name === "JsonWebTokenError" ||
    name === "TokenExpiredError" ||
    name === "NotBeforeError"
  );
}

export async function rotateRefreshTokenRecord(
  prismaClient,
  { currentTokenId, userId, nextJti, hashedNextToken, expiresAt }
) {
  try {
    await prismaClient.$transaction(async (tx) => {
      const deleted = await tx.refreshToken.deleteMany({
        where: { id: currentTokenId },
      });
      if (deleted.count !== 1) {
        throw new RefreshAuthError("Token not found", "refresh_token_not_found");
      }
      await tx.refreshToken.create({
        data: {
          id: nextJti,
          hashedToken: hashedNextToken,
          userId,
          expiresAt,
        },
      });
    });
  } catch (error) {
    if (error instanceof RefreshAuthError) {
      throw error;
    }
    throw new RefreshRotationError();
  }
}
