import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notesProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import type { NotesDoneState } from "@/lib/notes/progress";

const NO_STORE = { "Cache-Control": "no-store" };

const sanitize = (input: unknown): NotesDoneState => {
  const out: NotesDoneState = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [id, value] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[a-z0-9-]{1,40}$/.test(id)) continue;
    if (!Array.isArray(value)) continue;
    const indices = value.filter(
      (index) => Number.isInteger(index) && index >= 0 && index < 50,
    );
    if (indices.length) out[id] = indices as number[];
  }
  return out;
};

/** One notes artifact's checklist progress. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(notesProgress)
    .where(
      and(eq(notesProgress.userId, user.id), eq(notesProgress.notesId, id)),
    );
  return NextResponse.json(
    { done: row?.done && typeof row.done === "object" ? row.done : {} },
    { headers: NO_STORE },
  );
}

/** Upsert checklist progress as the student ticks items. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { done?: unknown };
  const done = sanitize(body.done);

  const existing = await db
    .select({ notesId: notesProgress.notesId })
    .from(notesProgress)
    .where(
      and(eq(notesProgress.userId, user.id), eq(notesProgress.notesId, id)),
    );

  if (existing.length > 0) {
    await db
      .update(notesProgress)
      .set({ done, updatedAt: new Date() })
      .where(
        and(eq(notesProgress.userId, user.id), eq(notesProgress.notesId, id)),
      );
  } else {
    await db
      .insert(notesProgress)
      .values({ userId: user.id, notesId: id, done });
  }
  return new Response(null, { status: 204 });
}
