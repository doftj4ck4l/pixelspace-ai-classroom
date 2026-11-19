import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deckProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/** One deck's mastery for the signed-in user. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(deckProgress)
    .where(and(eq(deckProgress.userId, user.id), eq(deckProgress.deckId, id)));
  return NextResponse.json({
    knownIndices: Array.isArray(row?.knownIndices) ? row.knownIndices : [],
    total: row ? Number(row.total) || 0 : 0,
  });
}

/** Upsert mastery as cards are marked. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    knownIndices?: unknown;
    total?: unknown;
  };
  const knownIndices = Array.isArray(body.knownIndices)
    ? body.knownIndices.filter((value) => Number.isInteger(value))
    : [];
  const total = Number.isInteger(body.total)
    ? Number(body.total)
    : knownIndices.length;

  const existing = await db
    .select({ deckId: deckProgress.deckId })
    .from(deckProgress)
    .where(and(eq(deckProgress.userId, user.id), eq(deckProgress.deckId, id)));

  if (existing.length > 0) {
    await db
      .update(deckProgress)
      .set({ knownIndices, total: String(total), updatedAt: new Date() })
      .where(
        and(eq(deckProgress.userId, user.id), eq(deckProgress.deckId, id)),
      );
  } else {
    await db.insert(deckProgress).values({
      userId: user.id,
      deckId: id,
      knownIndices,
      total: String(total),
    });
  }
  return new Response(null, { status: 204 });
}
