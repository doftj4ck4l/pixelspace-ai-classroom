import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { docs } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

const toWire = (row: typeof docs.$inferSelect) => ({
  id: row.id,
  type: row.type,
  title: row.title,
  pinned: row.pinned,
  favorite: row.favorite,
  content: row.content ?? undefined,
  slides: row.slides ?? undefined,
  originArtifactId: row.originArtifactId ?? undefined,
  downloads: row.downloads ?? undefined,
});

/** The signed-in user's gallery documents. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const rows = await db
    .select()
    .from(docs)
    .where(eq(docs.userId, user.id))
    .orderBy(desc(docs.updatedAt));
  return NextResponse.json({ docs: rows.map(toWire) });
}

export async function POST(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    id?: string;
    type?: string;
    title?: string;
    content?: unknown;
    slides?: unknown;
    downloads?: unknown;
    originArtifactId?: string;
  };
  if (!body.id || !body.type || !body.title) {
    return NextResponse.json({ error: "id, type and title are required" }, { status: 400 });
  }

  await db
    .insert(docs)
    .values({
      id: body.id,
      userId: user.id,
      type: body.type,
      title: body.title,
      content: body.content ?? null,
      slides: body.slides ?? null,
      downloads: body.downloads ?? null,
      originArtifactId: body.originArtifactId ?? null,
    })
    .onConflictDoNothing();
  return NextResponse.json({ ok: true });
}
