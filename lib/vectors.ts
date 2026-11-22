import { Pool } from "pg";

/**
 * Connection to the textbook vector database (pgvector, localhost-only).
 * A separate instance from the app database: it holds the copied books +
 * chunks with their embeddings, and the app only reads from it.
 */

const globalForVectors = globalThis as unknown as {
  __paic2VectorsPool?: Pool;
};

const pool =
  globalForVectors.__paic2VectorsPool ??
  new Pool({
    connectionString:
      process.env.VECTOR_DB_URL ??
      "postgresql://textbook:textbook@127.0.0.1:5434/textbook_kb",
    max: 4,
  });

if (process.env.NODE_ENV !== "production") {
  globalForVectors.__paic2VectorsPool = pool;
}

export const vectorQuery = <T extends import("pg").QueryResultRow>(
  text: string,
  params?: unknown[],
) => pool.query<T>(text, params);
