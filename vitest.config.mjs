import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

process.env.JWT_ACCESS_SECRET ||= "test-access-secret-32-characters-min";
process.env.JWT_REFRESH_SECRET ||= "test-refresh-secret-32-characters-min";

const config = {
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
    setupFiles: [path.join(root, "tests/setup-env.js")],
  },
  resolve: {
    alias: {
      "@": root,
    },
  },
};

export default config;
