import { storage } from "@/lib/storage";

/** Storage for feedback attachments — bytes live outside the repo. */

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

export const saveFeedbackFile = async (
  ext: string,
  bytes: Buffer,
): Promise<string> => {
  const file = `fb_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}.${ext.toLowerCase()}`;
  await storage.put(`feedback/${file}`, bytes, feedbackMimeFor(ext));
  return file;
};

export const readFeedbackFile = async (
  file: string,
): Promise<Buffer | null> => {
  if (!FILE_RE.test(file)) return null;
  const stored = await storage.get(`feedback/${file}`);
  return stored?.bytes ?? null;
};

export const removeFeedbackFile = async (file: string): Promise<void> => {
  if (!FILE_RE.test(file)) return;
  await storage.delete(`feedback/${file}`);
};
