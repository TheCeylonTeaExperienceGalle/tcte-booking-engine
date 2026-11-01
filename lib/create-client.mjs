import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function databaseConfig(connectionString) {
  const url = new URL(connectionString);
  const host = url.hostname;
  const config = {
    host,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
    connectTimeout: 10000,
  };

  const local = host === "localhost" || host === "127.0.0.1";
  if (!local) {
    const caPath = path.join(projectRoot, "prisma/aiven-ca.pem");
    config.ssl = fs.existsSync(caPath)
      ? { ca: fs.readFileSync(caPath), rejectUnauthorized: true }
      : { rejectUnauthorized: false };
  }

  return config;
}

export function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set");
  }

  const adapter = new PrismaMariaDb(databaseConfig(connectionString));
  return new PrismaClient({ adapter });
}
