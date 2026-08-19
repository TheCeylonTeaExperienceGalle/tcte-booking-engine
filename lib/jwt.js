import jwt from "jsonwebtoken";

const DEFAULT_ACCESS_EXPIRY = "15m";
const DEFAULT_REFRESH_EXPIRY = "7d";
const MIN_SECRET_LENGTH = 32;

const requiredSecrets = [
  { name: "JWT_ACCESS_SECRET", value: process.env.JWT_ACCESS_SECRET },
  { name: "JWT_REFRESH_SECRET", value: process.env.JWT_REFRESH_SECRET },
];

for (const { name, value } of requiredSecrets) {
  if (!value || value.length < MIN_SECRET_LENGTH) {
    throw new Error(
      `${name} must be set and at least ${MIN_SECRET_LENGTH} characters long`
    );
  }
}

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;

const getAccessExpiry = () =>
  process.env.JWT_ACCESS_EXPIRY || DEFAULT_ACCESS_EXPIRY;
const getRefreshExpiry = () =>
  process.env.JWT_REFRESH_EXPIRY || DEFAULT_REFRESH_EXPIRY;

export function parseExpiryToMs(expiry = DEFAULT_REFRESH_EXPIRY) {
  const normalized = expiry.trim().toLowerCase();
  const units = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000,
  };
  const match = normalized.match(/^(\d+)([smhdw])$/);
  if (!match) {
    throw new Error(`Invalid expiry format: ${expiry}`);
  }
  const value = parseInt(match[1], 10);
  const unit = match[2];
  return value * units[unit];
}

export function generateAccessToken(userId, email, role) {
  if (!userId || !email) {
    throw new Error(
      "userId and email are required to generate an access token"
    );
  }
  return jwt.sign({ userId, email, role, type: "access" }, accessSecret, {
    algorithm: "HS256",
    expiresIn: getAccessExpiry(),
  });
}

export function generateRefreshToken(userId, jti) {
  if (!userId || !jti) {
    throw new Error("userId and jti are required to generate a refresh token");
  }
  return jwt.sign({ userId, jti, type: "refresh" }, refreshSecret, {
    algorithm: "HS256",
    expiresIn: getRefreshExpiry(),
  });
}

export function verifyAccessToken(token) {
  if (!token) {
    throw new Error("Missing access token");
  }
  return jwt.verify(token, accessSecret);
}

export function verifyRefreshToken(token) {
  if (!token) {
    throw new Error("Missing refresh token");
  }
  return jwt.verify(token, refreshSecret);
}

export function getRefreshTokenExpiryDate() {
  const ms = parseExpiryToMs(getRefreshExpiry());
  return new Date(Date.now() + ms);
}

export function getRefreshTokenCookieMaxAge() {
  return parseExpiryToMs(getRefreshExpiry());
}
