import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { mindmapProgress } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import type { NodeState } from "@/lib/mindmaps/progress";

const NO_STORE = { "Cache-Control": "no-store" };

const sanitize = (input: unknown): Record<string, NodeState> => {
  const out: Record<string, NodeState> = {};
  if (!input || typeof input !== "object" || Array.isArray(input)) return out;
  for (const [id, value] of Object.entries(input as Record<string, unknown>)) {
    if (!/^[a-z0-9-]{1,40}$/.test(id)) continue;
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    const s = value as Record<string, unknown>;
    const level = Number(s.level);
    if (!Number.isInteger(level) || level < 0 || level > 3) continue;
    out[id] = {
      level: level as NodeState["level"],
      streak: Math.max(0, Number(s.streak) || 0),
      correct: Math.max(0, Number(s.correct) || 0),
      attempts: Math.max(0, Number(s.attempts) || 0),
      nextDue: Number(s.nextDue) || 0,
      lastSeen: Number(s.lastSeen) || 0,
    };
  }
  return out;
};

/** One learning map's per-node mastery for the signed-in user. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(mindmapProgress)
    .where(
      and(eq(mindmapProgress.userId, user.id), eq(mindmapProgress.mapId, id)),
    );
  return NextResponse.json(
    {
      nodeState:
        row?.nodeState && typeof row.nodeState === "object"
          ? row.nodeState
          : {},
      total: row ? Number(row.total) || 0 : 0,
    },
    { headers: NO_STORE },
  );
}

/** Upsert per-node mastery as the student explores and practices. */
export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    nodeState?: unknown;
    total?: unknown;
  };
  const nodeState = sanitize(body.nodeState);
  const total = Number.isInteger(body.total) ? Number(body.total) : 0;

  const existing = await db
    .select({ mapId: mindmapProgress.mapId })
    .from(mindmapProgress)
    .where(
      and(eq(mindmapProgress.userId, user.id), eq(mindmapProgress.mapId, id)),
    );

  if (existing.length > 0) {
    await db
      .update(mindmapProgress)
      .set({ nodeState, total: String(total), updatedAt: new Date() })
      .where(
        and(eq(mindmapProgress.userId, user.id), eq(mindmapProgress.mapId, id)),
      );
  } else {
    await db.insert(mindmapProgress).values({
      userId: user.id,
      mapId: id,
      nodeState,
      total: String(total),
    });
  }
  return new Response(null, { status: 204 });
}
