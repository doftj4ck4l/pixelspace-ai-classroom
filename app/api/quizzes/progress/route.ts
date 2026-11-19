import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quizProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/** Every quiz's results for the signed-in user (quizId → counts). */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const rows = await db
    .select()
    .from(quizProgress)
    .where(eq(quizProgress.userId, user.id));
  return NextResponse.json(
    {
      progress: rows.map((row) => {
        const results =
          row.results && typeof row.results === "object"
            ? (row.results as Record<string, string>)
            : {};
        const values = Object.values(results);
        return {
          quizId: row.quizId,
          correctCount: values.filter((value) => value === "correct").length,
          answeredCount: values.length,
          total: Number(row.total) || 0,
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
