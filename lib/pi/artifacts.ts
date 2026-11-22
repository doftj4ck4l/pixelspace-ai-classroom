import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { artifacts, spaceMembers, spaces, threads } from "@/lib/db/schema";

/**
 * Artifact registry in Postgres: files the agent shared (`share_file`) and
 * decks it designed (render_ui specs), scoped to the owning account.
 */

export type PiArtifact = {
  id: string;
  userId: string;
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
  updatedAt: string;
};

type ArtifactRow = typeof artifacts.$inferSelect;

const toPiArtifact = (row: ArtifactRow): PiArtifact => ({
  id: row.id,
  userId: row.userId,
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
  updatedAt: row.updatedAt.toISOString(),
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

  /**
   * Read access for the artifact viewers: the owner, the space owner, or a
   * member of the space the artifact's thread belongs to. Mutations keep
   * using `get`, so shared space artifacts stay read-only for members.
   */
  async getViewable(
    userId: string,
    id: string,
  ): Promise<PiArtifact | undefined> {
    const [row] = await db.select().from(artifacts).where(eq(artifacts.id, id));
    if (!row) return undefined;
    if (row.userId === userId) return toPiArtifact(row);
    if (!row.threadId) return undefined;
    const [thread] = await db
      .select({ spaceId: threads.spaceId })
      .from(threads)
      .where(eq(threads.id, row.threadId));
    if (!thread?.spaceId) return undefined;
    const [space] = await db
      .select({ id: spaces.id, userId: spaces.userId })
      .from(spaces)
      .where(eq(spaces.id, thread.spaceId));
    if (!space) return undefined;
    if (space.userId === userId) return toPiArtifact(row);
    const [member] = await db
      .select({ id: spaceMembers.id })
      .from(spaceMembers)
      .where(
        and(
          eq(spaceMembers.spaceId, space.id),
          eq(spaceMembers.userId, userId),
        ),
      );
    return member ? toPiArtifact(row) : undefined;
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

    // Prefer whichever of path/title carries a known extension.
    const byPath = typeForPath(input.path);
    const row: typeof artifacts.$inferInsert = {
      id: newId(),
      userId,
      threadId: input.threadId,
      title: input.title,
      type: byPath !== "other" ? byPath : typeForPath(input.title),
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
      updatedAt: new Date(),
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
    if (existing.length > 0) {
      // Same run regenerated this component (e.g. a retry after a validation
      // failure): replace the spec in place so Spaces keeps one card.
      const id = existing[0]!.id;
      await db
        .update(artifacts)
        .set({
          spec: input.spec as Record<string, unknown>,
          title: input.title,
          updatedAt: new Date(),
        })
        .where(and(eq(artifacts.id, id), eq(artifacts.userId, userId)));
      return artifactRegistry
        .get(userId, id)
        .then((artifact) => artifact ?? null);
    }

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
      updatedAt: new Date(),
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
        updatedAt: new Date(),
        ...(title ? { title } : {}),
      })
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, userId)));
  },

  /** Point a file artifact at a freshly shared copy (same deck, new file). */
  async updateFile(
    userId: string,
    id: string,
    patch: { url?: string; path?: string; title?: string },
  ): Promise<void> {
    if (!patch.url && !patch.path && !patch.title) return;
    await db
      .update(artifacts)
      .set({
        ...(patch.url ? { url: patch.url } : {}),
        ...(patch.path ? { path: patch.path } : {}),
        ...(patch.title ? { title: patch.title } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(artifacts.id, id), eq(artifacts.userId, userId)));
  },

  async setFlags(
    userId: string,
    id: string,
    flags: { pinned?: boolean; favorite?: boolean },
  ): Promise<void> {
    if (flags.pinned === undefined && flags.favorite === undefined) return;
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
