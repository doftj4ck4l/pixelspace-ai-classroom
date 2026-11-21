import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sources } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

/** Extract the video id from any common YouTube URL shape. */
const videoIdFrom = (input: string): string | null => {
  const value = input.trim();
  const direct = /^[A-Za-z0-9_-]{11}$/.exec(value);
  if (direct) return value;
  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (!/(^|\.)youtube\.com$/.test(url.hostname)) return null;
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const shorts = /^\/(?:shorts|embed|live)\/([A-Za-z0-9_-]{11})/.exec(
      url.pathname,
    );
    return shorts?.[1] ?? null;
  } catch {
    return null;
  }
};

/** Add a YouTube video as a teaching source. */
export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    url?: unknown;
    title?: unknown;
  };
  const raw = typeof body.url === "string" ? body.url.trim() : "";
  const videoId = raw ? videoIdFrom(raw) : null;
  if (!videoId) {
    return NextResponse.json(
      { error: "Pautan YouTube tidak sah." },
      { status: 400 },
    );
  }

  let title =
    typeof body.title === "string" && body.title.trim()
      ? body.title.trim()
      : "";
  if (!title) {
    try {
      const res = await fetch(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`,
        { signal: AbortSignal.timeout(6000) },
      );
      if (res.ok) {
        const data = (await res.json()) as { title?: string };
        title = typeof data.title === "string" ? data.title : "";
      }
    } catch {
      // fall back to the default title
    }
  }
  if (!title) title = "Video YouTube";

  const id = `src_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(sources).values({
    id,
    userId: user.id,
    title: title.slice(0, 200),
    ext: "youtube",
    mime: "video/youtube",
    size: 0,
    path: videoId,
  });

  return NextResponse.json({ id });
}
