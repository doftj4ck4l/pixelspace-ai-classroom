/**
 * File-backed registry mapping app thread ids to pi conversation ids.
 *
 * Threads are created locally (before pi knows about them); the mapping is
 * filled in by the chat relay when pi opens the conversation on the first
 * message. Kept on disk so history and titles survive app restarts.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export type PiThread = {
  remoteId: string;
  conversationId?: string;
  title?: string;
  status: "regular" | "archived";
  lastMessageAt?: string;
};

const FILE = path.join(process.cwd(), "data", "pi-threads.json");

let cache: Record<string, PiThread> | null = null;
let writing: Promise<void> = Promise.resolve();

const load = async (): Promise<Record<string, PiThread>> => {
  if (cache) return cache;
  try {
    cache = JSON.parse(await readFile(FILE, "utf8")) as Record<
      string,
      PiThread
    >;
  } catch {
    cache = {};
  }
  return cache;
};

const save = () => {
  const snapshot = JSON.stringify(cache ?? {}, null, 2);
  writing = writing
    .then(() => mkdir(path.dirname(FILE), { recursive: true }))
    .then(() => writeFile(FILE, snapshot))
    .catch(() => {});
  return writing;
};

export const registry = {
  async list(): Promise<PiThread[]> {
    return Object.values(await load());
  },
  async get(id: string): Promise<PiThread | undefined> {
    return (await load())[id];
  },
  async create(id: string): Promise<PiThread> {
    const threads = await load();
    threads[id] = { remoteId: id, status: "regular" };
    await save();
    return threads[id];
  },
  async update(id: string, patch: Partial<PiThread>): Promise<PiThread> {
    const threads = await load();
    threads[id] = {
      ...{ remoteId: id, status: "regular" as const },
      ...threads[id],
      ...patch,
      remoteId: id,
    };
    await save();
    return threads[id];
  },
  async remove(id: string): Promise<void> {
    const threads = await load();
    delete threads[id];
    await save();
  },
};
