import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaces, users } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const ACCENTS = ["teal", "blue", "amber", "violet", "rose", "emerald"];

/** Subjects: teachers see their own; students see their school's subjects. */
export async function GET() {
  const { user, response } = await requireRoleApi("teacher", "student");
  if (!user) return response;

  const schoolId = (user as { schoolId?: string | null }).schoolId ?? null;
  const rows =
    user.role === "teacher"
      ? await db
          .select({
            space: spaces,
            teacherName: users.name,
            displayName: users.displayName,
          })
          .from(spaces)
          .leftJoin(users, eq(users.id, spaces.userId))
          .where(eq(spaces.userId, user.id))
          .orderBy(desc(spaces.createdAt))
      : schoolId
        ? await db
            .select({
              space: spaces,
              teacherName: users.name,
              displayName: users.displayName,
            })
            .from(spaces)
            .leftJoin(users, eq(users.id, spaces.userId))
            .where(eq(spaces.schoolId, schoolId))
            .orderBy(desc(spaces.createdAt))
        : [];

  return NextResponse.json(
    {
      spaces: rows.map(({ space, teacherName, displayName }) => ({
        id: space.id,
        name: space.name,
        level: space.level,
        description: space.description ?? "",
        accent: space.accent,
        teacher: displayName ?? teacherName ?? "Guru",
        createdAt: space.createdAt.toISOString(),
      })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

/** Add a subject (teachers only). */
export async function POST(req: Request) {
  const { user, response } = await requireRoleApi("teacher");
  if (!user) return response;

  const body = (await req.json().catch(() => ({}))) as {
    name?: unknown;
    level?: unknown;
    description?: unknown;
    accent?: unknown;
  };
  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json(
      { error: "Nama subjek diperlukan." },
      { status: 400 },
    );
  }
  const level =
    typeof body.level === "string" && body.level.trim()
      ? body.level.trim()
      : "Umum";
  const description =
    typeof body.description === "string"
      ? body.description.trim().slice(0, 300)
      : "";
  const accent =
    typeof body.accent === "string" && ACCENTS.includes(body.accent)
      ? body.accent
      : "teal";

  const id = `spc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(spaces).values({
    id,
    userId: user.id,
    schoolId: (user as { schoolId?: string | null }).schoolId ?? null,
    name: name.slice(0, 120),
    level,
    ...(description ? { description } : {}),
    accent,
  });
  return NextResponse.json({ id });
}
