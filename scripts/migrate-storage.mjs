#!/usr/bin/env node
/**
 * One-off migration: copy the app's legacy disk files (~/.cache/paic2-sources,
 * paic2-feedback, paic2-generated) into the S3 bucket and into the new disk
 * layout (~/.cache/paic2-storage) so both storage drivers keep working.
 *
 * Idempotent — safe to re-run. Run on the deploy host with the S3 env set:
 *
 *   S3_ENDPOINT=http://127.0.0.1:9100 S3_BUCKET=paic2-media \
 *   S3_ACCESS_KEY=... S3_SECRET_KEY=... \
 *   node scripts/migrate-storage.mjs
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

const ENDPOINT = process.env.S3_ENDPOINT;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY = process.env.S3_ACCESS_KEY;
const SECRET_KEY = process.env.S3_SECRET_KEY;
if (!ENDPOINT || !BUCKET || !ACCESS_KEY || !SECRET_KEY) {
  console.error("set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY");
  process.exit(1);
}

const CACHE = path.join(homedir(), ".cache");
const NEW_ROOT = path.join(CACHE, "paic2-storage");

const DOMAINS = [
  { dir: "paic2-sources", prefix: "sources" },
  { dir: "paic2-feedback", prefix: "feedback" },
  { dir: "paic2-generated", prefix: "generated" },
];

const MIME = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  json: "application/json",
};

const client = new S3Client({
  endpoint: ENDPOINT,
  region: process.env.S3_REGION ?? "us-east-1",
  credentials: { accessKeyId: ACCESS_KEY, secretAccessKey: SECRET_KEY },
  forcePathStyle: true,
});

try {
  await client.send(new HeadBucketCommand({ Bucket: BUCKET }));
} catch {
  await client.send(new CreateBucketCommand({ Bucket: BUCKET }));
  console.log(`created bucket ${BUCKET}`);
}

let uploaded = 0;
for (const { dir, prefix } of DOMAINS) {
  const from = path.join(CACHE, dir);
  if (!existsSync(from)) {
    console.log(`${dir}: nothing to migrate`);
    continue;
  }
  const files = readdirSync(from).filter((name) => !name.startsWith("."));
  for (const name of files) {
    const bytes = readFileSync(path.join(from, name));
    const ext = (name.split(".").pop() ?? "").toLowerCase();
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: `${prefix}/${name}`,
        Body: bytes,
        ContentType: MIME[ext] ?? "application/octet-stream",
      }),
    );
    const to = path.join(NEW_ROOT, prefix, name);
    mkdirSync(path.dirname(to), { recursive: true });
    copyFileSync(path.join(from, name), to);
    uploaded += 1;
  }
  console.log(`${dir}: ${files.length} files -> ${prefix}/`);
}

console.log(
  `done — ${uploaded} objects in ${BUCKET} (and mirrored to ${NEW_ROOT})`,
);
