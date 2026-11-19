import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * One pool per process, reused across hot reloads in development so a reload
 * does not leak connections.
 */
const globalForDb = globalThis as unknown as { __paic2Pool?: Pool };

const pool =
  globalForDb.__paic2Pool ??
  new Pool({
    connectionString:
      process.env.DATABASE_URL ??
      "postgresql://pixelspace:pixelspace@127.0.0.1:5432/pixelspace_classroom",
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb.__paic2Pool = pool;
}

export const db = drizzle(pool, { schema });
