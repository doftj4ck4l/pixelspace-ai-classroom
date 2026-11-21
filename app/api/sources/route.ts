import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";
import {
  MAX_SOURCE_BYTES,
  SOURCE_EXTS,
  kindForExt,
  saveSourceFile,
} from "@/lib/sources/store";

/** List the teacher's uploaded sources. */
export async function GET() {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const rows = await db
    .select()
    .from(sources)
    .where(eq(sources.userId, user.id))
    .orderBy(desc(sources.createdAt));
  return NextResponse.json(
    {
      sources: rows.map((row) => ({
        id: row.id,
        title: row.title,
        ext: row.ext,
        mime: row.mime,
        size: row.size,
        kind: kindForExt(row.ext),
        createdAt: row.createdAt.toISOString(),
        url: `/api/sources/${row.id}/file`,
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Upload one or more teaching materials (multipart form data). */
export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "Permintaan tidak sah." },
      { status: 400 },
    );
  }
  const files = form
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File);
  if (files.length === 0) {
    return NextResponse.json({ error: "Tiada fail dipilih." }, { status: 400 });
  }

  const uploaded: string[] = [];
  for (const file of files) {
    const ext = (file.name.split(".").pop() ?? "").toLowerCase();
    if (!(SOURCE_EXTS as readonly string[]).includes(ext)) {
      return NextResponse.json(
        { error: `Format .${ext} tidak disokong.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_SOURCE_BYTES) {
      return NextResponse.json(
        { error: `${file.name} melebihi 25 MB.` },
        { status: 400 },
      );
    }
    const bytes = Buffer.from(await file.arrayBuffer());
    const saved = saveSourceFile(ext, bytes);
    await db.insert(sources).values({
      id: saved.id,
      userId: user.id,
      title: file.name,
      ext,
      mime: file.type || "application/octet-stream",
      size: file.size,
      path: saved.path,
    });
    uploaded.push(file.name);
  }

  return NextResponse.json({ uploaded });
}
