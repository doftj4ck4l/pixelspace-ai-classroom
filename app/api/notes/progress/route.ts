import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { notesProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/** Every notes artifact's checklist progress for the signed-in user. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const rows = await db
    .select()
    .from(notesProgress)
    .where(eq(notesProgress.userId, user.id));
  return NextResponse.json(
    {
      progress: rows.map((row) => {
        const done =
          row.done && typeof row.done === "object"
            ? (row.done as Record<string, number[]>)
            : {};
        return {
          notesId: row.notesId,
          doneCount: Object.values(done).reduce(
            (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
            0,
          ),
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
