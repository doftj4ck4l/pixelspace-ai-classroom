#!/usr/bin/env node
/**
 * One-off: move the pre-Postgres JSON registries (data/pi-threads.json,
 * data/pi-artifacts.json) into the database, owned by one account.
 *
 * Run on the host that has DATABASE_URL and the old files:
 *   node scripts/migrate-legacy-json.mjs benjamin@nextplus.com.my
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const email = process.argv[2];
if (!email) {
  console.error("usage: migrate-legacy-json.mjs <owner-email>");
  process.exit(1);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });

const readJson = async (file) => {
  try {
    return JSON.parse(await readFile(file, "utf8"));
  } catch {
    return null;
  }
};

const run = async () => {
  const { rows: users } = await pool.query(
    'SELECT id FROM "user" WHERE email = $1',
    [email],
  );
  const userId = users[0]?.id;
  if (!userId) {
    console.error(`no user with email ${email} — register first`);
    process.exit(1);
  }

  const dataDir = path.join(process.cwd(), "data");

  const threads = await readJson(path.join(dataDir, "pi-threads.json"));
  let threadsMoved = 0;
  if (threads) {
    for (const thread of Object.values(threads)) {
      const res = await pool.query(
        `INSERT INTO threads (id, user_id, pi_conversation_id, title, status, last_message_at)
         VALUES ($1, $2, $3, $4, $5, $6) ON CONFLICT (id) DO NOTHING`,
        [
          thread.remoteId,
          userId,
          thread.conversationId ?? null,
          thread.title ?? null,
          thread.status ?? "regular",
          thread.lastMessageAt ? new Date(thread.lastMessageAt) : null,
        ],
      );
      threadsMoved += res.rowCount;
    }
  }

  const artifacts = await readJson(path.join(dataDir, "pi-artifacts.json"));
  let artifactsMoved = 0;
  if (Array.isArray(artifacts)) {
    for (const artifact of artifacts) {
      const res = await pool.query(
        `INSERT INTO artifacts (id, user_id, thread_id, title, type, kind, url, path, spec, dedupe_key, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) ON CONFLICT (id) DO NOTHING`,
        [
          artifact.id,
          userId,
          artifact.threadId ?? null,
          artifact.title,
          artifact.type,
          artifact.kind ?? "file",
          artifact.url ?? null,
          artifact.path ?? null,
          artifact.spec ? JSON.stringify(artifact.spec) : null,
          artifact.dedupeKey ?? null,
          artifact.createdAt ? new Date(artifact.createdAt) : new Date(),
        ],
      );
      artifactsMoved += res.rowCount;
    }
  }

  console.log(
    `moved ${threadsMoved} threads and ${artifactsMoved} artifacts to ${email}`,
  );
  await pool.end();
};

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
