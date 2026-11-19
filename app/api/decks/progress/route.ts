import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { deckProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/** Every deck's mastery for the signed-in user (deckId → known/total). */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const rows = await db
    .select()
    .from(deckProgress)
    .where(eq(deckProgress.userId, user.id));
  return NextResponse.json({
    progress: rows.map((row) => ({
      deckId: row.deckId,
      knownCount: Array.isArray(row.knownIndices) ? row.knownIndices.length : 0,
      total: Number(row.total) || 0,
      updatedAt: row.updatedAt.toISOString(),
    })),
  });
}
