import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaces } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const ACCENTS = ["teal", "blue", "amber", "violet", "rose", "emerald"];

/** Update one of the teacher's subjects. */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    level?: unknown;
    description?: unknown;
    accent?: unknown;
  };
  const patch: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim())
    patch.name = body.name.trim().slice(0, 120);
  if (typeof body.level === "string" && body.level.trim())
    patch.level = body.level.trim();
  if (typeof body.description === "string")
    patch.description = body.description.trim().slice(0, 300);
  if (typeof body.accent === "string" && ACCENTS.includes(body.accent))
    patch.accent = body.accent;
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tiada perubahan." }, { status: 400 });
  }

  await db
    .update(spaces)
    .set(patch)
    .where(and(eq(spaces.id, id), eq(spaces.userId, user.id)));
  return new Response(null, { status: 204 });
}

/** Delete one of the teacher's subjects. */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const { id } = await params;
  await db
    .delete(spaces)
    .where(and(eq(spaces.id, id), eq(spaces.userId, user.id)));
  return new Response(null, { status: 204 });
}
