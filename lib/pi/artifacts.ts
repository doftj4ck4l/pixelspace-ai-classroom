import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artifacts } from "@/lib/db/schema";

/**
 * Artifact registry in Postgres: files the agent shared (`share_file`) and
 * decks it designed (render_ui specs), scoped to the owning account.
 */

export type PiArtifact = {
  id: string;
  threadId: string;
  title: string;
  type: string;
  kind?: "file" | "spec";
  url?: string;
  path?: string;
  spec?: unknown;
  dedupeKey?: string;
  pinned: boolean;
  favorite: boolean;
  createdAt: string;
};

type ArtifactRow = typeof artifacts.$inferSelect;

const toPiArtifact = (row: ArtifactRow): PiArtifact => ({
  id: row.id,
  threadId: row.threadId ?? "",
  title: row.title,
  type: row.type,
  kind: row.kind === "spec" ? "spec" : "file",
  ...(row.url ? { url: row.url } : {}),
  ...(row.path ? { path: row.path } : {}),
  ...(row.spec ? { spec: row.spec } : {}),
  ...(row.dedupeKey ? { dedupeKey: row.dedupeKey } : {}),
  pinned: row.pinned,
  favorite: row.favorite,
  createdAt: row.createdAt.toISOString(),
});

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
  async list(userId: string): Promise<PiArtifact[]> {
    const rows = await db
      .select()
      .from(artifacts)
      .where(eq(artifacts.userId, userId))
      .orderBy(desc(artifacts.createdAt));
    return rows.map(toPiArtifact);
  },

  async get(userId: string, id: string): Promise<PiArtifact | undefined> {
    const [row] = await db
      .select()
      .from(artifacts)
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, userId)));
    return row ? toPiArtifact(row) : undefined;
  },

  async add(
    userId: string,
    input: { threadId: string; title: string; path: string; url: string },
  ): Promise<PiArtifact | null> {
    const existing = await db
      .select({ id: artifacts.id })
      .from(artifacts)
      .where(and(eq(artifacts.userId, userId), eq(artifacts.url, input.url)));
    if (existing.length > 0) return null;

    const row: typeof artifacts.$inferInsert = {
      id: newId(),
      userId,
      threadId: input.threadId,
      title: input.title,
      type: typeForPath(input.title || input.path),
      kind: "file",
      url: input.url,
      path: input.path,
    };
    await db.insert(artifacts).values(row);
    return toPiArtifact({
      ...row,
      pinned: false,
      favorite: false,
      createdAt: new Date(),
    } as ArtifactRow);
  },

  async addSpec(
    userId: string,
    input: {
      threadId: string;
      title: string;
      type: string;
      spec: unknown;
      dedupeKey: string;
    },
  ): Promise<PiArtifact | null> {
    const existing = await db
      .select({ id: artifacts.id })
      .from(artifacts)
      .where(
        and(
          eq(artifacts.userId, userId),
          eq(artifacts.dedupeKey, input.dedupeKey),
        ),
      );
    if (existing.length > 0) return null;

    const row: typeof artifacts.$inferInsert = {
      id: newId(),
      userId,
      threadId: input.threadId,
      title: input.title,
      type: input.type,
      kind: "spec",
      spec: input.spec,
      dedupeKey: input.dedupeKey,
    };
    await db.insert(artifacts).values(row);
    return toPiArtifact({
      ...row,
      pinned: false,
      favorite: false,
      createdAt: new Date(),
    } as ArtifactRow);
  },

  /** Replace a deck artifact's spec (and mirror its title column). */
  async updateSpec(
    userId: string,
    id: string,
    spec: unknown,
    title?: string,
  ): Promise<void> {
    await db
      .update(artifacts)
      .set({
        spec: spec as Record<string, unknown>,
        ...(title ? { title } : {}),
      })
      .where(
        and(
          eq(artifacts.id, id),
          eq(artifacts.userId, userId),
          eq(artifacts.type, "flashcards"),
        ),
      );
  },

  async setFlags(
    userId: string,
    id: string,
    flags: { pinned?: boolean; favorite?: boolean },
  ): Promise<void> {
    await db
      .update(artifacts)
      .set({
        ...(flags.pinned !== undefined ? { pinned: flags.pinned } : {}),
        ...(flags.favorite !== undefined ? { favorite: flags.favorite } : {}),
      })
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, userId)));
  },

  async remove(userId: string, id: string): Promise<void> {
    await db
      .delete(artifacts)
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, userId)));
  },
};
