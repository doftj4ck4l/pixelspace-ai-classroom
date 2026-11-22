import { NextResponse } from "next/server";
import { and, desc, eq, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { artifacts, spaceMembers, spaces, threads } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/**
 * The artifacts generated in a space's chats — shown on the space Hub tab so
 * students can attempt quizzes, check slides and review flashcards. Members
 * see the owner's artifacts plus their own; the owner sees everything.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [space] = await db.select().from(spaces).where(eq(spaces.id, id));
  if (!space) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }
  const isOwner = space.userId === user.id;
  if (!isOwner) {
    const [member] = await db
      .select({ id: spaceMembers.id })
      .from(spaceMembers)
      .where(
        and(eq(spaceMembers.spaceId, id), eq(spaceMembers.userId, user.id)),
      );
    if (!member) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  const threadRows = await db
    .select({ id: threads.id })
    .from(threads)
    .where(eq(threads.spaceId, id));
  const threadIds = threadRows.map((row) => row.id);

  const noStore = { headers: { "Cache-Control": "no-store" } };
  if (!threadIds.length) {
    return NextResponse.json({ artifacts: [] }, noStore);
  }

  const inSpace = inArray(artifacts.threadId, threadIds);
  const scope = isOwner
    ? inSpace
    : and(
        inSpace,
        or(eq(artifacts.userId, space.userId), eq(artifacts.userId, user.id)),
      );
  const rows = await db
    .select({
      id: artifacts.id,
      type: artifacts.type,
      title: artifacts.title,
      kind: artifacts.kind,
      url: artifacts.url,
      createdAt: artifacts.createdAt,
    })
    .from(artifacts)
    .where(scope)
    .orderBy(desc(artifacts.createdAt));

  return NextResponse.json(
    {
      artifacts: rows.map((row) => ({
        id: row.id,
        type: row.type,
        title: row.title,
        kind: row.kind,
        url: row.url,
        createdAt: row.createdAt.toISOString(),
      })),
    },
    noStore,
  );
}
