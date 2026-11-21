import { storage } from "@/lib/storage";

/**
 * Storage for images the app generates itself (infographics via the Nextplus
 * router). Bytes live outside the repo — disk or object storage.
 */

const newId = () =>
  `gen_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;

export type GeneratedMeta = {
  prompt: string;
  kind: string;
  createdAt: string;
};

export const saveGeneratedImage = async (
  bytes: Buffer,
  meta: { prompt: string; kind: string },
): Promise<string> => {
  const id = newId();
  await storage.put(`generated/${id}.png`, bytes, "image/png");
  await storage.put(
    `generated/${id}.json`,
    Buffer.from(
      JSON.stringify({ ...meta, createdAt: new Date().toISOString() }),
    ),
    "application/json",
  );
  return id;
};

const bareId = (id: string) => id.replace(/\.png$/i, "");

const validId = (id: string) => /^gen_[a-z0-9_]+$/.test(id);

export const readGeneratedImage = async (
  id: string,
): Promise<Buffer | null> => {
  const clean = bareId(id);
  if (!validId(clean)) return null;
  const stored = await storage.get(`generated/${clean}.png`);
  return stored?.bytes ?? null;
};

export const readGeneratedMeta = async (
  id: string,
): Promise<GeneratedMeta | null> => {
  const clean = bareId(id);
  if (!validId(clean)) return null;
  const stored = await storage.get(`generated/${clean}.json`);
  if (!stored) return null;
  try {
    return JSON.parse(stored.bytes.toString("utf8")) as GeneratedMeta;
  } catch {
    return null;
  }
};

export const removeGeneratedImage = async (id: string): Promise<void> => {
  const clean = bareId(id);
  if (!validId(clean)) return;
  await storage.delete(`generated/${clean}.png`);
  await storage.delete(`generated/${clean}.json`);
};
