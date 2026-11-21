import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";
import { removeSourceFile } from "@/lib/sources/store";

/** Delete one of the teacher's sources (row + stored file). */
export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const { id } = await params;
  const [row] = await db
    .select({ path: sources.path })
    .from(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, user.id)));
  if (!row) return new Response("Not found", { status: 404 });

  await removeSourceFile(row.path);
  await db
    .delete(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, user.id)));
  return new Response(null, { status: 204 });
}
