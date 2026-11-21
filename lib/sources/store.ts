import { storage } from "@/lib/storage";

/** Disk (or S3) storage for teacher uploads. Bytes live outside the repo. */

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

export const SOURCE_MIME_BY_EXT: Record<string, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  csv: "text/csv",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  txt: "text/plain",
  md: "text/markdown",
};

const newId = () =>
  `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export const saveSourceFile = async (
  ext: string,
  bytes: Buffer,
): Promise<{ id: string; path: string }> => {
  const id = newId();
  const file = `${id}.${ext.toLowerCase()}`;
  await storage.put(
    `sources/${file}`,
    bytes,
    SOURCE_MIME_BY_EXT[ext.toLowerCase()] ?? "application/octet-stream",
  );
  return { id, path: file };
};

const FILE_RE = /^src_[a-z0-9_]+(\.[a-z0-9]+)?$/;

export const readSourceFile = async (file: string): Promise<Buffer | null> => {
  if (!FILE_RE.test(file)) return null;
  const stored = await storage.get(`sources/${file}`);
  return stored?.bytes ?? null;
};

export const removeSourceFile = async (file: string): Promise<void> => {
  if (!FILE_RE.test(file)) return;
  await storage.delete(`sources/${file}`);
};
