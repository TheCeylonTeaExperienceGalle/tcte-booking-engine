import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.ts";

const { Pool } = pg;

function isLocalHost(hostname) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

function poolConfig(connectionString) {
  const url = new URL(connectionString);
  const local = isLocalHost(url.hostname);
  const transactionPooler =
    url.port === "6543" || url.searchParams.get("pgbouncer") === "true";

  // TIME columns are stored as clock values and read back as 1970-01-01 UTC.
  // A non-UTC session TimeZone shifts that round-trip. Transaction-mode
  // poolers reject startup options, so UTC is applied on connect instead.
  if (!transactionPooler && !/TimeZone/i.test(url.searchParams.get("options") || "")) {
    const current = url.searchParams.get("options");
    url.searchParams.set(
      "options",
      [current, "-c TimeZone=UTC"].filter(Boolean).join(" ")
    );
  }

  // node-pg treats sslmode=require as verify-full and then rejects Supabase's
  // certificate chain. Drop sslmode from the URL and require TLS here instead.
  url.searchParams.delete("sslmode");
  url.searchParams.delete("ssl");

  const config = {
    connectionString: url.toString(),
    max: 1,
  };

  if (!local) {
    config.ssl = { rejectUnauthorized: false };
  }

  return { config, transactionPooler };
}

export function createPrismaClient(connectionString = process.env.DATABASE_URL) {
  if (!connectionString) {
    throw new Error("DATABASE_URL must be set");
  }

  const { config, transactionPooler } = poolConfig(connectionString);
  const pool = new Pool(config);

  if (transactionPooler) {
    pool.on("connect", (client) => {
      client.query("SET TIME ZONE 'UTC'").catch((error) => {
        console.error("Failed to set Postgres TimeZone to UTC:", error.message);
      });
    });
  }

  const adapter = new PrismaPg(pool, { disposeExternalPool: true });
  return new PrismaClient({ adapter });
}
