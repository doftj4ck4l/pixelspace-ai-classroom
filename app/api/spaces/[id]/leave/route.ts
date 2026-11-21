import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaceMembers } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

/** Students leave a subject they joined. */
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("student");
  if (!user) return response;

  const { id } = await params;
  await db
    .delete(spaceMembers)
    .where(and(eq(spaceMembers.spaceId, id), eq(spaceMembers.userId, user.id)));
  return new Response(null, { status: 204 });
}
