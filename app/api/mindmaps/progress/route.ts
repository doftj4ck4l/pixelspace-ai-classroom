import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mindmapProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import {
  masteredCount,
  exploredCount,
  type NodeState,
} from "@/lib/mindmaps/progress";

/** Every learning map's mastery for the signed-in user. */
export async function GET() {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const rows = await db
    .select()
    .from(mindmapProgress)
    .where(eq(mindmapProgress.userId, user.id));
  return NextResponse.json(
    {
      progress: rows.map((row) => {
        const state =
          row.nodeState && typeof row.nodeState === "object"
            ? (row.nodeState as Record<string, NodeState>)
            : {};
        return {
          mapId: row.mapId,
          masteredCount: masteredCount(state),
          exploredCount: exploredCount(state),
          total: Number(row.total) || 0,
          updatedAt: row.updatedAt.toISOString(),
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
