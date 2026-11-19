import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

const NO_STORE = { "Cache-Control": "no-store" };

/** One quiz's per-question results for the signed-in user. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(quizProgress)
    .where(and(eq(quizProgress.userId, user.id), eq(quizProgress.quizId, id)));
  return NextResponse.json(
    {
      results:
        row?.results && typeof row.results === "object" ? row.results : {},
      total: row ? Number(row.total) || 0 : 0,
    },
    { headers: NO_STORE },
  );
}

/** Upsert per-question results as the quiz is taken. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    results?: unknown;
    total?: unknown;
  };
  const results: Record<string, string> = {};
  if (
    body.results &&
    typeof body.results === "object" &&
    !Array.isArray(body.results)
  ) {
    for (const [key, value] of Object.entries(
      body.results as Record<string, unknown>,
    )) {
      if (value === "correct" || value === "wrong") results[key] = value;
    }
  }
  const total = Number.isInteger(body.total) ? Number(body.total) : 0;

  const existing = await db
    .select({ quizId: quizProgress.quizId })
    .from(quizProgress)
    .where(and(eq(quizProgress.userId, user.id), eq(quizProgress.quizId, id)));

  if (existing.length > 0) {
    await db
      .update(quizProgress)
      .set({ results, total: String(total), updatedAt: new Date() })
      .where(
        and(eq(quizProgress.userId, user.id), eq(quizProgress.quizId, id)),
      );
  } else {
    await db.insert(quizProgress).values({
      userId: user.id,
      quizId: id,
      results,
      total: String(total),
    });
  }
  return new Response(null, { status: 204 });
}
