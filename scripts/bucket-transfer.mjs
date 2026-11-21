#!/usr/bin/env node
/**
 * Copy an S3 bucket between two RustFS instances via a local directory.
 *
 *   MODE=export EXPORT_DIR=/tmp/bucket S3_ENDPOINT=... S3_BUCKET=... \
 *   S3_ACCESS_KEY=... S3_SECRET_KEY=... node scripts/bucket-transfer.mjs
 *
 *   MODE=import EXPORT_DIR=/tmp/bucket S3_ENDPOINT=... ... (destination)
 *
 * Export writes every object under EXPORT_DIR preserving its key as the path;
 * import uploads the tree back. Idempotent — re-running overwrites.
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from "@aws-sdk/client-s3";

const MODE = process.env.MODE;
const DIR = process.env.EXPORT_DIR;
const ENDPOINT = process.env.S3_ENDPOINT;
const BUCKET = process.env.S3_BUCKET;
const ACCESS_KEY = process.env.S3_ACCESS_KEY;
const SECRET_KEY = process.env.S3_SECRET_KEY;

if (
  !["export", "import"].includes(MODE) ||
  !DIR ||
  !ENDPOINT ||
  !BUCKET ||
  !ACCESS_KEY ||
  !SECRET_KEY
) {
  console.error(
    "set MODE=export|import, EXPORT_DIR, S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY",
  );
  process.exit(1);
}

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

const walk = (dir) => {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (entry.isFile()) out.push(full);
  }
  return out;
};

if (MODE === "export") {
  mkdirSync(DIR, { recursive: true });
  let token;
  let count = 0;
  do {
    const page = await client.send(
      new (await import("@aws-sdk/client-s3")).ListObjectsV2Command({
        Bucket: BUCKET,
        MaxKeys: 1000,
        ...(token ? { ContinuationToken: token } : {}),
      }),
    );
    for (const item of page.Contents ?? []) {
      const res = await client.send(
        new GetObjectCommand({ Bucket: BUCKET, Key: item.Key }),
      );
      const bytes = Buffer.from(await res.Body.transformToByteArray());
      const target = path.join(DIR, item.Key);
      mkdirSync(path.dirname(target), { recursive: true });
      writeFileSync(target, bytes);
      count += 1;
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);
  console.log(`exported ${count} objects from ${BUCKET} to ${DIR}`);
} else {
  const files = walk(DIR);
  let count = 0;
  for (const file of files) {
    const key = path.relative(DIR, file).split(path.sep).join("/");
    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: readFileSync(file),
      }),
    );
    count += 1;
  }
  console.log(`imported ${count} objects into ${BUCKET} from ${DIR}`);
}
