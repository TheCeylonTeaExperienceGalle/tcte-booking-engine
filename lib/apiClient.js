"use client";

class AuthError extends Error {
  constructor(message = "Session expired. Please sign in again.") {
    super(message);
    this.name = "AuthError";
  }
}

let refreshPromise = null;

const ACCESS_TOKEN_EXPIRED_HEADER = "access_token_expired";
const REFRESH_ERRORS_REQUIRING_LOGOUT = new Set([
  "refresh_token_missing",
  "refresh_token_not_found",
  "refresh_token_mismatch",
  "refresh_token_revoked",
  "refresh_token_expired",
  "refresh_token_invalid",
  "user_not_found",
]);

function clearStoredSession() {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem("accessToken");
  localStorage.removeItem("user");
}

function redirectToLogin() {
  if (typeof window === "undefined") {
    return;
  }
  if (window.location.pathname === "/login") {
    return;
  }
  window.location.replace("/login");
}

async function refreshAccessToken() {
  if (typeof window === "undefined") {
    throw new Error("refreshAccessToken can only run in the browser");
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshCall = (async () => {
    const response = await fetch("/api/auth/refresh", {
      method: "POST",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

    let data = null;
    try {
      data = await response.json();
    } catch (error) {
      data = null;
    }

    const errorCode = response.headers.get("X-Auth-Error") || data?.code;

    if (!response.ok || !data?.accessToken) {
      if (errorCode && REFRESH_ERRORS_REQUIRING_LOGOUT.has(errorCode)) {
        throw new AuthError();
      }
      const message = data?.error || "Failed to refresh access token";
      throw new Error(message);
    }

    localStorage.setItem("accessToken", data.accessToken);
    return data.accessToken;
  })();

  refreshPromise = refreshCall;

  refreshCall.finally(() => {
    if (refreshPromise === refreshCall) {
      refreshPromise = null;
    }
  });

  return refreshCall;
}

function handleUnauthorized() {
  clearStoredSession();
  redirectToLogin();
}

export async function fetchWithAuth(input, init = {}) {
  if (typeof window === "undefined") {
    throw new Error("fetchWithAuth can only run in the browser");
  }

  const { skipAuth, ...requestInit } = init;
  const requiresAuth = skipAuth !== true;

  const executeFetch = async (accessToken) => {
    const headers = new Headers(requestInit.headers || {});
    if (requiresAuth && accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }

    const credentials = requestInit.credentials ?? "same-origin";

    return fetch(input, {
      ...requestInit,
      headers,
      credentials,
    });
  };

  const initialToken = requiresAuth
    ? localStorage.getItem("accessToken")
    : null;
  let response = await executeFetch(initialToken);

  if (!requiresAuth || response.status !== 401) {
    return response;
  }

  const initialAuthError = response.headers.get("X-Auth-Error");
  if (initialAuthError && initialAuthError !== ACCESS_TOKEN_EXPIRED_HEADER) {
    handleUnauthorized();
    throw new AuthError();
  }

  try {
    const newToken = await refreshAccessToken();
    response = await executeFetch(newToken);
  } catch (error) {
    handleUnauthorized();
    throw error instanceof AuthError ? error : new AuthError();
  }

  if (response.status === 401) {
    handleUnauthorized();
    throw new AuthError();
  }

  return response;
}

export { AuthError };
