import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Object storage for files the app owns (teacher sources, feedback
 * attachments, generated infographics).
 *
 * Two drivers behind one interface: `disk` keeps today's local behavior
 * (~/.cache/paic2-storage) and is the default, `s3` stores objects in an
 * S3-compatible bucket (RustFS on the deploy host). Keys are
 * `<domain>/<file>` — the domain prefix is what keeps the three stores
 * sharing one namespace without colliding.
 */

export type StoredObject = { bytes: Buffer; contentType?: string };

export interface ObjectStore {
  put(key: string, bytes: Buffer, contentType?: string): Promise<void>;
  get(key: string): Promise<StoredObject | null>;
  delete(key: string): Promise<void>;
}

const KEY_RE = /^[a-z0-9][a-z0-9_./-]*$/i;

const assertKey = (key: string) => {
  if (!KEY_RE.test(key) || key.includes("..")) {
    throw new Error(`invalid storage key: ${key}`);
  }
};

/* ----------------------------------------------------------------- disk */

const DISK_ROOT = path.join(homedir(), ".cache", "paic2-storage");

const diskStore: ObjectStore = {
  async put(key, bytes) {
    assertKey(key);
    const file = path.join(DISK_ROOT, key);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, bytes);
  },
  async get(key) {
    assertKey(key);
    try {
      return { bytes: readFileSync(path.join(DISK_ROOT, key)) };
    } catch {
      return null;
    }
  },
  async delete(key) {
    assertKey(key);
    rmSync(path.join(DISK_ROOT, key), { force: true });
  },
};

/* ------------------------------------------------------------------ s3 */

type S3ClientType = import("@aws-sdk/client-s3").S3Client;

let s3Client: S3ClientType | undefined;
let bucketReady: Promise<void> | undefined;

const s3Config = () => {
  const endpoint = process.env.S3_ENDPOINT;
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;
  if (!endpoint || !bucket || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "S3 storage is not configured — set S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY and S3_SECRET_KEY",
    );
  }
  return { endpoint, bucket, accessKeyId, secretAccessKey };
};

const s3 = async (): Promise<S3ClientType> => {
  const { endpoint, accessKeyId, secretAccessKey } = s3Config();
  if (!s3Client) {
    const { S3Client } = await import("@aws-sdk/client-s3");
    s3Client = new S3Client({
      endpoint,
      region: process.env.S3_REGION ?? "us-east-1",
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  return s3Client;
};

const ensureBucket = (): Promise<void> => {
  bucketReady ??= (async () => {
    const { bucket } = s3Config();
    const { HeadBucketCommand, CreateBucketCommand } =
      await import("@aws-sdk/client-s3");
    const client = await s3();
    try {
      await client.send(new HeadBucketCommand({ Bucket: bucket }));
    } catch {
      await client.send(new CreateBucketCommand({ Bucket: bucket }));
    }
  })().catch((error) => {
    bucketReady = undefined;
    throw error;
  });
  return bucketReady;
};

const s3Store: ObjectStore = {
  async put(key, bytes, contentType) {
    assertKey(key);
    await ensureBucket();
    const { PutObjectCommand } = await import("@aws-sdk/client-s3");
    const { bucket } = s3Config();
    const client = await s3();
    await client.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: key,
        Body: bytes,
        ...(contentType ? { ContentType: contentType } : {}),
      }),
    );
  },
  async get(key) {
    assertKey(key);
    await ensureBucket();
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const { bucket } = s3Config();
    const client = await s3();
    try {
      const res = await client.send(
        new GetObjectCommand({ Bucket: bucket, Key: key }),
      );
      if (!res.Body) return null;
      const bytes = Buffer.from(await res.Body.transformToByteArray());
      return {
        bytes,
        ...(res.ContentType ? { contentType: res.ContentType } : {}),
      };
    } catch (error) {
      const name = (error as { name?: string }).name;
      if (name === "NoSuchKey" || name === "NotFound") return null;
      throw error;
    }
  },
  async delete(key) {
    assertKey(key);
    await ensureBucket();
    const { DeleteObjectCommand } = await import("@aws-sdk/client-s3");
    const { bucket } = s3Config();
    const client = await s3();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
  },
};

/* ------------------------------------------------------------- selector */

export const storageDriver =
  process.env.STORAGE_DRIVER === "s3" ? "s3" : "disk";

export const storage: ObjectStore =
  storageDriver === "s3" ? s3Store : diskStore;

export const storageConfigured = (): boolean =>
  storageDriver === "disk" ||
  Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY &&
    process.env.S3_SECRET_KEY,
  );
