import { drizzle as drizzleNeon } from "drizzle-orm/neon-serverless";
import { drizzle as drizzlePg } from "drizzle-orm/node-postgres";
import { drizzle as drizzlePGlite } from "drizzle-orm/pglite";
import { Pool as PgPool } from "pg";
import { Pool as NeonPool } from "@neondatabase/serverless";
import { PGlite } from "@electric-sql/pglite";
import * as schema from "./schema";

let instance: any = null;
let pgliteClient: any = null;

export function getDb() {
  if (instance) return instance;

  const url = process.env.DATABASE_URL || "";
  const isNeon = url.includes("neon.tech") || (process.env.VERCEL === "1" && !url.includes("localhost"));

  if (isNeon) {
    const pool = new NeonPool({ connectionString: url });
    instance = drizzleNeon(pool, { schema });
    return instance;
  }

  // If local real postgres URL is supplied
  if (url && !url.includes("localhost:5432") && !url.includes("pglite") && !url.includes("pg-mem")) {
    try {
      const pool = new PgPool({ connectionString: url });
      instance = drizzlePg(pool, { schema });
      return instance;
    } catch {
      // fallback
    }
  }

  // Pure WASM Embedded PostgreSQL (PGlite) externalized from Next.js bundler
  if (!pgliteClient) {
    pgliteClient = new PGlite();
  }

  instance = drizzlePGlite(pgliteClient, { schema });
  return instance;
}

export const db = getDb();
