import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

/** Add an external link (e.g. a wordwall.net practice set) as a source. */
export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    url?: unknown;
    title?: unknown;
  };
  const raw = typeof body.url === "string" ? body.url.trim() : "";

  let url: URL | null = null;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    url = null;
  }
  if (!url || (url.protocol !== "http:" && url.protocol !== "https:")) {
    return NextResponse.json({ error: "Pautan tidak sah." }, { status: 400 });
  }

  const title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim().slice(0, 200)
      : url.hostname.replace(/^www\./, "");

  const id = `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(sources).values({
    id,
    userId: user.id,
    title,
    ext: "link",
    mime: "text/uri-list",
    size: 0,
    path: url.toString(),
  });

  return NextResponse.json({ id });
}
