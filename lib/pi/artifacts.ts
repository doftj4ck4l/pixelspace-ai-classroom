/**
 * Server-side registry of artifacts the agent shared in chat
 * (`share_file` calls only — never workspace dumps).
 *
 * File-backed so a generated deck keeps its card in Spaces across restarts.
 * Removing an entry only hides the card; the file stays in the harness
 * workspace and the download link in the original chat keeps working.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PiArtifact = {
  id: string;
  threadId: string;
  /** Display name (file basename). */
  title: string;
  /** Our gallery doc type, e.g. "slides" | "reports" | "infographics". */
  type: string;
  /** Same-origin URL to open/download (proxied paths). */
  url: string;
  /** Workspace-relative path for files; the image id for images. */
  path: string;
  createdAt: string;
};

const FILE = path.join(process.cwd(), "data", "pi-artifacts.json");

let cache: PiArtifact[] | null = null;
let writing: Promise<void> = Promise.resolve();

const load = async (): Promise<PiArtifact[]> => {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as PiArtifact[];
  } catch {
    cache = [];
  }
  return cache;
};

const save = () => {
  const snapshot = JSON.stringify(cache ?? [], null, 2);
  writing = writing
    .then(() => mkdir(path.dirname(FILE), { recursive: true }))
    .then(() => writeFile(FILE, snapshot))
    .catch(() => {});
  return writing;
};

/** Extension → gallery type. Unknown extensions land in All only. */
export function typeForPath(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  switch (ext) {
    case "pptx":
    case "ppt":
      return "slides";
    case "pdf":
    case "docx":
    case "doc":
      return "reports";
    case "png":
    case "jpg":
    case "jpeg":
    case "webp":
    case "gif":
      return "infographics";
    case "md":
    case "txt":
      return "notes";
    case "mp3":
    case "wav":
      return "podcasts";
    default:
      return "other";
  }
}

const newId = () =>
  `art_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const artifactRegistry = {
  async list(): Promise<PiArtifact[]> {
    const artifacts = await load();
    return [...artifacts].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
  },
  async get(id: string): Promise<PiArtifact | undefined> {
    return (await load()).find((artifact) => artifact.id === id);
  },
  async add(input: {
    threadId: string;
    title: string;
    path: string;
    url: string;
  }): Promise<PiArtifact | null> {
    const artifacts = await load();
    if (artifacts.some((artifact) => artifact.url === input.url)) return null;
    const artifact: PiArtifact = {
      id: newId(),
      threadId: input.threadId,
      title: input.title,
      type: typeForPath(input.title || input.path),
      url: input.url,
      path: input.path,
      createdAt: new Date().toISOString(),
    };
    artifacts.push(artifact);
    await save();
    return artifact;
  },
  async remove(id: string): Promise<void> {
    const artifacts = await load();
    const next = artifacts.filter((artifact) => artifact.id !== id);
    if (next.length !== artifacts.length) {
      cache = next;
      await save();
    }
  },
};
