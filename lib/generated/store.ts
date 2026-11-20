import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/**
 * Storage for images the app generates itself (infographics via the Nextplus
 * router). Kept outside the repo so deploys never touch it.
 */

const DIR = path.join(homedir(), ".cache", "paic2-generated");

const newId = () =>
  `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export type GeneratedMeta = {
  prompt: string;
  kind: string;
  createdAt: string;
};

export const saveGeneratedImage = (
  bytes: Buffer,
  meta: { prompt: string; kind: string },
): string => {
  mkdirSync(DIR, { recursive: true });
  const id = newId();
  writeFileSync(path.join(DIR, `${id}.png`), bytes);
  writeFileSync(
    path.join(DIR, `${id}.json`),
    JSON.stringify({ ...meta, createdAt: new Date().toISOString() }),
  );
  return id;
};

export const readGeneratedImage = (id: string): Buffer | null => {
  if (!/^gen_[a-z0-9_]+$/.test(id)) return null;
  const file = path.join(DIR, `${id}.png`);
  if (!existsSync(file)) return null;
  return readFileSync(file);
};

export const readGeneratedMeta = (id: string): GeneratedMeta | null => {
  if (!/^gen_[a-z0-9_]+$/.test(id)) return null;
  const file = path.join(DIR, `${id}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as GeneratedMeta;
  } catch {
    return null;
  }
};
