"use client";

import { useEffect } from "react";

/**
 * Handles Next.js deployment / chunk mismatch errors.
 * When a new build is deployed, old JS/CSS chunks are purged from the server.
 * If an active browser tab tries to fetch an old chunk, Turbopack/Webpack
 * throws a ChunkLoadError. This component catches that error and gracefully
 * reloads the page to fetch the newly deployed build assets.
 */
export default function ChunkErrorHandler() {
  useEffect(() => {
    function triggerReload() {
      const lastReloadKey = "tcte_chunk_error_reload";
      const lastReload = parseInt(
        sessionStorage.getItem(lastReloadKey) || "0",
        10
      );
      const now = Date.now();

      // Prevent infinite reload loops (limit to once every 10 seconds)
      if (now - lastReload > 10000) {
        sessionStorage.setItem(lastReloadKey, now.toString());
        window.location.reload();
      }
    }

    function handleChunkError(errorMsg) {
      if (!errorMsg || typeof errorMsg !== "string") return;

      const isChunkError =
        errorMsg.includes("ChunkLoadError") ||
        errorMsg.includes("Failed to load chunk") ||
        errorMsg.includes("Loading chunk");

      if (isChunkError) {
        triggerReload();
      }
    }

    function onWindowError(event) {
      // 1. Standard JS chunk error message check
      const message =
        event?.message ||
        event?.error?.message ||
        "";
      handleChunkError(message);

      // 2. Resource load failure (<link rel="stylesheet"> or <script>) in capture phase
      const target = event?.target;
      if (target && (target.tagName === "LINK" || target.tagName === "SCRIPT")) {
        const src = target.href || target.src || "";
        if (
          src.includes("/_next/static/") ||
          (target.tagName === "LINK" && target.rel === "stylesheet" && src.includes(".css"))
        ) {
          console.warn("Detected missing or outdated chunk resource, reloading:", src);
          triggerReload();
        }
      }
    }

    function onUnhandledRejection(event) {
      const reason = event?.reason;
      const message =
        typeof reason === "string"
          ? reason
          : reason?.message || "";
      handleChunkError(message);
    }

    // useCapture = true is necessary to capture resource loading errors (<link>, <script>)
    window.addEventListener("error", onWindowError, true);
    window.addEventListener("unhandledrejection", onUnhandledRejection);

    return () => {
      window.removeEventListener("error", onWindowError, true);
      window.removeEventListener("unhandledrejection", onUnhandledRejection, true);
    };
  }, []);

  return null;
}

