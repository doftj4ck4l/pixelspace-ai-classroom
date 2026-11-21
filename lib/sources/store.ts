import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/** Disk storage for teacher uploads — outside the repo so deploys never touch it. */
const DIR = path.join(homedir(), ".cache", "paic2-sources");

export const MAX_SOURCE_BYTES = 25 * 1024 * 1024;

export const SOURCE_EXTS = [
  "pdf",
  "doc",
  "docx",
  "ppt",
  "pptx",
  "xls",
  "xlsx",
  "csv",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "txt",
  "md",
] as const;

export type SourceKind =
  | "pdf"
  | "doc"
  | "slides"
  | "sheets"
  | "images"
  | "youtube"
  | "other";

export const kindForExt = (ext: string): SourceKind => {
  const value = ext.toLowerCase();
  if (value === "pdf") return "pdf";
  if (value === "doc" || value === "docx") return "doc";
  if (value === "ppt" || value === "pptx") return "slides";
  if (value === "xls" || value === "xlsx" || value === "csv") return "sheets";
  if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(value))
    return "images";
  if (value === "youtube") return "youtube";
  return "other";
};

const newId = () =>
  `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const saveSourceFile = (
  ext: string,
  bytes: Buffer,
): { id: string; path: string } => {
  mkdirSync(DIR, { recursive: true });
  const id = newId();
  const file = `${id}.${ext.toLowerCase()}`;
  writeFileSync(path.join(DIR, file), bytes);
  return { id, path: file };
};

export const readSourceFile = (file: string): Buffer | null => {
  if (!/^src_[a-z0-9_]+(\.[a-z0-9]+)?$/.test(file)) return null;
  try {
    return readFileSync(path.join(DIR, file));
  } catch {
    return null;
  }
};

export const removeSourceFile = (file: string) => {
  if (!/^src_[a-z0-9_]+(\.[a-z0-9]+)?$/.test(file)) return;
  rmSync(path.join(DIR, file), { force: true });
};
