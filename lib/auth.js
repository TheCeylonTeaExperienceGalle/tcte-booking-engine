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
