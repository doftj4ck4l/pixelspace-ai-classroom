#!/usr/bin/env node
/**
 * Match the mirrored NAS textbooks to the vector-database books by sha256 and
 * upload each matched PDF into object storage as textbooks/<file_name>.
 * Files that match no book are written to /tmp/textbooks-unmatched.txt for
 * the (small) embed pass. Run on the deploy host:
 *
 *   node scripts/upload-textbooks.mjs
 */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { Client } from "pg";
import {
  CreateBucketCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const envPath = path.join(os.homedir(), "Developer/gemini-clone/.env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const match = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
  if (match && !process.env[match[1]]) {
    process.env[match[1]] = match[2].replace(/^"|"$/g, "");
  }
}

const ROOT = path.join(os.homedir(), "textbook-downloads");
const BUCKET = process.env.S3_BUCKET;
const pool = new Client({ connectionString: process.env.VECTOR_DB_URL });
await pool.connect();
const { rows } = await pool.query(
  "select id, file_hash, file_name from books where file_hash is not null and file_name is not null",
);
const byHash = new Map(rows.map((row) => [row.file_hash, row]));
console.log(`books with hashes: ${byHash.size}`);

const s3 = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY,
    secretAccessKey: process.env.S3_SECRET_KEY,
  },
  forcePathStyle: true,
});
try {
  await s3.send(new HeadBucketCommand({ Bucket: BUCKET }));
} catch {
  await s3.send(new CreateBucketCommand({ Bucket: BUCKET }));
}

const files = [];
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".pdf"))
      files.push(full);
  }
};
walk(ROOT);
console.log(`mirrored files: ${files.length}`);

let uploaded = 0;
const unmatched = [];
for (const file of files) {
  const bytes = readFileSync(file);
  const hash = createHash("sha256").update(bytes).digest("hex");
  const book = byHash.get(hash);
  if (!book) {
    unmatched.push(file);
    continue;
  }
  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: `textbooks/${book.file_name}`,
      Body: bytes,
      ContentType: "application/pdf",
    }),
  );
  uploaded += 1;
  if (uploaded % 25 === 0) {
    console.log(`uploaded ${uploaded}/${files.length}…`);
  }
}

writeFileSync("/tmp/textbooks-unmatched.txt", unmatched.join("\n"));
console.log(
  `done: uploaded ${uploaded}, unmatched ${unmatched.length}, total ${files.length}`,
);
await pool.end();
process.exit(0);
