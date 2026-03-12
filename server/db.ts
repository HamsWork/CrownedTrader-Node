import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "@shared/schema";

function getDatabaseUrl(): string {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }
  throw new Error("DATABASE_URL environment variable is not set. Set it in .env or Replit secrets.");
}

export const pool = new Pool({
  connectionString: getDatabaseUrl(),
  connectionTimeoutMillis: 15000,
  ssl: process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: true } : undefined,
});
export const db = drizzle(pool, { schema });
