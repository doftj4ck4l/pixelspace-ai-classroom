import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "../../config/env";
import { logger } from "../../lib/logger";
import { workspaceRoot } from "../../repositories/workspace.repository";

/**
 * Object-storage sync for workspace output files.
 *
 * The local workspace directory stays the live copy the sandbox and the API
 * both read; the bucket is the durable copy. Only output files are ever
 * uploaded — documents, slides, sheets, images — because scratch files (.py,
 * intermediates, lock files) are working state the agent can always rewrite,
 * and keeping them would just fill the bucket with garbage.
 *
 * Upload-only by design: the bucket is never deleted from implicitly, so an
 * output file survives even if it disappears locally. Objects leave the
 * bucket only through `deleteWorkspaceOutput`, which the download route's
 * DELETE calls when the user deletes the output — that is what "kept forever
 * until the user deletes it" means here.
 */

const DEFAULT_EXTS =
  "pptx,ppt,pdf,doc,docx,xls,xlsx,csv,png,jpg,jpeg,gif,webp,svg,txt,md";
const MANIFEST = ".paic2-sync.json";
const MAX_DEPTH = 8;

const MIME_BY_EXT: Record<string, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ppt: "application/vnd.ms-powerpoint",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
};

/** True when enough configuration exists to reach the workspace bucket. */
export function syncConfigured(): boolean {
  return !!(
    env.s3WorkspaceBucket &&
    env.s3Endpoint &&
    env.s3AccessKey &&
    env.s3SecretKey
  );
}

function syncExts(): Set<string> {
  return new Set(
    (env.s3WorkspaceSyncExts || DEFAULT_EXTS)
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean),
  );
}

/** Output files only: known extension, not hidden, not the sync manifest. */
export function isOutputFile(relativePath: string): boolean {
  const name = path.basename(relativePath);
  if (!name || name.startsWith(".")) return false;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return false;
  return syncExts().has(name.slice(dot + 1).toLowerCase());
}

/** A workspace-relative path that cannot escape the workspace prefix. */
function safeRelative(value: string): string | null {
  if (!value || value.includes("\\")) return null;
  const segments = value.split("/").filter(Boolean);
  if (!segments.length) return null;
  if (segments.some((segment) => segment === "." || segment === "..")) {
    return null;
  }
  return segments.join("/");
}

/** Single-quote a value for `sh -c`, escaping embedded quotes. */
const shellQuote = (value: string) => `'${value.replace(/'/g, `'\\''`)}'`;

/**
 * Run a shell script as root with the workspace mounted.
 *
 * Sandbox containers run as root, so the API process (uid 1000) cannot always
 * delete what they wrote — EACCES on prune and on user deletes. A throwaway
 * container mounts the workspace and does the removal with the permissions
 * that created the files.
 */
async function runAsRoot(root: string, script: string): Promise<boolean> {
  try {
    const proc = Bun.spawn(
      [
        "docker",
        "run",
        "--rm",
        "-v",
        `${root}:${root}`,
        env.sandboxImage,
        "sh",
        "-c",
        `${script} 2>/dev/null; true`,
      ],
      { stdout: "ignore", stderr: "ignore" },
    );
    const code = await proc.exited;
    return code === 0;
  } catch (error) {
    logger.warn("workspace.remove_root_failed", {
      root,
      error: (error as Error).message,
    });
    return false;
  }
}

let client: Bun.S3Client | undefined;

function s3(): Bun.S3Client {
  client ??= new Bun.S3Client({
    accessKeyId: env.s3AccessKey,
    secretAccessKey: env.s3SecretKey,
    bucket: env.s3WorkspaceBucket,
    endpoint: env.s3Endpoint,
    region: env.s3Region,
  });
  return client;
}

const sha256 = (data: string | Buffer) =>
  crypto.createHash("sha256").update(data).digest("hex");
const hmac = (key: crypto.BinaryLike, data: string) =>
  crypto.createHmac("sha256", key).update(data).digest();

/**
 * PUT /<bucket>, signed with SigV4 — the one call `Bun.S3Client` cannot
 * express. Adapted from media.service, pointed at the workspace bucket.
 */
async function createBucket(): Promise<Response> {
  const url = new URL(`${env.s3Endpoint}/${env.s3WorkspaceBucket}`);
  const now = new Date();
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, "");
  const dateStamp = amzDate.slice(0, 8);

  const body =
    env.s3Region === "us-east-1"
      ? ""
      : `<CreateBucketConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">` +
        `<LocationConstraint>${env.s3Region}</LocationConstraint></CreateBucketConfiguration>`;
  const payloadHash = sha256(body);

  const headers: Record<string, string> = {
    host: url.host,
    "x-amz-content-sha256": payloadHash,
    "x-amz-date": amzDate,
  };
  const signedHeaders = Object.keys(headers).sort().join(";");
  const canonicalHeaders = Object.keys(headers)
    .sort()
    .map((header) => `${header}:${headers[header]}\n`)
    .join("");

  const canonicalRequest = [
    "PUT",
    url.pathname,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${env.s3Region}/s3/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256(canonicalRequest),
  ].join("\n");

  const signature = hmac(
    hmac(
      hmac(hmac(hmac(`AWS4${env.s3SecretKey}`, dateStamp), env.s3Region), "s3"),
      "aws4_request",
    ),
    stringToSign,
  ).toString("hex");

  return fetch(url, {
    method: "PUT",
    headers: {
      ...headers,
      Authorization:
        `AWS4-HMAC-SHA256 Credential=${env.s3AccessKey}/${scope}, ` +
        `SignedHeaders=${signedHeaders}, Signature=${signature}`,
    },
    body: body || undefined,
    signal: AbortSignal.timeout(10_000),
  });
}

let bucketReady: Promise<void> | undefined;

function ensureBucket(): Promise<void> {
  bucketReady ??= (async () => {
    const res = await createBucket();
    if (res.ok || res.status === 409) return;
    const detail = await res.text().catch(() => "");
    throw new Error(
      `could not create bucket ${env.s3WorkspaceBucket}: HTTP ${res.status} ${detail.slice(0, 200)}`,
    );
  })().catch((error) => {
    bucketReady = undefined;
    throw error;
  });
  return bucketReady;
}

type Manifest = Record<string, { size: number; mtimeMs: number }>;

async function readManifest(root: string): Promise<Manifest> {
  try {
    return JSON.parse(
      await fs.readFile(path.join(root, MANIFEST), "utf8"),
    ) as Manifest;
  } catch {
    return {};
  }
}

type OutputFile = { rel: string; size: number; mtimeMs: number };

async function walkOutputs(root: string): Promise<OutputFile[]> {
  const out: OutputFile[] = [];

  async function walk(dir: string, depth: number): Promise<void> {
    if (depth > MAX_DEPTH) return;
    const entries = await fs
      .readdir(dir, { withFileTypes: true })
      .catch(() => []);
    for (const entry of entries) {
      if (entry.name === MANIFEST) continue;
      // Application-owned recordings have their own UI; they are not outputs.
      if (depth === 0 && entry.name === ".pixelspace") continue;
      const full = path.join(dir, entry.name);
      if (entry.isSymbolicLink()) continue;
      if (entry.isDirectory()) {
        await walk(full, depth + 1);
      } else if (entry.isFile()) {
        const rel = path.relative(root, full).split(path.sep).join("/");
        if (!isOutputFile(rel)) continue;
        const stat = await fs.stat(full).catch(() => null);
        if (!stat) continue;
        out.push({ rel, size: stat.size, mtimeMs: stat.mtimeMs });
      }
    }
  }

  await walk(root, 0);
  return out;
}

/**
 * Upload every changed output file. Returns false when the sync failed, so a
 * caller about to prune the local copy knows not to.
 */
export async function uploadWorkspaceOutputs(
  workspaceId: string,
): Promise<boolean> {
  if (!syncConfigured()) return true;
  const root = workspaceRoot(workspaceId);
  try {
    await ensureBucket();
    const outputs = await walkOutputs(root);
    const manifest = await readManifest(root);
    const next: Manifest = {};
    let uploaded = 0;
    for (const file of outputs) {
      next[file.rel] = { size: file.size, mtimeMs: file.mtimeMs };
      const previous = manifest[file.rel];
      if (
        previous &&
        previous.size === file.size &&
        previous.mtimeMs === file.mtimeMs
      ) {
        continue;
      }
      const bytes = await fs.readFile(path.join(root, ...file.rel.split("/")));
      const ext = file.rel.slice(file.rel.lastIndexOf(".") + 1).toLowerCase();
      await s3().write(`${workspaceId}/${file.rel}`, bytes, {
        type: MIME_BY_EXT[ext] ?? "application/octet-stream",
      });
      uploaded += 1;
    }
    await fs.writeFile(path.join(root, MANIFEST), JSON.stringify(next));
    if (uploaded) {
      logger.info("workspace.sync.uploaded", {
        workspace: workspaceId,
        files: uploaded,
      });
    }
    return true;
  } catch (error) {
    logger.warn("workspace.sync.upload_failed", {
      workspace: workspaceId,
      error: (error as Error).message,
    });
    return false;
  }
}

async function downloadAll(workspaceId: string, root: string): Promise<number> {
  await ensureBucket();
  let token: string | undefined;
  let restored = 0;
  do {
    const page = await s3().list({
      prefix: `${workspaceId}/`,
      maxKeys: 1000,
      ...(token ? { continuationToken: token } : {}),
    });
    for (const item of page.contents ?? []) {
      const rel = safeRelative(item.key.slice(workspaceId.length + 1));
      if (!rel || !isOutputFile(rel)) continue;
      const target = path.join(root, ...rel.split("/"));
      const exists = await fs
        .stat(target)
        .then(() => true)
        .catch(() => false);
      if (exists) continue;
      const bytes = await s3().file(item.key).bytes();
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, bytes);
      restored += 1;
    }
    token = page.isTruncated ? page.nextContinuationToken : undefined;
  } while (token);
  if (restored) {
    logger.info("workspace.sync.restored", {
      workspace: workspaceId,
      files: restored,
    });
  }
  return restored;
}

/** A fresh (or pruned) workspace gets its output files back before it runs. */
export async function restoreWorkspaceIfEmpty(
  workspaceId: string,
): Promise<void> {
  if (!syncConfigured()) return;
  const root = workspaceRoot(workspaceId);
  try {
    const entries = await fs.readdir(root).catch(() => []);
    const meaningful = entries.filter((name) => name !== MANIFEST);
    if (meaningful.length > 0) return;
    await downloadAll(workspaceId, root);
  } catch (error) {
    logger.warn("workspace.sync.restore_failed", {
      workspace: workspaceId,
      error: (error as Error).message,
    });
  }
}

/** Restore one output file (a pruned workspace still serves its old links). */
export async function restoreWorkspaceFile(
  workspaceId: string,
  relativePath: string,
): Promise<boolean> {
  if (!syncConfigured()) return false;
  const rel = safeRelative(relativePath);
  if (!rel || !isOutputFile(rel)) return false;
  try {
    const file = s3().file(`${workspaceId}/${rel}`);
    if (!(await file.exists())) return false;
    const bytes = await file.bytes();
    const target = path.join(workspaceRoot(workspaceId), ...rel.split("/"));
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes);
    return true;
  } catch (error) {
    logger.warn("workspace.sync.restore_file_failed", {
      workspace: workspaceId,
      path: rel,
      error: (error as Error).message,
    });
    return false;
  }
}

/** Output objects in the bucket, for the listing to merge when pruned. */
export async function listWorkspaceObjects(
  workspaceId: string,
): Promise<{ path: string; bytes: number; modifiedAt: number }[]> {
  if (!syncConfigured()) return [];
  try {
    await ensureBucket();
    const out: { path: string; bytes: number; modifiedAt: number }[] = [];
    let token: string | undefined;
    do {
      const page = await s3().list({
        prefix: `${workspaceId}/`,
        maxKeys: 1000,
        ...(token ? { continuationToken: token } : {}),
      });
      for (const item of page.contents ?? []) {
        const rel = safeRelative(item.key.slice(workspaceId.length + 1));
        if (!rel || !isOutputFile(rel)) continue;
        out.push({
          path: rel,
          bytes: item.size ?? 0,
          modifiedAt: item.lastModified
            ? new Date(item.lastModified).getTime()
            : 0,
        });
      }
      token = page.isTruncated ? page.nextContinuationToken : undefined;
    } while (token);
    return out;
  } catch (error) {
    logger.warn("workspace.sync.list_failed", {
      workspace: workspaceId,
      error: (error as Error).message,
    });
    return [];
  }
}

/** The user deleted the output: local copy and object both go. */
export async function deleteWorkspaceOutput(
  workspaceId: string,
  relativePath: string,
): Promise<boolean> {
  const rel = safeRelative(relativePath);
  if (!rel) return false;
  let removed = false;
  const root = workspaceRoot(workspaceId);
  try {
    const target = path.join(root, ...rel.split("/"));
    await fs.rm(target, { force: true });
    removed = true;
  } catch {
    // Sandbox files are root-owned; delete with the permissions that wrote it.
    removed = await runAsRoot(
      root,
      `rm -rf ${shellQuote(`${root}/${rel}`)}`,
    );
  }
  try {
    const manifest = await readManifest(root);
    if (manifest[rel]) {
      delete manifest[rel];
      await fs.writeFile(path.join(root, MANIFEST), JSON.stringify(manifest));
    }
  } catch {
    // manifest is an optimization, not truth
  }
  if (syncConfigured()) {
    try {
      await ensureBucket();
      await s3().delete(`${workspaceId}/${rel}`);
      removed = true;
    } catch (error) {
      logger.warn("workspace.sync.delete_failed", {
        workspace: workspaceId,
        path: rel,
        error: (error as Error).message,
      });
    }
  }
  return removed;
}

/**
 * Cold prune: sync once more, then drop the local directory. Outputs survive
 * in the bucket and are restored on demand; scratch files die here, which is
 * the point of pruning.
 */
export async function pruneWorkspace(workspaceId: string): Promise<boolean> {
  if (!syncConfigured()) return false;
  const synced = await uploadWorkspaceOutputs(workspaceId);
  if (!synced) return false;
  const root = workspaceRoot(workspaceId);
  try {
    await fs.rm(root, { recursive: true, force: true });
    logger.info("workspace.pruned", { workspace: workspaceId });
    return true;
  } catch {
    // Root-owned files from sandbox runs: empty the directory from a
    // throwaway container, then drop the (now empty) root from here.
    await runAsRoot(
      root,
      `rm -rf ${shellQuote(root)}/* ${shellQuote(root)}/.[!.]*`,
    );
    try {
      await fs.rm(root, { recursive: true, force: true });
      logger.info("workspace.pruned", { workspace: workspaceId });
      return true;
    } catch (error) {
      logger.warn("workspace.prune_failed", {
        workspace: workspaceId,
        error: (error as Error).message,
      });
      return false;
    }
  }
}
