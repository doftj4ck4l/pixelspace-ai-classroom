import { and, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { threads } from "@/lib/db/schema";

/**
 * Thread registry in Postgres: maps app thread ids to pi conversation ids,
 * scoped to the owning account. Every method takes the user id and filters by
 * it, so one account can never read or write another's threads.
 */

export type PiThread = {
  remoteId: string;
  conversationId?: string;
  title?: string;
  status: "regular" | "archived";
  lastMessageAt?: string;
};

type ThreadRow = typeof threads.$inferSelect;

const toPiThread = (row: ThreadRow): PiThread => ({
  remoteId: row.id,
  ...(row.piConversationId ? { conversationId: row.piConversationId } : {}),
  ...(row.title ? { title: row.title } : {}),
  status: row.status === "archived" ? "archived" : "regular",
  ...(row.lastMessageAt
    ? { lastMessageAt: row.lastMessageAt.toISOString() }
    : {}),
});

export const registry = {
  async list(userId: string): Promise<PiThread[]> {
    const rows = await db
      .select()
      .from(threads)
      .where(eq(threads.userId, userId))
      .orderBy(desc(threads.lastMessageAt), desc(threads.createdAt));
    return rows.map(toPiThread);
  },

  async get(userId: string, id: string): Promise<PiThread | undefined> {
    const [row] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.id, id), eq(threads.userId, userId)));
    return row ? toPiThread(row) : undefined;
  },

  async create(userId: string, id: string): Promise<void> {
    await db.insert(threads).values({ id, userId }).onConflictDoNothing();
  },

  /** The AI edit session for a deck artifact, if one exists. */
  async findByDeck(
    userId: string,
    deckId: string,
  ): Promise<PiThread | undefined> {
    const [row] = await db
      .select()
      .from(threads)
      .where(and(eq(threads.userId, userId), eq(threads.deckId, deckId)));
    return row ? toPiThread(row) : undefined;
  },

  /** Get or create the AI edit session thread for a deck artifact. */
  async upsertForDeck(
    userId: string,
    id: string,
    deckId: string,
    title: string,
  ): Promise<void> {
    await db
      .insert(threads)
      .values({ id, userId, deckId, title })
      .onConflictDoNothing();
  },

  async update(
    userId: string,
    id: string,
    patch: Partial<PiThread>,
  ): Promise<void> {
    await db
      .update(threads)
      .set({
        ...(patch.conversationId !== undefined
          ? { piConversationId: patch.conversationId }
          : {}),
        ...(patch.title !== undefined ? { title: patch.title } : {}),
        ...(patch.status !== undefined ? { status: patch.status } : {}),
        ...(patch.lastMessageAt !== undefined
          ? { lastMessageAt: new Date(patch.lastMessageAt) }
          : {}),
      })
      .where(and(eq(threads.id, id), eq(threads.userId, userId)));
  },

  async remove(userId: string, id: string): Promise<void> {
    await db
      .delete(threads)
      .where(and(eq(threads.id, id), eq(threads.userId, userId)));
  },
};
