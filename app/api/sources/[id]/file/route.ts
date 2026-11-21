import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";
import { readSourceFile } from "@/lib/sources/store";

/** Serve one of the teacher's stored files. */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const { id } = await params;
  const [row] = await db
    .select()
    .from(sources)
    .where(and(eq(sources.id, id), eq(sources.userId, user.id)));
  if (!row) return new Response("Not found", { status: 404 });

  const bytes = await readSourceFile(row.path);
  if (!bytes) return new Response("Not found", { status: 404 });

  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": row.mime,
      "Content-Disposition": `inline; filename="${encodeURIComponent(row.title)}"`,
      "Cache-Control": "private, max-age=31536000, immutable",
    },
  });
}
