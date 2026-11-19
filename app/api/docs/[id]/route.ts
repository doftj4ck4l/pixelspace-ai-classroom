import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { docs } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";

/** Update one owned document (title, pins, slides, downloads…). */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const patch = (await req.json().catch(() => ({}))) as {
    title?: string;
    pinned?: boolean;
    favorite?: boolean;
    content?: unknown;
    slides?: unknown;
    downloads?: unknown;
    originArtifactId?: string;
  };

  await db
    .update(docs)
    .set({
      ...(patch.title !== undefined ? { title: patch.title } : {}),
      ...(patch.pinned !== undefined ? { pinned: patch.pinned } : {}),
      ...(patch.favorite !== undefined ? { favorite: patch.favorite } : {}),
      ...(patch.content !== undefined ? { content: patch.content } : {}),
      ...(patch.slides !== undefined ? { slides: patch.slides } : {}),
      ...(patch.downloads !== undefined ? { downloads: patch.downloads } : {}),
      ...(patch.originArtifactId !== undefined
        ? { originArtifactId: patch.originArtifactId }
        : {}),
      updatedAt: new Date(),
    })
    .where(and(eq(docs.id, id), eq(docs.userId, user.id)));

  return new Response(null, { status: 204 });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  await db.delete(docs).where(and(eq(docs.id, id), eq(docs.userId, user.id)));
  return new Response(null, { status: 204 });
}
