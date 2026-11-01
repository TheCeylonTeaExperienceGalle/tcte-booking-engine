import { config } from "dotenv";
import { defineConfig, env } from "prisma/config";

config({ path: ".env" });
config({ path: ".env.local" });

// Migrations and seed use the direct connection. Runtime keeps DATABASE_URL.
const datasourceUrl = process.env.DIRECT_URL
  ? process.env.DIRECT_URL
  : env("DATABASE_URL");

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: datasourceUrl,
  },
});
