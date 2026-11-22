import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources, spaceMembers, spaceSources, spaces } from "@/lib/db/schema";
import { requireApiUser } from "@/lib/auth-session";
import {
  attachTextbookSubject,
  booksForSpace,
  levelOrderFor,
  uploadsForSpace,
} from "@/lib/textbooks/library";

/**
 * The sources attached to a space: the matching textbook (auto-attached at
 * creation, adjustable here) plus the teacher's own uploads. The space owner
 * manages them; members read.
 */

const ownedSpace = async (userId: string, id: string) => {
  const [space] = await db
    .select()
    .from(spaces)
    .where(and(eq(spaces.id, id), eq(spaces.userId, userId)));
  return space;
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const [space] = await db.select().from(spaces).where(eq(spaces.id, id));
  if (!space) return NextResponse.json({ error: "not found" }, { status: 404 });
  if (space.userId !== user.id) {
    // Members may read the space's sources; only the owner may change them.
    const [member] = await db
      .select({ id: spaceMembers.id })
      .from(spaceMembers)
      .where(
        and(eq(spaceMembers.spaceId, id), eq(spaceMembers.userId, user.id)),
      );
    if (!member) {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
  }

  const rows = await db
    .select()
    .from(spaceSources)
    .where(eq(spaceSources.spaceId, id))
    .orderBy(spaceSources.createdAt);
  const books = await booksForSpace(id);
  const uploads = await uploadsForSpace(id);

  return NextResponse.json(
    {
      space: { id: space.id, name: space.name, level: space.level },
      sources: rows.map((row) => {
        if (row.kind === "textbook") {
          const book = books.get(Number(row.refId));
          return {
            id: row.id,
            kind: row.kind,
            refId: row.refId,
            title: book?.title ?? "Buku teks",
            subject: book?.subject ?? null,
            level: book?.level ?? null,
          };
        }
        const upload = uploads.get(row.refId);
        return {
          id: row.id,
          kind: row.kind,
          refId: row.refId,
          title: upload?.title ?? "Bahan",
          ext: upload?.ext ?? null,
        };
      }),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const space = await ownedSpace(user.id, id);
  if (!space) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as {
    kind?: string;
    subject?: string;
    refId?: string;
  };

  if (body.kind === "textbook") {
    const subject = typeof body.subject === "string" ? body.subject.trim() : "";
    const levelOrder = levelOrderFor(space.level);
    if (!subject || levelOrder === null) {
      return NextResponse.json(
        { error: "Subjek tidak sah untuk tahap ruang ini." },
        { status: 400 },
      );
    }
    const attached = await attachTextbookSubject(id, levelOrder, subject);
    return NextResponse.json({ ok: true, attached });
  }

  if (body.kind === "upload") {
    const refId = typeof body.refId === "string" ? body.refId : "";
    const [upload] = refId
      ? await db
          .select({ id: sources.id })
          .from(sources)
          .where(and(eq(sources.id, refId), eq(sources.userId, user.id)))
      : [];
    if (!upload) {
      return NextResponse.json(
        { error: "Bahan tidak dijumpai." },
        { status: 404 },
      );
    }
    const [existing] = await db
      .select({ id: spaceSources.id })
      .from(spaceSources)
      .where(
        and(
          eq(spaceSources.spaceId, id),
          eq(spaceSources.kind, "upload"),
          eq(spaceSources.refId, refId),
        ),
      );
    if (!existing) {
      await db.insert(spaceSources).values({
        id: `ss_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
        spaceId: id,
        kind: "upload",
        refId,
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "kind tidak sah." }, { status: 400 });
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const { id } = await params;
  const space = await ownedSpace(user.id, id);
  if (!space) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = (await req.json().catch(() => ({}))) as { refIds?: unknown };
  const refIds = Array.isArray(body.refIds)
    ? body.refIds.filter((value): value is string => typeof value === "string")
    : [];
  if (!refIds.length) {
    return NextResponse.json({ error: "refIds diperlukan." }, { status: 400 });
  }
  await db
    .delete(spaceSources)
    .where(
      and(eq(spaceSources.spaceId, id), inArray(spaceSources.refId, refIds)),
    );
  return NextResponse.json({ ok: true });
}
