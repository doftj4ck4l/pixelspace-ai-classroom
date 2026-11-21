import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaceMembers, spaces } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

/** Students join a subject with the teacher's code. */
export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("student");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as { code?: unknown };
  const code =
    typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
  if (code.length < 4) {
    return NextResponse.json({ error: "Kod tidak sah." }, { status: 400 });
  }

  const [space] = await db
    .select({ id: spaces.id, name: spaces.name })
    .from(spaces)
    .where(eq(spaces.code, code));
  if (!space) {
    return NextResponse.json(
      { error: "Kod tidak dijumpai. Semak semula dengan guru anda." },
      { status: 404 },
    );
  }

  const id = `spm_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db
    .insert(spaceMembers)
    .values({ id, spaceId: space.id, userId: user.id })
    .onConflictDoNothing();
  return NextResponse.json({ id: space.id, name: space.name });
}
