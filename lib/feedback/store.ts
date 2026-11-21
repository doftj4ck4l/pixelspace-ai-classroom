import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";

/** Disk storage for feedback attachments — outside the repo so deploys never touch it. */
const DIR = path.join(homedir(), ".cache", "paic2-feedback");

export const MAX_FEEDBACK_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_FEEDBACK_FILES = 5;

/** The famous image types, plus PDF — nothing else rides along. */
export const FEEDBACK_EXTS = [
  "png",
  "jpg",
  "jpeg",
  "gif",
  "webp",
  "svg",
  "pdf",
] as const;

const MIME_BY_EXT: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  pdf: "application/pdf",
};

export const feedbackMimeFor = (ext: string): string =>
  MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream";

const FILE_RE = /^fb_[a-z0-9_]+(\.[a-z0-9]+)?$/;

export const saveFeedbackFile = (ext: string, bytes: Buffer): string => {
  mkdirSync(DIR, { recursive: true });
  const file = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext.toLowerCase()}`;
  writeFileSync(path.join(DIR, file), bytes);
  return file;
};

export const readFeedbackFile = (file: string): Buffer | null => {
  if (!FILE_RE.test(file)) return null;
  try {
    return readFileSync(path.join(DIR, file));
  } catch {
    return null;
  }
};

export const removeFeedbackFile = (file: string) => {
  if (!FILE_RE.test(file)) return;
  rmSync(path.join(DIR, file), { force: true });
};
