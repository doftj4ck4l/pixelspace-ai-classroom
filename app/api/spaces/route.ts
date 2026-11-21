import { NextResponse } from "next/server";
import { desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { spaceMembers, spaces, users } from "@/lib/db/schema";
import { requireRoleApi } from "@/lib/roles";

const ACCENTS = ["teal", "blue", "amber", "violet", "rose", "emerald"];
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

const newCode = () =>
  Array.from(
    { length: 6 },
    () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)],
  ).join("");

/** Subjects: teachers see their own; students see the ones they joined. */
export async function GET() {
  const { user, response } = await requireRoleApi("teacher", "student");
  if (!user) return response;

  if (user.role === "teacher") {
    const rows = await db
      .select()
      .from(spaces)
      .where(eq(spaces.userId, user.id))
      .orderBy(desc(spaces.createdAt));
    const counts = rows.length
      ? await db
          .select({
            spaceId: spaceMembers.spaceId,
            count: sql<number>`count(*)`,
          })
          .from(spaceMembers)
          .where(
            inArray(
              spaceMembers.spaceId,
              rows.map((row) => row.id),
            ),
          )
          .groupBy(spaceMembers.spaceId)
      : [];
    const countBySpace = new Map(
      counts.map((row) => [row.spaceId, Number(row.count) || 0]),
    );
    return NextResponse.json(
      {
        spaces: rows.map((space) => ({
          id: space.id,
          name: space.name,
          level: space.level,
          description: space.description ?? "",
          accent: space.accent,
          code: space.code,
          members: countBySpace.get(space.id) ?? 0,
          teacher: user.name ?? "Guru",
          createdAt: space.createdAt.toISOString(),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const rows = await db
    .select({
      space: spaces,
      teacherName: users.name,
      displayName: users.displayName,
    })
    .from(spaceMembers)
    .innerJoin(spaces, eq(spaces.id, spaceMembers.spaceId))
    .leftJoin(users, eq(users.id, spaces.userId))
    .where(eq(spaceMembers.userId, user.id))
    .orderBy(desc(spaceMembers.createdAt));
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

/** Add a subject with a fresh join code (teachers only). */
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

  // Retry on the (astronomically unlikely) code collision.
  let code = newCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    const [existing] = await db
      .select({ id: spaces.id })
      .from(spaces)
      .where(eq(spaces.code, code));
    if (!existing) break;
    code = newCode();
  }

  const id = `spc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
  await db.insert(spaces).values({
    id,
    userId: user.id,
    schoolId: (user as { schoolId?: string | null }).schoolId ?? null,
    name: name.slice(0, 120),
    level,
    ...(description ? { description } : {}),
    accent,
    code,
  });
  return NextResponse.json({ id, code });
}
