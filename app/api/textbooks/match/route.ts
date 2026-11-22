import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth-session";
import { levelOrderFor } from "@/lib/textbooks/levels";
import { matchSubject } from "@/lib/textbooks/library";
import { vectorQuery } from "@/lib/vectors";

/** Predicts which library textbook a space name is about (live suggestion). */
export async function GET(req: Request) {
  const { user, response } = await requireApiUser();
  if (!user) return response;

  const url = new URL(req.url);
  const name = (url.searchParams.get("name") ?? "").trim();
  const level = (url.searchParams.get("level") ?? "").trim();
  const levelOrder = levelOrderFor(level);
  if (!name || levelOrder === null) {
    return NextResponse.json({ subject: null, title: null });
  }

  const subject = await matchSubject(levelOrder, name);
  if (!subject) {
    return NextResponse.json({ subject: null, title: null });
  }

  const { rows } = await vectorQuery<{ id: number; title: string }>(
    `select id, title from books where level_order = $1 and subject = $2
     order by (title like '%(%'), title limit 1`,
    [levelOrder, subject],
  );
  return NextResponse.json({ subject, title: rows[0]?.title ?? null });
}
