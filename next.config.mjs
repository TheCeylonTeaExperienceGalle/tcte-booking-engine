import path from "path";
import { fileURLToPath } from "url";

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  turbopack: {
    root: projectRoot,
  },

  reactCompiler: false, // re-enable only after measuring build time

  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  serverExternalPackages: ["@prisma/client", "@prisma/adapter-pg", "pg"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
    qualities: [70, 75, 100],
  },

  // Page HTML / RSC must never be cached by nginx or the browser, otherwise a
  // new deploy leaves stale pages pointing at deleted hashed chunks (404s).
  // Hashed static assets (_next/), APIs and files with extensions are excluded.
  async headers() {
    const noStore = [
      {
        key: "Cache-Control",
        value: "private, no-cache, no-store, max-age=0, must-revalidate",
      },
    ];

    return [
      {
        source: "/:path((?!_next/|api/|.*\\..*).*)",
        headers: noStore,
      },
    ];
  },
};

export default nextConfig;
