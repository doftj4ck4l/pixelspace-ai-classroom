#!/usr/bin/env node
/**
 * Patches the pi harness (pixelspacev3) with workspace output sync to
 * object storage (RustFS).
 *
 * Layers on top of the genui patch — run apply-flashcards-patch.mjs first,
 * then this one. Extracts the sandbox/workspace files from the current
 * patched image, applies the sync hooks, adds the new workspace-sync module,
 * and builds:
 *
 *   FROM pixelspace-api:genui-patch  + the patched files
 *   -> pixelspace-api:sync-patch
 *
 * Behaviour with S3_WORKSPACE_BUCKET set in the harness .env:
 *   - output files (pdf, pptx, docx, xlsx, images, ...) are uploaded to the
 *     bucket at the end of every run and kept forever until the user deletes
 *     them (DELETE /api/workspace/files/* removes local + object)
 *   - scratch files (.py, intermediates, ...) are never uploaded
 *   - a fresh/pruned workspace restores its output files on acquire
 *   - downloads restore-on-miss; the listing merges bucket keys
 *   - workspaces cold past WORKSPACE_PRUNE_MS (default 7 days) are pruned
 *     locally after a final sync
 *
 * Idempotent — safe to re-run (e.g. after a harness upgrade, re-run the
 * flashcards patch, then this one).
 *
 * Run on the harness host:
 *   node apply-workspace-sync-patch.mjs [harness-root]
 */

import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = process.argv[2] ?? path.join(homedir(), "pixelspace-0.11.2");
const BASE_IMAGE =
  process.env.PIXELSPACE_BASE_IMAGE ?? "pixelspace-api:genui-patch";
const PATCHED_IMAGE =
  process.env.PIXELSPACE_SYNC_IMAGE ?? "pixelspace-api:sync-patch";
const WORK = path.join(homedir(), "pixelspace-workspace-sync-patch");
const ASSET = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "assets",
  "workspace-sync.ts",
);

const sh = (cmd) => execSync(cmd, { stdio: "pipe" }).toString().trim();

// ---------------------------------------------------------------------------
// 1. Extract the files to patch from the current image
// ---------------------------------------------------------------------------
rmSync(WORK, { recursive: true, force: true });
mkdirSync(WORK, { recursive: true });

const FILES = [
  ["src/services/sandbox/sandbox.service.ts", "sandbox.service.ts"],
  ["src/controllers/workspace.controller.ts", "workspace.controller.ts"],
  ["src/routes/workspace.routes.ts", "workspace.routes.ts"],
  ["src/config/env.ts", "env.ts"],
  ["src/repositories/sandbox.repository.ts", "sandbox.repository.ts"],
];

const tmp = `sync-patch-extract-${Date.now()}`;
sh(`docker create --name ${tmp} ${BASE_IMAGE}`);
try {
  for (const [inImage, local] of FILES) {
    sh(`docker cp ${tmp}:/app/apps/api/${inImage} ${path.join(WORK, local)}`);
  }
} finally {
  sh(`docker rm ${tmp}`);
}
console.log("extracted from", BASE_IMAGE);

// ---------------------------------------------------------------------------
// 2. Patch the copies
// ---------------------------------------------------------------------------
const read = (file) => readFileSync(path.join(WORK, file), "utf8");
const write = (file, content) => writeFileSync(path.join(WORK, file), content);

const must = (s, anchor, label) => {
  if (!s.includes(anchor)) throw new Error(`${label}: anchor missing`);
};

{
  let s = read("sandbox.service.ts");
  if (s.includes("uploadWorkspaceOutputs")) {
    console.log("already patched: sandbox.service.ts");
  } else {
    const importAnchor =
      'import { sandboxRepository } from "../../repositories/sandbox.repository";';
    must(s, importAnchor, "sandbox.service.ts import");
    s = s.replace(
      importAnchor,
      `${importAnchor}\nimport {\n  pruneWorkspace,\n  restoreWorkspaceIfEmpty,\n  uploadWorkspaceOutputs,\n} from "../media/workspace-sync";`,
    );

    const mkdirAnchor = "  fs.mkdirSync(workspacePath, { recursive: true });";
    must(s, mkdirAnchor, "sandbox.service.ts mkdir");
    s = s.replace(
      mkdirAnchor,
      `${mkdirAnchor}\n\n  // A fresh (or pruned) workspace gets its output files back from the\n  // bucket before anything runs against it.\n  await restoreWorkspaceIfEmpty(workspaceId);`,
    );

    const releaseAnchor = `        release: async () => {
          if (released) return;
          released = true;
          const remaining = (activeLeases.get(workspaceId) ?? 1) - 1;
          if (remaining > 0) activeLeases.set(workspaceId, remaining);
          else activeLeases.delete(workspaceId);
          await sandboxRepository.touch(workspaceId);
        },`;
    must(s, releaseAnchor, "sandbox.service.ts lease release");
    s = s.replace(
      releaseAnchor,
      `        release: async () => {
          if (released) return;
          released = true;
          const remaining = (activeLeases.get(workspaceId) ?? 1) - 1;
          if (remaining > 0) activeLeases.set(workspaceId, remaining);
          else activeLeases.delete(workspaceId);
          await sandboxRepository.touch(workspaceId);
          // Output files (documents, slides, sheets, images) are copied to
          // object storage whenever a lease is released — the end of a run is
          // the moment that matters, and a read-only lease is a cheap no-op.
          await uploadWorkspaceOutputs(workspaceId);
        },`,
    );

    const destroyAnchor = `  async destroy(workspaceId: string): Promise<void> {
    await withWorkspaceLock(workspaceId, async () => {
      const row = await sandboxRepository.get(workspaceId);`;
    must(s, destroyAnchor, "sandbox.service.ts destroy");
    s = s.replace(
      destroyAnchor,
      `  async destroy(workspaceId: string): Promise<void> {
    await withWorkspaceLock(workspaceId, async () => {
      await uploadWorkspaceOutputs(workspaceId);
      const row = await sandboxRepository.get(workspaceId);`,
    );

    const reaperAnchor = `export function startSandboxReaper(): () => void {
  const intervalMs = Math.max(1_000, Math.min(60_000, env.sandboxIdleMs));
  const timer = setInterval(() => {
    void sandboxService.reapIdle().catch((e) => {
      logger.warn("sandbox.reap_failed", { error: (e as Error).message });
    });
  }, intervalMs);`;
    must(s, reaperAnchor, "sandbox.service.ts reaper");
    s = s.replace(
      reaperAnchor,
      `/**
 * Prune workspace directories cold past the window: sync the output files
 * one last time, then drop the directory. The bucket keeps the outputs;
 * scratch files are discarded by design.
 */
async function pruneColdWorkspaces(): Promise<number> {
  const windowMs = env.workspacePruneMs;
  if (windowMs <= 0) return 0;
  const cold = await sandboxRepository.listCold(windowMs);
  let pruned = 0;
  for (const row of cold) {
    await withWorkspaceLock(row.workspaceId, async () => {
      if ((activeLeases.get(row.workspaceId) ?? 0) > 0) return;
      const current = await sandboxRepository.get(row.workspaceId);
      if (current && Date.now() - current.lastUsedAt < windowMs) return;
      // A warm container holds a mount of the directory we are about to
      // delete — drop it first, or the container breaks on the next exec.
      if (current?.containerId) {
        await removeContainer(current.containerId).catch(() => undefined);
        await sandboxRepository.clearContainer(row.workspaceId);
      }
      await removeContainer(containerNameFor(row.workspaceId)).catch(
        () => undefined,
      );
      if (await pruneWorkspace(row.workspaceId)) pruned += 1;
    });
  }
  if (pruned) logger.info("workspace.prune_tick", { pruned });
  return pruned;
}

export function startSandboxReaper(): () => void {
  const intervalMs = Math.max(1_000, Math.min(60_000, env.sandboxIdleMs));
  const timer = setInterval(() => {
    void sandboxService.reapIdle().catch((e) => {
      logger.warn("sandbox.reap_failed", { error: (e as Error).message });
    });
    void pruneColdWorkspaces().catch((e) => {
      logger.warn("workspace.prune_failed", { error: (e as Error).message });
    });
  }, intervalMs);`,
    );

    write("sandbox.service.ts", s);
    console.log("patched: sandbox.service.ts");
  }
}

{
  let s = read("workspace.controller.ts");
  if (s.includes("deleteWorkspaceOutput")) {
    console.log("already patched: workspace.controller.ts");
  } else {
    const importAnchor =
      'import { workspaceRegistry } from "../repositories/workspace-registry.repository";';
    must(s, importAnchor, "workspace.controller.ts import");
    s = s.replace(
      importAnchor,
      `${importAnchor}\nimport {\n  deleteWorkspaceOutput,\n  listWorkspaceObjects,\n  restoreWorkspaceFile,\n} from "../services/media/workspace-sync";`,
    );

    const indexAnchor = `  const [files, origins] = await Promise.all([listWorkspaceFiles(workspaceId), fileOrigins(workspaceId)]);
  return c.json({
    files: files.map((file) => ({ ...file, origin: origins.get(file.path) ?? null })),
  });`;
    must(s, indexAnchor, "workspace.controller.ts index");
    s = s.replace(
      indexAnchor,
      `  const [files, origins, objects] = await Promise.all([
    listWorkspaceFiles(workspaceId),
    fileOrigins(workspaceId),
    listWorkspaceObjects(workspaceId),
  ]);
  // Output files pruned from the local directory are still listed from the
  // bucket — the download route restores them on demand.
  const local = new Set(files.map((file) => file.path));
  const merged = [
    ...files,
    ...objects.filter((object) => !local.has(object.path)),
  ].sort((a, b) => b.modifiedAt - a.modifiedAt);
  return c.json({
    files: merged.map((file) => ({ ...file, origin: origins.get(file.path) ?? null })),
  });`,
    );

    const showAnchor = `  const found = await resolve(workspaceId, decoded);
  // Rejected and missing are one response: distinguishing them would let a
  // caller map the host's filesystem.
  if (!found.ok) return c.json({ error: "File not found" }, 404);`;
    must(s, showAnchor, "workspace.controller.ts show");
    s = s.replace(
      showAnchor,
      `  let found = await resolve(workspaceId, decoded);
  if (!found.ok) {
    // A pruned workspace still serves its output files: restore the copy
    // from object storage, then resolve the freshly written file.
    if (await restoreWorkspaceFile(workspaceId, decoded)) {
      found = await resolve(workspaceId, decoded);
    }
  }
  // Rejected and missing are one response: distinguishing them would let a
  // caller map the host's filesystem.
  if (!found.ok) return c.json({ error: "File not found" }, 404);`,
    );

    const tailAnchor = `/** Strip what would break out of the quoted filename in the header. */
function quoted(name: string): string {
  return name.replace(/[\\r\\n"\\\\]/g, "_");
}`;
    must(s, tailAnchor, "workspace.controller.ts tail");
    s = s.replace(
      tailAnchor,
      `${tailAnchor}

/**
 * DELETE /api/workspace/files/* — the user deleted the output.
 *
 * Output files are kept forever until this runs: the local copy and the
 * object-storage copy go together.
 */
export async function remove(c: Context) {
  const requested = c.req.path.split("/api/workspace/files/")[1] ?? "";
  const decoded = safeDecode(requested);
  if (decoded === null) return c.json({ error: "File not found" }, 404);

  const workspaceId = await workspaceIdOf(c);
  const deleted = await deleteWorkspaceOutput(workspaceId, decoded);
  return c.json({ ok: true, deleted });
}`,
    );

    write("workspace.controller.ts", s);
    console.log("patched: workspace.controller.ts");
  }
}

{
  let s = read("workspace.routes.ts");
  if (s.includes("workspaceController.remove")) {
    console.log("already patched: workspace.routes.ts");
  } else {
    const anchor = 'workspaceRoutes.get("/files/*", workspaceController.show);';
    must(s, anchor, "workspace.routes.ts show route");
    s = s.replace(
      anchor,
      `${anchor}\n// Delete an output file: local copy and object-storage copy go together.\nworkspaceRoutes.delete("/files/*", workspaceController.remove);`,
    );
    write("workspace.routes.ts", s);
    console.log("patched: workspace.routes.ts");
  }
}

{
  let s = read("env.ts");
  if (s.includes("s3WorkspaceBucket")) {
    console.log("already patched: env.ts");
  } else {
    const anchor = `  s3Region: process.env.S3_REGION ?? "us-east-1",
} as const;`;
    must(s, anchor, "env.ts s3 section");
    s = s.replace(
      anchor,
      `  s3Region: process.env.S3_REGION ?? "us-east-1",

  /**
   * Workspace output sync. Output files (documents, slides, sheets, images)
   * are copied to this bucket at the end of every run and kept until the
   * user deletes them; scratch files are never uploaded. Empty disables the
   * sync entirely — the sandbox behaves as if it never existed.
   */
  s3WorkspaceBucket: process.env.S3_WORKSPACE_BUCKET ?? "",
  s3WorkspaceSyncExts: process.env.S3_WORKSPACE_SYNC_EXTS ?? "",
  /** Cold workspaces are pruned after this long without a run (0 disables). */
  workspacePruneMs: Number(
    process.env.WORKSPACE_PRUNE_MS ?? 7 * 24 * 60 * 60 * 1000,
  ),
} as const;`,
    );
    write("env.ts", s);
    console.log("patched: env.ts");
  }
}

{
  let s = read("sandbox.repository.ts");
  if (s.includes("listCold")) {
    console.log("already patched: sandbox.repository.ts");
  } else {
    const anchor = `        and(
          isNotNull(sandboxes.containerId),
          lt(sandboxes.lastUsedAt, Date.now() - olderThanMs),
        ),
      );
  },
};`;
    must(s, anchor, "sandbox.repository.ts listIdle");
    s = s.replace(
      anchor,
      `        and(
          isNotNull(sandboxes.containerId),
          lt(sandboxes.lastUsedAt, Date.now() - olderThanMs),
        ),
      );
  },

  /** Every workspace unused for longer than the window, container or not. */
  async listCold(olderThanMs: number): Promise<SandboxRow[]> {
    return db
      .select()
      .from(sandboxes)
      .where(lt(sandboxes.lastUsedAt, Date.now() - olderThanMs));
  },
};`,
    );
    write("sandbox.repository.ts", s);
    console.log("patched: sandbox.repository.ts");
  }
}

// ---------------------------------------------------------------------------
// 3. The new sync module
// ---------------------------------------------------------------------------
if (!existsSync(ASSET)) throw new Error(`missing asset ${ASSET}`);
writeFileSync(
  path.join(WORK, "workspace-sync.ts"),
  readFileSync(ASSET, "utf8"),
);

// ---------------------------------------------------------------------------
// 4. Build the derived image
// ---------------------------------------------------------------------------
writeFileSync(
  path.join(WORK, "Dockerfile"),
  `FROM ${BASE_IMAGE}
COPY workspace-sync.ts /app/apps/api/src/services/media/workspace-sync.ts
COPY sandbox.service.ts /app/apps/api/src/services/sandbox/sandbox.service.ts
COPY workspace.controller.ts /app/apps/api/src/controllers/workspace.controller.ts
COPY workspace.routes.ts /app/apps/api/src/routes/workspace.routes.ts
COPY env.ts /app/apps/api/src/config/env.ts
COPY sandbox.repository.ts /app/apps/api/src/repositories/sandbox.repository.ts
`,
);
sh(`docker build -q -t ${PATCHED_IMAGE} ${WORK}`);
console.log("built", PATCHED_IMAGE);

// ---------------------------------------------------------------------------
// 5. Point compose at the patched image, configure the bucket, recreate api
// ---------------------------------------------------------------------------
const envFile = path.join(root, ".env");
if (!existsSync(envFile)) throw new Error(`missing ${envFile}`);
let env = readFileSync(envFile, "utf8");
if (/^PIXELSPACE_API_IMAGE=/m.test(env)) {
  env = env.replace(
    /^PIXELSPACE_API_IMAGE=.*$/m,
    `PIXELSPACE_API_IMAGE="${PATCHED_IMAGE}"`,
  );
} else {
  env += `\nPIXELSPACE_API_IMAGE="${PATCHED_IMAGE}"\n`;
}
if (!/^S3_WORKSPACE_BUCKET=/m.test(env)) {
  env += `S3_WORKSPACE_BUCKET="pixelspace-workspaces"\n`;
}
writeFileSync(envFile, env);
console.log(
  "compose now uses",
  PATCHED_IMAGE,
  "· bucket pixelspace-workspaces",
);

sh(`cd ${root} && docker compose up -d api`);
console.log("api container recreated");
